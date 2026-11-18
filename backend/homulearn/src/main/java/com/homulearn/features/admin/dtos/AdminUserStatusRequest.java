package com.homulearn.features.admin.dtos;

import jakarta.validation.constraints.NotBlank;

public record AdminUserStatusRequest(
    @NotBlank(message = "Trạng thái không được để trống")
    String status
) {}
