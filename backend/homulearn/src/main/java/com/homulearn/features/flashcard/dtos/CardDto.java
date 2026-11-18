package com.homulearn.features.flashcard.dtos;

import java.time.LocalDateTime;

public record CardDto(
    Long id,
    Long deckId,
    String frontText,
    String backText,
    Integer intervalDays,
    LocalDateTime nextReviewDate
) {}
