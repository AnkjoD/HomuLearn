package com.homulearn.app.repository;

import com.homulearn.app.entity.PomodoroSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface PomodoroSessionRepository extends JpaRepository<PomodoroSession, Long> {
    List<PomodoroSession> findByUserIdOrderByCompletedAtDesc(Long userId);

    Optional<PomodoroSession> findByIdempotencyKey(String idempotencyKey);

    @Query("SELECT COALESCE(SUM(p.durationMinutes), 0) FROM PomodoroSession p WHERE p.user.id = :userId")
    long sumDurationByUserId(Long userId);

    long countByUserId(Long userId);
}
