package com.homulearn.features.group.repositories;

import com.homulearn.features.group.entities.GroupMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GroupMessageRepository extends JpaRepository<GroupMessage, Long> {
    List<GroupMessage> findByGroupIdOrderByIdDesc(Long groupId, Pageable pageable);
    List<GroupMessage> findByGroupIdAndIdLessThanOrderByIdDesc(Long groupId, Long beforeId, Pageable pageable);
    List<GroupMessage> findByGroupIdAndContentContainingIgnoreCaseOrderByIdDesc(Long groupId, String q, Pageable pageable);
    Optional<GroupMessage> findByGroupIdAndUserIdAndClientMessageId(Long groupId, Long userId, String clientMessageId);
    Optional<GroupMessage> findTop1ByGroupIdOrderByCreatedAtDescIdDesc(Long groupId);
    void deleteAllByGroupId(Long groupId);
}
