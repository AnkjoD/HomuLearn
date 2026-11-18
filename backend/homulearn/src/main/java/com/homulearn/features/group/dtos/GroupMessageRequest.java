package com.homulearn.features.group.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GroupMessageRequest(
    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    @Size(max = 2000, message = "Tin nhắn tối đa 2000 ký tự")
    String content,

    @Size(max = 64)
    String clientMessageId
) {}
