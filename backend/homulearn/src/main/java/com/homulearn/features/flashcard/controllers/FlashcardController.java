package com.homulearn.features.flashcard.controllers;

import com.homulearn.features.flashcard.dtos.CardDto;
import com.homulearn.features.flashcard.dtos.CreateCardRequest;
import com.homulearn.features.flashcard.dtos.CreateDeckRequest;
import com.homulearn.features.flashcard.dtos.DeckDto;
import com.homulearn.features.flashcard.dtos.ReviewCardRequest;
import com.homulearn.features.flashcard.services.FlashcardService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/flashcards")
public class FlashcardController {

    private final FlashcardService flashcardService;

    public FlashcardController(FlashcardService flashcardService) {
        this.flashcardService = flashcardService;
    }

    @GetMapping("/decks")
    public List<DeckDto> listDecks(Principal principal) {
        return flashcardService.getDecks(principal.getName());
    }

    @PostMapping("/decks")
    @ResponseStatus(HttpStatus.CREATED)
    public DeckDto createDeck(Principal principal, @Valid @RequestBody CreateDeckRequest request) {
        return flashcardService.createDeck(principal.getName(), request);
    }

    @DeleteMapping("/decks/{deckId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDeck(Principal principal, @PathVariable Long deckId) {
        flashcardService.deleteDeck(principal.getName(), deckId);
    }

    @GetMapping("/decks/{deckId}/cards")
    public List<CardDto> listCards(Principal principal, @PathVariable Long deckId) {
        return flashcardService.getCards(principal.getName(), deckId);
    }

    @PostMapping("/decks/{deckId}/cards")
    @ResponseStatus(HttpStatus.CREATED)
    public CardDto createCard(
            Principal principal,
            @PathVariable Long deckId,
            @Valid @RequestBody CreateCardRequest request
    ) {
        return flashcardService.createCard(principal.getName(), deckId, request);
    }

    @PostMapping("/cards/{cardId}/review")
    public CardDto reviewCard(
            Principal principal,
            @PathVariable Long cardId,
            @Valid @RequestBody ReviewCardRequest request
    ) {
        return flashcardService.reviewCard(principal.getName(), cardId, request.remembered());
    }

    @DeleteMapping("/cards/{cardId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCard(Principal principal, @PathVariable Long cardId) {
        flashcardService.deleteCard(principal.getName(), cardId);
    }
}
