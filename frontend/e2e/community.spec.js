import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test.describe('Community Posts & Comments — real API, session, authorization & PostgreSQL', () => {
  const registerAndLogin = async (page, fullName, email, password) => {
    await page.goto('/register');
    await page.getByLabel('Họ và tên', { exact: true }).fill(fullName);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
  };

  test('post CRUD, comment CRUD, pagination and ownership rules in multi-user scenario', async ({ browser }) => {
    const userAContext = await browser.newContext({ baseURL: "http://127.0.0.1:5176" });
    const userBContext = await browser.newContext({ baseURL: "http://127.0.0.1:5176" });

    const pageA = await userAContext.newPage();
    const pageB = await userBContext.newPage();

    const emailA = `comm-alice-${randomUUID()}@test.com`;
    const emailB = `comm-bob-${randomUUID()}@test.com`;
    const pass = 'Password123!';

    // User A registers & logs in
    await registerAndLogin(pageA, 'Alice Community', emailA, pass);
    // User B registers & logs in
    await registerAndLogin(pageB, 'Bob Community', emailB, pass);

    // 1. User A creates a post
    await pageA.goto('/community');
    await pageA.getByTestId('create-post-btn').click();
    const postTitle = `Bài viết thuật toán Dijkstra ${randomUUID().substring(0, 5)}`;
    const postContent = 'Giải thuật tìm đường đi ngắn nhất đồ thị có trọng số không âm.';
    await pageA.getByTestId('post-title-input').locator('input').fill(postTitle);
    await pageA.getByTestId('post-content-input').locator('textarea').first().fill(postContent);
    await pageA.getByTestId('save-post-btn').click();

    // Verify post card appears for User A
    const postCardA = pageA.locator(`[data-testid^="post-card-"]`, { hasText: postTitle });
    await expect(postCardA).toBeVisible();

    // User A can see edit/delete buttons on their post
    await expect(postCardA.locator('[data-testid^="edit-post-"]')).toBeVisible();
    await expect(postCardA.locator('[data-testid^="delete-post-"]')).toBeVisible();

    // 2. User B visits community -> can see User A post, but CANNOT see edit/delete
    await pageB.goto('/community');
    const postCardB = pageB.locator(`[data-testid^="post-card-"]`, { hasText: postTitle });
    await expect(postCardB).toBeVisible();
    await expect(postCardB.locator('[data-testid^="edit-post-"]')).toHaveCount(0);
    await expect(postCardB.locator('[data-testid^="delete-post-"]')).toHaveCount(0);

    // 3. User B opens post detail and writes a comment
    await postCardB.click();

    const commentInput = pageB.getByRole('textbox', { name: 'Bình luận của bạn', exact: true });
    await expect(commentInput).toBeVisible();
    await commentInput.fill('Độ phức tạp là O((V + E) log V) khi dùng min-heap.');
    await pageB.getByTestId('send-comment-btn').click();

    // User B verifies their comment is displayed
    const commentText = 'Độ phức tạp là O((V + E) log V) khi dùng min-heap.';
    await expect(pageB.getByText(commentText)).toBeVisible();

    // User B sees edit/delete on their own comment
    const commentItemB = pageB.locator('[data-testid^="comment-item-"]', { hasText: commentText });
    await expect(commentItemB.locator('[data-testid^="edit-comment-"]')).toBeVisible();
    await expect(commentItemB.locator('[data-testid^="delete-comment-"]')).toBeVisible();

    const stableCommentItemB = pageB.getByTestId(await commentItemB.getAttribute("data-testid"));
    // User B edits their comment
    await commentItemB.locator('[data-testid^="edit-comment-"]').click();
    const editCommentInput = stableCommentItemB.getByRole('textbox');
    const updatedCommentText = 'Độ phức tạp O((V + E) log V) khi dùng PriorityQueue Java.';
    await editCommentInput.fill(updatedCommentText);
    await stableCommentItemB.locator('[data-testid^="save-edit-comment-"]').click();
    await expect(pageB.getByText(updatedCommentText)).toBeVisible();

    // 4. User A opens the same post: sees User B's comment, but NO edit/delete on B's comment
    await postCardA.click();
    await expect(pageA.getByText(updatedCommentText)).toBeVisible();
    const commentItemA = pageA.locator('[data-testid^="comment-item-"]', { hasText: updatedCommentText });
    await expect(commentItemA.locator('[data-testid^="edit-comment-"]')).toHaveCount(0);
    await expect(commentItemA.locator('[data-testid^="delete-comment-"]')).toHaveCount(0);

    // User A closes detail modal
    await pageA.getByRole('button', { name: 'Đóng', exact: true }).click();

    // 5. User A edits their own post
    await postCardA.locator('[data-testid^="edit-post-"]').click();
    const updatedTitle = postTitle + ' [Đã cập nhật]';
    await pageA.getByTestId('post-title-input').locator('input').fill(updatedTitle);
    await pageA.getByTestId('save-post-btn').click();
    await expect(pageA.getByText(updatedTitle)).toBeVisible();

    // 6. User A deletes their own post -> cascade deletes everything
    pageA.once('dialog', d => d.accept());
    await pageA.locator(`[data-testid^="post-card-"]`, { hasText: updatedTitle }).locator('[data-testid^="delete-post-"]').click();
    await expect(pageA.getByText(updatedTitle)).toHaveCount(0);

    // Reload User B -> post is gone
    await pageB.reload();
    await expect(pageB.getByText(updatedTitle)).toHaveCount(0);

    await userAContext.close();
    await userBContext.close();
  });

  test('network errors keep post form input and allow retry', async ({ page }) => {
    await registerAndLogin(page, 'Retry Tester', `comm-retry-${randomUUID()}@test.com`, 'Password123!');
    await page.route('**/api/v1/posts?*', route => route.abort());
    await page.goto('/community');
    await expect(page.getByRole('button', {name:'Thử lại',exact:true})).toBeVisible();
    await expect(page.getByTestId('empty-posts')).toHaveCount(0);
    await page.unroute('**/api/v1/posts?*');
    await page.getByRole('button', {name:'Thử lại',exact:true}).click();
    await expect(page.getByRole('button', {name:'Thử lại',exact:true})).toHaveCount(0);
    await page.getByTestId('create-post-btn').click();
    const title = `Retry post ${randomUUID()}`;
    await page.getByLabel('Tiêu đề bài viết').fill(title);
    await page.getByRole('textbox', {name:/^Nội dung/}).fill('Giữ nội dung khi lỗi mạng');
    let failed=false;
    await page.route('**/api/v1/posts', route => {
      if (route.request().method()==='POST' && !failed) { failed=true;return route.abort(); }
      return route.continue();
    });
    await page.getByTestId('save-post-btn').click();
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Tiêu đề bài viết')).toHaveValue(title);
    await expect(page.getByRole('textbox', {name:/^Nội dung/})).toHaveValue('Giữ nội dung khi lỗi mạng');
    await page.getByTestId('save-post-btn').click();
    const card = page.locator('[data-testid^="post-card-"]', {hasText:title});
    await expect(card).toBeVisible();
    page.once('dialog', d=>d.accept());await card.locator('[data-testid^="delete-post-"]').click();
    await expect(card).toHaveCount(0);
  });

  test('pagination reads the second page from the real API', async ({ page }) => {
    await registerAndLogin(page, 'Pagination Tester', `comm-pages-${randomUUID()}@test.com`, 'Password123!');
    const csrf=await (await page.request.get('/api/v1/auth/csrf')).json();
    const headers={[csrf.headerName]:csrf.token};const ids=[];const prefix=`Paging ${randomUUID()}`;
    try {
      for (let i=0;i<11;i++) {
        const response=await page.request.post('/api/v1/posts',{headers,data:{title:`${prefix} ${i}`,content:'Page fixture'}});
        expect(response.status()).toBe(201);ids.push((await response.json()).id);
      }
      const first = await (await page.request.get('/api/v1/posts?page=0&size=10')).json();
      const second = await (await page.request.get('/api/v1/posts?page=1&size=10')).json();
      expect(second.content.length).toBeGreaterThan(0);
      await page.goto('/community');
      await expect(page.getByTestId(`post-card-${first.content[0].id}`)).toBeVisible();
      const requested=page.waitForResponse(r=>r.url().includes('/api/v1/posts?page=1&size=10') && r.status()===200);
      await page.getByRole('button',{name:'Go to page 2',exact:true}).click();await requested;
      for (const post of second.content) await expect(page.getByTestId(`post-card-${post.id}`)).toBeVisible();
      await expect(page.getByTestId(`post-card-${first.content[0].id}`)).toHaveCount(0);
    } finally {
      for (const id of ids) await page.request.delete(`/api/v1/posts/${id}`,{headers});
    }
  });
});
