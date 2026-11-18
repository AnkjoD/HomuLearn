package com.homulearn.features.auth.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
        String fullName,

        @Size(max = 100, message = "Ngành / Khoa tối đa 100 ký tự")
        String major,

        @Size(max = 50, message = "Khóa / Năm học tối đa 50 ký tự")
        String cohort,

        @Size(max = 200, message = "Giới thiệu ngắn tối đa 200 ký tự")
        String bio,

        @Size(max = 20, message = "Mã màu tối đa 20 ký tự")
        String avatarColor
) {}
