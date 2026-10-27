import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
vi.mock("../api/notesApi", () => ({ fetchNotes: vi.fn(), fetchNote: vi.fn(), createNote: vi.fn(), updateNote: vi.fn(), deleteNote: vi.fn() }));
import * as api from "../api/notesApi";
import reducer, { loadNotes, loadNote, addNote, clearCurrent } from "../store/notesSlice";
import { logout } from "../store/authSlice";
import applicationStore from "../store/index";

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const store = () => configureStore({ reducer: { notes: reducer } });
beforeEach(() => vi.clearAllMocks());

describe("Notes wiring and request lifecycle", () => {
  it("registers notes in the real application store", () => {
    expect(applicationStore.getState().notes.items).toEqual([]);
  });
  it("ignores an older detail response that arrives after navigation", async () => {
    const first = deferred(); const second = deferred();
    api.fetchNote.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const s = store(); const p1 = s.dispatch(loadNote(1)); const p2 = s.dispatch(loadNote(2));
    second.resolve({ id: 2, title: "Latest" }); await p2;
    first.resolve({ id: 1, title: "Old" }); await p1;
    expect(s.getState().notes.current.id).toBe(2);
  });
  it("does not resurrect detail after unmount cleanup", async () => {
    const response = deferred(); api.fetchNote.mockReturnValueOnce(response.promise);
    const s = store(); const request = s.dispatch(loadNote(1)); s.dispatch(clearCurrent());
    response.resolve({ id: 1 }); await request;
    expect(s.getState().notes.current).toBeNull();
  });
  it("does not replace a newly created note with an older list response", async () => {
    const response = deferred(); api.fetchNotes.mockReturnValueOnce(response.promise);
    api.createNote.mockResolvedValueOnce({ id: 1, title: "New" });
    const s = store(); const request = s.dispatch(loadNotes()); await s.dispatch(addNote({ title: "New" }));
    response.resolve({ items: [] }); await request;
    expect(s.getState().notes.items).toHaveLength(1);
  });
  it("drops a previous account's pending mutation after logout", async () => {
    const response = deferred(); api.createNote.mockReturnValueOnce(response.promise);
    const s = store(); const request = s.dispatch(addNote({ title: "Private" }));
    s.dispatch(logout.fulfilled(undefined, "logout"));
    response.resolve({ id: 1, title: "Private" }); await request;
    expect(s.getState().notes.items).toEqual([]);
    expect(s.getState().notes.mutationStatus).toBe("idle");
  });
});
