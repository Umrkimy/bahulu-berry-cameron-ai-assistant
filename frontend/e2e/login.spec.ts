import { expect, test } from '@playwright/test';

test('shows a usable sign-in screen', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});

test('shows the server retry time and prevents repeated login attempts', async ({ page }) => {
  await page.route('**/api/auth/csrf', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"csrf_token":"test"}' });
  });
  await page.route('**/api/auth/token', async (route) => {
    await route.fulfill({ status: 429, headers: { 'Retry-After': '3' }, contentType: 'application/json', body: '{"detail":{"message":"Too many requests.","retry_after_seconds":3}}' });
  });

  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill('owner@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('alert')).toContainText('Try again in 3 seconds');
  await expect(page.getByRole('button', { name: 'Try again in 3s' })).toBeDisabled();
});
