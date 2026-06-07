package com.pbl5.controller;

import com.pbl5.dto.CreateCommunityRequest;
import com.pbl5.dto.CommunityResponse;
import com.pbl5.model.Community;
import com.pbl5.model.CommunityMember;
import com.pbl5.model.User;
import com.pbl5.repository.UserRepository;
import com.pbl5.security.JwtTokenProvider;
import com.pbl5.service.CommunityService;
import com.pbl5.model.Post;
import com.pbl5.repository.PostRepository;
import com.pbl5.repository.CommunityMemberRepository;
import com.pbl5.service.PostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/communities")
public class CommunityController {

    @Autowired
    private CommunityService communityService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private PostService postService;

    @Autowired
    private CommunityMemberRepository communityMemberRepository;

    @Autowired
    private com.pbl5.repository.ReportRepository reportRepository;

    @PostMapping("/create")
    public ResponseEntity<?> createCommunity(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CreateCommunityRequest request) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.createCommunity(
                    user,
                    request.getName(),
                    request.getDescription(),
                    request.getAvatarUrl(),
                    request.getCoverUrl(),
                    request.getIsPrivate(),
                    request.getRequireApproval()
            );
            return ResponseEntity.ok(convertToResponse(community));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<?> joinCommunity(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            CommunityMember member = communityService.joinCommunity(user, id);
            return ResponseEntity.ok("Đã gửi yêu cầu tham gia cộng đồng. Trạng thái: " + member.getStatus().name());
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<?> leaveCommunity(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            boolean isPending = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .map(m -> m.getStatus() == com.pbl5.enums.CommunityMemberStatus.PENDING)
                    .orElse(false);
            
            communityService.leaveCommunity(user, id);
            return ResponseEntity.ok(isPending ? "Đã hủy yêu cầu tham gia." : "Đã rời khỏi cộng đồng.");
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/approve/{memberUserId}")
    public ResponseEntity<?> approveMember(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @PathVariable Long memberUserId) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            communityService.approveMember(user, id, memberUserId);
            return ResponseEntity.ok("Đã phê duyệt thành viên.");
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/kick/{memberUserId}")
    public ResponseEntity<?> kickMember(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @PathVariable Long memberUserId) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            communityService.kickMember(user, id, memberUserId);
            return ResponseEntity.ok("Đã trục xuất thành viên khỏi nhóm.");
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyCommunities(@RequestHeader("Authorization") String authHeader) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        List<Community> communities = communityService.getCommunitiesForUser(user.getId());
        List<CommunityResponse> responses = communities.stream()
                .map(c -> convertToResponse(c, user))
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchCommunities(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam("q") String query) {
        User user = null;
        if (authHeader != null) {
            user = getAuthenticatedUser(authHeader);
        }
        List<Community> communities = communityService.searchCommunities(query);
        User finalUser = user;
        List<CommunityResponse> responses = communities.stream()
                .map(c -> convertToResponse(c, finalUser))
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCommunityDetails(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));
            return ResponseEntity.ok(convertToResponse(community, user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/posts")
    public ResponseEntity<?> getCommunityPosts(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            if (community.getIsPrivate()) {
                boolean isMember = communityMemberRepository.existsByCommunityIdAndUserIdAndStatus(
                        id, user.getId(), com.pbl5.enums.CommunityMemberStatus.ACTIVE);
                
                boolean isSysAdminOrMod = user.getRole() == com.pbl5.enums.Role.ADMIN || user.getRole() == com.pbl5.enums.Role.MODERATOR;
                
                if (!isMember && !isSysAdminOrMod) {
                    return ResponseEntity.status(403).body("Đây là cộng đồng riêng tư. Bạn cần tham gia nhóm để xem bài viết.");
                }
            }

             List<Post> posts = postRepository.findByCommunityIdAndStatusOrderByCreatedAtDesc(id, com.pbl5.enums.PostStatus.ACTIVE);
            List<com.pbl5.dto.PostResponse> responses = postService.convertToResponses(posts, user);
            return ResponseEntity.ok(responses);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<?> getCommunityMembers(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestParam(value = "status", defaultValue = "ACTIVE") String statusStr) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            com.pbl5.enums.CommunityMemberStatus status = com.pbl5.enums.CommunityMemberStatus.valueOf(statusStr.toUpperCase());
            
            if (status == com.pbl5.enums.CommunityMemberStatus.PENDING) {
                CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                        .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));
                
                if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                    return ResponseEntity.status(403).body("Chỉ quản trị viên mới có quyền xem danh sách chờ duyệt.");
                }
            }

            List<CommunityMember> members = communityMemberRepository.findByCommunityIdAndStatus(id, status);
            List<java.util.Map<String, Object>> response = members.stream().map(m -> {
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("userId", m.getUser().getId());
                map.put("fullName", m.getUser().getFullName());
                map.put("avatar", m.getUser().getAvatar());
                map.put("role", m.getRole().name());
                map.put("joinedAt", m.getJoinedAt());
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/reports")
    public ResponseEntity<?> getCommunityReports(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            // Check if user is OWNER or ADMIN of this community
            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                return ResponseEntity.status(403).body("Chỉ quản trị viên mới có quyền xem báo cáo.");
            }

            List<com.pbl5.model.Report> reports = reportRepository.findByCommunityId(id);
            List<java.util.Map<String, Object>> response = reports.stream().map(r -> {
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("id", r.getId());
                map.put("reason", r.getReason());
                map.put("category", r.getCategory() != null ? r.getCategory().name() : null);
                map.put("status", r.getStatus() != null ? r.getStatus().name() : "PENDING");
                map.put("createdAt", r.getCreatedAt());
                map.put("reporterName", r.getUser() != null ? r.getUser().getFullName() : null);
                map.put("reporterAvatar", r.getUser() != null ? r.getUser().getAvatar() : null);
                if (r.getPost() != null) {
                    map.put("postId", r.getPost().getId());
                    map.put("postContent", r.getPost().getContent());
                }
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private User getAuthenticatedUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        String token = authHeader.substring(7);
        if (!tokenProvider.validateToken(token)) {
            return null;
        }
        String email = tokenProvider.getEmailFromJWT(token);
        return userRepository.findByEmail(email).orElse(null);
    }

    private CommunityResponse convertToResponse(Community community) {
        return convertToResponse(community, null);
    }

    private CommunityResponse convertToResponse(Community community, User user) {
        CommunityResponse response = new CommunityResponse(
                community.getId(),
                community.getName(),
                community.getDescription(),
                community.getAvatarUrl(),
                community.getCoverUrl(),
                community.getIsPrivate(),
                community.getRequireApproval(),
                community.getCreatedAt(),
                community.getCreator().getId(),
                community.getCreator().getFullName()
        );
        if (user != null) {
            communityMemberRepository.findByCommunityIdAndUserId(community.getId(), user.getId())
                    .ifPresent(member -> response.setMembershipStatus(member.getStatus().name()));
        }
        return response;
    }
}
