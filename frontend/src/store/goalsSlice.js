import { login, logout } from "./authSlice";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from "../api/goals";

export const loadGoals = createAsyncThunk(
  "goals/load",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchGoals();
    } catch (err) {
      return rejectWithValue(err.message || "Không tải được mục tiêu");
    }
  }
);

export const addGoal = createAsyncThunk(
  "goals/add",
  async (data, { rejectWithValue }) => {
    try {
      return await createGoal(data);
    } catch (err) {
      return rejectWithValue({
        message: err.message,
        fieldErrors: err.fieldErrors,
      });
    }
  }
);

export const editGoal = createAsyncThunk(
  "goals/edit",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await updateGoal(id, data);
    } catch (err) {
      return rejectWithValue({
        message: err.message,
        fieldErrors: err.fieldErrors,
      });
    }
  }
);

export const removeGoal = createAsyncThunk(
  "goals/remove",
  async (id, { rejectWithValue }) => {
    try {
      await deleteGoal(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.message || "Xóa mục tiêu thất bại");
    }
  }
);

const goalsSlice = createSlice({
  name: "goals",
  initialState: {
    items: [],
    listRequestId: null,
    mutationRequestId: null,
    status: "idle",
    error: null,
    mutationStatus: "idle",
    mutationError: null,
  },
  reducers: {
    clearGoalError(state) {
      state.error = null;
      state.mutationError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadGoals.pending, (state, action) => {
        state.listRequestId = action.meta.requestId;
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadGoals.fulfilled, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.listRequestId = null;
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(loadGoals.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.listRequestId = null;
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(addGoal.pending, (state, action) => {
        state.mutationRequestId = action.meta.requestId;
        state.mutationStatus = "loading";
        state.mutationError = null;
      })
      .addCase(addGoal.fulfilled, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null;
        state.listRequestId = null;
        state.status = "succeeded";
        state.mutationStatus = "succeeded";
        state.items.unshift(action.payload);
      })
      .addCase(addGoal.rejected, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null;
        state.mutationStatus = "failed";
        state.mutationError = action.payload;
      })
      .addCase(editGoal.pending, (state, action) => {
        state.mutationRequestId = action.meta.requestId;
        state.mutationStatus = "loading";
        state.mutationError = null;
      })
      .addCase(editGoal.fulfilled, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null;
        state.listRequestId = null;
        state.status = "succeeded";
        state.mutationStatus = "succeeded";
        const idx = state.items.findIndex((g) => g.id === action.payload.id);
        if (idx !== -1) {
          state.items[idx] = action.payload;
        }
      })
      .addCase(editGoal.rejected, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null;
        state.mutationStatus = "failed";
        state.mutationError = action.payload;
      })
      .addCase(removeGoal.pending, (state, action) => {
        state.mutationRequestId = action.meta.requestId;
        state.mutationStatus = "loading";
        state.mutationError = null;
      })
      .addCase(removeGoal.rejected, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null;
        state.mutationStatus = "failed";
        state.mutationError = action.payload;
      })
      .addCase(removeGoal.fulfilled, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null;
        state.listRequestId = null;
        state.status = "succeeded";
        state.mutationStatus = "succeeded";
        state.items = state.items.filter((g) => g.id !== action.payload);
      });
    builder.addCase(login.fulfilled, () => goalsSlice.getInitialState());
    builder.addCase(logout.fulfilled, () => goalsSlice.getInitialState());
  },
});

export const { clearGoalError } = goalsSlice.actions;
export default goalsSlice.reducer;
