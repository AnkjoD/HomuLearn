package com.homulearn.app.repository;

import com.homulearn.app.entity.Deck;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DeckRepository extends JpaRepository<Deck, Long> {
    List<Deck> findByUserId(Long userId);
}
