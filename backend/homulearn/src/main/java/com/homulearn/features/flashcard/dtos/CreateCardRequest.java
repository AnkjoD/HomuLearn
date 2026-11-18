package com.homulearn.features.flashcard.dtos;

import jakarta.validation.constraints.NotBlank;

public record CreateCardRequest(
    @NotBlank (message = "Nội dung mặt trước của thẻ không được để trống")
    String frontText,
    @NotBlank (message = "Nội dung mặt sau của thẻ không được để trống")
    String backText
) {
    
}
