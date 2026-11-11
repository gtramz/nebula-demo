import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const title = (page: Page) => page.getByRole('heading', { name: 'Find your next project.', exact: true });
const wink = (page: Page) => title(page).locator('[data-blob-wink]');
const search = (page: Page) => page.getByRole('combobox', { name: 'Search Home opportunities', exact: true });

async function geometry(slot: Locator, searchControl: Locator) {
  const layout = await slot.evaluate(element => {
    const heading = element.closest('h1')!, ending = element.parentElement!;
    const face = element.querySelector<HTMLElement>('[data-blob-wink-face]')!;
    const dot = element.querySelector<HTMLElement>('[data-blob-wink-dot]')!;
    const rect = (box: DOMRect) => ({ x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom });
    const wordRange = document.createRange(); wordRange.selectNode(ending.firstChild!);
    const dotRange = document.createRange(); dotRange.selectNodeContents(dot);
    return {
      heading: rect(heading.getBoundingClientRect()), ending: rect(ending.getBoundingClientRect()),
      slot: rect(element.getBoundingClientRect()), face: rect(face.getBoundingClientRect()),
      word: rect(wordRange.getBoundingClientRect()), dot: rect(dotRange.getBoundingClientRect()),
      nowrap: getComputedStyle(ending).whiteSpace,
      overflowing: document.documentElement.scrollWidth > innerWidth,
    };
  });
  const searchBox = await searchControl.boundingBox();
  expect(searchBox).not.toBeNull();
  return { ...layout, search: searchBox! };
}

async function evidence(page: Page, info: TestInfo, name: string) {
  // Keep review images outside test-results, which later suites may replace.
  const directory = join(tmpdir(), 'nebula-home-heading-wink');
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${info.project.name}-${name}.png`);
  await page.screenshot({ path, animations: 'allow' });
  await info.attach(name, { path, contentType: 'image/png' });
}

test('Home reserves a real punctuation slot without overlap, wrap separation or layout movement', async ({ page }, info) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/explore', { waitUntil: 'domcontentloaded' });
    const slot = wink(page), face = slot.locator('[data-blob-wink-face]'), dot = slot.locator('[data-blob-wink-dot]');
    await expect(slot).toHaveAttribute('data-blob-wink', /^(blooming|winking)$/);
    await expect(face).toHaveCSS('opacity', '1');
    await expect(dot).toHaveCSS('opacity', '0');
    await page.evaluate(() => document.fonts.ready);
    const font = await title(page).evaluate(element => ({
      family: getComputedStyle(element).fontFamily,
      ready: document.fonts.check('700 36px "Space Grotesk"'),
      loaded: [...document.fonts].some(face => face.family.replace(/["']/g, '') === 'Space Grotesk' && face.status === 'loaded'),
    }));
    expect(font.family).toContain('Space Grotesk');
    expect(font.ready).toBe(true);
    expect(font.loaded).toBe(true);
    const active = await geometry(slot, search(page));
    expect(active.nowrap).toBe('nowrap');
    expect(active.overflowing).toBe(false);
    expect(active.slot.x).toBeGreaterThanOrEqual(active.word.right - 1);
    expect(active.face.x).toBeGreaterThanOrEqual(active.slot.x - 1);
    expect(active.face.right).toBeLessThanOrEqual(active.slot.right + 1);
    expect(active.face.y).toBeGreaterThanOrEqual(active.slot.y - 1);
    expect(active.face.bottom).toBeLessThanOrEqual(active.slot.bottom + 1);
    expect(active.ending.x).toBeGreaterThanOrEqual(active.heading.x - 1);
    expect(active.ending.right).toBeLessThanOrEqual(active.heading.right + 1);
    await evidence(page, info, `${width}-active`);

    await expect(slot).toHaveAttribute('data-blob-wink', 'done');
    await expect(face).toHaveCSS('opacity', '0');
    await expect(dot).toHaveCSS('opacity', '1');
    const done = await geometry(slot, search(page));
    for (const key of ['heading', 'ending', 'slot', 'search'] as const) {
      for (const coordinate of ['x', 'y', 'width', 'height'] as const) {
        expect(Math.abs(done[key][coordinate] - active[key][coordinate]), `${width}px ${key}.${coordinate}`).toBeLessThanOrEqual(1);
      }
    }
    // The dot follows the last word on its text baseline, at the slot's left edge.
    expect(Math.abs(done.dot.x - done.word.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(done.dot.y - done.word.y)).toBeLessThanOrEqual(1);
    expect(done.overflowing).toBe(false);
    await expect(title(page)).toBeVisible();
    await evidence(page, info, `${width}-done`);
  }
});

test('Home keeps the completed wink through a real retry and search query change', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let fail = true;
  await page.route('**/api/opportunities/projects?*', route => fail
    ? route.fulfill({ status: 503, json: { error: 'Temporary Home test failure.' } })
    : route.continue());
  await page.goto('/explore');
  const slot = wink(page);
  await expect(slot).toHaveAttribute('data-blob-wink', 'done');
  const original = await slot.elementHandle();
  await slot.evaluate(element => {
    (window as any).__homeWinkPhases = [];
    new MutationObserver(() => (window as any).__homeWinkPhases.push(element.getAttribute('data-blob-wink')))
      .observe(element, { attributes: true, attributeFilter: ['data-blob-wink'] });
  });
  fail = false;
  const retry = page.waitForResponse(response => response.url().includes('/api/opportunities/projects?') && response.ok());
  await page.getByRole('alert').getByRole('button', { name: 'Try again', exact: true }).click();
  await retry;
  await expect(page.getByRole('alert')).toHaveCount(0);
  const changed = page.waitForResponse(response => response.url().includes('/api/opportunities/projects?') && response.url().includes('luna') && response.ok());
  await search(page).fill('luna');
  await changed;
  await expect(slot).toHaveAttribute('data-blob-wink', 'done');
  expect(await slot.evaluate((element, previous) => element === previous, original)).toBe(true);
  expect(await page.evaluate(() => (window as any).__homeWinkPhases)).toEqual([]);
});

test('Home exit leaves no late effects and reduced motion remains completed after preference changes', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/explore', { waitUntil: 'domcontentloaded' });
  await expect(wink(page)).toHaveAttribute('data-blob-wink', /^(blooming|winking)$/);
  await page.locator('#primary-navigation a[href="/discovery"]').click();
  await expect(page).toHaveURL(/\/discovery$/);
  // Outwait the discarded wink's final callback to catch late route/DOM effects.
  await page.waitForTimeout(2100);
  await expect(page).toHaveURL(/\/discovery$/);
  await expect(page.locator('[data-blob-wink]')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/explore');
  await expect(wink(page)).toHaveAttribute('data-blob-wink', 'done');
  await expect(wink(page).locator('[data-blob-wink-face]')).toHaveCSS('opacity', '0');
  await expect(wink(page).locator('[data-blob-wink-dot]')).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(wink(page)).toHaveAttribute('data-blob-wink', 'done');
  await expect(wink(page).locator('[data-blob-wink-face]')).toHaveCSS('opacity', '0');
  await evidence(page, info, 'reduced-motion-done');
  expect(errors).toEqual([]);
});
