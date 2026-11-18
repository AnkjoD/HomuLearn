package com.homulearn.features.flashcard.repositories;

import com.homulearn.features.flashcard.entities.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CardRepository extends JpaRepository<Card, Long> {
    List<Card> findByDeckIdOrderByIdAsc(Long deckId);
    Optional<Card> findByIdAndDeckUserId(Long id, Long userId);
    void deleteByDeckId(Long deckId);

    @Query("select c.deck.id, count(c) from Card c where c.deck.user.id = :userId group by c.deck.id")
    List<Object[]> countCardsByDeckForUser(@Param("userId") Long userId);
}
