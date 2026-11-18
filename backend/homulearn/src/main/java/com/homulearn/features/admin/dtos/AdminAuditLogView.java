package com.homulearn.features.admin.dtos;

import com.homulearn.features.admin.entities.AdminAuditLog;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public record AdminAuditLogView(
    Long id,
    String adminName,
    String action,
    String targetType,
    Long targetId,
    String detail,
    OffsetDateTime createdAt
) {
    public static AdminAuditLogView from(AdminAuditLog log) {
        return new AdminAuditLogView(
            log.getId(),
            log.getAdmin() != null ? log.getAdmin().getFullName() : "Admin",
            log.getAction(),
            log.getTargetType(),
            log.getTargetId(),
            log.getDetail(),
            log.getCreatedAt() == null ? null : log.getCreatedAt().atOffset(ZoneOffset.UTC)
        );
    }
}
