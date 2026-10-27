package com.homulearn.app.auth;

import com.homulearn.app.entity.User;
import com.homulearn.app.repository.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        User user = users.findByEmail(email).orElseThrow(() -> new BadCredentialsException("Account unavailable"));
        if (!"ACTIVE".equals(user.getStatus())) {
            throw new BadCredentialsException("Account unavailable");
        }
        return AccountView.from(user);
    }
}
