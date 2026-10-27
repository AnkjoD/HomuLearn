import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test.describe('Study Productivity — real API and PostgreSQL', () => {
  test.beforeEach(async ({ page }) => {
    const email = `productivity-${randomUUID()}@test.com`;
    await page.goto('/register');
    await page.getByLabel('Họ và tên', { exact: true }).fill('Productivity Tester');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill('StrongPass1234');
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill('StrongPass1234');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
  });

  test('goals CRUD persists and dashboard reflects mutations', async ({ page }) => {
    await page.goto('/goals');
    await page.getByRole('button', { name: 'Mục tiêu mới' }).click();
    await page.getByLabel('Tiêu đề mục tiêu').fill('Học tiếng Anh');
    await page.getByLabel('Chỉ tiêu').fill('3');
    await page.getByLabel('Đơn vị').fill('giờ');
    await page.getByLabel('Hạn chót').fill('2026-12-31');
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(page.getByText('0/3 giờ', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cộng thêm 1', exact: true }).click();
    await expect(page.getByText('1/3 giờ', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('1/3 giờ', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sửa mục tiêu', exact: true }).click();
    await page.getByLabel('Tiêu đề mục tiêu').fill('Hoàn thành tiếng Anh');
    await page.getByLabel('Tiến độ hiện tại').fill('3');
    await page.getByLabel('Đơn vị').fill('bài');
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(page.getByText('3/3 bài', { exact: true })).toBeVisible();
    await page.goto('/');
    await expect(page.getByTestId('stat-goalDone')).toHaveText('1');
    await expect(page.getByTestId('stat-goalInProgress')).toHaveText('0');
    await page.goto('/goals');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Xóa mục tiêu', exact: true }).click();
    await expect(page.getByText('Hoàn thành tiếng Anh', { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText('Hoàn thành tiếng Anh', { exact: true })).toHaveCount(0);
    await page.goto('/'); await expect(page.getByTestId('stat-goalDone')).toHaveText('0');
  });

  test('timer pause/resume completes once, retries failed save, persists history and stats', async ({ page }) => {
    await page.clock.install();
    await page.goto('/pomodoro');
    await expect(page.getByRole('tab', { name: 'Lịch sử (0)' })).toBeVisible();
    await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await page.clock.fastForward(60_000);
    await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
    await expect(page.getByText('24:00', { exact: true })).toBeVisible();
    await page.clock.fastForward(60_000);
    await expect(page.getByText('24:00', { exact: true })).toBeVisible();
    let failedKey;
    await page.route('**/api/v1/pomodoro-sessions', async route => {
      if (route.request().method() === 'POST' && !failedKey) {
        failedKey = route.request().headers()['idempotency-key']; return route.abort();
      }
      return route.continue();
    });
    await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await page.clock.fastForward(24 * 60_000);
    await expect(page.getByRole('button', { name: 'Lưu lại phiên' })).toBeVisible();
    const saved = page.waitForResponse(r => r.url().endsWith('/api/v1/pomodoro-sessions') && r.request().method() === 'POST' && r.status() === 201);
    await page.getByRole('button', { name: 'Lưu lại phiên' }).click();
    expect((await saved).request().headers()['idempotency-key']).toBe(failedKey);
    await page.getByRole('tab', { name: 'Lịch sử (1)' }).click();
    await expect(page.getByText('Phiên học tập (25 phút)', { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole('tab', { name: 'Lịch sử (1)' }).click();
    await expect(page.getByText('Phiên học tập (25 phút)', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Timer', exact: true }).click();
    await page.getByRole('button', { name: 'Bỏ qua' }).click();
    await page.goto('/');
    await expect(page.getByTestId('stat-sessionCount')).toHaveText('1');
    await expect(page.getByTestId('stat-totalMinutes')).toHaveText('25');
  });

  test('dashboard recovers after network failure and counts a real note', async ({ page }) => {
    const csrf = await (await page.request.get('/api/v1/auth/csrf')).json();
    const created = await page.request.post('/api/v1/notes', { headers: { [csrf.headerName]: csrf.token }, data: { title: 'Dashboard thật', content: '' } });
    expect(created.status()).toBe(201);
    await page.route('**/api/v1/dashboard/stats', route => route.abort());
    await page.goto('/'); await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toBeVisible();
    await page.unroute('**/api/v1/dashboard/stats');
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await expect(page.getByTestId('stat-noteCount')).toHaveText('1');
    await expect(page.getByRole('button', { name: 'Dashboard thật', exact: true })).toBeVisible();
  });

  test('concurrent duplicate sessions save one database row', async ({ page }) => {
    const csrf = await (await page.request.get('/api/v1/auth/csrf')).json();
    const options = { headers: { [csrf.headerName]: csrf.token, 'Idempotency-Key': randomUUID() }, data: { durationMinutes: 25 } };
    const results = await Promise.all([page.request.post('/api/v1/pomodoro-sessions', options), page.request.post('/api/v1/pomodoro-sessions', options)]);
    expect(results.map(r => r.status()).sort()).toEqual([200, 201]);
    const history = await (await page.request.get('/api/v1/pomodoro-sessions')).json();
    expect(history.sessions).toHaveLength(1); expect(history.totalMinutes).toBe(25);
  });
});
