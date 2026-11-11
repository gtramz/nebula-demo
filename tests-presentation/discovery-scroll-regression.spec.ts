import { test, expect, type Page } from '@playwright/test';

const feed = (page: Page) => page.locator('.discovery-feed');
const active = (page: Page) => page.locator('.discovery-post[data-active=true]');
async function open(page: Page) {
  await page.goto('/discovery');
  await expect(active(page).locator('.discovery-video-tap')).toBeEnabled({ timeout: 20000 });
  await expect(active(page)).toHaveAttribute('data-index', '0');
}
async function at(page: Page, index: number) {
  await expect(active(page)).toHaveAttribute('data-index', String(index));
  await expect(feed(page)).not.toHaveAttribute('data-scrolling', 'true');
  await expect.poll(() => feed(page).evaluate(element => Math.abs(element.scrollTop - (element.querySelector('[data-active=true]') as HTMLElement).offsetTop))).toBeLessThanOrEqual(1);
}

test('fractional viewport heights keep every successive piece aligned without returning to an older index', async ({ page }) => {
  await open(page);
  await feed(page).evaluate(element => { element.style.height = '600.4px'; });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await feed(page).focus();
  for (let index = 1; index <= 12; index++) {
    await page.keyboard.press('ArrowDown');
    await at(page, index);
  }
  for (let index = 11; index >= 0; index--) {
    await page.keyboard.press('ArrowUp');
    await at(page, index);
  }
});

test('a delayed decaying trackpad tail cannot skip a piece or bounce backwards', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await open(page);
  await active(page).locator('.discovery-video-tap').hover();
  for (const delta of [160, 120, 80]) {
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(40);
  }
  await at(page, 1);
  await page.waitForTimeout(240);
  await page.mouse.wheel(0, 40);
  await page.waitForTimeout(240);
  await page.mouse.wheel(0, -5);
  await page.waitForTimeout(650);
  await at(page, 1);
  await page.mouse.wheel(0, -160);
  await at(page, 0);
  await page.waitForTimeout(240);
  await page.mouse.wheel(0, 160);
  await at(page, 1);
  await page.waitForTimeout(240);
  await page.mouse.wheel(0, 160);
  await at(page, 2);
});
