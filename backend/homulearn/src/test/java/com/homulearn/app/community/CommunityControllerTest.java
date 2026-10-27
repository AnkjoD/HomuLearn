package com.homulearn.app.community;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CommunityControllerTest {

    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;

    private MockHttpSession registerAndLogin(String email, String password, String name) throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"%s","password":"%s","fullName":"%s"}
                    """.formatted(email, password, name)))
                .andExpect(status().isCreated());

        var result = mvc.perform(post("/api/v1/auth/login").with(csrf())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("email", email)
                .param("password", password))
                .andExpect(status().isOk())
                .andReturn();

        return (MockHttpSession) result.getRequest().getSession(false);
    }

    @Test
    void unauthenticatedRequestsRequireAuth() throws Exception {
        mvc.perform(post("/api/v1/posts").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Chưa login","content":"Nội dung"}
                    """))
                .andExpect(status().isUnauthorized());

        mvc.perform(post("/api/v1/posts/1/comments").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"content":"Bình luận"}
                    """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void postCrudAndOwnership() throws Exception {
        MockHttpSession user1 = registerAndLogin("comm_user1@test.com", "Password123!", "Alice");
        MockHttpSession user2 = registerAndLogin("comm_user2@test.com", "Password123!", "Bob");

        // Alice creates post
        String createRes = mvc.perform(post("/api/v1/posts").session(user1).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Bài viết của Alice","content":"Nội dung thảo luận"}
                    """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Bài viết của Alice"))
                .andExpect(jsonPath("$.author.name").value("Alice"))
                .andExpect(jsonPath("$.author.id").isString())
                .andExpect(jsonPath("$.author.email").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        JsonNode postJson = json.readTree(createRes);
        long postId = postJson.get("id").asLong();

        // Bob cannot edit Alice's post -> 403
        mvc.perform(put("/api/v1/posts/" + postId).session(user2).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Bob sửa lén","content":"Hack"}
                    """))
                .andExpect(status().isForbidden());

        // Alice edits her post -> 200
        mvc.perform(put("/api/v1/posts/" + postId).session(user1).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Bài viết đã sửa","content":"Nội dung mới"}
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Bài viết đã sửa"));

        // Bob cannot delete Alice's post -> 403
        mvc.perform(delete("/api/v1/posts/" + postId).session(user2).with(csrf()))
                .andExpect(status().isForbidden());

        // Alice deletes her post -> 204
        mvc.perform(delete("/api/v1/posts/" + postId).session(user1).with(csrf()))
                .andExpect(status().isNoContent());

        // Post not found after delete -> 404
        mvc.perform(get("/api/v1/posts/" + postId).session(user1))
                .andExpect(status().isNotFound());
    }

    @Test
    void commentCrudAndCascadeDelete() throws Exception {
        MockHttpSession author = registerAndLogin("comm_author@test.com", "Password123!", "Author");
        MockHttpSession commenter = registerAndLogin("comm_peer@test.com", "Password123!", "Peer");

        // Create post
        String postRes = mvc.perform(post("/api/v1/posts").session(author).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Thảo luận thuật toán","content":"Ai giải thích giúp DFS"}
                    """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long postId = json.readTree(postRes).get("id").asLong();

        // Peer comments on post
        String commentRes = mvc.perform(post("/api/v1/posts/" + postId + "/comments").session(commenter).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"content":"DFS dùng Stack hoặc đệ quy nhé"}
                    """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.author.name").value("Peer"))
                .andReturn().getResponse().getContentAsString();
        long commentId = json.readTree(commentRes).get("id").asLong();

        // Check comment in list
        mvc.perform(get("/api/v1/posts/" + postId + "/comments").session(author))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].content").value("DFS dùng Stack hoặc đệ quy nhé"));

        // Author cannot edit peer's comment -> 403
        mvc.perform(put("/api/v1/posts/" + postId + "/comments/" + commentId).session(author).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"content":"Sửa bậy"}
                    """))
                .andExpect(status().isForbidden());

        // Peer edits their comment
        mvc.perform(put("/api/v1/posts/" + postId + "/comments/" + commentId).session(commenter).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"content":"DFS dùng Stack hoặc đệ quy (chú ý visited array)"}
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("DFS dùng Stack hoặc đệ quy (chú ý visited array)"));

        // Delete post -> cascade deletes comment
        mvc.perform(delete("/api/v1/posts/" + postId).session(author).with(csrf()))
                .andExpect(status().isNoContent());

        // Listing comments for deleted post returns 404
        mvc.perform(get("/api/v1/posts/" + postId + "/comments").session(author))
                .andExpect(status().isNotFound());
    }

    @Test
    void validationRejectsEmptyInputs() throws Exception {
        MockHttpSession user = registerAndLogin("comm_val@test.com", "Password123!", "ValUser");

        // Empty title/content in post
        mvc.perform(post("/api/v1/posts").session(user).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"","content":""}
                    """))
                .andExpect(status().isBadRequest());

        // Empty comment
        mvc.perform(post("/api/v1/posts/9999/comments").session(user).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"content":""}
                    """))
                .andExpect(status().isBadRequest());
    }

    @Autowired com.homulearn.app.repository.CommentRepository comments;

    @Test
    void deleting_post_removes_managed_comments_and_keeps_unrelated_post() throws Exception {
        var owner = registerAndLogin("comm_cascade_regression@test.com", "Password123!", "Owner");
        long first = createPost(owner, "First");
        long second = createPost(owner, "Second");
        for (long id : new long[]{first,second}) mvc.perform(post("/api/v1/posts/"+id+"/comments").session(owner).with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Keep association managed\"}")).andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/posts/"+first).session(owner).with(csrf())).andExpect(status().isNoContent());
        comments.flush();
        org.junit.jupiter.api.Assertions.assertEquals(0, comments.countByPostId(first));
        org.junit.jupiter.api.Assertions.assertEquals(1, comments.countByPostId(second));
    }

    private long createPost(MockHttpSession session, String title) throws Exception {
        var body = mvc.perform(post("/api/v1/posts").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(java.util.Map.of("title",title,"content","Body"))))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    @Test
    void bounded_pagination_and_public_author_contract() throws Exception {
        var owner = registerAndLogin("comm_pagination@test.com", "Password123!", "Owner");
        createPost(owner,"A");createPost(owner,"B");createPost(owner,"C");
        String pageBody = mvc.perform(get("/api/v1/posts?page=0&size=2").session(owner)).andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(2)).andExpect(jsonPath("$.totalElements").value(org.hamcrest.Matchers.greaterThanOrEqualTo(3)))
            .andExpect(jsonPath("$.content[0].author.email").doesNotExist())
            .andReturn().getResponse().getContentAsString();
        var content = json.readTree(pageBody).get("content");
        var firstTime = java.time.OffsetDateTime.parse(content.get(0).get("createdAt").asText());
        var secondTime = java.time.OffsetDateTime.parse(content.get(1).get("createdAt").asText());
        org.junit.jupiter.api.Assertions.assertFalse(firstTime.isBefore(secondTime));
        if (firstTime.equals(secondTime)) org.junit.jupiter.api.Assertions.assertTrue(content.get(0).get("id").asLong() > content.get(1).get("id").asLong());
        String nextBody = mvc.perform(get("/api/v1/posts?page=1&size=2").session(owner)).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        long nextId = json.readTree(nextBody).get("content").get(0).get("id").asLong();
        org.junit.jupiter.api.Assertions.assertNotEquals(content.get(0).get("id").asLong(), nextId);
        org.junit.jupiter.api.Assertions.assertNotEquals(content.get(1).get("id").asLong(), nextId);
        for (String query : new String[]{"page=-1", "size=0", "size=101", "page=2147483647&size=100"})
            mvc.perform(get("/api/v1/posts?"+query).session(owner)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/posts")).andExpect(status().isUnauthorized());
    }

    @Test
    void comment_delete_ownership_and_wrong_post_are_enforced() throws Exception {
        var owner = registerAndLogin("comm_comment_owner@test.com", "Password123!", "Owner");
        var other = registerAndLogin("comm_comment_other@test.com", "Password123!", "Other");
        long postId = createPost(owner,"Thread"), second = createPost(owner,"Other thread");
        var body = mvc.perform(post("/api/v1/posts/"+postId+"/comments").session(other).with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Mine\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();
        mvc.perform(delete("/api/v1/posts/"+postId+"/comments/"+id).session(owner).with(csrf())).andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/posts/"+second+"/comments/"+id).session(other).with(csrf())).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/v1/posts/"+postId+"/comments/"+id).session(other).with(csrf())).andExpect(status().isNoContent());
        org.junit.jupiter.api.Assertions.assertEquals(0, comments.countByPostId(postId));
    }
}
