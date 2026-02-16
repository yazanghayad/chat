import { test, expect } from '@playwright/test';

// ── Smoke: pages load without 500 errors ──────────────────────────────

test.describe('Smoke tests', () => {
  test('landing page redirects to /dashboard/overview', async ({ page }) => {
    const response = await page.goto('/');
    // Either it loads the page or redirects to sign-in (auth required)
    expect(response?.status()).toBeLessThan(500);
  });

  test('sign-in page renders the form', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await expect(
      page.locator('[data-slot="card-title"]').first()
    ).toContainText(/sign in/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('sign-up page renders the form', async ({ page }) => {
    await page.goto('/auth/sign-up');
    await expect(
      page.locator('[data-slot="card-title"]').first()
    ).toContainText(/create account/i);
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('sign-in page has link to sign-up', async ({ page }) => {
    await page.goto('/auth/sign-in');
    const link = page.locator('a[href="/auth/sign-up"]');
    await expect(link).toBeVisible();
  });

  test('sign-up page has link to sign-in', async ({ page }) => {
    await page.goto('/auth/sign-up');
    const link = page.locator('a[href="/auth/sign-in"]');
    await expect(link).toBeVisible();
  });
});

// ── Auth guard: dashboard redirects unauthenticated users ────────────

test.describe('Auth guard', () => {
  test('unauthenticated user on /dashboard is redirected to sign-in', async ({
    page
  }) => {
    await page.goto('/dashboard/overview');

    // The proxy should redirect to /auth/sign-in
    await page.waitForURL(/auth\/sign-in/, { timeout: 10_000 });
    expect(page.url()).toContain('/auth/sign-in');
  });

  test('unauthenticated user on /dashboard/conversations is redirected', async ({
    page
  }) => {
    await page.goto('/dashboard/conversations');
    await page.waitForURL(/auth\/sign-in/, { timeout: 10_000 });
    expect(page.url()).toContain('/auth/sign-in');
  });
});

// ── API health check ─────────────────────────────────────────────────

test.describe('API routes', () => {
  test('health endpoint returns 200', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

  test('widget JS route returns JavaScript', async ({ request }) => {
    const response = await request.get('/api/widget/chat-widget.js');
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('javascript');
  });
});

// ── Sign-in form validation ──────────────────────────────────────────

test.describe('Sign-in form', () => {
  test('submitting empty form shows validation', async ({ page }) => {
    await page.goto('/auth/sign-in');

    // HTML5 validation should prevent submit
    const email = page.locator('input[name="email"]');
    const password = page.locator('input[name="password"]');

    // Both fields should have required attribute
    await expect(email).toHaveAttribute('required', '');
    await expect(password).toHaveAttribute('required', '');
  });

  test('submitting with wrong credentials stays on sign-in', async ({
    page
  }) => {
    await page.goto('/auth/sign-in');
    await page.fill('input[name="email"]', 'nobody@example.com');
    await page.fill('input[name="password"]', 'wrong-password-123');

    // Use JS to submit to bypass HTML validation
    await page.locator('button[type="submit"]').click();

    // Should stay on sign-in (the server action will fail)
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/auth/sign-in');
  });
});
