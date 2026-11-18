package com.homulearn.features.community.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReportRequest(
    @NotBlank(message = "Lý do báo cáo không được để trống")
    @Size(max = 500, message = "Lý do báo cáo tối đa 500 ký tự")
    String reason
) {}
