package com.homulearn.features.flashcard;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FlashcardControllerTest {

    @Autowired
    private MockMvc mvc;

    private final ObjectMapper json = new ObjectMapper();

    private MockHttpSession loginSession(String email, String password) throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"%s","password":"%s","fullName":"Flashcard Tester"}
                    """.formatted(email, password)))
            .andExpect(status().isCreated());

        MvcResult res = mvc.perform(post("/api/v1/auth/login").with(csrf())
                .param("email", email)
                .param("password", password))
            .andExpect(status().isOk())
            .andReturn();
        return (MockHttpSession) res.getRequest().getSession(false);
    }

    @Test
    void unauthenticated_returns_401() throws Exception {
        mvc.perform(get("/api/v1/flashcards/decks")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/flashcards/decks").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Java\"}")).andExpect(status().isUnauthorized());
    }

    @Test
    void createDeck_createCards_and_reviewSpacedRepetition() throws Exception {
        MockHttpSession session = loginSession("fc-owner@test.com", "StrongPass1234");

        String deckBody = mvc.perform(post("/api/v1/flashcards/decks").session(session).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"System Design\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.title").value("System Design"))
            .andExpect(jsonPath("$.cardCount").value(0))
            .andReturn().getResponse().getContentAsString();
        long deckId = json.readTree(deckBody).get("id").asLong();

        String cardBody = mvc.perform(post("/api/v1/flashcards/decks/" + deckId + "/cards").session(session).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"frontText\":\"CAP theorem?\",\"backText\":\"Consistency, Availability, Partition tolerance\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.deckId").value(deckId))
            .andExpect(jsonPath("$.intervalDays").value(0))
            .andReturn().getResponse().getContentAsString();
        long cardId = json.readTree(cardBody).get("id").asLong();

        mvc.perform(get("/api/v1/flashcards/decks").session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].cardCount").value(1));

        // Review remembered: 0 -> 1 -> 3 -> 6
        mvc.perform(post("/api/v1/flashcards/cards/" + cardId + "/review").session(session).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"remembered\":true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.intervalDays").value(1));

        mvc.perform(post("/api/v1/flashcards/cards/" + cardId + "/review").session(session).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"remembered\":true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.intervalDays").value(3));

        mvc.perform(post("/api/v1/flashcards/cards/" + cardId + "/review").session(session).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"remembered\":true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.intervalDays").value(6));

        // Review forgotten: reset -> 0
        mvc.perform(post("/api/v1/flashcards/cards/" + cardId + "/review").session(session).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"remembered\":false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.intervalDays").value(0));

        // Delete deck with cards -> 204
        mvc.perform(delete("/api/v1/flashcards/decks/" + deckId).session(session).with(csrf()))
            .andExpect(status().isNoContent());

        JsonNode listAfterDelete = json.readTree(
            mvc.perform(get("/api/v1/flashcards/decks").session(session))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()
        );
        org.junit.jupiter.api.Assertions.assertEquals(0, listAfterDelete.size());
    }

    @Test
    void ownership_otherUser_gets_404() throws Exception {
        MockHttpSession alice = loginSession("fc-alice@test.com", "StrongPass1234");
        MockHttpSession bob = loginSession("fc-bob@test.com", "StrongPass1234");

        String deckBody = mvc.perform(post("/api/v1/flashcards/decks").session(alice).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Alice Deck\"}"))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        long deckId = json.readTree(deckBody).get("id").asLong();

        String cardBody = mvc.perform(post("/api/v1/flashcards/decks/" + deckId + "/cards").session(alice).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"frontText\":\"Q\",\"backText\":\"A\"}"))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        long cardId = json.readTree(cardBody).get("id").asLong();

        mvc.perform(get("/api/v1/flashcards/decks/" + deckId + "/cards").session(bob))
            .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/flashcards/decks/" + deckId + "/cards").session(bob).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"frontText\":\"Hack\",\"backText\":\"Hack\"}"))
            .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/flashcards/cards/" + cardId + "/review").session(bob).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"remembered\":true}"))
            .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/flashcards/cards/" + cardId).session(bob).with(csrf()))
            .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/flashcards/decks/" + deckId).session(bob).with(csrf()))
            .andExpect(status().isNotFound());
    }

    @Test
    void validation_blankTitle_or_cardText_returns_400() throws Exception {
        MockHttpSession session = loginSession("fc-val@test.com", "StrongPass1234");

        mvc.perform(post("/api/v1/flashcards/decks").session(session).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"   \"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        String deckBody = mvc.perform(post("/api/v1/flashcards/decks").session(session).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Valid\"}"))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        long deckId = json.readTree(deckBody).get("id").asLong();

        mvc.perform(post("/api/v1/flashcards/decks/" + deckId + "/cards").session(session).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"frontText\":\"\",\"backText\":\"A\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
