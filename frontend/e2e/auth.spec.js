import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("guest is redirected and invalid login preserves form input", async ({ page }) => {
  await page.goto("/notes");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email", { exact: true }).fill(`missing-${randomUUID()}@test.com`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("StrongPass1234");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Email hoặc mật khẩu không đúng");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(/missing-/);
});

test("real registration, duplicate error, session cookie, reload, authorization and logout", async ({ page, context }) => {
  const email = `browser-${randomUUID()}@test.com`;
  const password = "StrongPass1234";
  const registerForm = async () => {
    await page.getByLabel("Họ và tên", { exact: true }).fill("Browser Learner");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  };
  await page.goto("/register");
  await registerForm();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("alert")).toContainText("Đã tạo tài khoản");
  expect((await context.request.get("/api/v1/auth/me")).status()).toBe(401);
  await page.goto("/register");
  await registerForm();
  await expect(page.getByRole("alert")).toContainText("Không thể đăng ký với email này");
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL("/");
  const me = await context.request.get("/api/v1/auth/me");
  expect(me.status()).toBe(200);
  expect((await me.json()).email).toBe(email);
  expect((await context.cookies()).find(c => c.name === "JSESSIONID")).toMatchObject({ httpOnly: true, sameSite: "Lax" });
  expect((await context.request.get("/api/v1/admin/users")).status()).toBe(403);
  expect((await context.request.post("/api/v1/auth/register", { data: { email: "no-csrf@test.com", password, fullName: "Blocked" } })).status()).toBe(403);
  await page.reload();
  await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await context.request.get("/api/v1/auth/me")).status()).toBe(401);
  await page.goto("/notes");
  await expect(page).toHaveURL(/\/login$/);
});
