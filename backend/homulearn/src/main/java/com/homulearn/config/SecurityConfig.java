package com.homulearn.config;

import tools.jackson.databind.json.JsonMapper;
import com.homulearn.common.ApiError;
import com.homulearn.features.auth.repositories.UserRepository;
import com.homulearn.features.auth.services.AccountService;
import com.homulearn.features.auth.dtos.AccountView;
import java.io.IOException;
import java.util.Locale;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    @Bean
    UserDetailsService userDetailsService(UserRepository users) {
        return email -> users.findByEmail(email.strip().toLowerCase(Locale.ROOT))
            .map(user -> org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
                .password(user.getPasswordHash()).roles(user.getRole())
                .disabled(!"ACTIVE".equals(user.getStatus())).build())
            .orElseThrow(() -> new UsernameNotFoundException("Account unavailable"));
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http, JsonMapper json, AccountService accounts) throws Exception {
        http.authorizeHttpRequests(access -> access
            .requestMatchers("/api/v1/health", "/api/v1/auth/csrf", "/api/v1/auth/register", "/api/v1/auth/login").permitAll()
            .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated())
            .requestCache(cache -> cache.disable())
            .formLogin(login -> login.loginProcessingUrl("/api/v1/auth/login")
                .usernameParameter("email")
                .successHandler((request, response, authentication) -> {
                    AccountView view = accounts.current(authentication.getName());
                    response.setStatus(200);
                    response.setContentType("application/json;charset=UTF-8");
                    json.writeValue(response.getWriter(), view);
                })
                .failureHandler((request, response, exception) ->
                    writeError(json, response, 401, "INVALID_CREDENTIALS", "Email hoac mat khau khong dung")))
            .logout(logout -> logout.logoutUrl("/api/v1/auth/logout")
                .deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, exception) ->
                    writeError(json, response, 401, "UNAUTHENTICATED", "Vui long dang nhap"))
                .accessDeniedHandler((request, response, exception) ->
                    writeError(json, response, 403, "FORBIDDEN", "Yeu cau bi tu choi")));
        return http.build();
    }

    private void writeError(JsonMapper json, HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        json.writeValue(response.getWriter(), ApiError.of(code, message));
    }
}
