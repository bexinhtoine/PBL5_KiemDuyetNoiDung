package com.pbl5.service;

import com.pbl5.dto.CreatePostRequest;
import com.pbl5.dto.PostResponse;
import com.pbl5.enums.PostStatus;
import com.pbl5.enums.PostVisibility;
import com.pbl5.model.Post;
import com.pbl5.model.User;
import com.pbl5.repository.CommentRepository;
import com.pbl5.repository.LikeRepository;
import com.pbl5.repository.PostRepository;
import com.pbl5.model.Community;
import com.pbl5.repository.CommunityRepository;
import com.pbl5.repository.CommunityMemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PostService {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private ContentModerationService moderationService;

    @Autowired
    private LikeRepository likeRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private CommunityRepository communityRepository;

    @Autowired
    private CommunityMemberRepository communityMemberRepository;

    @Autowired
    private com.pbl5.repository.FriendshipRepository friendshipRepository;

    @Autowired
    private com.pbl5.repository.CommunityTagRepository communityTagRepository;

    /**
     * Tạo bài đăng mới với kiểm tra nội dung
     * 
     * @param user    Người đăng bài
     * @param request Dữ liệu bài đăng
     * @return PostResponse nếu thành công hoặc null nếu bị từ chối tự động
     */
    public PostResponse createPost(User user, CreatePostRequest request) {
        if (user.getPostWarningExpiresAt() != null
                && user.getPostWarningExpiresAt().isAfter(java.time.LocalDateTime.now())) {
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter
                    .ofPattern("HH:mm 'ngày' dd/MM/yyyy");
            String expiryStr = user.getPostWarningExpiresAt().format(formatter);
            throw new IllegalStateException("Bạn đang bị cấm đăng bài do vi phạm. Vui lòng quay lại sau " + expiryStr);
        }

        boolean hasContent = request.getContent() != null && !request.getContent().trim().isEmpty();
        boolean hasMedia = (request.getImageUrl() != null && !request.getImageUrl().trim().isEmpty())
                || (request.getVideoUrl() != null && !request.getVideoUrl().trim().isEmpty());
        if (!hasContent && !hasMedia) {
            throw new IllegalArgumentException("Nội dung bài đăng không được trống.");
        }

        // Tạo bài đăng mới
        Post post = new Post();
        post.setContent(request.getContent());
        post.setImageUrl(request.getImageUrl());
        post.setVideoUrl(request.getVideoUrl());
        post.setUser(user);

        // Đặt visibility
        if (request.getVisibility() != null) {
            try {
                post.setVisibility(PostVisibility.valueOf(request.getVisibility().toUpperCase()));
            } catch (IllegalArgumentException e) {
                post.setVisibility(PostVisibility.PUBLIC);
            }
        }

        // Liên kết cộng đồng nếu có
        if (request.getCommunityId() != null) {
            Community community = communityRepository.findById(request.getCommunityId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            boolean isMember = communityMemberRepository.existsByCommunityIdAndUserIdAndStatus(
                    community.getId(), user.getId(), com.pbl5.enums.CommunityMemberStatus.ACTIVE);

            if (!isMember) {
                throw new IllegalStateException("Bạn phải là thành viên chính thức để đăng bài vào cộng đồng này.");
            }

            post.setCommunity(community);
            post.setVisibility(community.getIsPrivate() ? PostVisibility.PRIVATE : PostVisibility.PUBLIC);

            if (request.getTags() != null && !request.getTags().isEmpty()) {
                List<com.pbl5.model.CommunityTag> communityTags = communityTagRepository
                        .findByCommunityIdAndNameIn(community.getId(), request.getTags());
                post.setTags(communityTags);
            }
        }

        // Đặt trạng thái ban đầu:
        // - Bài đăng cá nhân (không có cộng đồng): ACTIVE ngay lập tức, AI kiểm duyệt
        // trong nền
        // - Bài đăng cộng đồng: PENDING_REVIEW cho đến khi AI duyệt xong
        PostStatus initialStatus;
        boolean triggerAiImmediately = true;

        if (post.getCommunity() == null) {
            // Bài cá nhân: hiển thị ngay, kiểm duyệt nền sẽ cập nhật nếu vi phạm
            initialStatus = PostStatus.ACTIVE;
        } else if (post.getCommunity().getRequirePostApproval() != null
                && post.getCommunity().getRequirePostApproval()) {
            // Kịch bản 1: Nhóm bật chế độ "Phê duyệt trước"
            initialStatus = PostStatus.PENDING_COMM_ADMIN;
            triggerAiImmediately = false;
        } else {
            // Kịch bản 2: Nhóm không yêu cầu phê duyệt trước
            initialStatus = PostStatus.PENDING_REVIEW;
        }

        post.setStatus(initialStatus);
        post.setBestScore(0.0);
        post.setNsfwScore(0.0);
        post.setViolenceScore(0.0);
        post.setHateSpeechScore(0.0);
        post.setNsfwBox(null);
        post.setViolenBox(null);
        post.setHateSpeechWord("(Video:) (Content:)");
        post.setViolationRate(0.0);

        // Lưu bài đăng
        Post savedPost = postRepository.save(post);

        if (triggerAiImmediately) {
            try {
                moderationService.moderatePostAsync(
                        savedPost.getId(),
                        request.getContent(),
                        request.getImageUrl(),
                        request.getVideoUrl());
            } catch (Exception e) {
                // Bài viết đã được lưu; lỗi kiểm duyệt nền không được chặn luồng đăng bài.
                System.err.println(
                        "Không thể khởi chạy kiểm duyệt nền bài viết " + savedPost.getId() + ": " + e.getMessage());
            }
        }

        // Trả về thông tin bài đăng
        return convertToResponse(savedPost, user);
    }

    /**
     * Convert Post entity thành PostResponse
     */
    public PostResponse convertToResponse(Post post, User user) {
        long likeCount = likeRepository.countByPostId(post.getId());
        long commentCount = commentRepository.countByPostId(post.getId());

        String authorName = post.getUser().getFullName() != null ? post.getUser().getFullName() : "Người dùng";
        String authorAvatar = post.getUser().getAvatar() != null ? post.getUser().getAvatar()
                : "https://ui-avatars.com/api/?name=" + authorName.replace(" ", "+") + "&background=5e6ad2&color=fff";

        PostResponse response = new PostResponse(
                post.getId(),
                post.getContent(),
                post.getImageUrl(),
                post.getVideoUrl(),
                post.getCreatedAt(),
                post.getUser().getId(),
                authorName,
                authorAvatar,
                likeCount,
                commentCount,
                false,
                true,
                post.getVisibility() != null ? post.getVisibility().name() : "PUBLIC",
                post.getStatus() != null ? post.getStatus().name() : "ACTIVE");
        response.setNsfwScore(post.getNsfwScore());
        response.setViolenceScore(post.getViolenceScore());
        response.setHateSpeechScore(post.getHateSpeechScore());
        response.setOcrContent(post.getDetectedText());
        response.setSpeechLabels(post.getSpeechLabels());
        response.setHateSpeechContentScore(post.getHateSpeechContentScore());
        response.setHateSpeechVideoScore(post.getHateSpeechVideoScore());
        response.setHateSpeechWord(post.getHateSpeechWord());
        response.setPinned(post.isPinned());
        if (post.getCommunity() != null) {
            response.setCommunityId(post.getCommunity().getId());
            response.setCommunityName(post.getCommunity().getName());
            boolean isMember = communityMemberRepository.existsByCommunityIdAndUserIdAndStatus(
                    post.getCommunity().getId(), user.getId(), com.pbl5.enums.CommunityMemberStatus.ACTIVE);
            response.setJoinedCommunity(isMember);
            response.setCommunityPrivate(post.getCommunity().getIsPrivate());
        }
        if (user != null && post.getUser() != null) {
            if (post.getUser().getId().equals(user.getId())) {
                response.setFriendshipStatus("MINE");
            } else {
                java.util.Optional<com.pbl5.model.Friendship> friendshipOpt = friendshipRepository.findByUsers(user,
                        post.getUser());
                if (friendshipOpt.isPresent()) {
                    response.setFriendshipStatus(friendshipOpt.get().getStatus().name());
                } else {
                    response.setFriendshipStatus("NONE");
                }
            }
        } else {
            response.setFriendshipStatus("NONE");
        }
        if (post.getTags() != null) {
            response.setTags(post.getTags().stream()
                    .map(com.pbl5.model.CommunityTag::getName)
                    .collect(Collectors.toList()));
        }
        return response;
    }

    public List<PostResponse> convertToResponses(List<Post> posts, User user) {
        return posts.stream()
                .map(post -> convertToResponse(post, user))
                .collect(Collectors.toList());
    }
}
