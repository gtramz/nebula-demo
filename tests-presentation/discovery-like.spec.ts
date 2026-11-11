import { test, expect, type Page } from '@playwright/test';

const headers = { Origin: 'http://127.0.0.1:4177', 'X-Nebula-Request': '1' };
const active = (page: Page) => page.locator('article[data-active=true]');
const like = (page: Page) => active(page).getByRole('button', { name: 'Like', exact: true });
async function open(page: Page, id = 11) {
  await page.request.put(`/api/publications/${id}/star`, { headers, data: { enabled: false } });
  await page.goto(`/discovery?post=post-${id}`);
  await expect(active(page).locator('.discovery-video-tap')).toBeEnabled({ timeout: 20000 });
  await expect(like(page)).toHaveAttribute('aria-pressed', 'false');
}
async function observe(page: Page) {
  await like(page).evaluate(button => {
    const history: { phase: string | null; time: number }[] = [];
    (button as HTMLElement & { phases: typeof history }).phases = history;
    new MutationObserver(() => history.push({ phase: button.getAttribute('data-like-phase'), time: performance.now() }))
      .observe(button, { attributes: true, attributeFilter: ['data-like-phase'] });
  });
}
test.beforeEach(async ({ page }) => {
  const reset = await page.request.post('/api/presentation/reset', { headers, data: { confirm: true } });
  expect(reset.ok()).toBe(true);
});

for (const id of [3, 11]) test(`like morph on publication ${id} confirms once and preserves playback and layout`, async ({ page }, info) => {
  await open(page, id); await observe(page);
  const button = like(page), before = await button.boundingBox(), count = Number(await button.locator('span').textContent());
  const media = await active(page).locator('audio,video').elementHandle();
  await expect(active(page).locator('audio,video')).toHaveJSProperty('paused', false);
  let writes = 0; page.on('request', r => { if (r.url().endsWith(`/${id}/star`) && r.method() === 'PUT') writes++; });
  if (info.project.name === 'mobile') await button.tap(); else await button.press('Enter');
  await expect(button).toHaveAttribute('data-like-phase', 'clef');
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute('data-like-phase', 'idle');
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(button.locator('span')).toHaveText(String(count + 1));
  expect(writes).toBe(1);
  expect(await button.boundingBox()).toEqual(before);
  expect(await media!.evaluate(m => m.isConnected && !(m as HTMLMediaElement).paused)).toBe(true);
  const phases = await button.evaluate(b => (b as HTMLElement & { phases: { phase: string; time: number }[] }).phases);
  expect(phases.map(p => p.phase)).toEqual(['clef', 'return', 'idle']);
  expect(phases[2].time - phases[0].time).toBeGreaterThanOrEqual(600);
  expect(phases[2].time - phases[0].time).toBeLessThan(2000);
  if (info.project.name === 'mobile') await button.tap(); else await button.press('Space');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(button.locator('span')).toHaveText(String(count));
  expect(await button.evaluate(b => (b as HTMLElement & { phases: unknown[] }).phases.length)).toBe(3);
  expect(writes).toBe(2);
});

test('slow response holds a static clef, blocks duplicate likes and cancels animation on scroll', async ({ page }, info) => {
  await open(page);
  const original = page.locator('article[data-index="0"]').getByRole('button', { name: 'Like', exact: true });
  let release!: () => void, writes = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/publications/11/star', async route => { writes++; await gate; await route.continue(); });
  await original.screenshot({ path: info.outputPath('heart-before.png') });
  await original.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(original).toHaveAttribute('data-like-phase', 'clef');
  await page.waitForTimeout(350);
  const shape = await original.locator('path').getAttribute('d');
  await page.waitForTimeout(450);
  expect(await original.locator('path').getAttribute('d')).toBe(shape);
  await expect(original).toHaveAttribute('aria-pressed', 'false');
  await page.screenshot({ path: info.outputPath('treble-clef-discovery.png') });
  await original.screenshot({ path: info.outputPath('treble-clef-button.png') });
  expect(writes).toBe(1);
  await page.locator('.discovery-feed').focus(); await page.keyboard.press('ArrowDown');
  await expect(active(page)).toHaveAttribute('data-index', '1');
  await expect(original).toHaveAttribute('data-like-phase', 'idle');
  await expect(like(page)).toHaveAttribute('data-like-phase', 'idle');
  release();
  await expect(original).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(active(page)).toHaveAttribute('data-index', '0');
  await expect(original).toHaveAttribute('data-like-phase', 'idle');
  await original.screenshot({ path: info.outputPath('heart-confirmed.png') });
  await expect(active(page).locator('audio,video')).toHaveJSProperty('paused', false);
});

test('failed like returns to its previous state and a retry succeeds without pausing or changing comments', async ({ page }) => {
  await open(page);
  const button = like(page), count = await button.locator('span').textContent();
  let writes = 0;
  await page.route('**/api/publications/11/star', route => {
    writes++; return writes === 1 ? route.fulfill({ status: 503, json: { error: 'Like temporarily unavailable' } }) : route.continue();
  });
  await button.click();
  await expect(page.getByRole('alert')).toContainText('Like temporarily unavailable');
  await expect(button).toHaveAttribute('data-like-phase', 'idle');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(button.locator('span')).toHaveText(count!);
  await button.click(); await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(button).toHaveAttribute('data-like-phase', 'idle'); expect(writes).toBe(2);
  await active(page).locator('.discovery-video-tap').click();
  await expect(active(page).locator('audio,video')).toHaveJSProperty('paused', true);
  await active(page).getByRole('button', { name: 'Comments', exact: true }).click();
  const comments = page.getByRole('complementary', { name: 'Publication comments' });
  await comments.getByLabel('Add a comment', { exact: true }).fill('Like animation preserves this draft');
  await comments.getByRole('button', { name: 'Close comments' }).click();
  await expect(active(page).locator('audio,video')).toHaveJSProperty('paused', true);
  await expect(button).toHaveAttribute('aria-pressed', 'true');
});

test('reduced motion keeps both shapes fixed and uses opacity only', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  const button = like(page), paths = button.locator('path');
  await expect(paths).toHaveCount(2);
  const before = await paths.evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/publications/11/star', async route => { await gate; await route.continue(); });
  await button.click(); await expect(button).toHaveAttribute('data-like-phase', 'clef');
  await expect(paths.nth(1)).toHaveAttribute('opacity', '1');
  expect(await paths.evaluateAll(nodes => nodes.map(node => node.getAttribute('d')))).toEqual(before);
  release(); await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(button).toHaveAttribute('data-like-phase', 'idle');
  await expect(paths.nth(0)).toHaveAttribute('opacity', '1');
});

test('guest like opens the existing login flow without a morph or write', async ({ page }) => {
  await page.request.post('/api/presentation/switch', { headers, data: { accountId: 0 } });
  await page.goto('/discovery?post=post-11');
  await expect(active(page).locator('.discovery-video-tap')).toBeEnabled({ timeout: 20000 });
  let writes = 0; page.on('request', r => { if (r.url().endsWith('/star')) writes++; });
  await like(page).click();
  await expect(page.getByRole('dialog', { name: 'Join the conversation' })).toBeVisible();
  await expect(page.locator('.discovery-like[data-like-phase="clef"]')).toHaveCount(0);
  expect(writes).toBe(0);
});
