package com.pbl5.repository;

import com.pbl5.model.CommunityInvitation;
import com.pbl5.enums.CommunityInvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CommunityInvitationRepository extends JpaRepository<CommunityInvitation, Long> {
    List<CommunityInvitation> findByReceiverIdAndStatusOrderByCreatedAtDesc(Long receiverId, CommunityInvitationStatus status);
    Optional<CommunityInvitation> findByCommunityIdAndReceiverIdAndStatus(Long communityId, Long receiverId, CommunityInvitationStatus status);
    boolean existsByCommunityIdAndReceiverIdAndStatus(Long communityId, Long receiverId, CommunityInvitationStatus status);
    
    @org.springframework.transaction.annotation.Transactional
    void deleteByCommunityId(Long communityId);
}
