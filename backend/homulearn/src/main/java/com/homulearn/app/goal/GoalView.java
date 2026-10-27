package com.homulearn.app.goal;

import java.time.OffsetDateTime;

public record GoalView(
        Long id,
        String title,
        Integer currentProgress,
        Integer targetValue,
        String unit,
        OffsetDateTime deadline,
        String status,
        java.time.LocalDateTime createdAt
) {
    public static GoalView from(com.homulearn.app.entity.Goal g) {
        return new GoalView(
                g.getId(), g.getTitle(), g.getCurrentProgress(),
                g.getTargetValue(), g.getUnit(), g.getDeadline() == null ? null : g.getDeadline().atOffset(java.time.ZoneOffset.UTC),
                g.getStatus(), g.getCreatedAt()
        );
    }
}
