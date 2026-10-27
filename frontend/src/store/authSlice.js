import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchMe, postLogin, postLogout, postRegister } from "../api/authApi";

// Khôi phục phiên khi reload: gọi GET /api/v1/auth/me
// Nếu server trả 200 → user đã đăng nhập (JSESSIONID còn hợp lệ)
// Nếu 401 → chưa đăng nhập, trả null, không throw
export const restoreSession = createAsyncThunk(
  "auth/restoreSession",
  async () => {
    try {
      return await fetchMe();
    } catch {
      return null;
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      return await postLogin(email, password);
    } catch (err) {
      return rejectWithValue(err.message || "Đăng nhập thất bại");
    }
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async ({ email, password, fullName }, { rejectWithValue }) => {
    try {
      return await postRegister(email, password, fullName);
    } catch (err) {
      // err.fieldErrors là object {field: message} từ backend 400
      return rejectWithValue({ message: err.message, fieldErrors: err.fieldErrors, status: err.status });
    }
  }
);

export const logout = createAsyncThunk("auth/logout", async () => {
  await postLogout();
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    // user: null | { id, email, fullName, role }
    user: null,
    // "idle" | "loading" | "succeeded" | "failed"
    status: "idle",
    // lỗi dạng string cho login; object {field: msg} cho register
    error: null,
    // true trong khi restoreSession đang chạy lần đầu
    restoring: true,
  },
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // --- restoreSession ---
    builder
      .addCase(restoreSession.pending, (state) => {
        state.restoring = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload; // null nếu 401
        state.restoring = false;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.restoring = false;
      });

    // --- login ---
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });

    // --- register ---
    builder
      .addCase(register.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = "succeeded";
        // Account creation does not establish a server session.
        state.user = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });

    // --- logout ---
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = "idle";
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        // Logout thất bại vẫn clear local state; server session có thể đã hết
        state.user = null;
        state.status = "idle";
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
