const BASE = "/api/v1/groups";
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
    if (res.status === 204) return null;
    return await res.json();
  }
}

export async function fetchGroups() {
  const res = await fetch(BASE, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function createGroup(data) {
  return mutation(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function joinGroup(groupId) {
  return mutation(`${BASE}/${groupId}/join`, { method: "POST" });
}

export async function leaveGroup(groupId) {
  return mutation(`${BASE}/${groupId}/leave`, { method: "POST" });
}

export async function deleteGroup(groupId) {
  return mutation(`${BASE}/${groupId}`, { method: "DELETE" });
}

export async function fetchGroupMembers(groupId) {
  const res = await fetch(`${BASE}/${groupId}/members`, {
    credentials: "include",
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function fetchGroupMessages(groupId, { query = "", beforeId = null, limit = 30 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query && query.trim()) params.set("q", query.trim());
  if (beforeId != null) params.set("beforeId", String(beforeId));
  const res = await fetch(`${BASE}/${groupId}/messages?${params.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function sendGroupMessage(groupId, content, clientMessageId) {
  return mutation(`${BASE}/${groupId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, clientMessageId }),
  });
}
