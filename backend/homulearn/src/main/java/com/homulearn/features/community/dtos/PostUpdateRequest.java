package com.homulearn.features.community.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostUpdateRequest(
    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
    String title,

    @NotBlank(message = "Nội dung không được để trống")
    @Size(max = 20000)
    String content
) {}
