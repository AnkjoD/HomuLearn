/**
 * notesApi.js — HTTP client cho /api/v1/notes
 *
 * Dùng cùng pattern CSRF với authApi.js:
 *   - credentials: "include" để gửi JSESSIONID cookie
 *   - CSRF token lấy từ GET /api/v1/auth/csrf, cache module-level
 *   - Retry 1 lần nếu 403 (token rotate)
 *
 * Tất cả hàm throw Error có .status và .fieldErrors nếu backend trả lỗi.
 */

const BASE = "/api/v1/notes";
const CSRF_URL = "/api/v1/auth/csrf";

let _csrf = null;

async function getCsrf() {
  if (_csrf) return _csrf;
  const res = await fetch(CSRF_URL, { credentials: "include" });
  if (!res.ok) throw new Error("Không lấy được CSRF token");
  _csrf = await res.json();
  return _csrf;
}

function invalidateCsrf() {
  _csrf = null;
}

async function parseError(res) {
  let body = {};
  try {
    body = await res.json();
  } catch { /* không phải JSON */ }
  const err = new Error(body.message || `HTTP ${res.status}`);
  err.status = res.status;
  err.code = body.code;
  err.fieldErrors = body.fieldErrors || null;
  return err;
}

/**
 * mutation — gửi POST/PATCH/DELETE với CSRF, retry 1 lần nếu 403
 * @param {string} url   - full URL
 * @param {object} opts  - fetch options (method, body, headers)
 */
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
      invalidateCsrf();
      continue;
    }
    if (!res.ok) throw await parseError(res);
    return res;
  }
}

/**
 * fetchNotes — GET /api/v1/notes
 * Trả { items, page, size, totalItems, totalPages }
 * @param {object} params - { page?, size? }
 */
export async function fetchNotes({ page = 0, size = 50 } = {}) {
  const url = `${BASE}?page=${page}&size=${size}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

/**
 * fetchNote — GET /api/v1/notes/:id
 * Trả NoteView { id, title, content, createdAt, updatedAt }
 */
export async function fetchNote(id) {
  const res = await fetch(`${BASE}/${id}`, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

/**
 * createNote — POST /api/v1/notes
 * @param {{ title: string, content?: string }} data
 * Trả NoteView, HTTP 201
 */
export async function createNote(data) {
  const res = await mutation(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * updateNote — PATCH /api/v1/notes/:id
 * @param {string} id
 * @param {{ title?: string, content?: string }} data
 * Trả NoteView
 */
export async function updateNote(id, data) {
  const res = await mutation(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * deleteNote — DELETE /api/v1/notes/:id
 * HTTP 204, không có body
 */
export async function deleteNote(id) {
  await mutation(`${BASE}/${id}`, { method: "DELETE" });
}

const FOLDERS_BASE = "/api/v1/note-folders";

/** fetchFolders — GET /api/v1/note-folders */
export async function fetchFolders() {
  const res = await fetch(FOLDERS_BASE, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

/** createFolder — POST /api/v1/note-folders */
export async function createFolder(data) {
  const res = await mutation(FOLDERS_BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

/** updateFolder — PATCH /api/v1/note-folders/:id */
export async function updateFolder(id, data) {
  const res = await mutation(`${FOLDERS_BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

/** deleteFolder — DELETE /api/v1/note-folders/:id */
export async function deleteFolder(id) {
  await mutation(`${FOLDERS_BASE}/${id}`, { method: "DELETE" });
}
