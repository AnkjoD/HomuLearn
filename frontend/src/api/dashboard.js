const BASE = "/api/v1/dashboard/stats";

async function parseError(res) {
  let body = {};
  try {
    body = await res.json();
  } catch {}
  const err = new Error(body.message || `HTTP ${res.status}`);
  err.status = res.status;
  err.code = body.code;
  return err;
}

export async function fetchDashboardStats() {
  const res = await fetch(BASE, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.json();
}
