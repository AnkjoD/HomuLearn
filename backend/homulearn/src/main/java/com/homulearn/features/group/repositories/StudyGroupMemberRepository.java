package com.homulearn.features.group.repositories;

import com.homulearn.features.group.entities.StudyGroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StudyGroupMemberRepository extends JpaRepository<StudyGroupMember, Long> {
    Optional<StudyGroupMember> findByGroupIdAndUserId(Long groupId, Long userId);
    boolean existsByGroupIdAndUserId(Long groupId, Long userId);
    long countByGroupId(Long groupId);
    List<StudyGroupMember> findByGroupIdOrderByJoinedAtAsc(Long groupId);
    void deleteAllByGroupId(Long groupId);
}
