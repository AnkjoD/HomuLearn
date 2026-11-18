package com.homulearn.features.note.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NoteFolderRequest(
        @NotBlank(message = "Tên thư mục không được để trống")
        @Size(max = 100, message = "Tối đa 100 ký tự")
        String name,

        @Size(max = 16, message = "Icon tối đa 16 ký tự")
        String icon,

        @Size(max = 500, message = "Nội dung ghi chú tối đa 500 ký tự")
        String noteContent
) {}
