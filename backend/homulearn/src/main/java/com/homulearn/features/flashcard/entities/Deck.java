package com.homulearn.features.flashcard.entities;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

import com.homulearn.features.auth.entities.User;

@Entity
@Table(name = "decks")
@Data
public class Deck {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private String name;
    private LocalDateTime createdAt = LocalDateTime.now();
}
