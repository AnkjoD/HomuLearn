package com.homulearn.app.auth;

import com.homulearn.app.entity.User;
import java.util.UUID;

public record AccountView(UUID id, String email, String fullName, String role) {
    public static AccountView from(User user) {
        return new AccountView(user.getPublicId(), user.getEmail(), user.getFullName(), user.getRole());
    }
}
