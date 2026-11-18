import { login, logout } from "./authSlice";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchDashboardStats } from "../api/dashboard";

export const loadDashboardStats = createAsyncThunk(
  "dashboard/loadStats",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchDashboardStats();
    } catch (err) {
      return rejectWithValue(err.message || "Không tải được thống kê");
    }
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState: {
    stats: null,
    listRequestId: null,
    mutationRequestId: null,
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadDashboardStats.pending, (state, action) => {
        state.listRequestId = action.meta.requestId;
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadDashboardStats.fulfilled, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.listRequestId = null;
        state.status = "succeeded";
        state.stats = action.payload;
      })
      .addCase(loadDashboardStats.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.listRequestId = null;
        state.status = "failed";
        state.error = action.payload;
      });
    builder.addCase(login.fulfilled, () => dashboardSlice.getInitialState());
    builder.addCase(logout.fulfilled, () => dashboardSlice.getInitialState());
  },
});

export default dashboardSlice.reducer;
