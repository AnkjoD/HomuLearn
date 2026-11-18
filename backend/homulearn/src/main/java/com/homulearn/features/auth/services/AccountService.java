package com.homulearn.features.auth.services;

import com.homulearn.features.auth.entities.User;
import com.homulearn.features.auth.repositories.UserRepository;
import com.homulearn.features.auth.dtos.AccountView;
import com.homulearn.features.auth.dtos.ChangePasswordRequest;
import com.homulearn.features.auth.dtos.ProfileUpdateRequest;
import com.homulearn.features.auth.dtos.RegisterRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountService {
    private final UserRepository users;
    private final PasswordEncoder passwords;

    public AccountService(UserRepository users, PasswordEncoder passwords) {
        this.users = users;
        this.passwords = passwords;
    }

    @Transactional
    public AccountView register(RegisterRequest request) {
        User user = new User();
        user.setEmail(request.email());
        user.setFullName(request.fullName());
        user.setPasswordHash(passwords.encode(request.password()));
        return AccountView.from(users.saveAndFlush(user));
    }

    @Transactional(readOnly = true)
    public AccountView current(String email) {
        return AccountView.from(resolveActiveUser(email));
    }

    @Transactional
    public AccountView updateProfile(String email, ProfileUpdateRequest request) {
        User user = resolveActiveUser(email);
        user.setFullName(request.fullName().strip());
        user.setMajor(normalizeOptional(request.major()));
        user.setCohort(normalizeOptional(request.cohort()));
        user.setBio(normalizeOptional(request.bio()));
        user.setAvatarColor(normalizeOptional(request.avatarColor()));
        return AccountView.from(users.save(user));
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = resolveActiveUser(email);
        if (!passwords.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng");
        }
        user.setPasswordHash(passwords.encode(request.newPassword()));
        users.save(user);
    }

    private User resolveActiveUser(String email) {
        User user = users.findByEmail(email).orElseThrow(() -> new BadCredentialsException("Account unavailable"));
        if (!"ACTIVE".equals(user.getStatus())) throw new BadCredentialsException("Account unavailable");
        return user;
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) return null;
        return value.strip();
    }
}
