package com.pbl5.repository;

import com.pbl5.model.CommunityMember;
import com.pbl5.model.Community;
import com.pbl5.model.User;
import com.pbl5.enums.CommunityMemberStatus;
import com.pbl5.enums.CommunityRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommunityMemberRepository extends JpaRepository<CommunityMember, Long> {

    Optional<CommunityMember> findByCommunityAndUser(Community community, User user);

    Optional<CommunityMember> findByCommunityIdAndUserId(Long communityId, Long userId);

    boolean existsByCommunityAndUser(Community community, User user);

    boolean existsByCommunityIdAndUserIdAndStatus(Long communityId, Long userId, CommunityMemberStatus status);

    List<CommunityMember> findByCommunityIdAndStatus(Long communityId, CommunityMemberStatus status);

    List<CommunityMember> findByUserIdAndStatus(Long userId, CommunityMemberStatus status);

    List<CommunityMember> findByUserId(Long userId);

    List<CommunityMember> findByCommunityId(Long communityId);

    long countByCommunityIdAndStatusAndJoinedAtAfter(Long communityId, CommunityMemberStatus status, java.time.LocalDateTime date);
    List<CommunityMember> findByCommunityIdAndStatusAndJoinedAtAfterOrderByJoinedAtAsc(Long communityId, CommunityMemberStatus status, java.time.LocalDateTime date);

    @org.springframework.transaction.annotation.Transactional
    void deleteByCommunityId(Long communityId);
}
