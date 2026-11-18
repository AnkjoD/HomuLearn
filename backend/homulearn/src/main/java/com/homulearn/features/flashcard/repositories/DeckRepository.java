package com.homulearn.features.flashcard.repositories;

import com.homulearn.features.flashcard.entities.Deck;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeckRepository extends JpaRepository<Deck, Long> {
    List<Deck> findByUserIdOrderByIdDesc(Long userId);
    Optional<Deck> findByIdAndUserId(Long id, Long userId);
}
