package com.homulearn.app.dashboard;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DashboardControllerTest {

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
        mvc.perform(get("/api/v1/dashboard/stats"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void user_stats_aggregated_accurately() throws Exception {
        var s = loginSession("dash1@test.com", "StrongPass1234");

        // tạo 1 goal in-progress (progress=2, target=5)
        mvc.perform(post("/api/v1/goals").with(csrf()).session(s)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Goal 1","targetValue":5,"unit":"hours"}
                    """))
                .andExpect(status().isCreated());

        // tạo 1 pomodoro session hoàn thành
        mvc.perform(post("/api/v1/pomodoro-sessions").with(csrf()).session(s)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"durationMinutes":25,"completed":true}
                    """))
                .andExpect(status().isCreated());

        // stats
        mvc.perform(get("/api/v1/dashboard/stats").session(s))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.goalInProgress").value(1))
                .andExpect(jsonPath("$.goalDone").value(0))
                .andExpect(jsonPath("$.sessionCount").value(1))
                .andExpect(jsonPath("$.totalMinutes").value(25));
    }

    @Test
    void stats_isolated_between_users() throws Exception {
        var s1 = loginSession("user1_dash@test.com", "StrongPass1234");
        var s2 = loginSession("user2_dash@test.com", "StrongPass1234");

        mvc.perform(post("/api/v1/goals").with(csrf()).session(s1)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"User 1 Goal","targetValue":10,"unit":"hours"}
                    """))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/dashboard/stats").session(s2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.goalInProgress").value(0))
                .andExpect(jsonPath("$.goalDone").value(0))
                .andExpect(jsonPath("$.sessionCount").value(0))
                .andExpect(jsonPath("$.totalMinutes").value(0));
    }

    @Test
    void counts_all_notes_not_only_the_first_page_and_tracks_completed_goals() throws Exception {
        var s = loginSession("dash-total@test.com", "StrongPass1234");
        for (int i=0;i<52;i++) mvc.perform(post("/api/v1/notes").session(s).with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Note "+i+"\"}")).andExpect(status().isCreated());
        mvc.perform(post("/api/v1/goals").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Done\",\"targetValue\":1,\"currentProgress\":1}")).andExpect(status().isCreated());
        mvc.perform(get("/api/v1/dashboard/stats").session(s)).andExpect(status().isOk())
            .andExpect(jsonPath("$.noteCount").value(52)).andExpect(jsonPath("$.goalDone").value(1))
            .andExpect(jsonPath("$.goalInProgress").value(0));
    }

}
