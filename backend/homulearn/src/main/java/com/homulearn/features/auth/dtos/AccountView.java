package com.homulearn.features.auth.dtos;

import com.homulearn.features.auth.entities.User;
import java.util.UUID;

public record AccountView(
        UUID id,
        String email,
        String fullName,
        String role,
        String major,
        String cohort,
        String bio,
        String avatarColor
) {
    public static AccountView from(User user) {
        return new AccountView(
                user.getPublicId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getMajor(),
                user.getCohort(),
                user.getBio(),
                user.getAvatarColor()
        );
    }
}
