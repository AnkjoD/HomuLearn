package com.homulearn.features.group.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import com.homulearn.features.group.entities.StudyGroup;
import java.util.List;

public interface StudyGroupRepository extends JpaRepository<StudyGroup, Long> {
    List<StudyGroup> findAllByOrderByCreatedAtDesc();
}
