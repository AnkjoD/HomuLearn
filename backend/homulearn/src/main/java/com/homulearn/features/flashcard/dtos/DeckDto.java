package com.homulearn.features.flashcard.dtos;

import java.time.LocalDateTime;

public record DeckDto(
    Long id,
    String title,
    String description,
    Long cardCount,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
