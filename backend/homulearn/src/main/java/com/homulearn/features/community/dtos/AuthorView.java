package com.homulearn.features.community.dtos;

import com.homulearn.features.auth.entities.User;
import java.util.UUID;

public record AuthorView(UUID id, String name) {
    public static AuthorView from(User user) {
        if (user == null) return null;
        return new AuthorView(user.getPublicId(), user.getFullName());
    }
}
