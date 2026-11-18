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

        // Alice views post -> 200
        mvc.perform(get("/api/v1/posts/" + postId).session(user1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Bài viết đã sửa"))
                .andExpect(jsonPath("$.commentCount").value(0));

        // Alice deletes post -> 204
        mvc.perform(delete("/api/v1/posts/" + postId).session(user1).with(csrf()))
                .andExpect(status().isNoContent());

        // Get deleted post -> 404
        mvc.perform(get("/api/v1/posts/" + postId).session(user1))
                .andExpect(status().isNotFound());
    }

    @Test
    void commentCrudAndOwnership() throws Exception {
        MockHttpSession author = registerAndLogin("comm_author@test.com", "Password123!", "Author");
        MockHttpSession commenter = registerAndLogin("comm_commenter@test.com", "Password123!", "Commenter");
        MockHttpSession stranger = registerAndLogin("comm_stranger@test.com", "Password123!", "Stranger");

        // Author creates post
        String postRes = mvc.perform(post("/api/v1/posts").session(author).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Post for comments","content":"Leave comment"}
                    """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long postId = json.readTree(postRes).get("id").asLong();

        // Commenter adds comment
        String commentRes = mvc.perform(post("/api/v1/posts/" + postId + "/comments").session(commenter).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"content":"Bình luận hay quá!"}
                    """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Bình luận hay quá!"))
                .andExpect(jsonPath("$.author.name").value("Commenter"))
                .andReturn().getResponse().getContentAsString();
        long commentId = json.readTree(commentRes).get("id").asLong();

        // Check comment count in post
        mvc.perform(get("/api/v1/posts/" + postId).session(author))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commentCount").value(1));

        // Stranger cannot edit comment -> 403
        mvc.perform(put("/api/v1/posts/" + postId + "/comments/" + commentId).session(stranger).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"content":"Hack comment"}
                    """))
                .andExpect(status().isForbidden());

        // Commenter edits comment -> 200
        mvc.perform(put("/api/v1/posts/" + postId + "/comments/" + commentId).session(commenter).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"content":"Bình luận đã sửa!"}
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Bình luận đã sửa!"));

        // Stranger cannot delete comment -> 403
        mvc.perform(delete("/api/v1/posts/" + postId + "/comments/" + commentId).session(stranger).with(csrf()))
                .andExpect(status().isForbidden());

        // Commenter deletes comment -> 204
        mvc.perform(delete("/api/v1/posts/" + postId + "/comments/" + commentId).session(commenter).with(csrf()))
                .andExpect(status().isNoContent());

        // Comment list is now empty
        mvc.perform(get("/api/v1/posts/" + postId + "/comments").session(author))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void postValidation() throws Exception {
        MockHttpSession user = registerAndLogin("comm_valid@test.com", "Password123!", "ValUser");

        // Empty title
        mvc.perform(post("/api/v1/posts").session(user).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"","content":"Nội dung"}
                    """))
                .andExpect(status().isBadRequest());

        // Empty content
        mvc.perform(post("/api/v1/posts").session(user).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Tiêu đề","content":""}
                    """))
                .andExpect(status().isBadRequest());

        // Empty both
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

    @Autowired com.homulearn.features.community.repositories.CommentRepository comments;

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
        return createPost(session, title, "Body");
    }

    private long createPost(MockHttpSession session, String title, String content) throws Exception {
        var body = mvc.perform(post("/api/v1/posts").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(java.util.Map.of("title", title, "content", content))))
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
    void searchPostsByTitleAndContentCaseInsensitiveAndTrimmed() throws Exception {
        var user = registerAndLogin("comm_search_user@test.com", "Password123!", "Searcher");
        createPost(user, "Hoc Java Spring Boot", "Tim hieu ve JPA va Hibernate");
        createPost(user, "Hoc React Vite Frontend", "Xay dung giao dien voi Material UI");
        createPost(user, "Docker va Postgres", "Deploy he thong voi Docker Compose");

        // Match title case-insensitive
        mvc.perform(get("/api/v1/posts?q=spring").session(user))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1))
            .andExpect(jsonPath("$.content[0].title").value("Hoc Java Spring Boot"));

        // Match content case-insensitive with leading/trailing spaces
        mvc.perform(get("/api/v1/posts?q=  MATERIAL  ").session(user))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1))
            .andExpect(jsonPath("$.content[0].title").value("Hoc React Vite Frontend"));

        // Empty query returns all posts
        mvc.perform(get("/api/v1/posts?q=   ").session(user))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(org.hamcrest.Matchers.greaterThanOrEqualTo(3)));

        // Non-matching query returns empty list
        mvc.perform(get("/api/v1/posts?q=nonexistentkeyword123xyz").session(user))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(0))
            .andExpect(jsonPath("$.totalElements").value(0));

        // Pagination and sort order (createdAt DESC, id DESC) with search
        createPost(user, "React State Management Redux", "Huong dan Redux Toolkit");
        mvc.perform(get("/api/v1/posts?q=react&page=0&size=1").session(user))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1))
            .andExpect(jsonPath("$.content[0].title").value("React State Management Redux"))
            .andExpect(jsonPath("$.totalElements").value(2))
            .andExpect(jsonPath("$.totalPages").value(2));

        mvc.perform(get("/api/v1/posts?q=react&page=1&size=1").session(user))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1))
            .andExpect(jsonPath("$.content[0].title").value("Hoc React Vite Frontend"));

        // Guest is blocked
        mvc.perform(get("/api/v1/posts?q=spring"))
            .andExpect(status().isUnauthorized());
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