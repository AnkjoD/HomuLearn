const BASE = "/api/v1/goals";
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

async function mutation(url, opts = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const csrf = await getCsrf();
    const res = await fetch(url, {
      ...opts,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...opts.headers,
        [csrf.headerName]: csrf.token,
      },
    });
    if (res.status === 403 && attempt === 0) {
      invalidateCsrf();
      continue;
    }
    if (!res.ok) throw await parseError(res);
    return res;
  }
}

export async function fetchGoals() {
  const res = await fetch(BASE, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function createGoal(data) {
  const res = await mutation(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateGoal(id, data) {
  const res = await mutation(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteGoal(id) {
  await mutation(`${BASE}/${id}`, {
    method: "DELETE",
  });
}
