package com.homulearn.features.admin.dtos;

import java.time.OffsetDateTime;

public record AdminReportView(
    Long id,
    String targetType,
    Long targetId,
    String reason,
    String status,
    String reporterName,
    String targetPreview,
    OffsetDateTime createdAt
) {}
