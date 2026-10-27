const BASE = "/api/v1/posts";
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

export async function fetchPosts(page = 0, size = 10) {
  const res = await fetch(`${BASE}?page=${page}&size=${size}`, {
    credentials: "include",
  });
  if (!res.ok) throw await parseError(res);
  return await res.json();
}

export async function fetchPost(id) {
  const res = await fetch(`${BASE}/${id}`, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return await res.json();
}

export async function createPost(data) {
  return mutation(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePost(id, data) {
  return mutation(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePost(id) {
  return mutation(`${BASE}/${id}`, {
    method: "DELETE",
  });
}

export async function fetchComments(postId) {
  const res = await fetch(`${BASE}/${postId}/comments`, {
    credentials: "include",
  });
  if (!res.ok) throw await parseError(res);
  return await res.json();
}

export async function createComment(postId, data) {
  return mutation(`${BASE}/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateComment(postId, commentId, data) {
  return mutation(`${BASE}/${postId}/comments/${commentId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteComment(postId, commentId) {
  return mutation(`${BASE}/${postId}/comments/${commentId}`, {
    method: "DELETE",
  });
}
