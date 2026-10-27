package com.homulearn.app.pomodoro;

import jakarta.validation.constraints.Positive;
import java.time.OffsetDateTime;

public record SessionRequest(
        @jakarta.validation.constraints.NotNull @Positive @jakarta.validation.constraints.Max(180) Integer durationMinutes,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt
) {}
