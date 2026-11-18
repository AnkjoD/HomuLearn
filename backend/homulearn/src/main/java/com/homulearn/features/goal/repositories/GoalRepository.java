package com.homulearn.features.goal.repositories;

import com.homulearn.features.goal.entities.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface GoalRepository extends JpaRepository<Goal, Long> {
    List<Goal> findByUserId(Long userId);
    Optional<Goal> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT COUNT(g) FROM Goal g WHERE g.user.id = :userId AND g.currentProgress >= g.targetValue")
    long countDoneByUserId(Long userId);

    @Query("SELECT COUNT(g) FROM Goal g WHERE g.user.id = :userId AND g.currentProgress < g.targetValue")
    long countInProgressByUserId(Long userId);

    long countByUserId(Long userId);
}
