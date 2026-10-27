package com.homulearn.app.goal;

import java.time.OffsetDateTime;

// tất cả nullable — PATCH chỉ cập nhật field không null
public record GoalUpdateRequest(
        @jakarta.validation.constraints.Size(max=255) String title,
        Integer currentProgress,
        @jakarta.validation.constraints.Positive Integer targetValue,
        @jakarta.validation.constraints.Size(max=100) String unit,
        Boolean clearDeadline,
        OffsetDateTime deadline
) {}
