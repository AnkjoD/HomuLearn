package com.homulearn.app.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")

@Transactional
class AuthControllerTest {

    @Autowired MockMvc mvc;

    // --- register ---

    @Test
    void register_created() throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"alice@test.com","password":"StrongPass1234","fullName":"Alice"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.email").value("alice@test.com"))
            .andExpect(jsonPath("$.role").value("STUDENT"))
            .andExpect(jsonPath("$.id").isNotEmpty());
    }

    @Test
    void register_blankEmail_400() throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"","password":"StrongPass1234","fullName":"Alice"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.fieldErrors.email").isNotEmpty());
    }

    @Test
    void register_shortPassword_400() throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"bob@test.com","password":"short","fullName":"Bob"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors.password").isNotEmpty());
    }

    @Test
    void register_duplicateEmail_409() throws Exception {
        String body = """
            {"email":"dup@test.com","password":"StrongPass1234","fullName":"Dup"}
            """;
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("ACCOUNT_CONFLICT"));
    }

    // --- login ---

    @Test
    void login_success_returns_accountView() throws Exception {
        // đăng ký trước
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"login@test.com","password":"StrongPass1234","fullName":"Login User"}
                    """))
            .andExpect(status().isCreated());

        var result = mvc.perform(post("/api/v1/auth/login").with(csrf())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("email", "login@test.com")
                .param("password", "StrongPass1234"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("login@test.com"))
            .andExpect(jsonPath("$.role").value("STUDENT"))
            .andReturn();
        assertNotNull(result.getRequest().getSession(false));
    }

    @Test
    void login_wrongPassword_401() throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"fail@test.com","password":"StrongPass1234","fullName":"Fail User"}
                    """))
            .andExpect(status().isCreated());

        mvc.perform(post("/api/v1/auth/login").with(csrf())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("email", "fail@test.com")
                .param("password", "WrongPassword"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void login_unknownEmail_401() throws Exception {
        mvc.perform(post("/api/v1/auth/login").with(csrf())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("email", "nobody@test.com")
                .param("password", "StrongPass1234"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    // --- me ---

    @Test
    void me_unauthenticated_401() throws Exception {
        mvc.perform(get("/api/v1/auth/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void me_authenticated_200() throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"me@test.com","password":"StrongPass1234","fullName":"Me User"}
                    """))
            .andExpect(status().isCreated());

        // lấy session cookie từ login
        var loginResult = mvc.perform(post("/api/v1/auth/login").with(csrf())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("email", "me@test.com")
                .param("password", "StrongPass1234"))
            .andExpect(status().isOk())
            .andReturn();

        var session = loginResult.getRequest().getSession(false);

        mvc.perform(get("/api/v1/auth/me").session((org.springframework.mock.web.MockHttpSession) session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("me@test.com"));
    }

    // --- logout ---

    @Test
    void logout_204() throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"logout@test.com","password":"StrongPass1234","fullName":"Logout User"}
                    """))
            .andExpect(status().isCreated());

        var loginResult = mvc.perform(post("/api/v1/auth/login").with(csrf())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("email", "logout@test.com")
                .param("password", "StrongPass1234"))
            .andExpect(status().isOk())
            .andReturn();

        var session = loginResult.getRequest().getSession(false);

        mvc.perform(post("/api/v1/auth/logout").with(csrf())
                .session((org.springframework.mock.web.MockHttpSession) session))
            .andExpect(status().isNoContent());
    }
}
