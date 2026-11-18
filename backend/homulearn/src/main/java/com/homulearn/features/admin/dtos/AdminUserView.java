package com.homulearn.features.admin.dtos;

import com.homulearn.features.auth.entities.User;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

public record AdminUserView(
    UUID id,
    String email,
    String fullName,
    String role,
    String status,
    String major,
    String cohort,
    OffsetDateTime createdAt
) {
    public static AdminUserView from(User u) {
        return new AdminUserView(
            u.getPublicId(),
            u.getEmail(),
            u.getFullName(),
            u.getRole(),
            u.getStatus(),
            u.getMajor(),
            u.getCohort(),
            u.getCreatedAt() == null ? null : u.getCreatedAt().atOffset(ZoneOffset.UTC)
        );
    }
}
