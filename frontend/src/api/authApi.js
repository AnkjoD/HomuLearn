/**
 * authApi.js — HTTP client cho Auth endpoints
 *
 * Luồng CSRF:
 *   1. Trước POST đầu tiên, gọi GET /api/v1/auth/csrf → { token, headerName }
 *   2. Gửi token trong header (mặc định X-CSRF-TOKEN) cho mọi POST/DELETE
 *   3. Cache token trong module; invalidate sau logout
 *
 * Cookie JSESSIONID được browser tự gửi (credentials: "include").
 * Không lưu token vào localStorage — phiên sống trong cookie HttpOnly.
 */

const BASE = "/api/v1/auth";

// Module-level cache; không expose ra ngoài
let _csrf = null; // { token: string, headerName: string }

async function getCsrf() {
  if (_csrf) return _csrf;
  const res = await fetch(`${BASE}/csrf`, { credentials: "include" });
  if (!res.ok) throw new Error("Không lấy được CSRF token");
  _csrf = await res.json();
  return _csrf;
}

// Gọi sau logout để buộc lấy token mới ở request tiếp theo
export function invalidateCsrf() {
  _csrf = null;
}

/**
 * parseError — chuyển Response lỗi thành Error có thêm fieldErrors
 * Backend trả { code, message, fieldErrors } theo error envelope
 */
async function parseError(res) {
  let body = {};
  try {
    body = await res.json();
  } catch {
    /* response không phải JSON */
  }
  const err = new Error(body.message || `HTTP ${res.status}`);
  err.status = res.status;
  err.code = body.code;
  err.fieldErrors = body.fieldErrors || null;
  return err;
}

// GET /api/v1/auth/me — trả AccountView hoặc throw 401
export async function fetchMe() {
  const res = await fetch(`${BASE}/me`, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

// A session can expire or rotate its CSRF token. Retry a rejected mutation once
// with a fresh token; a second 403 remains a real error, never an endless loop.
async function sendMutation(path, options = {}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const csrf = await getCsrf();
    const res = await fetch(`${BASE}/${path}`, {
      ...options,
      method: options.method || "POST",
      credentials: "include",
      headers: { ...options.headers, [csrf.headerName]: csrf.token },
    });
    if (res.status === 403 && attempt === 0) {
      invalidateCsrf();
      continue;
    }
    if (!res.ok) throw await parseError(res);
    return res;
  }
}

// POST /api/v1/auth/login — form-encoded theo Spring Security convention
export async function postLogin(email, password) {
  const body = new URLSearchParams({ email, password });
  const res = await sendMutation("login", {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  invalidateCsrf();
  return res.json(); // AccountView { id, email, fullName, role }
}

// POST /api/v1/auth/register — JSON
export async function postRegister(email, password, fullName) {
  const res = await sendMutation("register", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, fullName }),
  });
  return res.json(); // AccountView
}

// POST /api/v1/auth/logout
export async function postLogout() {
  await sendMutation("logout");
  invalidateCsrf();
}

// PATCH /api/v1/auth/me — cập nhật hồ sơ cá nhân
export async function patchProfile(data) {
  const res = await sendMutation("me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// POST /api/v1/auth/change-password — đổi mật khẩu
export async function postChangePassword(data) {
  await sendMutation("change-password", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
