package com.homulearn.app.group;

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
class StudyGroupControllerTest {

    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;

    private String registerUser(String email) throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"StrongPass1234\",\"fullName\":\"Sinh viên\"}"))
                .andExpect(status().isCreated());
        return email;
    }

    @Test
    void groupLifecycle_ownerCannotLeave_joinMessageIdempotency_andOwnership() throws Exception {
        String owner = registerUser("group_owner@test.com");
        String member = registerUser("group_member@test.com");

        // Owner creates public group
        MvcResult createRes = mvc.perform(post("/api/v1/groups").with(csrf()).with(user(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Giải tích K22\",\"subject\":\"Toán\",\"privacy\":\"PUBLIC\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.myRole").value("OWNER"))
                .andExpect(jsonPath("$.memberCount").value(1))
                .andReturn();
        long groupId = json.readTree(createRes.getResponse().getContentAsString()).get("id").asLong();

        // Non-member cannot read messages (403)
        mvc.perform(get("/api/v1/groups/" + groupId + "/messages").with(user(member)))
                .andExpect(status().isForbidden());

        // Member joins -> memberCount becomes 2
        mvc.perform(post("/api/v1/groups/" + groupId + "/join").with(csrf()).with(user(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.joined").value(true))
                .andExpect(jsonPath("$.memberCount").value(2));

        // Send message with clientMessageId twice -> idempotent (same message id)
        MvcResult msg1 = mvc.perform(post("/api/v1/groups/" + groupId + "/messages").with(csrf()).with(user(member))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"Xin chào nhóm\",\"clientMessageId\":\"uuid-123\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long msgId1 = json.readTree(msg1.getResponse().getContentAsString()).get("id").asLong();

        MvcResult msg2 = mvc.perform(post("/api/v1/groups/" + groupId + "/messages").with(csrf()).with(user(member))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"Xin chào nhóm\",\"clientMessageId\":\"uuid-123\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long msgId2 = json.readTree(msg2.getResponse().getContentAsString()).get("id").asLong();
        org.junit.jupiter.api.Assertions.assertEquals(msgId1, msgId2);

        // Search messages with ?q=
        mvc.perform(get("/api/v1/groups/" + groupId + "/messages?q=chào").with(user(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/v1/groups/" + groupId + "/messages?q=khong_co").with(user(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // Cursor pagination with beforeId & limit
        MvcResult msg3 = mvc.perform(post("/api/v1/groups/" + groupId + "/messages").with(csrf()).with(user(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"Tin nhắn thứ 2\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long msgId3 = json.readTree(msg3.getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(get("/api/v1/groups/" + groupId + "/messages?beforeId=" + msgId3 + "&limit=1").with(user(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(msgId1));

        // Owner cannot leave without deleting group (400)
        mvc.perform(post("/api/v1/groups/" + groupId + "/leave").with(csrf()).with(user(owner)))
                .andExpect(status().isBadRequest());

        // Member cannot delete group (403)
        mvc.perform(delete("/api/v1/groups/" + groupId).with(csrf()).with(user(member)))
                .andExpect(status().isForbidden());

        // Member can leave
        mvc.perform(post("/api/v1/groups/" + groupId + "/leave").with(csrf()).with(user(member)))
                .andExpect(status().isNoContent());

        // Owner can delete group
        mvc.perform(delete("/api/v1/groups/" + groupId).with(csrf()).with(user(owner)))
                .andExpect(status().isNoContent());
    }
}
