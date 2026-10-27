import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fetchMe, invalidateCsrf, postLogin, postLogout, postRegister } from "../api/authApi";

const response = (body, status = 200) => new Response(body == null ? null : JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
const token = (value) => response({ token: value, headerName: "X-CSRF-TOKEN" });
let fetchMock;
beforeEach(() => { invalidateCsrf(); fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe("auth HTTP contract", () => {
  it("sends email (not username) and drops the token rotated by successful login", async () => {
    fetchMock.mockResolvedValueOnce(token("guest")).mockResolvedValueOnce(response({ email: "a@test.com" }))
      .mockResolvedValueOnce(token("signed-in")).mockResolvedValueOnce(response(null, 204));
    await postLogin("a@test.com", "long-password");
    const options = fetchMock.mock.calls[1][1];
    expect(options.body.get("email")).toBe("a@test.com");
    expect(options.body.has("username")).toBe(false);
    expect(options.credentials).toBe("include");
    await postLogout();
    expect(fetchMock.mock.calls[3][1].headers["X-CSRF-TOKEN"]).toBe("signed-in");
  });
  it("refreshes stale CSRF and retries automatically, without a manual reset in the test", async () => {
    fetchMock.mockResolvedValueOnce(token("expired")).mockResolvedValueOnce(response({}, 403))
      .mockResolvedValueOnce(token("fresh")).mockResolvedValueOnce(response({ id: "created" }, 201));
    await expect(postRegister("a@test.com", "long-password", "Alice")).resolves.toEqual({ id: "created" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][1].headers["X-CSRF-TOKEN"]).toBe("fresh");
  });
  it("stops after the second 403", async () => {
    fetchMock.mockResolvedValueOnce(token("one")).mockResolvedValueOnce(response({}, 403))
      .mockResolvedValueOnce(token("two")).mockResolvedValueOnce(response({ code: "FORBIDDEN" }, 403));
    await expect(postLogout()).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
  it("preserves validation fields and does not retry a 400", async () => {
    fetchMock.mockResolvedValueOnce(token("one")).mockResolvedValueOnce(response({ message: "Invalid", fieldErrors: { password: "Too short" } }, 400));
    await expect(postRegister("a@test.com", "short", "Alice")).rejects.toMatchObject({ status: 400, fieldErrors: { password: "Too short" } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("keeps a 401 distinct from a network failure", async () => {
    fetchMock.mockResolvedValueOnce(response({ code: "UNAUTHENTICATED" }, 401));
    await expect(fetchMe()).rejects.toMatchObject({ status: 401 });
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await expect(fetchMe()).rejects.toThrow("offline");
  });
});
