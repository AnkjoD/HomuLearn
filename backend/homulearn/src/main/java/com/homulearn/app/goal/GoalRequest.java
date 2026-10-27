package com.homulearn.app.goal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.time.OffsetDateTime;

public record GoalRequest(
        @NotBlank @jakarta.validation.constraints.Size(max=255) String title,
        @jakarta.validation.constraints.NotNull @Positive Integer targetValue,
        @jakarta.validation.constraints.PositiveOrZero Integer currentProgress,
        @jakarta.validation.constraints.Size(max=100) String unit,
        OffsetDateTime deadline
) {}
