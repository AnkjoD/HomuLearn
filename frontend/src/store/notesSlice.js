import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { login, logout } from "./authSlice";
import {
  fetchNotes,
  fetchNote,
  createNote,
  updateNote,
  deleteNote,
  fetchFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} from "../api/notesApi";

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

/**
 * loadNotes — GET /api/v1/notes
 * Dùng khi mount Notes.jsx hoặc reload danh sách.
 * payload khi fulfilled: { items, page, size, totalItems, totalPages }
 */
export const loadNotes = createAsyncThunk(
  "notes/load",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await fetchNotes(params);
    } catch (err) {
      return rejectWithValue(err.message || "Không tải được ghi chú");
    }
  }
);

/**
 * loadNote — GET /api/v1/notes/:id
 * Dùng khi mount NoteDetail.jsx.
 * payload khi fulfilled: NoteView
 */
export const loadNote = createAsyncThunk(
  "notes/loadOne",
  async (id, { rejectWithValue }) => {
    try {
      return await fetchNote(id);
    } catch (err) {
      return rejectWithValue({ message: err.message, status: err.status });
    }
  }
);

/**
 * addNote — POST /api/v1/notes
 * payload khi fulfilled: NoteView mới tạo
 */
export const addNote = createAsyncThunk(
  "notes/add",
  async (data, { rejectWithValue }) => {
    try {
      return await createNote(data);
    } catch (err) {
      return rejectWithValue({
        message: err.message,
        fieldErrors: err.fieldErrors,
      });
    }
  }
);

/**
 * editNote — PATCH /api/v1/notes/:id
 * @param {{ id: string, data: object }}
 * payload khi fulfilled: NoteView đã cập nhật
 */
export const editNote = createAsyncThunk(
  "notes/edit",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await updateNote(id, data);
    } catch (err) {
      return rejectWithValue({
        message: err.message,
        fieldErrors: err.fieldErrors,
      });
    }
  }
);

/**
 * removeNote — DELETE /api/v1/notes/:id
 * payload khi fulfilled: id đã xóa (để filter khỏi list)
 */
export const removeNote = createAsyncThunk(
  "notes/remove",
  async (id, { rejectWithValue }) => {
    try {
      await deleteNote(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.message || "Xóa thất bại");
    }
  }
);

export const loadFolders = createAsyncThunk(
  "notes/loadFolders",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchFolders();
    } catch (err) {
      return rejectWithValue(err.message || "Không tải được thư mục");
    }
  }
);

export const addFolder = createAsyncThunk(
  "notes/addFolder",
  async (data, { rejectWithValue }) => {
    try {
      return await createFolder(data);
    } catch (err) {
      return rejectWithValue(err.message || "Không tạo được thư mục");
    }
  }
);

export const editFolder = createAsyncThunk(
  "notes/editFolder",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await updateFolder(id, data);
    } catch (err) {
      return rejectWithValue(err.message || "Không cập nhật được thư mục");
    }
  }
);

export const removeFolder = createAsyncThunk(
  "notes/removeFolder",
  async (id, { rejectWithValue }) => {
    try {
      await deleteFolder(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.message || "Không xóa được thư mục");
    }
  }
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

function resetNotesState(state) {
  state.items = [];
  state.folders = [];
  state.current = null;
  state.listStatus = state.foldersStatus = state.currentStatus = state.mutationStatus = "idle";
  state.listError = state.foldersError = state.currentError = state.mutationError = null;
  state.listRequestId = state.foldersRequestId = state.currentRequestId = state.mutationRequestId = null;
}

const notesSlice = createSlice({
  name: "notes",
  initialState: {
    // Danh sách notes từ server (trang hiện tại)
    items: [],
    // Danh sách thư mục từ server
    folders: [],
    // Note đang xem trong NoteDetail
    current: null,
    listRequestId: null,
    foldersRequestId: null,
    currentRequestId: null,
    mutationRequestId: null,
    // "idle" | "loading" | "succeeded" | "failed"
    listStatus: "idle",
    foldersStatus: "idle",
    currentStatus: "idle",
    // "idle" | "saving" — POST/PATCH/DELETE đang chạy
    mutationStatus: "idle",
    // Lỗi danh sách
    listError: null,
    foldersError: null,
    // Lỗi note đơn (404, v.v.)
    currentError: null,
    // Lỗi mutation (validation fieldErrors, v.v.)
    mutationError: null,
  },
  reducers: {
    clearMutationError(state) {
      state.mutationError = null;
    },
    clearCurrent(state) {
      state.current = null;
      state.currentStatus = "idle";
      state.currentError = null;
      state.currentRequestId = null;
    },
  },
  extraReducers: (builder) => {
    // --- loadNotes ---
    builder
      .addCase(loadNotes.pending, (state, action) => {
        state.listRequestId = action.meta.requestId;
        state.listStatus = "loading";
        state.listError = null;
      })
      .addCase(loadNotes.fulfilled, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.listRequestId = null;
        state.listStatus = "succeeded";
        state.items = action.payload.items;
      })
      .addCase(loadNotes.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.listRequestId = null;
        state.listStatus = "failed";
        state.listError = action.payload;
      });

    // --- loadNote ---
    builder
      .addCase(loadNote.pending, (state, action) => {
        state.currentRequestId = action.meta.requestId;
        state.current = null;
        state.currentStatus = "loading";
        state.currentError = null;
      })
      .addCase(loadNote.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.currentRequestId = null;
        state.currentStatus = "succeeded";
        state.current = action.payload;
      })
      .addCase(loadNote.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.currentRequestId = null;
        state.currentStatus = "failed";
        state.currentError = action.payload;
      });

    // --- addNote ---
    builder
      .addCase(addNote.pending, (state, action) => {
        state.mutationRequestId = action.meta.requestId;
        state.mutationStatus = "saving";
        state.mutationError = null;
      })
      .addCase(addNote.fulfilled, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null;
        state.listRequestId = null;
        state.listStatus = "succeeded";
        state.mutationStatus = "idle";
        // Thêm lên đầu danh sách (backend sort updatedAt desc)
        state.items.unshift(action.payload);
      })
      .addCase(addNote.rejected, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null;
        state.mutationStatus = "idle";
        state.mutationError = action.payload;
      });

    // --- editNote ---
    builder
      .addCase(editNote.pending, (state, action) => {
        state.mutationRequestId = action.meta.requestId;
        state.mutationStatus = "saving";
        state.mutationError = null;
      })
      .addCase(editNote.fulfilled, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null;
        state.listRequestId = null;
        state.listStatus = "succeeded";
        state.mutationStatus = "idle";
        const idx = state.items.findIndex((n) => n.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.current?.id === action.payload.id) {
          state.currentRequestId = null;
          state.current = action.payload;
        }
      })
      .addCase(editNote.rejected, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null;
        state.mutationStatus = "idle";
        state.mutationError = action.payload;
      });

    // --- removeNote ---
    builder
      .addCase(removeNote.pending, (state, action) => {
        state.mutationRequestId = action.meta.requestId;
        state.mutationStatus = "saving";
        state.mutationError = null;
      })
      .addCase(removeNote.fulfilled, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null;
        state.listRequestId = null;
        state.listStatus = "succeeded";
        state.mutationStatus = "idle";
        state.items = state.items.filter((n) => n.id !== action.payload);
        if (state.current?.id === action.payload) {
          state.currentRequestId = null;
          state.current = null;
        }
      })
      .addCase(removeNote.rejected, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null;
        state.mutationStatus = "idle";
        state.mutationError = action.payload;
      });

    // --- folders ---
    builder
      .addCase(loadFolders.pending, (state, action) => {
        state.foldersRequestId = action.meta.requestId;
        state.foldersStatus = "loading";
        state.foldersError = null;
      })
      .addCase(loadFolders.fulfilled, (state, action) => {
        if (state.foldersRequestId !== action.meta.requestId) return;
        state.foldersRequestId = null;
        state.foldersStatus = "succeeded";
        state.folders = action.payload;
      })
      .addCase(loadFolders.rejected, (state, action) => {
        if (state.foldersRequestId !== action.meta.requestId) return;
        state.foldersRequestId = null;
        state.foldersStatus = "failed";
        state.foldersError = action.payload;
      })
      .addCase(addFolder.fulfilled, (state, action) => {
        state.folders.push(action.payload);
      })
      .addCase(editFolder.fulfilled, (state, action) => {
        const idx = state.folders.findIndex((f) => f.id === action.payload.id);
        if (idx !== -1) state.folders[idx] = action.payload;
      })
      .addCase(removeFolder.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.folders = state.folders.filter((f) => f.id !== deletedId);
        state.items = state.items.map((n) =>
          n.folderId === deletedId ? { ...n, folderId: null } : n
        );
        if (state.current?.folderId === deletedId) {
          state.current = { ...state.current, folderId: null };
        }
      });
    builder.addCase(logout.fulfilled, resetNotesState);
    builder.addCase(login.fulfilled, resetNotesState);
  },
});

export const { clearMutationError, clearCurrent } = notesSlice.actions;
export default notesSlice.reducer;
