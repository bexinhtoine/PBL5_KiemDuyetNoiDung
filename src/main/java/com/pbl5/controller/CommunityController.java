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
                return ResponseEntity.status(403).body("Chỉ quản trị viên hoặc chủ sở hữu mới có quyền xem nhật ký hoạt động.");
            }

            List<CommunityActivityLog> logs = communityActivityLogRepository.findByCommunityIdOrderByCreatedAtDesc(id);
            List<java.util.Map<String, Object>> responses = logs.stream().map(l -> {
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("id", l.getId());
                map.put("action", l.getAction());
                map.put("createdAt", l.getCreatedAt());
                map.put("adminName", l.getUser() != null ? l.getUser().getFullName() : "Ẩn danh");
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(responses);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
