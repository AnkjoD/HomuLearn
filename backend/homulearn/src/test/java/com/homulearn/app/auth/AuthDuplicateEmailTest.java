package com.homulearn.app.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.homulearn.features.auth.repositories.UserRepository;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Regression test — 409 khi đăng ký email trùng.
 *
 * Hai request commit độc lập trên PostgreSQL test thật. Email random và cleanup
 * giữ test lặp lại được; đồng thời xác nhận chuẩn hóa email không phân biệt hoa/thường.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")

// KHÔNG @Transactional — cần commit thật để trigger unique constraint
class AuthDuplicateEmailTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;

    @Test
    void register_duplicateEmail_409() throws Exception {
        String email = "duplicate-" + UUID.randomUUID() + "@test.com";
        String body = """
            {"email":"%s","password":"StrongPass1234","fullName":"Dup"}
            """.formatted(email);

        try {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body.replace(email, email.toUpperCase(java.util.Locale.ROOT))))
            .andExpect(status().isCreated());

        // Lần 2: cùng email → 409 CONFLICT
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("ACCOUNT_CONFLICT"));
        } finally {
            users.findByEmail(email).ifPresent(users::delete);
        }
    }
}
