package com.homulearn.features.flashcard.dtos;

import jakarta.validation.constraints.NotNull;

public record ReviewCardRequest(
    @NotNull(message = "Trạng thái ghi nhớ không được để trống")
    Boolean remembered
) {}
