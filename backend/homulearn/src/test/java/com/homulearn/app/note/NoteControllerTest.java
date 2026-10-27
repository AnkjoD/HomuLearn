package com.homulearn.app.note;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import tools.jackson.databind.json.JsonMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NoteControllerTest {

    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;

    // ---- helpers ----

    /** Tạo user qua register endpoint, trả email để dùng làm principal. */
    private String registerUser(String email) throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"StrongPass1234\",\"fullName\":\"Test\"}"))
                .andExpect(status().isCreated());
        return email;
    }

    /** POST /api/v1/notes, trả id từ response body. */
    private long createNote(String email, String title, String content) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/notes").with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"" + title + "\",\"content\":\"" + content + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return json.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }

    // ---- unauthenticated ----

    @Test
    void list_unauthenticated_401() throws Exception {
        mvc.perform(get("/api/v1/notes")).andExpect(status().isUnauthorized());
    }

    // ---- CRUD happy path ----

    @Test
    void create_returnsNoteView() throws Exception {
        String email = registerUser("note_create@test.com");
        mvc.perform(post("/api/v1/notes").with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Hello\",\"content\":\"World\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.title").value("Hello"))
                .andExpect(jsonPath("$.content").value("World"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());
    }

    @Test
    void list_returnsPaginatedItems() throws Exception {
        String email = registerUser("note_list@test.com");
        createNote(email, "Note A", "");
        createNote(email, "Note B", "");
        mvc.perform(get("/api/v1/notes").with(user(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20));
    }

    @Test
    void get_existingNote_200() throws Exception {
        String email = registerUser("note_get@test.com");
        long id = createNote(email, "Get me", "content");
        mvc.perform(get("/api/v1/notes/" + id).with(user(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.title").value("Get me"));
    }

    @Test
    void get_notFound_404() throws Exception {
        String email = registerUser("note_notfound@test.com");
        mvc.perform(get("/api/v1/notes/999999").with(user(email)))
                .andExpect(status().isNotFound());
    }

    @Test
    void patch_updatesFields() throws Exception {
        String email = registerUser("note_patch@test.com");
        long id = createNote(email, "Old title", "old content");
        mvc.perform(patch("/api/v1/notes/" + id).with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"New title\",\"content\":\"new content\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New title"))
                .andExpect(jsonPath("$.content").value("new content"));
    }

    @Test
    void patch_partialTitle_onlyTitleChanges() throws Exception {
        String email = registerUser("note_partial@test.com");
        long id = createNote(email, "Original", "keep this");
        mvc.perform(patch("/api/v1/notes/" + id).with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Updated\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated"))
                .andExpect(jsonPath("$.content").value("keep this"));
    }

    @Test
    void delete_thenGet_404() throws Exception {
        String email = registerUser("note_delete@test.com");
        long id = createNote(email, "To delete", "");
        mvc.perform(delete("/api/v1/notes/" + id).with(csrf()).with(user(email)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/notes/" + id).with(user(email)))
                .andExpect(status().isNotFound());
    }

    // ---- validation ----

    @Test
    void create_blankTitle_400() throws Exception {
        String email = registerUser("note_val@test.com");
        mvc.perform(post("/api/v1/notes").with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"\",\"content\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.title").isNotEmpty());
    }

    @Test
    void create_missingTitle_400() throws Exception {
        String email = registerUser("note_val2@test.com");
        mvc.perform(post("/api/v1/notes").with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.title").isNotEmpty());
    }

    // ---- ownership ----

    @Test
    void get_anotherUsersNote_404() throws Exception {
        String alice = registerUser("alice_own@test.com");
        String bob   = registerUser("bob_own@test.com");
        long id = createNote(alice, "Alice note", "secret");
        // Bob nhận 404, không phải 403 — không lộ sự tồn tại
        mvc.perform(get("/api/v1/notes/" + id).with(user(bob)))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_anotherUsersNote_404() throws Exception {
        String alice = registerUser("alice_del@test.com");
        String bob   = registerUser("bob_del@test.com");
        long id = createNote(alice, "Alice note", "");
        mvc.perform(delete("/api/v1/notes/" + id).with(csrf()).with(user(bob)))
                .andExpect(status().isNotFound());
    }

    @Test
    void patch_anotherUsersNote_404_andOriginalUnchanged() throws Exception {
        String alice = registerUser("alice_patch@test.com");
        String bob = registerUser("bob_patch@test.com");
        long id = createNote(alice, "Owner title", "Owner content");
        mvc.perform(patch("/api/v1/notes/" + id).with(csrf()).with(user(bob))
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Hijacked\"}"))
            .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/notes/" + id).with(user(alice)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("Owner title"));
    }
}
