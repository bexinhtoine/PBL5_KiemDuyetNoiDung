package com.pbl5.repository;

import com.pbl5.model.CommunityTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CommunityTagRepository extends JpaRepository<CommunityTag, Long> {
    List<CommunityTag> findByCommunityId(Long communityId);
    List<CommunityTag> findByCommunityIdAndNameIn(Long communityId, List<String> names);
    Optional<CommunityTag> findByCommunityIdAndName(Long communityId, String name);
    boolean existsByCommunityIdAndName(Long communityId, String name);
    void deleteByCommunityId(Long communityId);
}
