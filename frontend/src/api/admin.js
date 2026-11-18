const BASE = "/api/v1/admin";
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
    if (res.status === 204) return null;
    return await res.json();
  }
}

export async function fetchAdminOverview() {
  const res = await fetch(`${BASE}/overview`, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function fetchAdminUsers() {
  const res = await fetch(`${BASE}/users`, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function updateAdminUserStatus(publicId, status) {
  return mutation(`${BASE}/users/${publicId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchAdminReports() {
  const res = await fetch(`${BASE}/reports`, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function resolveAdminReport(id, status, deleteTarget = false) {
  return mutation(`${BASE}/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, deleteTarget }),
  });
}

export async function fetchAdminAuditLogs() {
  const res = await fetch(`${BASE}/audit-logs`, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function fetchAdminPosts() {
  const res = await fetch(`${BASE}/posts`, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function deleteAdminPost(id) {
  return mutation(`${BASE}/posts/${id}`, { method: "DELETE" });
}
