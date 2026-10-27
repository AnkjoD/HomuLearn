/**
 * Test authSlice — kiểm tra reducer logic, không mock fetch
 *
 * Dùng Vitest + Redux Toolkit configureStore thật.
 * Không test async thunks trực tiếp ở đây (cần mock fetch);
 * chỉ test reducer transitions qua dispatch action creators.
 */
import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, {
  clearError,
  login,
  logout,
  register,
} from "../store/authSlice";

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

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
