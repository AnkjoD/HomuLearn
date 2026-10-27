package com.homulearn.app.auth;

import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
    private final AccountService accounts;

    public AuthController(AccountService accounts) { this.accounts = accounts; }

    @GetMapping("/health")
    Map<String, String> health() { return Map.of("status", "ok"); }

    @GetMapping("/auth/csrf")
    Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    AccountView register(@Valid @RequestBody RegisterRequest request) {
        return accounts.register(request);
    }

    @GetMapping("/auth/me")
    AccountView me(Authentication authentication) { return accounts.current(authentication.getName()); }
}
