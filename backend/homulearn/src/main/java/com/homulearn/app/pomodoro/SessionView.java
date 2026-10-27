package com.homulearn.app.pomodoro;

import java.time.OffsetDateTime;

public record SessionView(Long id, Integer durationMinutes, OffsetDateTime completedAt, OffsetDateTime startedAt) {
    public static SessionView from(com.homulearn.app.entity.PomodoroSession s) {
        return new SessionView(s.getId(), s.getDurationMinutes(), s.getCompletedAt().atOffset(java.time.ZoneOffset.UTC), s.getStartedAt() == null ? null : s.getStartedAt().atOffset(java.time.ZoneOffset.UTC));
    }
}
