import { test, expect, type Page } from '@playwright/test';
const headers = { Origin: 'http://127.0.0.1:4177', 'X-Nebula-Request': '1' };
async function activeCount(page: Page) {
 return page.evaluate(() => ((window as any).__observedPlayers as HTMLMediaElement[]).filter(media => !media.paused && !media.ended).length);
}
test.beforeEach(async ({ page }) => {
 await page.request.post('/api/presentation/reset', { headers, data: { confirm: true } });
 // Retain elements after unmount too: a detached player must not keep sounding.
 await page.addInitScript(() => {
  (window as any).__observedPlayers = [];
  document.addEventListener('play', event => {
   if (event.target instanceof HTMLMediaElement && !(window as any).__observedPlayers.includes(event.target)) (window as any).__observedPlayers.push(event.target);
  }, true);
 });
});
test('Home audio is exclusive, including fast switches and silent catalog players', async ({ page }) => {
 await page.goto('/explore');
 const original = page.getByRole('article', { name: 'LUNA · Next phase', exact: true });
 const remix = page.getByRole('article', { name: 'CHILZ · Next chapter', exact: true });
 const noPop = page.getByRole('article', { name: 'No Pop', exact: true });
 const noRegrets = page.getByRole('article', { name: 'No Regrets', exact: true });
 await original.getByRole('button', { name: 'Play luna', exact: true }).click();
 await expect.poll(() => original.locator('audio').evaluate((a: HTMLMediaElement) => a.currentTime)).toBeGreaterThan(.1);
 await remix.getByRole('button', { name: 'Play luna - chilz remix', exact: true }).click();
 await expect.poll(() => original.locator('audio').evaluate((a: HTMLMediaElement) => a.paused)).toBe(true);
 await expect.poll(() => activeCount(page)).toBe(1);
 // Immediate changes do not leave an earlier play request running.
 for (let i = 0; i < 2; i++) {
  await original.getByRole('button', { name: 'Play luna', exact: true }).click();
  await remix.getByRole('button', { name: 'Play luna - chilz remix', exact: true }).click();
  await expect.poll(() => activeCount(page)).toBe(1);
  await expect(original.getByRole('button', { name: 'Play luna', exact: true })).toBeVisible();
 }
 await noPop.getByRole('button', { name: 'Play: No Pop', exact: true }).click();
 await expect.poll(() => activeCount(page)).toBe(0);
 await expect(noPop.getByRole('slider')).not.toHaveValue('0');
 await noRegrets.getByRole('button', { name: 'Play: No Regrets', exact: true }).click();
 await expect(noPop.getByRole('button', { name: 'Play: No Pop', exact: true })).toBeVisible();
 const stopped = await noPop.getByRole('slider').inputValue();
 await original.getByRole('button', { name: 'Play luna', exact: true }).click();
 await expect(noRegrets.getByRole('button', { name: 'Play: No Regrets', exact: true })).toHaveCount(1);
 await expect(noPop.getByRole('slider')).toHaveValue(stopped);
 await expect.poll(() => activeCount(page)).toBe(1);
});
test('entering a project stops Home audio; project playback and Back never duplicate it', async ({ page }) => {
 await page.goto('/explore');
 for (const [name, title] of [['LUNA · Next phase', 'luna'], ['CHILZ · Next chapter', 'luna - chilz remix']]) {
  const card = page.getByRole('article', { name, exact: true });
  await card.getByRole('button', { name: `Play ${title}`, exact: true }).click();
  const old = await card.locator('audio').elementHandle();
  await expect.poll(() => old!.evaluate((a: HTMLMediaElement) => a.currentTime)).toBeGreaterThan(.1);
  await card.getByRole('link', { name: 'View project', exact: true }).click();
  await expect(page).toHaveURL(/\/project\/\d+$/);
  await expect.poll(() => old!.evaluate((a: HTMLMediaElement) => a.paused)).toBe(true);
  await expect.poll(() => activeCount(page)).toBe(0);
  const featured = page.getByRole('region', { name: `Featured recording: ${title}`, exact: true });
  await featured.getByRole('button', { name: `Play ${title}`, exact: true }).click();
  await expect.poll(() => featured.locator('audio').evaluate((a: HTMLMediaElement) => a.currentTime)).toBeGreaterThan(.1);
  await expect.poll(() => activeCount(page)).toBe(1);
  await expect.poll(() => old!.evaluate((a: HTMLMediaElement) => a.paused)).toBe(true);
  const detail = await featured.locator('audio').elementHandle();
  await page.locator('a[data-contextual-return=true]').first().click();
  await expect(page).toHaveURL(/\/explore/);
  await expect.poll(() => detail!.evaluate((a: HTMLMediaElement) => a.paused)).toBe(true);
  await expect.poll(() => activeCount(page)).toBe(0);
  await expect(card.getByRole('button', { name: `Play ${title}`, exact: true })).toHaveCount(1);
 }
 const catalog = page.getByRole('article', { name: 'No Pop', exact: true });
 await catalog.getByRole('button', { name: 'Play: No Pop', exact: true }).click();
 await expect(catalog.getByRole('slider')).not.toHaveValue('0');
 await catalog.getByRole('link', { name: 'View project', exact: true }).click();
 await expect(page.getByRole('button', { name: 'Play: No Pop', exact: true })).toBeVisible();
 await expect.poll(() => activeCount(page)).toBe(0);
 await page.locator('a[data-contextual-return=true]').first().click();
 await expect(catalog.getByRole('button', { name: 'Play: No Pop', exact: true })).toHaveCount(1);
 await expect(catalog.getByRole('slider')).toHaveValue('0');
});
