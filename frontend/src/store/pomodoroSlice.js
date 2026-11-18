import { login, logout } from "./authSlice";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchPomodoroSessions,
  createPomodoroSession,
} from "../api/pomodoro";

export const loadPomodoroSessions = createAsyncThunk(
  "pomodoro/loadSessions",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchPomodoroSessions();
    } catch (err) {
      return rejectWithValue(err.message || "Không tải được lịch sử phiên");
    }
  }
);

export const savePomodoroSession = createAsyncThunk(
  "pomodoro/saveSession",
  async ({ data, idempotencyKey }, { rejectWithValue }) => {
    try {
      return await createPomodoroSession(data, idempotencyKey);
    } catch (err) {
      return rejectWithValue(err.message || "Lưu phiên học thất bại");
    }
  }
);

const pomodoroSlice = createSlice({
  name: "pomodoro",
  initialState: {
    history: [],
    listRequestId: null,
    mutationRequestId: null,
    status: "idle",
    error: null,
    saving: false,
    saveError: null,
  },
  reducers: {
    clearPomodoroError(state) {
      state.error = null;
      state.saveError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPomodoroSessions.pending, (state, action) => {
        state.listRequestId = action.meta.requestId;
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadPomodoroSessions.fulfilled, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.listRequestId = null;
        state.status = "succeeded";
        state.history = action.payload.sessions;
      })
      .addCase(loadPomodoroSessions.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.listRequestId = null;
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(savePomodoroSession.pending, (state, action) => {
        state.mutationRequestId = action.meta.requestId;
        state.saving = true;
        state.saveError = null;
      })
      .addCase(savePomodoroSession.fulfilled, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null;
        state.listRequestId = null;
        state.status = "succeeded";
        state.saving = false;
        // Kiểm tra xem đã có id này chưa để tránh duplicate trong redux state
        const exists = state.history.some((s) => s.id === action.payload.id);
        if (!exists) {
          state.history.unshift(action.payload);
        }
      })
      .addCase(savePomodoroSession.rejected, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null;
        state.saving = false;
        state.saveError = action.payload;
      });
    builder.addCase(login.fulfilled, () => pomodoroSlice.getInitialState());
    builder.addCase(logout.fulfilled, () => pomodoroSlice.getInitialState());
  },
});

export const { clearPomodoroError } = pomodoroSlice.actions;
export default pomodoroSlice.reducer;
