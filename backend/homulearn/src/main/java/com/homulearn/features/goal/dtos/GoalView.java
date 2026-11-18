package com.homulearn.features.goal.dtos;

import com.homulearn.features.goal.entities.Goal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public record GoalView(Long id, String title, Integer currentProgress, Integer targetValue,
        String unit, OffsetDateTime deadline, String status, java.time.LocalDateTime createdAt) {
    public static GoalView from(Goal g) {
        return new GoalView(g.getId(), g.getTitle(), g.getCurrentProgress(), g.getTargetValue(),
                g.getUnit(), g.getDeadline() == null ? null : g.getDeadline().atOffset(ZoneOffset.UTC),
                g.getStatus(), g.getCreatedAt());
    }
}
