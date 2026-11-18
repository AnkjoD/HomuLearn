package com.homulearn.app.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ProfileControllerTest {

    @Autowired MockMvc mvc;

    private String registerUser(String email) throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"StrongPass1234\",\"fullName\":\"Sinh viên A\"}"))
                .andExpect(status().isCreated());
        return email;
    }

    @Test
    void updateProfile_unauthenticated_401() throws Exception {
        mvc.perform(patch("/api/v1/auth/me").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Test\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void updateProfile_andChangePassword_happyPath_andWrongCurrentPassword400() throws Exception {
        String email = registerUser("profile_test@test.com");

        mvc.perform(patch("/api/v1/auth/me").with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Nguyễn Văn B\",\"major\":\"Kỹ thuật phần mềm\",\"cohort\":\"K18\",\"bio\":\"Mục tiêu 3.6 GPA\",\"avatarColor\":\"#7C3AED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Nguyễn Văn B"))
                .andExpect(jsonPath("$.major").value("Kỹ thuật phần mềm"))
                .andExpect(jsonPath("$.cohort").value("K18"))
                .andExpect(jsonPath("$.bio").value("Mục tiêu 3.6 GPA"))
                .andExpect(jsonPath("$.avatarColor").value("#7C3AED"));

        mvc.perform(post("/api/v1/auth/change-password").with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"WrongPass123\",\"newPassword\":\"NewStrongPass1\"}"))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/v1/auth/change-password").with(csrf()).with(user(email))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"StrongPass1234\",\"newPassword\":\"NewStrongPass1\"}"))
                .andExpect(status().isNoContent());
    }
}
