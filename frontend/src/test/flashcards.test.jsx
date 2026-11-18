import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Review from "../pages/Review";
import * as api from "../api/flashcards";

vi.mock("../api/flashcards", () => ({
  fetchDecks: vi.fn(),
  createDeck: vi.fn(),
  deleteDeck: vi.fn(),
  fetchCards: vi.fn(),
  createCard: vi.fn(),
  reviewCard: vi.fn(),
  deleteCard: vi.fn(),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(el, value) {
  const proto = el.tagName === "TEXTAREA"
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("Review Flashcards integration", () => {
  let root, host;

  beforeEach(() => {
    vi.clearAllMocks();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    root = null;
    host?.remove();
  });

  it("loads decks and cards, flips card and records spaced repetition review", async () => {
    api.fetchDecks.mockResolvedValueOnce([
      { id: 1, title: "System Design", cardCount: 1 },
    ]);
    api.fetchCards.mockResolvedValueOnce([
      { id: 10, deckId: 1, frontText: "What is CAP?", backText: "Consistency, Availability, Partition", intervalDays: 0 },
    ]);
    api.reviewCard.mockResolvedValueOnce({
      id: 10, deckId: 1, frontText: "What is CAP?", backText: "Consistency, Availability, Partition", intervalDays: 1,
    });

    await act(async () => {
      root.render(<Review />);
    });

    expect(api.fetchDecks).toHaveBeenCalledTimes(1);
    expect(api.fetchCards).toHaveBeenCalledWith(1);
    expect(host.textContent).toContain("What is CAP?");

    // Flip card and click "Đã nhớ"
    await act(async () => {
      host.querySelector('[data-testid="flashcard-flip-area"]').click();
    });
    await act(async () => {
      host.querySelector('[data-testid="review-remembered-btn"]').click();
    });

    expect(api.reviewCard).toHaveBeenCalledWith(10, true);
  });

  it("shows empty state and creates a new deck", async () => {
    api.fetchDecks.mockResolvedValueOnce([]);
    api.createDeck.mockResolvedValueOnce({ id: 2, title: "Java 21", cardCount: 0 });
    api.fetchCards.mockResolvedValueOnce([]);

    await act(async () => {
      root.render(<Review />);
    });

    expect(host.querySelector('[data-testid="empty-decks"]')).not.toBeNull();

    await act(async () => {
      host.querySelector('[data-testid="create-deck-btn"]').click();
    });

    const input = document.body.querySelector('[data-testid="deck-title-input"] input');
    act(() => {
      setInputValue(input, "Java 21");
    });

    await act(async () => {
      document.body.querySelector('[data-testid="save-deck-btn"]').click();
    });

    expect(api.createDeck).toHaveBeenCalledWith("Java 21");
  });

  it("shows error alert with retry when loading decks fails", async () => {
    api.fetchDecks.mockRejectedValueOnce(new Error("Lỗi kết nối"));
    api.fetchDecks.mockResolvedValueOnce([]);

    await act(async () => {
      root.render(<Review />);
    });

    expect(host.textContent).toContain("Lỗi kết nối");
    await act(async () => {
      host.querySelector('[data-testid="flashcard-retry-btn"]').click();
    });
    expect(api.fetchDecks).toHaveBeenCalledTimes(2);
  });
});
