package com.homulearn.app.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Kiểm tra session bị hủy sau logout và response không rò dữ liệu nhạy cảm.
 *
 * Rủi ro cần chứng minh:
 * 1. Session cookie cũ không dùng được sau POST /logout → 401, không 200.
 * 2. AccountView không chứa passwordHash, stackTrace, hay token.
 * 3. /me không có session → 401 JSON đúng envelope (không HTML Spring default).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthSessionInvalidationTest {

    @Autowired MockMvc mvc;

    // Helper: đăng ký + đăng nhập, trả về session
    private org.springframework.mock.web.MockHttpSession loginAs(String email) throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"%s","password":"StrongPass1234","fullName":"Test User"}
                    """.formatted(email)))
            .andExpect(status().isCreated());

        var result = mvc.perform(post("/api/v1/auth/login").with(csrf())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("email", email)
                .param("password", "StrongPass1234"))
            .andExpect(status().isOk())
            .andReturn();

        return (org.springframework.mock.web.MockHttpSession) result.getRequest().getSession(false);
    }

    /**
     * Sau POST /logout, session cũ không được dùng để gọi /me.
     * Nếu server không invalidate session, test này sẽ thất bại với 200 thay vì 401.
     */
    @Test
    void me_returns_401_after_logout() throws Exception {
        var session = loginAs("invalidate@test.com");

        // Xác nhận session đang hợp lệ
        mvc.perform(get("/api/v1/auth/me").session(session))
            .andExpect(status().isOk());

        // Logout
        mvc.perform(post("/api/v1/auth/logout").with(csrf()).session(session))
            .andExpect(status().isNoContent());

        // Session cũ phải bị từ chối — đây là điểm chứng minh session invalidation
        mvc.perform(get("/api/v1/auth/me").session(session))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    /**
     * AccountView từ /me không được chứa passwordHash hay bất kỳ trường nhạy cảm nào.
     * Regression: nếu entity User được serialize trực tiếp, passwordHash sẽ lộ ra.
     */
    @Test
    void me_response_does_not_leak_sensitive_fields() throws Exception {
        var session = loginAs("noleak@test.com");

        mvc.perform(get("/api/v1/auth/me").session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("noleak@test.com"))
            .andExpect(jsonPath("$.passwordHash").doesNotExist())
            .andExpect(jsonPath("$.password").doesNotExist())
            .andExpect(jsonPath("$.stackTrace").doesNotExist())
            .andExpect(jsonPath("$.traceId").doesNotExist()); // traceId chỉ xuất hiện trong error envelope
    }

    /**
     * /me không có session trả 401 JSON đúng envelope — không phải HTML redirect hay error page.
     * Quan trọng: Spring Security mặc định redirect 302 cho form login; SecurityConfig phải override.
     */
    @Test
    void me_unauthenticated_returns_json_401_not_redirect() throws Exception {
        mvc.perform(get("/api/v1/auth/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
            .andExpect(jsonPath("$.message").isNotEmpty());
    }

    /**
     * Login với email không tồn tại trả 401 — không phải 404 (tránh user enumeration).
     */
    @Test
    void login_unknown_email_does_not_reveal_existence() throws Exception {
        mvc.perform(post("/api/v1/auth/login").with(csrf())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("email", "ghost-" + System.nanoTime() + "@test.com")
                .param("password", "AnyPassword1234"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }
}
