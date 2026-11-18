package com.homulearn.app.goal;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class GoalControllerTest {

    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;

    // helper: đăng ký + lấy session cookie
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

    // --- unauthenticated ---

    @Test
    void getAll_unauthenticated_401() throws Exception {
        mvc.perform(get("/api/v1/goals"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void post_unauthenticated_401() throws Exception {
        mvc.perform(post("/api/v1/goals").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Mục tiêu 1","targetValue":10}
                    """))
                .andExpect(status().isUnauthorized());
    }

    // --- CRUD ---

    @Test
    void create_valid_201() throws Exception {
        var session = loginSession("goal1@test.com", "StrongPass1234");

        mvc.perform(post("/api/v1/goals").with(csrf()).session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "title": "Học 5 bài Giải tích",
                      "description": "Chương đạo hàm",
                      "targetValue": 5,
                      "unit": "bài",
                      "deadline": "2026-12-31T23:59:59Z"
                    }
                    """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.title").value("Học 5 bài Giải tích"))
                .andExpect(jsonPath("$.currentProgress").value(0))
                .andExpect(jsonPath("$.targetValue").value(5))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    void create_blankTitle_400() throws Exception {
        var session = loginSession("goal2@test.com", "StrongPass1234");

        mvc.perform(post("/api/v1/goals").with(csrf()).session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"   ","targetValue":10}
                    """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_zeroTarget_400() throws Exception {
        var session = loginSession("goal3@test.com", "StrongPass1234");

        mvc.perform(post("/api/v1/goals").with(csrf()).session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Mục tiêu","targetValue":0}
                    """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void patch_progress_updatesStatusToDone() throws Exception {
        var session = loginSession("goal4@test.com", "StrongPass1234");

        String createBody = mvc.perform(post("/api/v1/goals").with(csrf()).session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Chạy bộ","targetValue":5}
                    """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        long id = json.readTree(createBody).get("id").asLong();

        mvc.perform(patch("/api/v1/goals/" + id).with(csrf()).session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"currentProgress":5}
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DONE"))
                .andExpect(jsonPath("$.currentProgress").value(5));
    }

    @Test
    void patch_progressExceedsTarget_400() throws Exception {
        var session = loginSession("goal5@test.com", "StrongPass1234");

        String createBody = mvc.perform(post("/api/v1/goals").with(csrf()).session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Test","targetValue":3}
                    """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        long id = json.readTree(createBody).get("id").asLong();

        mvc.perform(patch("/api/v1/goals/" + id).with(csrf()).session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"currentProgress":10}
                    """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void delete_ownGoal_204() throws Exception {
        var session = loginSession("goal6@test.com", "StrongPass1234");

        String body = mvc.perform(post("/api/v1/goals").with(csrf()).session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Xóa tôi","targetValue":1}
                    """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        long id = json.readTree(body).get("id").asLong();

        mvc.perform(delete("/api/v1/goals/" + id).with(csrf()).session(session))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/goals").session(session))
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void ownership_other_user_gets_404() throws Exception {
        var alice = loginSession("goalA@test.com", "StrongPass1234");
        var bob   = loginSession("goalB@test.com", "StrongPass1234");

        String body = mvc.perform(post("/api/v1/goals").with(csrf()).session(alice)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Alice goal","targetValue":1}
                    """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        long id = json.readTree(body).get("id").asLong();

        // Bob cố PATCH goal của Alice → 404, không phải 403
        mvc.perform(patch("/api/v1/goals/" + id).with(csrf()).session(bob)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"currentProgress":1}
                    """))
                .andExpect(status().isNotFound());

        // Bob cố DELETE goal của Alice → 404
        mvc.perform(delete("/api/v1/goals/" + id).with(csrf()).session(bob))
                .andExpect(status().isNotFound());
    }

    @Test
    void required_target_and_oversized_title_are_validation_errors() throws Exception {
        var s = loginSession("goal-validation@test.com", "StrongPass1234");
        for (String body : new String[]{"{\"title\":\"x\"}", json.writeValueAsString(java.util.Map.of("title", "x".repeat(256), "targetValue", 1))}) {
            mvc.perform(post("/api/v1/goals").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }
    }

    @Test
    void edit_all_form_fields_normalizes_deadline_and_rejects_invalid_progress() throws Exception {
        var s = loginSession("goal-edit@test.com", "StrongPass1234");
        String body = mvc.perform(post("/api/v1/goals").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("""
            {"title":"Study","targetValue":5,"currentProgress":2,"unit":"bài","deadline":"2026-12-31T00:00:00+07:00"}
            """)).andExpect(status().isCreated()).andExpect(jsonPath("$.currentProgress").value(2))
            .andExpect(jsonPath("$.deadline").value("2026-12-30T17:00:00Z")).andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();
        mvc.perform(patch("/api/v1/goals/"+id).session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("""
            {"title":"Changed","targetValue":3,"currentProgress":3,"unit":"giờ","clearDeadline":true}
            """)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DONE"))
            .andExpect(jsonPath("$.unit").value("giờ")).andExpect(jsonPath("$.deadline").doesNotExist());
        mvc.perform(patch("/api/v1/goals/"+id).session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"targetValue\":2}")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/goals").session(s)).andExpect(jsonPath("$[0].targetValue").value(3));
    }

}
