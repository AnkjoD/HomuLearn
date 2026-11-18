package com.homulearn.features.goal.dtos;

import java.time.OffsetDateTime;

public record GoalUpdateRequest(
        @jakarta.validation.constraints.Size(max=255) String title,
        Integer currentProgress,
        @jakarta.validation.constraints.Positive Integer targetValue,
        @jakarta.validation.constraints.Size(max=100) String unit,
        Boolean clearDeadline,
        OffsetDateTime deadline
) {}
