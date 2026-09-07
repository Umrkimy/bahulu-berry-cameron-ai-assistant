import { expect, test } from '@playwright/test';

for (const width of [360, 768, 1280]) {
  test(`fulfilment opens the selected record and preserves filters at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const path = new URL(route.request().url()).pathname.replace('/api', '');
      const order = { id: 7, customer_id: 1, status: 'PENDING', payment_status: 'PAID', total_amount: '10.00', subtotal: '10.00', discount_amount: '0.00', created_at: '2026-09-07T01:00:00Z', updated_at: '2026-09-07T01:00:00Z' };
      const responses: Record<string, unknown> = {
        '/auth/csrf': {},
        '/auth/me': { id: 2, username: 'Fictional Staff', email: 'staff@example.test', role: 'STAFF', is_active: true, is_superuser: false },
        '/orders/fulfilment': { counts: { NEEDS_ATTENTION: 0, READY_TO_PREPARE: 1, IN_PREPARATION: 0, IN_DELIVERY: 0 }, items: [{ ...order, customer_name: 'Fictional Customer', queue_stage: 'READY_TO_PREPARE', delivery: null }] },
        '/orders/7': order,
        '/customers': [{ id: 1, full_name: 'Fictional Customer' }],
        '/products/admin': { items: [], total: 0, page: 1, page_size: 20 },
        '/payments/orders/7': null,
        '/refund-requests/orders/7': null,
        '/deliveries/orders/7': null,
      };
      await route.fulfill({ json: Object.hasOwn(responses, path) ? responses[path] : [] });
    });
    await page.goto('/fulfillment');
    await expect(page.getByRole('heading', { name: 'Fulfilment', exact: true })).toBeVisible();
    const search = page.getByPlaceholder('Search order, customer, courier, tracking...');
    await search.fill('Fictional');
    await page.getByRole('button', { name: 'View details', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('7');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(search).toHaveValue('Fictional');
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(search).toHaveValue('');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`fulfilment-${width}.png`), fullPage: true });
  });
}
