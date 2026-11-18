package com.homulearn.app.community;

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
class CommunityEngagementControllerTest {

    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;

    private String registerUser(String email) throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"StrongPass1234\",\"fullName\":\"Sinh viên\"}"))
                .andExpect(status().isCreated());
        return email;
    }

    private long createPost(String email, String title, String content) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/posts").with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"" + title + "\",\"content\":\"" + content + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return json.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }

    @Test
    void toggleReaction_bookmark_andReport_happyPath_andDuplicateReport409() throws Exception {
        String author = registerUser("engage_author@test.com");
        String viewer = registerUser("engage_viewer@test.com");
        long postId = createPost(author, "Bài viết test", "Nội dung chi tiết");

        // Toggle reaction ON
        mvc.perform(post("/api/v1/posts/" + postId + "/reaction").with(csrf()).with(user(viewer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.postId").value(postId))
                .andExpect(jsonPath("$.reactionCount").value(1))
                .andExpect(jsonPath("$.reactedByMe").value(true));

        // Toggle bookmark ON
        mvc.perform(post("/api/v1/posts/" + postId + "/bookmark").with(csrf()).with(user(viewer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.postId").value(postId))
                .andExpect(jsonPath("$.bookmarkedByMe").value(true));

        // Get post reflects reactedByMe & bookmarkedByMe
        mvc.perform(get("/api/v1/posts/" + postId).with(user(viewer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reactionCount").value(1))
                .andExpect(jsonPath("$.reactedByMe").value(true))
                .andExpect(jsonPath("$.bookmarkedByMe").value(true));

        // Toggle reaction OFF
        mvc.perform(post("/api/v1/posts/" + postId + "/reaction").with(csrf()).with(user(viewer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reactionCount").value(0))
                .andExpect(jsonPath("$.reactedByMe").value(false));

        // Report post -> 201 PENDING
        mvc.perform(post("/api/v1/posts/" + postId + "/report").with(csrf()).with(user(viewer))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Spam quảng cáo\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));

        // Duplicate report by same user -> 409 CONFLICT
        mvc.perform(post("/api/v1/posts/" + postId + "/report").with(csrf()).with(user(viewer))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Báo cáo lại\"}"))
                .andExpect(status().isConflict());
    }
}
