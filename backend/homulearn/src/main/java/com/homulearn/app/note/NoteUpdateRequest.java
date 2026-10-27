package com.homulearn.app.note;

import jakarta.validation.constraints.Size;

public record NoteUpdateRequest(
        @Size(min = 1, max = 255, message = "Tối thiểu 1, tối đa 255 ký tự")
        String title,

        String content
) {}
