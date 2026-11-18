package com.homulearn.features.note.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NoteRequest(
        @NotBlank(message = "Không được để trống")
        @Size(max = 255, message = "Tối đa 255 ký tự")
        String title,

        String content,

        Long folderId
) {}
