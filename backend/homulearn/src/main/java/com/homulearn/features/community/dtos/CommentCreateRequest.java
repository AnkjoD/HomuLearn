package com.homulearn.features.community.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentCreateRequest(
    @NotBlank(message = "Nội dung bình luận không được để trống")
    @Size(max = 5000)
    String content
) {}
