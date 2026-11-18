package com.homulearn.features.flashcard.services;

import com.homulearn.common.ApiException;
import com.homulearn.features.auth.entities.User;
import com.homulearn.features.auth.repositories.UserRepository;
import com.homulearn.features.flashcard.dtos.CardDto;
import com.homulearn.features.flashcard.dtos.CreateCardRequest;
import com.homulearn.features.flashcard.dtos.CreateDeckRequest;
import com.homulearn.features.flashcard.dtos.DeckDto;
import com.homulearn.features.flashcard.entities.Card;
import com.homulearn.features.flashcard.entities.Deck;
import com.homulearn.features.flashcard.repositories.CardRepository;
import com.homulearn.features.flashcard.repositories.DeckRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Transactional
public class FlashcardService {

    private static final int MAX_INTERVAL_DAYS = 30;

    private final DeckRepository deckRepository;
    private final CardRepository cardRepository;
    private final UserRepository userRepository;

    public FlashcardService(
            DeckRepository deckRepository,
            CardRepository cardRepository,
            UserRepository userRepository
    ) {
        this.deckRepository = deckRepository;
        this.cardRepository = cardRepository;
        this.userRepository = userRepository;
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email.strip().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Người dùng không hợp lệ"));
    }

    private Deck getOwnedDeck(Long userId, Long deckId) {
        return deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy bộ thẻ"));
    }

    private Card getOwnedCard(Long userId, Long cardId) {
        return cardRepository.findByIdAndDeckUserId(cardId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy thẻ"));
    }

    @Transactional(readOnly = true)
    public List<DeckDto> getDecks(String email) {
        User user = getUserByEmail(email);
        List<Deck> decks = deckRepository.findByUserIdOrderByIdDesc(user.getId());
        Map<Long, Long> countByDeck = new HashMap<>();
        for (Object[] row : cardRepository.countCardsByDeckForUser(user.getId())) {
            countByDeck.put((Long) row[0], (Long) row[1]);
        }
        return decks.stream()
                .map(deck -> new DeckDto(
                        deck.getId(),
                        deck.getName(),
                        null,
                        countByDeck.getOrDefault(deck.getId(), 0L),
                        deck.getCreatedAt(),
                        null
                ))
                .toList();
    }

    public DeckDto createDeck(String email, CreateDeckRequest req) {
        User user = getUserByEmail(email);
        String title = req.title().strip();
        if (title.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tên bộ thẻ không được để trống");
        }
        Deck deck = new Deck();
        deck.setUser(user);
        deck.setName(title);
        deck.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC));
        Deck saved = deckRepository.save(deck);
        return new DeckDto(saved.getId(), saved.getName(), null, 0L, saved.getCreatedAt(), null);
    }

    public void deleteDeck(String email, Long deckId) {
        User user = getUserByEmail(email);
        Deck deck = getOwnedDeck(user.getId(), deckId);
        cardRepository.deleteByDeckId(deck.getId());
        deckRepository.delete(deck);
    }

    @Transactional(readOnly = true)
    public List<CardDto> getCards(String email, Long deckId) {
        User user = getUserByEmail(email);
        Deck deck = getOwnedDeck(user.getId(), deckId);
        return cardRepository.findByDeckIdOrderByIdAsc(deck.getId()).stream()
                .map(FlashcardService::toCardDto)
                .toList();
    }

    public CardDto createCard(String email, Long deckId, CreateCardRequest req) {
        User user = getUserByEmail(email);
        Deck deck = getOwnedDeck(user.getId(), deckId);
        String front = req.frontText().strip();
        String back = req.backText().strip();
        if (front.isEmpty() || back.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Nội dung mặt trước và mặt sau không được để trống");
        }
        Card card = new Card();
        card.setDeck(deck);
        card.setFront(front);
        card.setBack(back);
        card.setIntervalDays(0);
        card.setNextReviewDate(LocalDateTime.now(ZoneOffset.UTC));
        return toCardDto(cardRepository.save(card));
    }

    public CardDto reviewCard(String email, Long cardId, boolean remembered) {
        User user = getUserByEmail(email);
        Card card = getOwnedCard(user.getId(), cardId);
        int current = card.getIntervalDays() == null ? 0 : card.getIntervalDays();
        int nextInterval;
        if (remembered) {
            if (current <= 0) nextInterval = 1;
            else if (current == 1) nextInterval = 3;
            else nextInterval = Math.min(current * 2, MAX_INTERVAL_DAYS);
        } else {
            nextInterval = 0;
        }
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        card.setIntervalDays(nextInterval);
        card.setNextReviewDate(nextInterval == 0 ? now : now.plusDays(nextInterval));
        return toCardDto(cardRepository.save(card));
    }

    public void deleteCard(String email, Long cardId) {
        User user = getUserByEmail(email);
        Card card = getOwnedCard(user.getId(), cardId);
        cardRepository.delete(card);
    }

    private static CardDto toCardDto(Card card) {
        return new CardDto(
                card.getId(),
                card.getDeck().getId(),
                card.getFront(),
                card.getBack(),
                card.getIntervalDays(),
                card.getNextReviewDate()
        );
    }
}
