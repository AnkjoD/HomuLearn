package com.homulearn.features.group.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GroupCreateRequest(
    @NotBlank(message = "Tên nhóm không được để trống")
    @Size(max = 120, message = "Tên nhóm tối đa 120 ký tự")
    String name,

    @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
    String description,

    @Size(max = 100, message = "Môn học tối đa 100 ký tự")
    String subject,

    @Size(max = 20)
    String privacy,

    @Size(max = 20)
    String avatarColor
) {}
