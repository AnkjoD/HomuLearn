package com.homulearn.features.flashcard.entities;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "cards")
@Data
public class Card {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_id")
    private Deck deck;

    @Column(columnDefinition = "TEXT")
    private String front;

    @Column(columnDefinition = "TEXT")
    private String back;

    private LocalDateTime nextReviewDate;
    private Integer intervalDays = 0;
}
