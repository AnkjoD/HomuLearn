package com.homulearn.app.repository;

import com.homulearn.app.entity.PomodoroSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PomodoroSessionRepository extends JpaRepository<PomodoroSession, Long> {
    List<PomodoroSession> findByUserId(Long userId);
}
