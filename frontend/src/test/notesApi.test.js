/**
 * notesApi.test.js — Unit tests cho notesApi.js (Vitest)
 *
 * Dùng global fetch mock; không gọi server thật.
 * Kiểm tra: response parse, error parse, CSRF retry logic, 404 throw.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Reset module cache giữa các test để _csrf không bị leak
let notesApi;

function mockFetch(responses) {
  // responses: mảng { ok, status, json }; gọi theo thứ tự
  let call = 0;
  global.fetch = vi.fn(async () => {
    const r = responses[call++] || responses[responses.length - 1];
    return {
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: async () => r.json ?? {},
    };
  });
}

beforeEach(async () => {
  vi.resetModules();
  notesApi = await import("../api/notesApi.js");
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// fetchNotes
// ---------------------------------------------------------------------------
describe("fetchNotes", () => {
  it("trả items từ server khi 200", async () => {
    const payload = { items: [{ id: "1", title: "Test" }], page: 0, size: 50, totalItems: 1, totalPages: 1 };
    mockFetch([{ ok: true, status: 200, json: payload }]);
    const result = await notesApi.fetchNotes();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("Test");
  });

  it("throw Error khi 401", async () => {
    mockFetch([{ ok: false, status: 401, json: { message: "Chưa đăng nhập" } }]);
    await expect(notesApi.fetchNotes()).rejects.toMatchObject({ status: 401 });
  });
});

// ---------------------------------------------------------------------------
// fetchNote
// ---------------------------------------------------------------------------
describe("fetchNote", () => {
  it("trả NoteView khi 200", async () => {
    const note = { id: "abc", title: "Hello", content: "World", createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" };
    mockFetch([{ ok: true, status: 200, json: note }]);
    const result = await notesApi.fetchNote("abc");
    expect(result.id).toBe("abc");
  });

  it("throw 404 khi note không tồn tại", async () => {
    mockFetch([{ ok: false, status: 404, json: { message: "Không tìm thấy", code: "NOT_FOUND" } }]);
    await expect(notesApi.fetchNote("missing")).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });
});

// ---------------------------------------------------------------------------
// createNote — CSRF flow
// ---------------------------------------------------------------------------
describe("createNote", () => {
  it("lấy CSRF rồi POST, trả NoteView 201", async () => {
    const csrfPayload = { token: "tok1", headerName: "X-CSRF-TOKEN" };
    const created = { id: "n1", title: "New", content: null, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" };
    // fetch call 0: GET /csrf, call 1: POST /notes
    mockFetch([
      { ok: true, status: 200, json: csrfPayload },
      { ok: true, status: 201, json: created },
    ]);
    const result = await notesApi.createNote({ title: "New" });
    expect(result.id).toBe("n1");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("retry 1 lần khi 403, thành công lần 2", async () => {
    const csrf1 = { token: "old", headerName: "X-CSRF-TOKEN" };
    const csrf2 = { token: "new", headerName: "X-CSRF-TOKEN" };
    const created = { id: "n2", title: "Retry", content: null, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" };
    // call 0: GET csrf (old), call 1: POST → 403, call 2: GET csrf (new), call 3: POST → 201
    mockFetch([
      { ok: true, status: 200, json: csrf1 },
      { ok: false, status: 403, json: {} },
      { ok: true, status: 200, json: csrf2 },
      { ok: true, status: 201, json: created },
    ]);
    const result = await notesApi.createNote({ title: "Retry" });
    expect(result.id).toBe("n2");
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it("throw với fieldErrors khi 400", async () => {
    const csrf = { token: "tok", headerName: "X-CSRF-TOKEN" };
    mockFetch([
      { ok: true, status: 200, json: csrf },
      { ok: false, status: 400, json: { message: "Không hợp lệ", fieldErrors: { title: "Không được để trống" } } },
    ]);
    const err = await notesApi.createNote({ title: "" }).catch((e) => e);
    expect(err.status).toBe(400);
    expect(err.fieldErrors?.title).toBe("Không được để trống");
  });
});

// ---------------------------------------------------------------------------
// deleteNote
// ---------------------------------------------------------------------------
describe("deleteNote", () => {
  it("gọi DELETE, không throw khi 204", async () => {
    const csrf = { token: "tok", headerName: "X-CSRF-TOKEN" };
    // 204 không có body — json() sẽ không được gọi
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => csrf })
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });
    await expect(notesApi.deleteNote("n1")).resolves.toBeUndefined();
  });
});
