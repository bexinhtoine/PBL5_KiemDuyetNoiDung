package com.pbl5.repository;

import com.pbl5.model.CommunityActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CommunityActivityLogRepository extends JpaRepository<CommunityActivityLog, Long> {
    List<CommunityActivityLog> findByCommunityIdOrderByCreatedAtDesc(Long communityId);

    @org.springframework.transaction.annotation.Transactional
    void deleteByCommunityId(Long communityId);
}
