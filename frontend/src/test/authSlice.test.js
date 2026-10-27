/**
 * Test authSlice — kiểm tra reducer logic, không mock fetch
 *
 * Dùng Vitest + Redux Toolkit configureStore thật.
 * Không test async thunks trực tiếp ở đây (cần mock fetch);
 * chỉ test reducer transitions qua dispatch action creators.
 *
 * Bổ sung lượt này: restoreSession pending/fulfilled/rejected (các ca chưa có).
 */
import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, {
  clearError,
  login,
  logout,
  register,
  restoreSession,
} from "../store/authSlice";

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

// ── Các test gốc (giữ nguyên) ────────────────────────────────────────────────

describe("authSlice reducer", () => {
  it("initial state đúng", () => {
    const store = makeStore();
    const s = store.getState().auth;
    expect(s.user).toBeNull();
    expect(s.restoring).toBe(true);
    expect(s.status).toBe("idle");
    expect(s.error).toBeNull();
  });

  it("clearError xóa error", () => {
    const store = makeStore();
    // Giả lập trạng thái có lỗi bằng dispatch rejected action
    store.dispatch(login.rejected(new Error("x"), "id", {}, "Sai mật khẩu"));
    expect(store.getState().auth.error).toBe("Sai mật khẩu");
    store.dispatch(clearError());
    expect(store.getState().auth.error).toBeNull();
  });

  it("login.pending → status=loading, error=null", () => {
    const store = makeStore();
    store.dispatch(login.pending("id", { email: "a@b.com", password: "x" }));
    const s = store.getState().auth;
    expect(s.status).toBe("loading");
    expect(s.error).toBeNull();
  });

  it("login.fulfilled → user set, status=succeeded", () => {
    const store = makeStore();
    const user = { id: "1", email: "a@b.com", fullName: "Test", role: "STUDENT" };
    store.dispatch(login.fulfilled(user, "id", {}));
    const s = store.getState().auth;
    expect(s.user).toEqual(user);
    expect(s.status).toBe("succeeded");
  });

  it("login.rejected → status=failed, error set", () => {
    const store = makeStore();
    store.dispatch(login.rejected(null, "id", {}, "Sai mật khẩu"));
    const s = store.getState().auth;
    expect(s.status).toBe("failed");
    expect(s.error).toBe("Sai mật khẩu");
  });

  it("register.rejected với fieldErrors object", () => {
    const store = makeStore();
    const errPayload = { message: "Validation", fieldErrors: { email: "Email đã tồn tại" } };
    store.dispatch(register.rejected(null, "id", {}, errPayload));
    const s = store.getState().auth;
    expect(s.status).toBe("failed");
    expect(s.error).toEqual(errPayload);
  });

  it("registration creates an account but never fabricates an authenticated session", () => {
    const store = makeStore();
    store.dispatch(register.fulfilled({ id: "created", email: "a@test.com" }, "id", {}));
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.status).toBe("succeeded");
  });

  it("logout.fulfilled → user=null, status=idle", () => {
    const store = makeStore();
    // Đặt user trước
    store.dispatch(login.fulfilled({ id: "1", email: "a@b.com", fullName: "T", role: "STUDENT" }, "id", {}));
    store.dispatch(logout.fulfilled(undefined, "id"));
    const s = store.getState().auth;
    expect(s.user).toBeNull();
    expect(s.status).toBe("idle");
  });

  it("logout.rejected vẫn clear user (session hết hạn phía server)", () => {
    const store = makeStore();
    store.dispatch(login.fulfilled({ id: "1", email: "a@b.com", fullName: "T", role: "STUDENT" }, "id", {}));
    store.dispatch(logout.rejected(new Error("net"), "id"));
    expect(store.getState().auth.user).toBeNull();
  });
});

// ── restoreSession reducer transitions (bổ sung) ─────────────────────────────

describe("restoreSession reducer transitions", () => {
  it("pending → restoring=true", () => {
    // Giả lập store đã qua restore (restoring=false), sau đó trigger lại
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { user: null, restoring: false, status: "idle", error: null } },
    });
    store.dispatch(restoreSession.pending("id", undefined));
    expect(store.getState().auth.restoring).toBe(true);
  });

  it("fulfilled với user → user set, restoring=false", () => {
    const store = makeStore();
    const user = { id: "u1", email: "a@test.com", fullName: "Alice", role: "STUDENT" };
    store.dispatch(restoreSession.fulfilled(user, "id", undefined));
    const s = store.getState().auth;
    expect(s.user).toEqual(user);
    expect(s.restoring).toBe(false);
  });

  it("fulfilled với null (401 bị catch trong thunk) → user=null, restoring=false", () => {
    // Path bình thường khi chưa đăng nhập: fetchMe throw 401, thunk catch → return null
    const store = makeStore();
    store.dispatch(restoreSession.fulfilled(null, "id", undefined));
    const s = store.getState().auth;
    expect(s.user).toBeNull();
    expect(s.restoring).toBe(false);
  });

  it("rejected → user=null, restoring=false (regression: spinner không treo vĩnh viễn)", () => {
    // Hiện tại thunk không thể reject (try/catch bắt hết). Test này là regression guard
    // nếu implementation thay đổi và bỏ catch — spinner sẽ treo mãi nếu restoring không reset.
    const store = makeStore();
    store.dispatch(restoreSession.rejected(new Error("unexpected"), "id", undefined));
    const s = store.getState().auth;
    expect(s.user).toBeNull();
    expect(s.restoring).toBe(false);
  });

  it("fulfilled không thay đổi status — restoreSession không phải login", () => {
    // status chỉ dùng cho login/register/logout; restoreSession không đụng status field
    const store = makeStore();
    const user = { id: "u1", email: "a@test.com", fullName: "Alice", role: "STUDENT" };
    store.dispatch(restoreSession.fulfilled(user, "id", undefined));
    expect(store.getState().auth.status).toBe("idle");
  });
});

/*
 * BLOCKER — ProtectedRoute render test:
 *
 * Cần @testing-library/react và @testing-library/jest-dom trong devDependencies
 * để render ProtectedRoute với <Provider> + <MemoryRouter> và assert DOM.
 *
 * Hành vi cần kiểm tra (chưa có test tự động):
 *   1. restoring=true → render <CircularProgress> (role="progressbar"), không redirect, không render children
 *   2. restoring=false, user=null → Navigate to="/login" được render
 *   3. restoring=false, user có giá trị → render children
 *   4. restoring=true dù user có giá trị → vẫn spinner (tránh render protected content sớm)
 *
 * Yêu cầu Reviewer thêm vào frontend/package.json devDependencies:
 *   "@testing-library/react": "^16.x"
 *   "@testing-library/jest-dom": "^6.x"
 * Sau đó TestEngineer viết frontend/src/test/protectedRoute.test.jsx.
 */
