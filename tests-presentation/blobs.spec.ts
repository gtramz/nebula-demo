import { test, expect } from '@playwright/test';
const headers = { Origin: 'http://127.0.0.1:4177', 'X-Nebula-Request': '1' };
async function artist(page: import('@playwright/test').Page) {
  await page.request.post('/api/presentation/switch', { headers, data: { accountId: 0 } });
  const response = await page.request.post('/api/rpc', { headers, data: { method: 'register', args: [{ name: 'Blob Artist', email: `blob-${crypto.randomUUID()}@example.invalid`, password: 'preview123', role: 'artist' }] } });
  expect(response.ok()).toBe(true);
  await page.goto('/onboarding');
  await expect(page.getByRole('heading', { name: 'Identity', exact: true })).toBeFocused();
}

test('onboarding gives truthful feedback, saves once and keeps invalid work', async ({ page }) => {
  await artist(page);
  let writes = 0;
  page.on('request', request => { if (request.url().endsWith('/api/rpc') && request.postDataJSON()?.method === 'updateArtistIdentity') writes++; });
  await page.getByLabel('artist name', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Save & continue', exact: true }).click();
  await expect(page.locator('[data-blob-mood="angry"]')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('artist name');
  await expect(page.getByRole('heading', { name: 'Identity', exact: true })).toBeVisible();
  expect(writes).toBe(0);
  await expect(page.getByRole('button', { name: 'Save & continue', exact: true })).toBeEnabled();
  await page.getByLabel('artist name', { exact: true }).fill('Saved Blob Artist');
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let received = false;
  await page.route('**/api/rpc', async route => {
    if (route.request().postDataJSON()?.method !== 'updateArtistIdentity') return route.continue();
    const response = await route.fetch(); received = true; await gate; await route.fulfill({ response });
  });
  await page.getByLabel('artist name', { exact: true }).press('Enter');
  await expect.poll(() => received).toBe(true);
  await expect(page.locator('[data-blob-mood="happy"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Identity', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save & continue', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Skip this step', exact: true })).toBeDisabled();
  release(); await expect(page.locator('[data-blob-mood="happy"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Creative identity', exact: true })).toBeFocused();
  expect(writes).toBe(1);
  await page.unroute('**/api/rpc');
  await page.route('**/api/rpc', route => route.request().postDataJSON()?.method === 'updateArtistIdentity' ? route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'Profile changed in another tab. Reopen to review your saved version.' }) }) : route.continue());
  await page.getByRole('button', { name: 'Save & continue', exact: true }).click();
  await expect(page.locator('[data-blob-mood="angry"]')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('another tab');
  await expect(page.getByRole('button', { name: 'Save & continue', exact: true })).toBeEnabled();
  await expect(page.getByRole('alert')).toContainText('another tab');
  await expect(page.getByRole('heading', { name: 'Creative identity', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('optional setup advances with reduced motion and Home wink does not restart', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await artist(page);
  await page.getByRole('button', { name: 'Skip this step', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Creative identity', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Save & continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Interests & preferences', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Save & continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Profile completion', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Finish setup', exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.locator('[data-blob-wink]')).toHaveAttribute('data-blob-wink', 'done');
  await page.getByRole('combobox', { name: 'Search Home opportunities', exact: true }).fill('afterglow');
  await expect(page.locator('[data-blob-wink]')).toHaveAttribute('data-blob-wink', 'done');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Find your next project.', exact: true })).toBeVisible();
});

test('leaving a completed save during feedback does not navigate later or replay the Home wink', async ({ page }) => {
  await artist(page);
  const changed = await page.request.post('/api/rpc', { headers, data: { method: 'updateArtistIdentity', args: [{ onboarding: { step: 4 } }] } });
  expect(changed.ok()).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Profile completion', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finish setup', exact: true }).click();
  await expect(page.locator('[data-blob-mood="happy"]')).toBeVisible();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('link', { name: 'Go to profile', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  // Deliberately outwait the discarded animation callback to detect late redirects.
  await page.waitForTimeout(2200);
  await expect(page).toHaveURL(/\/profile$/);
  await page.goto('/explore');
  await expect(page.locator('[data-blob-wink]')).toHaveAttribute('data-blob-wink', 'done');
  await page.getByRole('combobox', { name: 'Search Home opportunities', exact: true }).fill('afterglow');
  await expect(page.locator('[data-blob-wink]')).toHaveAttribute('data-blob-wink', 'done');
});
