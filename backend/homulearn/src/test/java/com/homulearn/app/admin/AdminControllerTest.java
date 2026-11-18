package com.homulearn.app.admin;

import com.homulearn.features.auth.entities.User;
import com.homulearn.features.auth.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdminControllerTest {

    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;
    @Autowired UserRepository users;

    private User registerUser(String email, String role) throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"StrongPass1234\",\"fullName\":\"User\"}"))
                .andExpect(status().isCreated());
        User u = users.findByEmail(email).orElseThrow();
        u.setRole(role);
        return users.saveAndFlush(u);
    }

    @Test
    void studentGets403_adminCanBanUnbanAndResolveReportAndAuditLogIsRecorded() throws Exception {
        User student = registerUser("student_adm@test.com", "STUDENT");
        User admin = registerUser("admin_adm@test.com", "ADMIN");

        // Student is forbidden on /api/v1/admin/**
        mvc.perform(get("/api/v1/admin/overview").with(user(student.getEmail()).roles("STUDENT")))
                .andExpect(status().isForbidden());

        // Student creates post & reports it (for test)
        MvcResult postRes = mvc.perform(post("/api/v1/posts").with(csrf()).with(user(student.getEmail()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Spam post\",\"content\":\"Buy now\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long postId = json.readTree(postRes.getResponse().getContentAsString()).get("id").asLong();

        MvcResult reportRes = mvc.perform(post("/api/v1/posts/" + postId + "/report").with(csrf()).with(user(admin.getEmail()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Spam\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long reportId = json.readTree(reportRes.getResponse().getContentAsString()).get("id").asLong();

        // Admin bans student
        mvc.perform(patch("/api/v1/admin/users/" + student.getPublicId() + "/status")
                .with(csrf()).with(user(admin.getEmail()).roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"BANNED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BANNED"));

        // Admin resolves report & deletes post
        mvc.perform(patch("/api/v1/admin/reports/" + reportId)
                .with(csrf()).with(user(admin.getEmail()).roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"RESOLVED\",\"deleteTarget\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));

        // Audit logs recorded
        mvc.perform(get("/api/v1/admin/audit-logs").with(user(admin.getEmail()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        // Admin can also list & delete any community post directly
        MvcResult extraPost = mvc.perform(post("/api/v1/posts").with(csrf()).with(user(student.getEmail()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Bài cần kiểm duyệt\",\"content\":\"Nội dung\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long extraPostId = json.readTree(extraPost.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(get("/api/v1/admin/posts").with(user(admin.getEmail()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mvc.perform(delete("/api/v1/admin/posts/" + extraPostId).with(csrf()).with(user(admin.getEmail()).roles("ADMIN")))
                .andExpect(status().isNoContent());
    }
}
