/**
 * notesSlice.test.js — Unit tests cho notesSlice reducer (Vitest)
 *
 * Dùng Redux Toolkit configureStore thật.
 * Test reducer transitions qua dispatch action creators (pending/fulfilled/rejected).
 * Không mock fetch — thunks được dispatch với payload trực tiếp.
 */
import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import notesReducer, {
  loadNotes,
  loadNote,
  addNote,
  editNote,
  removeNote,
  clearMutationError,
  clearCurrent,
} from "../store/notesSlice";

function makeStore() {
  return configureStore({ reducer: { notes: notesReducer } });
}

const SAMPLE_NOTE = {
  id: "n1",
  title: "Ghi chú test",
  content: "Nội dung",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
describe("notesSlice initial state", () => {
  it("khởi tạo đúng", () => {
    const store = makeStore();
    const s = store.getState().notes;
    expect(s.items).toEqual([]);
    expect(s.listStatus).toBe("idle");
    expect(s.mutationStatus).toBe("idle");
    expect(s.current).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// loadNotes
// ---------------------------------------------------------------------------
describe("loadNotes thunk", () => {
  it("pending → listStatus=loading", () => {
    const store = makeStore();
    store.dispatch(loadNotes.pending("test", {}));
    expect(store.getState().notes.listStatus).toBe("loading");
  });

  it("fulfilled → items set", () => {
    const store = makeStore();
    store.dispatch(loadNotes.pending("test", {}));
    store.dispatch({
      meta: { requestId: "test" },
      type: loadNotes.fulfilled.type,
      payload: { items: [SAMPLE_NOTE], page: 0, size: 50, totalItems: 1, totalPages: 1 },
    });
    const s = store.getState().notes;
    expect(s.listStatus).toBe("succeeded");
    expect(s.items).toHaveLength(1);
    expect(s.items[0].id).toBe("n1");
  });

  it("rejected → listStatus=failed, listError set", () => {
    const store = makeStore();
    store.dispatch(loadNotes.pending("test", {}));
    store.dispatch({
      meta: { requestId: "test" },
      type: loadNotes.rejected.type,
      payload: "Lỗi mạng",
    });
    const s = store.getState().notes;
    expect(s.listStatus).toBe("failed");
    expect(s.listError).toBe("Lỗi mạng");
  });
});

// ---------------------------------------------------------------------------
// loadNote
// ---------------------------------------------------------------------------
describe("loadNote thunk", () => {
  it("fulfilled → current set", () => {
    const store = makeStore();
    store.dispatch(loadNote.pending("test", "n1"));
    store.dispatch(loadNote.fulfilled(SAMPLE_NOTE, "test", "n1"));
    const s = store.getState().notes;
    expect(s.currentStatus).toBe("succeeded");
    expect(s.current?.id).toBe("n1");
  });

  it("rejected 404 → currentError có status", () => {
    const store = makeStore();
    store.dispatch(loadNote.pending("test", "n1"));
    store.dispatch({
      meta: { requestId: "test" },
      type: loadNote.rejected.type,
      payload: { message: "Không tìm thấy", status: 404 },
    });
    const s = store.getState().notes;
    expect(s.currentStatus).toBe("failed");
    expect(s.currentError?.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// addNote
// ---------------------------------------------------------------------------
describe("addNote thunk", () => {
  it("fulfilled → item thêm lên đầu items", () => {
    const store = makeStore();
    // Seed một item trước
    store.dispatch(loadNotes.pending("test", {}));
    store.dispatch({
      meta: { requestId: "test" },
      type: loadNotes.fulfilled.type,
      payload: { items: [{ ...SAMPLE_NOTE, id: "old" }], page: 0, size: 50, totalItems: 1, totalPages: 1 },
    });
    const newNote = { ...SAMPLE_NOTE, id: "new", title: "Mới nhất" };
    store.dispatch(addNote.pending("test", {}));
    store.dispatch(addNote.fulfilled(newNote, "test", {}));
    const items = store.getState().notes.items;
    expect(items[0].id).toBe("new"); // lên đầu
    expect(items[1].id).toBe("old");
  });

  it("rejected → mutationError set, mutationStatus=idle", () => {
    const store = makeStore();
    store.dispatch(addNote.pending("test", {}));
    store.dispatch({
      meta: { requestId: "test" },
      type: addNote.rejected.type,
      payload: { message: "Không hợp lệ", fieldErrors: { title: "Bắt buộc" } },
    });
    const s = store.getState().notes;
    expect(s.mutationStatus).toBe("idle");
    expect(s.mutationError?.fieldErrors?.title).toBe("Bắt buộc");
  });
});

// ---------------------------------------------------------------------------
// editNote
// ---------------------------------------------------------------------------
describe("editNote thunk", () => {
  it("fulfilled → cập nhật item trong list và current", () => {
    const store = makeStore();
    store.dispatch(loadNotes.pending("test", {}));
    store.dispatch({
      meta: { requestId: "test" },
      type: loadNotes.fulfilled.type,
      payload: { items: [SAMPLE_NOTE], page: 0, size: 50, totalItems: 1, totalPages: 1 },
    });
    store.dispatch(loadNote.pending("test", "n1"));
    store.dispatch(loadNote.fulfilled(SAMPLE_NOTE, "test", "n1"));

    const updated = { ...SAMPLE_NOTE, title: "Đã sửa", updatedAt: "2024-06-01T00:00:00Z" };
    store.dispatch(editNote.pending("test", {}));
    store.dispatch(editNote.fulfilled(updated, "test", {}));

    const s = store.getState().notes;
    expect(s.items[0].title).toBe("Đã sửa");
    expect(s.current?.title).toBe("Đã sửa");
  });
});

// ---------------------------------------------------------------------------
// removeNote
// ---------------------------------------------------------------------------
describe("removeNote thunk", () => {
  it("fulfilled → xóa khỏi items, xóa current nếu trùng id", () => {
    const store = makeStore();
    store.dispatch(loadNotes.pending("test", {}));
    store.dispatch({
      meta: { requestId: "test" },
      type: loadNotes.fulfilled.type,
      payload: { items: [SAMPLE_NOTE, { ...SAMPLE_NOTE, id: "n2" }], page: 0, size: 50, totalItems: 2, totalPages: 1 },
    });
    store.dispatch(loadNote.pending("test", "n1"));
    store.dispatch(loadNote.fulfilled(SAMPLE_NOTE, "test", "n1"));

    store.dispatch(removeNote.pending("test", "n1"));
    store.dispatch(removeNote.fulfilled("n1", "test", "n1"));
    const s = store.getState().notes;
    expect(s.items).toHaveLength(1);
    expect(s.items[0].id).toBe("n2");
    expect(s.current).toBeNull(); // current bị xóa vì trùng id
  });
});

// ---------------------------------------------------------------------------
// clearMutationError / clearCurrent
// ---------------------------------------------------------------------------
describe("reducers", () => {
  it("clearMutationError xóa mutationError", () => {
    const store = makeStore();
    store.dispatch(addNote.pending("test", {}));
    store.dispatch({
      meta: { requestId: "test" },
      type: addNote.rejected.type,
      payload: { message: "lỗi" },
    });
    store.dispatch(clearMutationError());
    expect(store.getState().notes.mutationError).toBeNull();
  });

  it("clearCurrent reset current và currentStatus", () => {
    const store = makeStore();
    store.dispatch(loadNote.pending("test", "n1"));
    store.dispatch(loadNote.fulfilled(SAMPLE_NOTE, "test", "n1"));
    store.dispatch(clearCurrent());
    const s = store.getState().notes;
    expect(s.current).toBeNull();
    expect(s.currentStatus).toBe("idle");
  });
});
