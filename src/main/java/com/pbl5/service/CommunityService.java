package com.pbl5.service;

import com.pbl5.enums.CommunityMemberStatus;
import com.pbl5.enums.CommunityRole;
import com.pbl5.model.Community;
import com.pbl5.model.CommunityMember;
import com.pbl5.model.Notification;
import com.pbl5.model.User;
import com.pbl5.repository.CommunityMemberRepository;
import com.pbl5.repository.CommunityRepository;
import com.pbl5.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CommunityService {

    @Autowired
    private CommunityRepository communityRepository;

    @Autowired
    private CommunityMemberRepository communityMemberRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private void sendNotification(User recipient, User sender, String type, String message, String link) {
        if (recipient == null || (sender != null && recipient.getId().equals(sender.getId()))) {
            return;
        }
        Notification notifEntity = new Notification();
        notifEntity.setUser(recipient);
        notifEntity.setSender(sender);
        notifEntity.setType(type);
        notifEntity.setMessage(message);
        notifEntity.setLink(link);
        notifEntity = notificationRepository.save(notifEntity);

        Map<String, Object> notification = new HashMap<>();
        notification.put("id", notifEntity.getId());
        notification.put("type", notifEntity.getType());
        notification.put("message", notifEntity.getMessage());
        notification.put("link", notifEntity.getLink());
        notification.put("isRead", notifEntity.isRead());
        notification.put("createdAt", notifEntity.getCreatedAt().toString());
        if (sender != null) {
            notification.put("senderId", sender.getId());
            notification.put("senderName", sender.getFullName());
            notification.put("senderAvatar", sender.getAvatar());
        }

        messagingTemplate.convertAndSend("/topic/notifications/" + recipient.getId(), notification);
    }

    @Transactional
    public Community createCommunity(User creator, String name, String description, 
                                     String avatarUrl, String coverUrl, 
                                     Boolean isPrivate, Boolean requireApproval) {
        if (communityRepository.existsByName(name)) {
            throw new IllegalArgumentException("Tên cộng đồng đã tồn tại.");
        }

        Community community = new Community();
        community.setName(name);
        community.setDescription(description);
        community.setAvatarUrl(avatarUrl);
        community.setCoverUrl(coverUrl);
        community.setIsPrivate(isPrivate != null ? isPrivate : false);
        community.setRequireApproval(requireApproval != null ? requireApproval : false);
        community.setCreator(creator);

        Community savedCommunity = communityRepository.save(community);

        // Add creator as OWNER
        CommunityMember member = new CommunityMember();
        member.setCommunity(savedCommunity);
        member.setUser(creator);
        member.setRole(CommunityRole.OWNER);
        member.setStatus(CommunityMemberStatus.ACTIVE);
        communityMemberRepository.save(member);

        return savedCommunity;
    }

    @Transactional
    public CommunityMember joinCommunity(User user, Long communityId) {
        Community community = communityRepository.findById(communityId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cộng đồng."));

        Optional<CommunityMember> existingMemberOpt = communityMemberRepository.findByCommunityAndUser(community, user);
        if (existingMemberOpt.isPresent()) {
            CommunityMember existingMember = existingMemberOpt.get();
            if (existingMember.getStatus() == CommunityMemberStatus.ACTIVE) {
                throw new IllegalStateException("Bạn đã là thành viên của cộng đồng này.");
            } else if (existingMember.getStatus() == CommunityMemberStatus.PENDING) {
                throw new IllegalStateException("Yêu cầu tham gia của bạn đang chờ phê duyệt.");
            } else {
                throw new IllegalStateException("Bạn đã bị chặn khỏi cộng đồng này.");
            }
        }

        CommunityMember member = new CommunityMember();
        member.setCommunity(community);
        member.setUser(user);
        member.setRole(CommunityRole.MEMBER);

        // If private and requires approval, set PENDING. Otherwise ACTIVE.
        if (community.getIsPrivate() && community.getRequireApproval()) {
            member.setStatus(CommunityMemberStatus.PENDING);
        } else {
            member.setStatus(CommunityMemberStatus.ACTIVE);
        }

        CommunityMember savedMember = communityMemberRepository.save(member);

        // Notifications
        if (savedMember.getStatus() == CommunityMemberStatus.PENDING) {
            if (community.getCreator() != null) {
                sendNotification(
                    community.getCreator(),
                    user,
                    "COMMUNITY_REQUEST",
                    user.getFullName() + " đã gửi yêu cầu tham gia cộng đồng " + community.getName() + ".",
                    "/html/community.html?id=" + community.getId() + "&tab=manage"
                );
            }
        } else {
            if (community.getCreator() != null) {
                sendNotification(
                    community.getCreator(),
                    user,
                    "COMMUNITY_JOIN",
                    user.getFullName() + " đã tham gia cộng đồng " + community.getName() + ".",
                    "/html/community.html?id=" + community.getId()
                );
            }
        }

        return savedMember;
    }

    @Transactional
    public void leaveCommunity(User user, Long communityId) {
        CommunityMember member = communityMemberRepository.findByCommunityIdAndUserId(communityId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên hoặc không có yêu cầu tham gia cộng đồng này."));

        if (member.getRole() == CommunityRole.OWNER) {
            throw new IllegalStateException("Chủ sở hữu không thể rời nhóm. Hãy chuyển quyền sở hữu hoặc xóa nhóm.");
        }

        communityMemberRepository.delete(member);
    }

    @Transactional
    public void approveMember(User adminUser, Long communityId, Long memberUserId) {
        CommunityMember adminMember = communityMemberRepository.findByCommunityIdAndUserId(communityId, adminUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

        if (adminMember.getRole() != CommunityRole.OWNER && adminMember.getRole() != CommunityRole.ADMIN) {
            throw new IllegalStateException("Chỉ quản trị viên nhóm mới có quyền phê duyệt thành viên.");
        }

        CommunityMember targetMember = communityMemberRepository.findByCommunityIdAndUserId(communityId, memberUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu tham gia của người dùng này."));

        if (targetMember.getStatus() != CommunityMemberStatus.PENDING) {
            throw new IllegalStateException("Thành viên này không ở trạng thái chờ duyệt.");
        }

        targetMember.setStatus(CommunityMemberStatus.ACTIVE);
        communityMemberRepository.save(targetMember);

        // Notification
        sendNotification(
            targetMember.getUser(),
            adminUser,
            "COMMUNITY_APPROVE",
            "Yêu cầu tham gia cộng đồng " + targetMember.getCommunity().getName() + " của bạn đã được phê duyệt.",
            "/html/community.html?id=" + communityId
        );
    }

    @Transactional
    public void kickMember(User adminUser, Long communityId, Long targetUserId) {
        CommunityMember adminMember = communityMemberRepository.findByCommunityIdAndUserId(communityId, adminUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Bạn không phải thành viên của cộng đồng này."));

        if (adminMember.getRole() != CommunityRole.OWNER && adminMember.getRole() != CommunityRole.ADMIN) {
            throw new IllegalStateException("Chỉ quản trị viên nhóm mới có quyền trục xuất thành viên.");
        }

        CommunityMember targetMember = communityMemberRepository.findByCommunityIdAndUserId(communityId, targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không phải thành viên nhóm."));

        // Admin cannot kick OWNER, and Admin cannot kick another Admin (unless they are OWNER)
        if (targetMember.getRole() == CommunityRole.OWNER) {
            throw new IllegalStateException("Không thể trục xuất chủ sở hữu nhóm.");
        }
        if (targetMember.getRole() == CommunityRole.ADMIN && adminMember.getRole() != CommunityRole.OWNER) {
            throw new IllegalStateException("Chỉ có chủ sở hữu nhóm mới có thể trục xuất phó nhóm.");
        }

        CommunityMemberStatus originalStatus = targetMember.getStatus();
        Community community = targetMember.getCommunity();
        User targetUser = targetMember.getUser();

        communityMemberRepository.delete(targetMember);

        // Notification
        if (originalStatus == CommunityMemberStatus.PENDING) {
            sendNotification(
                targetUser,
                adminUser,
                "COMMUNITY_REJECT",
                "Yêu cầu tham gia cộng đồng " + community.getName() + " của bạn đã bị từ chối.",
                "/html/communities.html"
            );
        } else {
            sendNotification(
                targetUser,
                adminUser,
                "COMMUNITY_KICK",
                "Bạn đã bị trục xuất khỏi cộng đồng " + community.getName() + ".",
                "/html/communities.html"
            );
        }
    }

    public List<Community> getCommunitiesForUser(Long userId) {
        List<CommunityMember> memberships = communityMemberRepository.findByUserIdAndStatus(userId, CommunityMemberStatus.ACTIVE);
        return memberships.stream().map(CommunityMember::getCommunity).collect(Collectors.toList());
    }

    public List<Community> searchCommunities(String query) {
        return communityRepository.searchCommunities(query);
    }

    public Optional<Community> getCommunityById(Long communityId) {
        return communityRepository.findById(communityId);
    }
}
