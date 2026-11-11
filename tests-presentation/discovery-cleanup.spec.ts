import { test, expect, type Page } from '@playwright/test';
const headers = { Origin: 'http://127.0.0.1:4177', 'X-Nebula-Request': '1' };
const active = (page: Page) => page.locator('article[data-active=true]');
const discovery = (page: Page) => page.locator('#primary-navigation a[href="/discovery"]');
async function open(page: Page) {
  await page.request.post('/api/presentation/reset', { headers, data: { confirm: true } });
  await page.goto('/discovery?post=post-14');
  await expect(active(page)).toContainText('Dante');
}
async function pull(page: Page, distance: number, cancel = false) {
  await page.locator('.discovery-feed').evaluate((element, { distance, cancel }) => {
    const touch = (y: number) => new Touch({ identifier: 1, target: element, clientX: 180, clientY: y });
    element.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(200)] }));
    element.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [touch(200 + distance)] }));
    element.dispatchEvent(new TouchEvent(cancel ? 'touchcancel' : 'touchend', { bubbles: true, touches: [] }));
  }, { distance, cancel });
}

test('clean feed keeps Create, avatar Profile at sidebar bottom, More in Profile and mobile navigation', async ({ page }, info) => {
  await open(page);
  for (const width of [390, 767, 768, 932, 1440]) {
    await page.setViewportSize({ width, height: 930 });
    await expect(page.locator('.discovery-post-top,.discovery-preview-note')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'publish +', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'More', exact: true })).toHaveCount(0);
    const profile = page.locator('#primary-navigation a[href="/profile"]');
    await expect(profile.locator('img')).toBeVisible();
    expect((await profile.boundingBox())!.y).toBeGreaterThan(820);
    await expect(page.getByRole('navigation', { name: 'Primary navigation', exact: true })).toHaveCount(1);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: 'Publish audio or video' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Create project' })).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.getByRole('menu')).toHaveCount(0);
    if (width === 390 || width === 932) await page.screenshot({ path: info.outputPath(`discovery-${width}.png`) });
  }
  await page.locator('#primary-navigation a[href="/profile"]').click();
  const more = page.getByRole('button', { name: 'More', exact: true }); await more.click();
  await expect(page.getByRole('menuitem', { name: 'Mobile view' })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(more).toBeFocused();
});

test('reselect refreshes a fresh snapshot once without page reload; errors preserve the publication and allow retry', async ({ page }) => {
  await open(page);
  let fresh = 0, fail = true, release: (() => void) | undefined;
  const hold = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/feed?*', async route => {
    const url = new URL(route.request().url());
    if (!url.searchParams.has('snapshot')) {
      fresh++; await hold;
      if (fail) return route.fulfill({ status: 503, json: { error: 'Refresh temporarily unavailable' } });
    }
    await route.continue();
  });
  await page.evaluate(() => { (window as any).__sameDocument = true; });
  const before = await active(page).getAttribute('aria-label');
  await discovery(page).click(); await discovery(page).click();
  await expect.poll(() => fresh).toBe(1); release!();
  await expect(page.getByRole('button', { name: 'Retry refresh' })).toBeVisible();
  await expect(active(page)).toHaveAttribute('aria-label', before!);
  fail = false; await page.getByRole('button', { name: 'Retry refresh' }).click();
  await expect(page.getByRole('button', { name: 'Retry refresh' })).toHaveCount(0);
  expect(fresh).toBe(2);
  await expect(page.getByText('Refreshing…', { exact: true })).toHaveCount(0);
  await expect(active(page)).toHaveAttribute('data-index', '0');
  expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
  const label = await active(page).getAttribute('aria-label');
  await page.locator('#primary-navigation a[href="/profile"]').click(); await discovery(page).click();
  await expect(active(page)).toHaveAttribute('aria-label', label!); expect(fresh).toBe(2);
});

test('pull refresh is mobile-only, top-only, thresholded, cancellable and pauses the previous media', async ({ page }) => {
  await open(page); await page.setViewportSize({ width: 390, height: 844 });
  let fresh = 0;
  await page.route('**/api/feed?*', async route => { if (!new URL(route.request().url()).searchParams.has('snapshot')) fresh++; await route.continue(); });
  await pull(page, 30); await pull(page, 100, true); expect(fresh).toBe(0);
  const feed = page.getByRole('region', { name: 'Discovery feed', exact: true });
  await feed.focus(); await feed.press('ArrowDown'); await expect(active(page)).toHaveAttribute('data-index', '1');
  await pull(page, 100); expect(fresh).toBe(0);
  await feed.press('ArrowUp'); await expect(active(page)).toHaveAttribute('data-index', '0');
  await pull(page, 100); await expect.poll(() => fresh).toBe(1);
  await expect(page.getByText('Refreshing…', { exact: true })).toHaveCount(0);
  expect(await page.locator('audio,video').evaluateAll(nodes => nodes.filter(n => !(n as HTMLMediaElement).paused).length)).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 932, height: 930 }); await pull(page, 100); expect(fresh).toBe(1);
});

test('Saved uses a checked bookmark; failed removal preserves it and success updates the collection', async ({ page }, info) => {
  await open(page); await active(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(active(page).getByRole('button', { name: 'Save', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.request.put('/api/publications/3/save', { headers, data: { enabled: true } });
  await page.goto('/saved');
  await expect(page.getByText('Your private collection of sounds and sessions.')).toHaveCount(0);
  const button = page.getByRole('button', { name: /^Unsave / }).first();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  const label = await button.getAttribute('aria-label');
  expect((await button.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  await page.route('**/api/publications/*/save', route => route.fulfill({ status: 503, json: { error: 'Save unavailable' } }));
  await button.click(); await expect(page.getByRole('alert')).toContainText('Save unavailable'); await expect(button).toHaveAttribute('aria-pressed', 'true');
  await page.unroute('**/api/publications/*/save'); await button.click();
  await expect(page.getByRole('button', { name: label!, exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('saved.png') });
});
