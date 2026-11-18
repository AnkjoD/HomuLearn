package com.homulearn.features.pomodoro.entities;

import com.homulearn.features.auth.entities.User;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "pomodoro_sessions")
@Data
public class PomodoroSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private Integer durationMinutes;
    private LocalDateTime completedAt = LocalDateTime.now();
    private String idempotencyKey;
    private LocalDateTime startedAt;
}
