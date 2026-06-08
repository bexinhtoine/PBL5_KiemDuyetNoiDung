package com.pbl5.controller;

import com.pbl5.dto.CreateCommunityRequest;
import com.pbl5.dto.CommunityResponse;
import com.pbl5.model.Community;
import com.pbl5.model.CommunityMember;
import com.pbl5.model.User;
import com.pbl5.model.CommunityRule;
import com.pbl5.model.CommunityActivityLog;
import com.pbl5.repository.UserRepository;
import com.pbl5.security.JwtTokenProvider;
import com.pbl5.service.CommunityService;
import com.pbl5.model.Post;
import com.pbl5.repository.PostRepository;
import com.pbl5.repository.CommunityMemberRepository;
import com.pbl5.repository.CommunityRuleRepository;
import com.pbl5.repository.CommunityActivityLogRepository;
import com.pbl5.service.PostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.time.LocalDateTime;

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

    @Autowired
    private com.pbl5.service.ContentModerationService contentModerationService;

    @Autowired
    private CommunityRuleRepository communityRuleRepository;

    @Autowired
    private CommunityActivityLogRepository communityActivityLogRepository;

    @Autowired
    private com.pbl5.repository.CommunityTagRepository communityTagRepository;

    @Autowired
    private com.pbl5.repository.CommunityInvitationRepository communityInvitationRepository;

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
                    request.getRequireApproval(),
                    request.getRequirePostApproval()
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
        List<CommunityMember> memberships = communityMemberRepository.findByUserId(user.getId());
        java.util.Map<Long, String> membershipMap = memberships.stream()
                .collect(Collectors.toMap(m -> m.getCommunity().getId(), m -> m.getStatus().name(), (a, b) -> a));

        List<CommunityResponse> responses = communities.stream()
                .map(c -> convertToResponse(c, membershipMap))
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
        
        java.util.Map<Long, String> membershipMap = new java.util.HashMap<>();
        if (user != null) {
            List<CommunityMember> memberships = communityMemberRepository.findByUserId(user.getId());
            membershipMap = memberships.stream()
                    .collect(Collectors.toMap(m -> m.getCommunity().getId(), m -> m.getStatus().name(), (a, b) -> a));
        }
        
        final java.util.Map<Long, String> finalMap = membershipMap;
        List<CommunityResponse> responses = communities.stream()
                .map(c -> convertToResponse(c, finalMap))
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
            @PathVariable Long id,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "tag", required = false) String tag) {

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

            List<Post> posts;
            if ((search != null && !search.trim().isEmpty()) || (tag != null && !tag.trim().isEmpty())) {
                posts = postRepository.searchCommunityPosts(id, search, tag);
            } else {
                posts = postRepository.findByCommunityIdAndStatusInOrderByCreatedAtDesc(id, List.of(com.pbl5.enums.PostStatus.ACTIVE, com.pbl5.enums.PostStatus.PENDING_REVIEW));
            }
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
            
            if (community.getIsPrivate()) {
                boolean isMember = communityMemberRepository.existsByCommunityIdAndUserIdAndStatus(id, user.getId(), com.pbl5.enums.CommunityMemberStatus.ACTIVE);
                boolean isSysAdminOrMod = user.getRole() == com.pbl5.enums.Role.ADMIN || user.getRole() == com.pbl5.enums.Role.MODERATOR;
                if (!isMember && !isSysAdminOrMod) {
                    return ResponseEntity.status(403).body("Không có quyền xem thành viên của nhóm riêng tư này.");
                }
            }

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
        return convertToResponse(community, (User) null);
    }

    private CommunityResponse convertToResponse(Community community, java.util.Map<Long, String> membershipMap) {
        CommunityResponse response = new CommunityResponse(
                community.getId(),
                community.getName(),
                community.getDescription(),
                community.getAvatarUrl(),
                community.getCoverUrl(),
                community.getIsPrivate(),
                community.getRequireApproval(),
                community.getRequirePostApproval(),
                community.getCreatedAt(),
                community.getCreator().getId(),
                community.getCreator().getFullName()
        );
        if (membershipMap != null && membershipMap.containsKey(community.getId())) {
            response.setMembershipStatus(membershipMap.get(community.getId()));
        }
        return response;
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
                community.getRequirePostApproval(),
                community.getCreatedAt(),
                community.getCreator().getId(),
                community.getCreator().getFullName()
        );
        if (user != null) {
            communityMemberRepository.findByCommunityIdAndUserId(community.getId(), user.getId())
                    .ifPresent(member -> {
                        if (member.getStatus() == com.pbl5.enums.CommunityMemberStatus.BLOCKED && member.getBanUntil() != null && member.getBanUntil().isBefore(LocalDateTime.now())) {
                            communityMemberRepository.delete(member);
                        } else {
                            response.setMembershipStatus(member.getStatus().name());
                            response.setMembershipRole(member.getRole().name());
                        }
                    });
        }
        return response;
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCommunity(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody CreateCommunityRequest request) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER) {
                return ResponseEntity.status(403).body("Chỉ chủ sở hữu cộng đồng mới có quyền chỉnh sửa.");
            }

            if (request.getName() != null && !request.getName().trim().isEmpty() && !request.getName().equals(community.getName())) {
                if (communityService.existsByName(request.getName())) {
                    return ResponseEntity.badRequest().body("Tên cộng đồng đã tồn tại.");
                }
                community.setName(request.getName().trim());
            }

            if (request.getDescription() != null) {
                community.setDescription(request.getDescription().trim());
            }
            if (request.getAvatarUrl() != null) {
                community.setAvatarUrl(request.getAvatarUrl());
            }
            if (request.getCoverUrl() != null) {
                community.setCoverUrl(request.getCoverUrl());
            }
            if (request.getIsPrivate() != null) {
                community.setIsPrivate(request.getIsPrivate());
            }
            if (request.getRequireApproval() != null) {
                community.setRequireApproval(request.getRequireApproval());
            }
            if (request.getRequirePostApproval() != null) {
                community.setRequirePostApproval(request.getRequirePostApproval());
            }

            Community updated = communityService.saveCommunity(community);
            return ResponseEntity.ok(convertToResponse(updated, user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/members/{targetUserId}/role")
    public ResponseEntity<?> updateMemberRole(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @PathVariable Long targetUserId,
            @RequestParam String role) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER) {
                return ResponseEntity.status(403).body("Chỉ chủ sở hữu nhóm mới có quyền bổ nhiệm.");
            }

            CommunityMember targetMember = communityMemberRepository.findByCommunityIdAndUserId(id, targetUserId)
                    .orElseThrow(() -> new IllegalArgumentException("Người dùng không phải là thành viên nhóm."));

            if (targetMember.getRole() == com.pbl5.enums.CommunityRole.OWNER) {
                return ResponseEntity.badRequest().body("Không thể thay đổi vai trò của chủ sở hữu nhóm.");
            }

            com.pbl5.enums.CommunityRole targetRole;
            try {
                targetRole = com.pbl5.enums.CommunityRole.valueOf(role.toUpperCase());
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("Vai trò không hợp lệ. Chỉ chấp nhận: ADMIN, MEMBER");
            }

            if (targetRole == com.pbl5.enums.CommunityRole.OWNER) {
                return ResponseEntity.badRequest().body("Không thể chuyển quyền chủ sở hữu qua API này.");
            }

            targetMember.setRole(targetRole);
            communityMemberRepository.save(targetMember);

            String messageText = targetRole == com.pbl5.enums.CommunityRole.ADMIN 
                ? "Bạn đã được bổ nhiệm làm Quản trị viên của cộng đồng " + community.getName() + "."
                : "Bạn đã bị bãi nhiệm vai trò Quản trị viên trong cộng đồng " + community.getName() + ".";
            communityService.sendNotification(targetMember.getUser(), user, "COMMUNITY_ROLE_CHANGE", messageText, "/html/community.html?id=" + id);

            return ResponseEntity.ok(java.util.Map.of("message", "Đã thay đổi vai trò thành viên thành " + targetRole.name()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/ban/{targetUserId}")
    public ResponseEntity<?> banMember(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @PathVariable Long targetUserId,
            @RequestParam(value = "duration", required = false) Integer durationDays) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                return ResponseEntity.status(403).body("Chỉ quản trị viên mới có quyền chặn thành viên.");
            }

            User targetUser = userRepository.findById(targetUserId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng mục tiêu."));

            Optional<CommunityMember> targetMemberOpt = communityMemberRepository.findByCommunityIdAndUserId(id, targetUserId);
            CommunityMember targetMember;
            if (targetMemberOpt.isPresent()) {
                targetMember = targetMemberOpt.get();
                if (targetMember.getRole() == com.pbl5.enums.CommunityRole.OWNER) {
                    return ResponseEntity.badRequest().body("Không thể chặn chủ sở hữu nhóm.");
                }
                if (targetMember.getRole() == com.pbl5.enums.CommunityRole.ADMIN && currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER) {
                    return ResponseEntity.badRequest().body("Chỉ có chủ sở hữu nhóm mới có thể chặn phó nhóm.");
                }
                targetMember.setStatus(com.pbl5.enums.CommunityMemberStatus.BLOCKED);
            } else {
                targetMember = new CommunityMember();
                targetMember.setCommunity(community);
                targetMember.setUser(targetUser);
                targetMember.setRole(com.pbl5.enums.CommunityRole.MEMBER);
                targetMember.setStatus(com.pbl5.enums.CommunityMemberStatus.BLOCKED);
            }

            String logMsg = "Đã chặn thành viên " + targetUser.getFullName();
            if (durationDays != null && durationDays > 0) {
                targetMember.setBanUntil(LocalDateTime.now().plusDays(durationDays));
                logMsg += " trong " + durationDays + " ngày";
            } else {
                targetMember.setBanUntil(null);
                logMsg += " vĩnh viễn";
            }

            communityMemberRepository.save(targetMember);

            communityService.logActivity(community, user, logMsg);

            communityService.sendNotification(targetUser, user, "COMMUNITY_BLOCKED", "Bạn đã bị chặn khỏi cộng đồng " + community.getName() + ".", "/html/communities.html");

            return ResponseEntity.ok(java.util.Map.of("message", "Đã chặn thành viên khỏi nhóm thành công."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/unban/{targetUserId}")
    public ResponseEntity<?> unbanMember(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @PathVariable Long targetUserId) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                return ResponseEntity.status(403).body("Chỉ quản trị viên mới có quyền bỏ chặn.");
            }

            CommunityMember targetMember = communityMemberRepository.findByCommunityIdAndUserId(id, targetUserId)
                    .orElseThrow(() -> new IllegalArgumentException("Người dùng không ở trạng thái bị chặn trong cộng đồng này."));

            if (targetMember.getStatus() != com.pbl5.enums.CommunityMemberStatus.BLOCKED) {
                return ResponseEntity.badRequest().body("Thành viên không ở trạng thái bị chặn.");
            }

            communityMemberRepository.delete(targetMember);

            return ResponseEntity.ok(java.util.Map.of("message", "Đã bỏ chặn thành viên thành công."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/reports/{reportId}/status")
    public ResponseEntity<?> updateCommunityReportStatus(
            @PathVariable Long id,
            @PathVariable Long reportId,
            @RequestParam String status,
            @RequestParam(required = false) String action,
            @RequestHeader("Authorization") String authHeader) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                return ResponseEntity.status(403).body("Chỉ quản trị viên mới có quyền xử lý báo cáo.");
            }

            com.pbl5.model.Report report = reportRepository.findById(reportId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy báo cáo."));

            if (report.getPost() == null || report.getPost().getCommunity() == null || !report.getPost().getCommunity().getId().equals(id)) {
                return ResponseEntity.badRequest().body("Báo cáo không thuộc cộng đồng này.");
            }

            com.pbl5.enums.ReportStatus reportStatus;
            try {
                reportStatus = com.pbl5.enums.ReportStatus.valueOf(status.toUpperCase());
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("Trạng thái không hợp lệ. Chỉ chấp nhận: RESOLVED, DISMISSED");
            }

            report.setStatus(reportStatus);
            report.setResolvedAt(LocalDateTime.now());
            report.setResolvedBy(user);
            report.setAdminNote(reportStatus == com.pbl5.enums.ReportStatus.RESOLVED ? "Đã xử lý vi phạm bởi Admin nhóm." : "Bỏ qua báo cáo bởi Admin nhóm.");
            reportRepository.save(report);

            if (reportStatus == com.pbl5.enums.ReportStatus.RESOLVED) {
                Post post = report.getPost();
                post.setStatus(com.pbl5.enums.PostStatus.REJECTED); // Ẩn khỏi feed
                post.setProcessingModerator(user);
                post.setReviewedAt(LocalDateTime.now());
                postRepository.save(post);

                String authorName = post.getUser() != null ? post.getUser().getFullName() : "Ẩn danh";
                String logAction = "DELETE".equalsIgnoreCase(action) 
                    ? "Đã gỡ bài viết của " + authorName + " với lý do: \"" + report.getReason() + "\""
                    : "Đã ẩn bài viết của " + authorName;
                communityService.logActivity(community, user, logAction);

                User author = post.getUser();
                if (author != null) {
                    if ("DELETE".equalsIgnoreCase(action)) {
                        communityService.sendNotification(author, user, "POST_REJECTED",
                                "Bài viết của bạn trong cộng đồng " + community.getName() + " đã bị quản trị viên nhóm gỡ bỏ do vi phạm quy tắc nhóm.",
                                "/html/post.html?id=" + post.getId());
                    } else {
                        communityService.sendNotification(author, user, "POST_HIDDEN",
                                "Bài viết của bạn trong cộng đồng " + community.getName() + " đã bị quản trị viên nhóm ẩn đi.",
                                "/html/post.html?id=" + post.getId());
                    }
                }

                if (report.getUser() != null) {
                    communityService.sendNotification(report.getUser(), user, "REPORT_RESOLVED",
                            "Báo cáo bài viết của bạn trong cộng đồng " + community.getName() + " đã được quản trị viên xử lý. Bài viết vi phạm đã được gỡ bỏ.",
                            "/html/home.html");
                }
            } else if (reportStatus == com.pbl5.enums.ReportStatus.DISMISSED) {
                if (report.getUser() != null) {
                    communityService.sendNotification(report.getUser(), user, "REPORT_DISMISSED",
                            "Báo cáo bài viết của bạn trong cộng đồng " + community.getName() + " đã được xem xét. Nội dung không vi phạm quy tắc nhóm.",
                            "/html/home.html");
                }
            }

            return ResponseEntity.ok(java.util.Map.of("message", "Đã cập nhật trạng thái báo cáo ID " + reportId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCommunity(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestParam(value = "keepPosts", defaultValue = "false") boolean keepPosts) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElse(null);

            boolean isOwner = currentMember != null && currentMember.getRole() == com.pbl5.enums.CommunityRole.OWNER;
            boolean isSysAdminOrMod = user.getRole() == com.pbl5.enums.Role.ADMIN || user.getRole() == com.pbl5.enums.Role.MODERATOR;

            if (!isOwner && !isSysAdminOrMod) {
                return ResponseEntity.status(403).body("Chỉ chủ sở hữu nhóm hoặc quản trị viên hệ thống mới có quyền giải tán nhóm.");
            }

            communityService.deleteCommunityAndNotifyMembers(community, user, keepPosts);
            return ResponseEntity.ok(java.util.Map.of("message", "Đã giải tán cộng đồng thành công."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/pending-posts")
    public ResponseEntity<?> getPendingPosts(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                return ResponseEntity.status(403).body("Chỉ quản trị viên hoặc chủ sở hữu mới có quyền xem bài viết chờ duyệt.");
            }

            List<Post> pendingPosts = postRepository.findByCommunityIdAndStatusOrderByCreatedAtDesc(id, com.pbl5.enums.PostStatus.PENDING_COMM_ADMIN);
            List<com.pbl5.dto.PostResponse> responses = postService.convertToResponses(pendingPosts, user);
            return ResponseEntity.ok(responses);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/posts/{postId}/approve")
    @Transactional
    public ResponseEntity<?> approvePost(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @PathVariable Long postId) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                return ResponseEntity.status(403).body("Chỉ quản trị viên hoặc chủ sở hữu mới có quyền phê duyệt bài viết.");
            }

            Post post = postRepository.findById(postId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài viết."));

            if (post.getCommunity() == null || !post.getCommunity().getId().equals(id)) {
                return ResponseEntity.badRequest().body("Bài viết không thuộc cộng đồng này.");
            }

            if (post.getStatus() != com.pbl5.enums.PostStatus.PENDING_COMM_ADMIN) {
                return ResponseEntity.badRequest().body("Bài viết không ở trạng thái chờ phê duyệt của cộng đồng.");
            }

            post.setStatus(com.pbl5.enums.PostStatus.PENDING_REVIEW);
            Post savedPost = postRepository.save(post);

            try {
                contentModerationService.moderatePostAsync(
                        savedPost.getId(),
                        savedPost.getContent(),
                        savedPost.getImageUrl(),
                        savedPost.getVideoUrl());
            } catch (Exception e) {
                System.err.println("Không thể khởi chạy kiểm duyệt nền bài viết sau phê duyệt " + savedPost.getId() + ": " + e.getMessage());
            }

            return ResponseEntity.ok("Đã duyệt bài viết. AI đang tiến hành kiểm tra mức độ an toàn...");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/posts/{postId}/reject")
    @Transactional
    public ResponseEntity<?> rejectPost(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @PathVariable Long postId) {

        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                return ResponseEntity.status(403).body("Chỉ quản trị viên hoặc chủ sở hữu mới có quyền từ chối bài viết.");
            }

            Post post = postRepository.findById(postId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài viết."));

            if (post.getCommunity() == null || !post.getCommunity().getId().equals(id)) {
                return ResponseEntity.badRequest().body("Bài viết không thuộc cộng đồng này.");
            }

            if (post.getStatus() != com.pbl5.enums.PostStatus.PENDING_COMM_ADMIN) {
                return ResponseEntity.badRequest().body("Bài viết không ở trạng thái chờ phê duyệt của cộng đồng.");
            }

            post.setStatus(com.pbl5.enums.PostStatus.REJECTED);
            post.setReviewedAt(java.time.LocalDateTime.now());
            postRepository.save(post);

            if (post.getUser() != null) {
                communityService.sendNotification(
                        post.getUser(),
                        user,
                        "POST_REJECTED",
                        "Bài viết của bạn trong cộng đồng \"" + community.getName() + "\" đã bị quản trị viên từ chối.",
                        "/html/community.html?id=" + community.getId()
                );
            }

            return ResponseEntity.ok("Đã từ chối bài viết thành công.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/rules")
    public ResponseEntity<?> getCommunityRules(@PathVariable Long id) {
        try {
            List<CommunityRule> rules = communityRuleRepository.findByCommunityIdOrderByRuleOrderAsc(id);
            return ResponseEntity.ok(rules);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/rules")
    @Transactional
    public ResponseEntity<?> updateCommunityRules(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody List<CommunityRule> rules) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                return ResponseEntity.status(403).body("Chỉ quản trị viên hoặc chủ sở hữu mới có quyền chỉnh sửa quy tắc.");
            }

            if (rules.size() > 10) {
                return ResponseEntity.badRequest().body("Cộng đồng có tối đa 10 quy tắc.");
            }

            communityRuleRepository.deleteByCommunityId(id);
            int order = 1;
            for (CommunityRule rule : rules) {
                rule.setCommunity(community);
                rule.setRuleOrder(order++);
                communityRuleRepository.save(rule);
            }

            communityService.logActivity(community, user, "Đã cập nhật quy tắc cộng đồng (" + rules.size() + " quy tắc)");

            return ResponseEntity.ok("Đã cập nhật quy tắc cộng đồng thành công.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/pinned-posts")
    public ResponseEntity<?> getPinnedPosts(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {
        User user = null;
        if (authHeader != null) {
            user = getAuthenticatedUser(authHeader);
        }
        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            if (community.getIsPrivate()) {
                if (user == null) {
                    return ResponseEntity.status(401).body("Đăng nhập để xem nội dung.");
                }
                boolean isMember = communityMemberRepository.existsByCommunityIdAndUserIdAndStatus(id, user.getId(), com.pbl5.enums.CommunityMemberStatus.ACTIVE);
                boolean isSysAdminOrMod = user.getRole() == com.pbl5.enums.Role.ADMIN || user.getRole() == com.pbl5.enums.Role.MODERATOR;
                if (!isMember && !isSysAdminOrMod) {
                    return ResponseEntity.status(403).body("Bạn cần là thành viên để xem bài viết ghim.");
                }
            }

            List<Post> posts = postRepository.findByCommunityIdAndStatusAndPinnedOrderByCreatedAtDesc(id, com.pbl5.enums.PostStatus.ACTIVE, true);
            List<com.pbl5.dto.PostResponse> responses = postService.convertToResponses(posts, user);
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/posts/{postId}/pin")
    @Transactional
    public ResponseEntity<?> pinPost(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @PathVariable Long postId) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                return ResponseEntity.status(403).body("Chỉ quản trị viên mới có quyền ghim bài viết.");
            }

            Post post = postRepository.findById(postId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài viết."));

            if (post.getCommunity() == null || !post.getCommunity().getId().equals(id)) {
                return ResponseEntity.badRequest().body("Bài viết không thuộc cộng đồng này.");
            }

            List<Post> pinnedPosts = postRepository.findByCommunityIdAndStatusAndPinnedOrderByCreatedAtDesc(id, com.pbl5.enums.PostStatus.ACTIVE, true);
            if (pinnedPosts.size() >= 3) {
                return ResponseEntity.badRequest().body("Đã đạt giới hạn tối đa 3 bài viết được ghim.");
            }

            post.setPinned(true);
            postRepository.save(post);

            communityService.logActivity(community, user, "Đã ghim bài viết #" + post.getId());

            if (post.getUser() != null) {
                communityService.sendNotification(
                        post.getUser(),
                        user,
                        "POST_PINNED",
                        "Bài viết của bạn trong cộng đồng \"" + community.getName() + "\" đã được ghim lên đầu nhóm.",
                        "/html/community.html?id=" + id
                );
            }

            return ResponseEntity.ok("Đã ghim bài viết thành công.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/posts/{postId}/unpin")
    @Transactional
    public ResponseEntity<?> unpinPost(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @PathVariable Long postId) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                return ResponseEntity.status(403).body("Chỉ quản trị viên mới có quyền bỏ ghim bài viết.");
            }

            Post post = postRepository.findById(postId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài viết."));

            if (post.getCommunity() == null || !post.getCommunity().getId().equals(id)) {
                return ResponseEntity.badRequest().body("Bài viết không thuộc cộng đồng này.");
            }

            post.setPinned(false);
            postRepository.save(post);

            communityService.logActivity(community, user, "Đã bỏ ghim bài viết #" + post.getId());

            return ResponseEntity.ok("Đã bỏ ghim bài viết thành công.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<?> getCommunityLogs(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                return ResponseEntity.status(403).body("Chỉ quản trị viên hoặc chủ sở hữu mới có quyền xem nhật ký hoạt động.");
            }

            org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
            org.springframework.data.domain.Page<CommunityActivityLog> logsPage = communityActivityLogRepository.findByCommunityIdOrderByCreatedAtDesc(id, pageable);

            List<java.util.Map<String, Object>> content = logsPage.getContent().stream().map(l -> {
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("id", l.getId());
                map.put("action", l.getAction());
                map.put("createdAt", l.getCreatedAt());
                map.put("adminName", l.getUser() != null ? l.getUser().getFullName() : "Ẩn danh");
                return map;
            }).collect(Collectors.toList());

            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("content", content);
            response.put("currentPage", logsPage.getNumber());
            response.put("totalItems", logsPage.getTotalElements());
            response.put("totalPages", logsPage.getTotalPages());

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ================= NEW ENDPOINTS =================

    // 1. Tag endpoints
    @GetMapping("/{id}/tags")
    public ResponseEntity<?> getCommunityTags(@PathVariable Long id) {
        try {
            List<com.pbl5.model.CommunityTag> tags = communityTagRepository.findByCommunityId(id);
            List<String> tagNames = tags.stream().map(com.pbl5.model.CommunityTag::getName).collect(Collectors.toList());
            return ResponseEntity.ok(tagNames);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/tags")
    @Transactional
    public ResponseEntity<?> updateCommunityTags(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody List<String> tagNames) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                return ResponseEntity.status(403).body("Chỉ quản trị viên mới có quyền cập nhật tag.");
            }

            if (tagNames.size() > 15) {
                return ResponseEntity.badRequest().body("Cộng đồng có tối đa 15 tag.");
            }

            communityTagRepository.deleteByCommunityId(id);
            for (String name : tagNames) {
                if (name != null && !name.trim().isEmpty()) {
                    com.pbl5.model.CommunityTag tag = new com.pbl5.model.CommunityTag();
                    tag.setCommunity(community);
                    tag.setName(name.trim());
                    communityTagRepository.save(tag);
                }
            }

            communityService.logActivity(community, user, "Đã cập nhật danh sách tag nhóm (" + tagNames.size() + " tag)");

            return ResponseEntity.ok("Cập nhật danh sách tag thành công.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 2. Invite Friend endpoints
    @PostMapping("/{id}/invite/{friendId}")
    @Transactional
    public ResponseEntity<?> inviteFriend(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @PathVariable Long friendId) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember senderMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn phải là thành viên để thực hiện mời bạn bè."));

            if (senderMember.getStatus() != com.pbl5.enums.CommunityMemberStatus.ACTIVE) {
                return ResponseEntity.status(403).body("Tài khoản của bạn chưa được kích hoạt trong cộng đồng này.");
            }

            User friend = userRepository.findById(friendId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bạn bè được mời."));

            // Check if friend is already member
            Optional<CommunityMember> targetMemberOpt = communityMemberRepository.findByCommunityIdAndUserId(id, friendId);
            if (targetMemberOpt.isPresent()) {
                com.pbl5.enums.CommunityMemberStatus status = targetMemberOpt.get().getStatus();
                if (status == com.pbl5.enums.CommunityMemberStatus.ACTIVE) {
                    return ResponseEntity.badRequest().body("Người dùng này đã là thành viên nhóm.");
                } else if (status == com.pbl5.enums.CommunityMemberStatus.PENDING) {
                    return ResponseEntity.badRequest().body("Người dùng này đang chờ phê duyệt tham gia nhóm.");
                } else {
                    return ResponseEntity.badRequest().body("Người dùng này đang bị chặn khỏi nhóm.");
                }
            }

            // Check if there is an active pending invite
            boolean existsPending = communityInvitationRepository.existsByCommunityIdAndReceiverIdAndStatus(id, friendId, com.pbl5.enums.CommunityInvitationStatus.PENDING);
            if (existsPending) {
                return ResponseEntity.badRequest().body("Lời mời đã được gửi trước đó và đang chờ xử lý.");
            }

            com.pbl5.model.CommunityInvitation invite = new com.pbl5.model.CommunityInvitation();
            invite.setCommunity(community);
            invite.setSender(user);
            invite.setReceiver(friend);
            invite.setStatus(com.pbl5.enums.CommunityInvitationStatus.PENDING);
            communityInvitationRepository.save(invite);

            // Send notification and WS
            communityService.sendNotification(
                    friend,
                    user,
                    "COMMUNITY_INVITE",
                    user.getFullName() + " đã mời bạn tham gia cộng đồng \"" + community.getName() + "\".",
                    "/html/community.html?id=" + id
            );

            return ResponseEntity.ok("Đã gửi lời mời thành công.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/invitations")
    public ResponseEntity<?> getMyInvitations(@RequestHeader("Authorization") String authHeader) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            List<com.pbl5.model.CommunityInvitation> invites = communityInvitationRepository.findByReceiverIdAndStatusOrderByCreatedAtDesc(user.getId(), com.pbl5.enums.CommunityInvitationStatus.PENDING);
            List<java.util.Map<String, Object>> responses = invites.stream().map(i -> {
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("id", i.getId());
                map.put("communityId", i.getCommunity().getId());
                map.put("communityName", i.getCommunity().getName());
                map.put("communityAvatar", i.getCommunity().getAvatarUrl());
                map.put("senderId", i.getSender().getId());
                map.put("senderName", i.getSender().getFullName());
                map.put("createdAt", i.getCreatedAt());
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/invitations/{inviteId}/accept")
    @Transactional
    public ResponseEntity<?> acceptInvitation(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long inviteId) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            com.pbl5.model.CommunityInvitation invite = communityInvitationRepository.findById(inviteId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lời mời."));

            if (!invite.getReceiver().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body("Không có quyền thực hiện.");
            }

            if (invite.getStatus() != com.pbl5.enums.CommunityInvitationStatus.PENDING) {
                return ResponseEntity.badRequest().body("Lời mời không ở trạng thái chờ xử lý.");
            }

            Community community = invite.getCommunity();

            // Check if member already exists
            Optional<CommunityMember> existingMemberOpt = communityMemberRepository.findByCommunityIdAndUserId(community.getId(), user.getId());
            CommunityMember member;
            if (existingMemberOpt.isPresent()) {
                member = existingMemberOpt.get();
                if (member.getStatus() == com.pbl5.enums.CommunityMemberStatus.ACTIVE) {
                    invite.setStatus(com.pbl5.enums.CommunityInvitationStatus.ACCEPTED);
                    communityInvitationRepository.save(invite);
                    return ResponseEntity.ok(java.util.Map.of("message", "Bạn đã là thành viên của cộng đồng này.", "status", "ACTIVE"));
                } else if (member.getStatus() == com.pbl5.enums.CommunityMemberStatus.BLOCKED) {
                    return ResponseEntity.badRequest().body("Bạn đang bị chặn khỏi cộng đồng này.");
                }
            } else {
                member = new CommunityMember();
                member.setCommunity(community);
                member.setUser(user);
                member.setRole(com.pbl5.enums.CommunityRole.MEMBER);
            }

            if (community.getRequireApproval() != null && community.getRequireApproval()) {
                member.setStatus(com.pbl5.enums.CommunityMemberStatus.PENDING);
            } else {
                member.setStatus(com.pbl5.enums.CommunityMemberStatus.ACTIVE);
            }
            communityMemberRepository.save(member);

            invite.setStatus(com.pbl5.enums.CommunityInvitationStatus.ACCEPTED);
            communityInvitationRepository.save(invite);

            if (member.getStatus() == com.pbl5.enums.CommunityMemberStatus.ACTIVE) {
                communityService.logActivity(community, user, user.getFullName() + " đã tham gia cộng đồng qua lời mời của " + invite.getSender().getFullName());
                // Notify the sender
                communityService.sendNotification(
                        invite.getSender(),
                        user,
                        "COMMUNITY_INVITE_ACCEPT",
                        user.getFullName() + " đã chấp nhận lời mời tham gia cộng đồng \"" + community.getName() + "\" của bạn.",
                        "/html/community.html?id=" + community.getId()
                );
                return ResponseEntity.ok(java.util.Map.of("message", "Tham gia cộng đồng thành công.", "status", "ACTIVE"));
            } else {
                if (community.getCreator() != null) {
                    communityService.sendNotification(
                            community.getCreator(),
                            user,
                            "COMMUNITY_REQUEST",
                            user.getFullName() + " đã gửi yêu cầu tham gia cộng đồng " + community.getName() + " (chấp nhận lời mời).",
                            "/html/community.html?id=" + community.getId() + "&tab=manage"
                    );
                }
                return ResponseEntity.ok(java.util.Map.of("message", "Đã gửi yêu cầu tham gia nhóm chờ phê duyệt.", "status", "PENDING"));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/invitations/{inviteId}/decline")
    @Transactional
    public ResponseEntity<?> declineInvitation(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long inviteId) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            com.pbl5.model.CommunityInvitation invite = communityInvitationRepository.findById(inviteId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lời mời."));

            if (!invite.getReceiver().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body("Không có quyền thực hiện.");
            }

            if (invite.getStatus() != com.pbl5.enums.CommunityInvitationStatus.PENDING) {
                return ResponseEntity.badRequest().body("Lời mời không ở trạng thái chờ xử lý.");
            }

            invite.setStatus(com.pbl5.enums.CommunityInvitationStatus.REJECTED);
            communityInvitationRepository.save(invite);

            return ResponseEntity.ok("Đã từ chối lời mời.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 3. Export Logs endpoint
    @GetMapping("/{id}/logs/export")
    public void exportCommunityLogs(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestParam(value = "format", defaultValue = "csv") String format,
            jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            response.sendError(401, "Chưa đăng nhập.");
            return;
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                response.sendError(403, "Chỉ quản trị viên mới có quyền xuất nhật ký.");
                return;
            }

            List<CommunityActivityLog> logs = communityActivityLogRepository.findByCommunityIdOrderByCreatedAtDesc(id);

            if ("csv".equalsIgnoreCase(format)) {
                response.setContentType("text/csv; charset=UTF-8");
                response.setHeader("Content-Disposition", "attachment; filename=\"nhat-ky-" + id + ".csv\"");
                
                // Write UTF-8 BOM
                response.getOutputStream().write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});
                java.io.PrintWriter writer = new java.io.PrintWriter(new java.io.OutputStreamWriter(response.getOutputStream(), java.nio.charset.StandardCharsets.UTF_8));
                
                writer.println("ID,Thời gian,Quản trị viên,Hành động");
                for (CommunityActivityLog log : logs) {
                    writer.println(log.getId() + "," +
                            log.getCreatedAt() + "," +
                            "\"" + (log.getUser() != null ? log.getUser().getFullName().replace("\"", "\"\"") : "Ẩn danh") + "\"," +
                            "\"" + log.getAction().replace("\"", "\"\"") + "\"");
                }
                writer.flush();
                writer.close();
            } else {
                response.setContentType("application/json; charset=UTF-8");
                response.setHeader("Content-Disposition", "attachment; filename=\"nhat-ky-" + id + ".json\"");
                
                List<java.util.Map<String, Object>> responses = logs.stream().map(l -> {
                    java.util.Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", l.getId());
                    map.put("createdAt", l.getCreatedAt().toString());
                    map.put("adminName", l.getUser() != null ? l.getUser().getFullName() : "Ẩn danh");
                    map.put("action", l.getAction());
                    return map;
                }).collect(Collectors.toList());
                
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                mapper.writeValue(response.getOutputStream(), responses);
            }
        } catch (IllegalArgumentException e) {
            response.sendError(400, e.getMessage());
        }
    }

    // 4. Analytics endpoint
    @GetMapping("/{id}/analytics")
    public ResponseEntity<?> getCommunityAnalytics(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập.");
        }

        try {
            Community community = communityService.getCommunityById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

            CommunityMember currentMember = communityMemberRepository.findByCommunityIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

            if (currentMember.getRole() != com.pbl5.enums.CommunityRole.OWNER && currentMember.getRole() != com.pbl5.enums.CommunityRole.ADMIN) {
                return ResponseEntity.status(403).body("Chỉ quản trị viên mới có quyền xem thống kê.");
            }

            java.time.LocalDateTime sevenDaysAgo = java.time.LocalDateTime.now().minusDays(7);

            long newMembersCount = communityMemberRepository.countByCommunityIdAndStatusAndJoinedAtAfter(id, com.pbl5.enums.CommunityMemberStatus.ACTIVE, sevenDaysAgo);
            long newPostsCount = postRepository.findByCommunityIdAndStatusAndCreatedAtAfterOrderByCreatedAtAsc(id, com.pbl5.enums.PostStatus.ACTIVE, sevenDaysAgo).size();
            long newReportsCount = reportRepository.countByCommunityIdAndCreatedAtAfter(id, sevenDaysAgo);

            List<CommunityMember> newMembersList = communityMemberRepository.findByCommunityIdAndStatusAndJoinedAtAfterOrderByJoinedAtAsc(id, com.pbl5.enums.CommunityMemberStatus.ACTIVE, sevenDaysAgo);
            List<Post> newPostsList = postRepository.findByCommunityIdAndStatusAndCreatedAtAfterOrderByCreatedAtAsc(id, com.pbl5.enums.PostStatus.ACTIVE, sevenDaysAgo);

            java.util.Map<String, Integer> membersByDay = new java.util.LinkedHashMap<>();
            java.util.Map<String, Integer> postsByDay = new java.util.LinkedHashMap<>();

            java.time.format.DateTimeFormatter dateFormatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM");
            for (int i = 6; i >= 0; i--) {
                String dayStr = java.time.LocalDate.now().minusDays(i).format(dateFormatter);
                membersByDay.put(dayStr, 0);
                postsByDay.put(dayStr, 0);
            }

            for (CommunityMember cm : newMembersList) {
                String dayStr = cm.getJoinedAt().format(dateFormatter);
                if (membersByDay.containsKey(dayStr)) {
                    membersByDay.put(dayStr, membersByDay.get(dayStr) + 1);
                }
            }

            for (Post p : newPostsList) {
                String dayStr = p.getCreatedAt().format(dateFormatter);
                if (postsByDay.containsKey(dayStr)) {
                    postsByDay.put(dayStr, postsByDay.get(dayStr) + 1);
                }
            }

            java.util.Map<String, Object> result = new java.util.HashMap<>();
            result.put("newMembersCount", newMembersCount);
            result.put("newPostsCount", newPostsCount);
            result.put("newReportsCount", newReportsCount);
            result.put("membersDaily", membersByDay);
            result.put("postsDaily", postsByDay);

            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
