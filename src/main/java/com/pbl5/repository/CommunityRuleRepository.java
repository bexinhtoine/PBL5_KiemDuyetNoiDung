package com.pbl5.repository;

import com.pbl5.model.CommunityRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CommunityRuleRepository extends JpaRepository<CommunityRule, Long> {
    List<CommunityRule> findByCommunityIdOrderByRuleOrderAsc(Long communityId);
    
    @org.springframework.transaction.annotation.Transactional
    void deleteByCommunityId(Long communityId);
}
