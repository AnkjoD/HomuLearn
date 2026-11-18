package com.homulearn.app.note;

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
class NoteFolderControllerTest {

    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;

    private String registerUser(String email) throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"StrongPass1234\",\"fullName\":\"Test\"}"))
                .andExpect(status().isCreated());
        return email;
    }

    private long createFolder(String email, String name, String icon, String noteContent) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/note-folders").with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"" + name + "\",\"icon\":\"" + icon + "\",\"noteContent\":\"" + noteContent + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return json.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }

    @Test
    void folderCrud_andNoteAssignment_andStandaloneNotes() throws Exception {
        String email = registerUser("folder_crud@test.com");
        long folderId = createFolder(email, "Giải tích", "📐", "Ôn thi giữa kỳ");

        // List folders returns created folder with icon and noteContent
        mvc.perform(get("/api/v1/note-folders").with(user(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(folderId))
                .andExpect(jsonPath("$[0].name").value("Giải tích"))
                .andExpect(jsonPath("$[0].icon").value("📐"))
                .andExpect(jsonPath("$[0].noteContent").value("Ôn thi giữa kỳ"));

        // Update folder noteContent
        mvc.perform(patch("/api/v1/note-folders/" + folderId).with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Giải tích 1\",\"icon\":\"📐\",\"noteContent\":\"Đã cập nhật ghi chú\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Giải tích 1"))
                .andExpect(jsonPath("$.noteContent").value("Đã cập nhật ghi chú"));

        // Create note inside folder
        MvcResult inFolderRes = mvc.perform(post("/api/v1/notes").with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Tích phân\",\"content\":\"dx\",\"folderId\":" + folderId + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.folderId").value(folderId))
                .andReturn();
        long noteInFolderId = json.readTree(inFolderRes.getResponse().getContentAsString()).get("id").asLong();

        // Create standalone note outside folder (folderId = null)
        mvc.perform(post("/api/v1/notes").with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Nháp tự do\",\"content\":\"outside\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.folderId").doesNotExist());

        // Move note outside folder via clearFolder=true
        mvc.perform(patch("/api/v1/notes/" + noteInFolderId).with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"clearFolder\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.folderId").doesNotExist());

        // Move back into folder, then delete folder -> note remains with folderId=null
        mvc.perform(patch("/api/v1/notes/" + noteInFolderId).with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"folderId\":" + folderId + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.folderId").value(folderId));

        mvc.perform(delete("/api/v1/note-folders/" + folderId).with(csrf()).with(user(email)))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/notes/" + noteInFolderId).with(user(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.folderId").doesNotExist());
    }

    @Test
    void folderOwnership_otherUserGets404() throws Exception {
        String owner = registerUser("folder_owner@test.com");
        String other = registerUser("folder_other@test.com");
        long folderId = createFolder(owner, "Riêng tư", "🔒", "Không chia sẻ");

        mvc.perform(post("/api/v1/notes").with(csrf()).with(user(other))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Hack\",\"content\":\"\",\"folderId\":" + folderId + "}"))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/v1/note-folders/" + folderId).with(csrf()).with(user(other)))
                .andExpect(status().isNotFound());
    }
}
