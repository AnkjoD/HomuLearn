/**
 * notes.spec.js — E2E tests cho Notes CRUD (Playwright Chromium)
 *
 * Yêu cầu:
 *   - Backend chạy ở :18080 với DB test (DB_URL=...test...)
 *   - Frontend dev ở :5176
 *   - Tài khoản test được tạo mới bằng randomUUID → không xung đột giữa các lần chạy
 *
 * Luồng: đăng ký → đăng nhập → tạo note → xem detail → sửa → xóa → reload
 */
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

const email = `notes-e2e-${randomUUID()}@test.com`;
const password = "StrongPass1234";

test.describe("Notes CRUD", () => {
  // Đăng ký và đăng nhập một lần trước tất cả test trong group
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ baseURL: "http://127.0.0.1:5176" });
    await page.goto("/register");
    await page.getByLabel("Họ và tên", { exact: true }).fill("Notes Tester");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Đăng nhập trước mỗi test
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
    await page.goto("/notes");
  });

  // -----------------------------------------------------------------------
  test("tạo ghi chú mới, hiển thị trong danh sách", async ({ page }) => {
    const title = `E2E Note ${randomUUID().slice(0, 8)}`;

    await page.getByRole("button", { name: "Ghi chú mới" }).click();
    await page.getByLabel("Tiêu đề").fill(title);
    await page.getByLabel("Nội dung").fill("Content before clearing");
    await page.getByLabel("Nội dung").fill("Nội dung thử nghiệm E2E");
    await page.getByRole("button", { name: "Lưu" }).click();

    // Dialog đóng, note xuất hiện trong danh sách
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText(title)).toBeVisible();
  });

  // -----------------------------------------------------------------------
  test("validation: title rỗng không cho lưu", async ({ page }) => {
    await page.getByRole("button", { name: "Ghi chú mới" }).click();
    // Form deliberately disables submit for a blank title.
    await expect(page.getByRole("button", { name: "Lưu" })).toBeDisabled();
    await page.getByLabel("Tiêu đề").fill("   ");
    await expect(page.getByRole("button", { name: "Lưu" })).toBeDisabled();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  // -----------------------------------------------------------------------
  test("xem chi tiết note, sửa title và content", async ({ page }) => {
    const title = `Detail Test ${randomUUID().slice(0, 8)}`;
    const updatedTitle = `${title} - Đã sửa`;

    // Tạo note
    await page.getByRole("button", { name: "Ghi chú mới" }).click();
    await page.getByLabel("Tiêu đề").fill(title);
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Click vào card để xem detail
    await page.getByText(title).click();
    await expect(page).toHaveURL(/\/notes\/.+/);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();

    // Chỉnh sửa
    await page.getByRole("button", { name: "Chỉnh sửa" }).click();
    const titleInput = page.getByLabel("Tiêu đề");
    await titleInput.clear();
    await titleInput.fill(updatedTitle);
    await page.getByLabel("Nội dung").clear();
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("heading", { name: updatedTitle, exact: true })).toBeVisible();
    const response = await page.request.get(new URL(page.url()).pathname.replace("/notes/", "/api/v1/notes/"));
    expect((await response.json()).content).toBe("");
  });

  // -----------------------------------------------------------------------
  test("xóa note, không còn trong danh sách", async ({ page }) => {
    const title = `Delete Test ${randomUUID().slice(0, 8)}`;

    // Tạo note
    await page.getByRole("button", { name: "Ghi chú mới" }).click();
    await page.getByLabel("Tiêu đề").fill(title);
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText(title)).toBeVisible();

    // Xóa: click icon delete trên card (hover để thấy button)
    const card = page.locator("[data-testid='note-card']").filter({ hasText: title }).first();
    await card.hover();
    await card.getByRole("button", { name: "Xoá" }).click();

    await expect(page.getByText(title)).not.toBeVisible();
  });

  // -----------------------------------------------------------------------
  test("reload trang vẫn còn dữ liệu từ DB", async ({ page }) => {
    const title = `Reload Test ${randomUUID().slice(0, 8)}`;

    await page.getByRole("button", { name: "Ghi chú mới" }).click();
    await page.getByLabel("Tiêu đề").fill(title);
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Reload
    await page.reload();
    await expect(page.getByText(title)).toBeVisible();
  });

  // -----------------------------------------------------------------------
  test("guest bị redirect về /login khi truy cập /notes", async ({ browser }) => {
    // Tạo context mới không có session
    const ctx = await browser.newContext({ baseURL: "http://127.0.0.1:5176" });
    const page = await ctx.newPage();
    await page.goto("/notes");
    await expect(page).toHaveURL(/\/login$/);
    await ctx.close();
  });

  // -----------------------------------------------------------------------
  test("tìm kiếm debounce lọc đúng note", async ({ page }) => {
    const unique = randomUUID().slice(0, 8);
    const title = `Search ${unique}`;

    await page.getByRole("button", { name: "Ghi chú mới" }).click();
    await page.getByLabel("Tiêu đề").fill(title);
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Gõ search
    await page.getByPlaceholder("Tìm ghi chú…").fill(unique);
    // Chờ debounce 300ms + render
    await expect(page.getByTestId("note-card")).toHaveCount(1);
    await expect(page.getByText(title)).toBeVisible();

    // Xóa search
    await page.getByPlaceholder("Tìm ghi chú…").clear();
    await expect(page.getByPlaceholder("Tìm ghi chú…")).toHaveValue("");
  });

  test("lỗi mạng hiện thông báo và có thể thử lại", async ({ page }) => {
    await page.route("**/api/v1/notes?*", route => route.abort());
    await page.reload();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.unroute("**/api/v1/notes?*");
    await page.getByRole("button", { name: "Thử lại" }).click();
    await expect(page.getByRole("alert")).not.toBeVisible();
    await expect(page.getByRole("progressbar")).not.toBeVisible();
  });
});
