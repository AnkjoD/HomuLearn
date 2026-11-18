package com.homulearn.app.pomodoro;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PomodoroControllerTest {

    @Autowired MockMvc mvc;

    private org.springframework.mock.web.MockHttpSession loginSession(String email, String password) throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"%s","password":"%s","fullName":"Test"}
                    """.formatted(email, password)))
                .andExpect(status().isCreated());

        var result = mvc.perform(post("/api/v1/auth/login").with(csrf())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("email", email)
                .param("password", password))
                .andExpect(status().isOk())
                .andReturn();
        return (org.springframework.mock.web.MockHttpSession) result.getRequest().getSession(false);
    }

    @Test
    void unauthenticated_returns_401() throws Exception {
        mvc.perform(get("/api/v1/pomodoro-sessions"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_and_list_sessions() throws Exception {
        var s = loginSession("pomo1@test.com", "StrongPass1234");

        mvc.perform(post("/api/v1/pomodoro-sessions").with(csrf()).session(s)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"durationMinutes":25,"completed":true}
                    """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.durationMinutes").value(25))
                .andExpect(jsonPath("$.completedAt").isNotEmpty());

        mvc.perform(get("/api/v1/pomodoro-sessions").session(s))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMinutes").value(25))
                .andExpect(jsonPath("$.sessions.length()").value(1));
    }

    @Test
    void idempotency_key_prevents_duplicate_save() throws Exception {
        var s = loginSession("pomo2@test.com", "StrongPass1234");
        String idemKey = UUID.randomUUID().toString();

        var res1 = mvc.perform(post("/api/v1/pomodoro-sessions").with(csrf()).session(s)
                .header("Idempotency-Key", idemKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"durationMinutes":25,"completed":true}
                    """))
                .andExpect(status().isCreated())
                .andReturn();

        var res2 = mvc.perform(post("/api/v1/pomodoro-sessions").with(csrf()).session(s)
                .header("Idempotency-Key", idemKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"durationMinutes":25,"completed":true}
                    """))
                .andExpect(status().isOk())
                .andReturn();

        mvc.perform(get("/api/v1/pomodoro-sessions").session(s))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions.length()").value(1))
                .andExpect(jsonPath("$.totalMinutes").value(25));
    }

    @Test
    void validation_duration_positive() throws Exception {
        var s = loginSession("pomo3@test.com", "StrongPass1234");

        mvc.perform(post("/api/v1/pomodoro-sessions").with(csrf()).session(s)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"durationMinutes":0,"completed":true}
                    """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void private_sessions_never_leak_through_a_shared_idempotency_key() throws Exception {
        var alice = loginSession("pomo-private-a@test.com", "StrongPass1234");
        var bob = loginSession("pomo-private-b@test.com", "StrongPass1234");
        String key = UUID.randomUUID().toString();
        mvc.perform(post("/api/v1/pomodoro-sessions").session(alice).with(csrf()).header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON).content("{\"durationMinutes\":25}" )).andExpect(status().isCreated());
        mvc.perform(post("/api/v1/pomodoro-sessions").session(bob).with(csrf()).header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON).content("{\"durationMinutes\":25}" )).andExpect(status().isConflict());
        mvc.perform(get("/api/v1/pomodoro-sessions").session(bob)).andExpect(status().isOk())
            .andExpect(jsonPath("$.sessions.length()").value(0)).andExpect(jsonPath("$.totalMinutes").value(0));
        mvc.perform(post("/api/v1/pomodoro-sessions").session(alice).with(csrf()).header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON).content("{\"durationMinutes\":10}" )).andExpect(status().isConflict());
    }

    @Test
    void missing_duration_bounds_and_missing_csrf_rejected() throws Exception {
        var s = loginSession("pomo-invalid@test.com", "StrongPass1234");
        for (String body : new String[]{"{}", "{\"durationMinutes\":181}"}) {
            mvc.perform(post("/api/v1/pomodoro-sessions").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        }
        mvc.perform(post("/api/v1/pomodoro-sessions").session(s).contentType(MediaType.APPLICATION_JSON).content("{\"durationMinutes\":25}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void timestamps_normalized_to_utc_and_invalid_order_rejected() throws Exception {
        var s = loginSession("pomo-time@test.com", "StrongPass1234");
        mvc.perform(post("/api/v1/pomodoro-sessions").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("""
            {"durationMinutes":25,"startedAt":"2026-10-27T10:00:00+07:00","completedAt":"2026-10-27T10:25:00+07:00"}
            """)).andExpect(status().isCreated()).andExpect(jsonPath("$.startedAt").value("2026-10-27T03:00:00Z"));
        mvc.perform(post("/api/v1/pomodoro-sessions").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("""
            {"durationMinutes":25,"startedAt":"2026-10-27T11:00:00Z","completedAt":"2026-10-27T10:25:00Z"}
            """)).andExpect(status().isBadRequest());
    }

}
