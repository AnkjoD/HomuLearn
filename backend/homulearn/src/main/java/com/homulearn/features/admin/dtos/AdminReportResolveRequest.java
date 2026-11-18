package com.homulearn.features.admin.dtos;

import jakarta.validation.constraints.NotBlank;

public record AdminReportResolveRequest(
    @NotBlank(message = "Trạng thái xử lý không được để trống")
    String status,
    boolean deleteTarget
) {}
