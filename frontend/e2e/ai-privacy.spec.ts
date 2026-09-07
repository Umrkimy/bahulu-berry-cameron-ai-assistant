import { expect, test } from '@playwright/test';

test('Staff chat uses only its own history and shows server outcome feedback', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('bahulu-cameron-ai-chat', JSON.stringify([{ role: 'assistant', content: 'Private fictional owner history' }]));
    sessionStorage.setItem('bahulu-cameron-ai-chat:1', JSON.stringify([{ role: 'assistant', content: 'Other account history' }]));
  });
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) {
      await route.fulfill({ json: { id: 2, username: 'Fictional Staff', email: 'staff@example.test', role: 'STAFF', is_superuser: false, is_active: true } });
    } else if (path.endsWith('/ai-assistant/chat')) {
      expect(route.request().postDataJSON().conversation_history).toEqual([]);
      await route.fulfill({ json: { response: 'Fictional stock check complete.', cards: [], outcome: 'ANSWER' } });
    } else {
      await route.fulfill({ json: {} });
    }
  });
  await page.goto('/ai-assistant');
  await expect(page.getByText('Live operations help', { exact: false })).toBeVisible();
  await expect(page.getByText('Private fictional owner history')).toHaveCount(0);
  await expect(page.getByText('Other account history')).toHaveCount(0);
  await page.getByPlaceholder('Message Bahulu Berry Cameron AI...').fill('Check fictional stock');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByText('Fictional stock check complete.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('bahulu-cameron-ai-chat'))).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
