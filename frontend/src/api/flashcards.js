const BASE = "/api/v1/flashcards";
const CSRF_URL = "/api/v1/auth/csrf";

let _csrf = null;

async function getCsrf() {
  if (_csrf) return _csrf;
  const res = await fetch(CSRF_URL, { credentials: "include" });
  if (!res.ok) throw new Error("Không lấy được CSRF token");
  _csrf = await res.json();
  return _csrf;
}

async function parseError(res) {
  let body = {};
  try {
    body = await res.json();
  } catch {}
  const err = new Error(body.message || `HTTP ${res.status}`);
  err.status = res.status;
  err.code = body.code;
  err.fieldErrors = body.fieldErrors || null;
  return err;
}

async function mutation(url, opts = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const csrf = await getCsrf();
    const res = await fetch(url, {
      ...opts,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...opts.headers,
        [csrf.headerName]: csrf.token,
      },
    });
    if (res.status === 403 && attempt === 0) {
      _csrf = null;
      continue;
    }
    if (!res.ok) throw await parseError(res);
    if (res.status === 204) return null;
    return await res.json();
  }
}

export async function fetchDecks() {
  const res = await fetch(`${BASE}/decks`, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return await res.json();
}

export async function createDeck(title) {
  return await mutation(`${BASE}/decks`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function deleteDeck(deckId) {
  return await mutation(`${BASE}/decks/${deckId}`, {
    method: "DELETE",
  });
}

export async function fetchCards(deckId) {
  const res = await fetch(`${BASE}/decks/${deckId}/cards`, {
    credentials: "include",
  });
  if (!res.ok) throw await parseError(res);
  return await res.json();
}

export async function createCard(deckId, frontText, backText) {
  return await mutation(`${BASE}/decks/${deckId}/cards`, {
    method: "POST",
    body: JSON.stringify({ frontText, backText }),
  });
}

export async function reviewCard(cardId, remembered) {
  return await mutation(`${BASE}/cards/${cardId}/review`, {
    method: "POST",
    body: JSON.stringify({ remembered }),
  });
}

export async function deleteCard(cardId) {
  return await mutation(`${BASE}/cards/${cardId}`, {
    method: "DELETE",
  });
}
