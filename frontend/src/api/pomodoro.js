const BASE = "/api/v1/pomodoro-sessions";
const CSRF_URL = "/api/v1/auth/csrf";

let _csrf = null;

async function getCsrf() {
  if (_csrf) return _csrf;
  const res = await fetch(CSRF_URL, { credentials: "include" });
  if (!res.ok) throw new Error("Không lấy được CSRF token");
  _csrf = await res.json();
  return _csrf;
}

function invalidateCsrf() {
  _csrf = null;
}

async function parseError(res) {
  let body = {};
  try {
    body = await res.json();
  } catch {}
  const err = new Error(body.message || `HTTP ${res.status}`);
  err.status = res.status;
  err.code = body.code;
  err.fieldErrors = body.fieldErrors || null;
  return err;
}

export async function fetchPomodoroSessions() {
  const res = await fetch(BASE, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function createPomodoroSession(data, idempotencyKey) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const csrf = await getCsrf();
    const headers = {
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
    };
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    const res = await fetch(BASE, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify(data),
    });

    if (res.status === 403 && attempt === 0) {
      invalidateCsrf();
      continue;
    }
    if (!res.ok) throw await parseError(res);
    return res.json();
  }
}
