import { test, expect, type Locator, type Page } from '@playwright/test';

const active = (page: Page) => page.locator('article[data-active=true]');
const media = (page: Page) => active(page).locator('audio,video');
const tap = (page: Page) => active(page).locator('.discovery-video-tap');
async function activate(control: Locator, mobile: boolean) {
  if (mobile) await control.tap(); else await control.click();
}

for (const id of [3, 11, 14]) test(`tap publication ${id} preserves comments and manual pause`, async ({ page }, info) => {
  const mobile = info.project.name === 'mobile';
  if (!mobile) await page.setViewportSize({ width: 1280, height: 930 });
  await page.goto(`/discovery?post=post-${id}`);
  await expect(tap(page)).toBeEnabled({ timeout: 20000 });
  await expect(media(page)).toHaveJSProperty('paused', false);
  const source = await media(page).elementHandle();

  await activate(tap(page), mobile);
  await expect(media(page)).toHaveJSProperty('paused', true);
  await expect(tap(page)).toHaveAccessibleName(/^Play /);
  await expect(tap(page).locator('svg')).toBeVisible();
  await active(page).getByRole('slider', { name: /^Seek / }).fill('5');
  await expect(media(page)).toHaveJSProperty('paused', true);
  await expect.poll(() => media(page).evaluate((element: HTMLMediaElement) => element.currentTime)).toBeCloseTo(5, 1);

  await activate(active(page).getByRole('button', { name: 'Comments', exact: true }), mobile);
  const comments = page.getByRole('complementary', { name: 'Publication comments' });
  await expect(comments).toBeVisible();
  const input = comments.getByLabel('Add a comment', { exact: true });
  const text = `Tap regression ${info.project.name} ${id}: space and k stay in comments`;
  await input.fill(text);
  await input.press('Space');
  await input.press('k');
  await expect(input).toHaveValue(`${text} k`);
  await expect(media(page)).toHaveJSProperty('paused', true);
  await comments.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(comments.getByText(`${text} k`, { exact: true })).toBeVisible();
  await comments.getByRole('button', { name: 'Close comments' }).click();
  await expect(comments).toHaveCount(0);
  await expect(media(page)).toHaveJSProperty('paused', true);
  expect(await source!.evaluate(element => element.isConnected)).toBe(true);

  await activate(tap(page), mobile);
  await expect(media(page)).toHaveJSProperty('paused', false);
  await expect.poll(() => media(page).evaluate((element: HTMLMediaElement) => element.currentTime)).toBeGreaterThan(5);
  await activate(active(page).getByRole('button', { name: 'Comments', exact: true }), mobile);
  await expect(comments).toBeVisible();
  // Preserve the existing behavior: mobile comments suspend playback; desktop comments keep it playing.
  await expect(media(page)).toHaveJSProperty('paused', mobile);
  await input.fill('Another comment draft');
  await expect(media(page)).toHaveJSProperty('paused', mobile);
  await comments.getByRole('button', { name: 'Close comments' }).click();
  await expect(active(page).getByRole('button', { name: 'Comments', exact: true })).toBeFocused();
  await expect(media(page)).toHaveJSProperty('paused', false);
  await expect.poll(() => page.locator('audio,video').evaluateAll((items: HTMLMediaElement[]) => items.filter(item => !item.paused).length)).toBe(1);

  if (!mobile) {
    await tap(page).press('Space');
    await expect(media(page)).toHaveJSProperty('paused', true);
    await tap(page).hover();
    const mute = active(page).locator('.discovery-desktop-volume').getByRole('button');
    await mute.click();
    await expect(media(page)).toHaveJSProperty('paused', true);
    await tap(page).press('Enter');
    await expect(media(page)).toHaveJSProperty('paused', false);
  }
});

test('swiping the playback surface advances the feed without pausing the next post', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile');
  await page.goto('/discovery?post=post-11');
  await expect(tap(page)).toBeEnabled({ timeout: 20000 });
  await expect(media(page)).toHaveJSProperty('paused', false);
  const previous = await active(page).getAttribute('aria-label');
  const bounds = (await tap(page).boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const x = bounds.x + bounds.width * .3, y = bounds.y + bounds.height * .7;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 8; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * bounds.height * .075 }] });
    await page.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await expect(active(page)).not.toHaveAttribute('aria-label', previous!);
  await expect(media(page)).toHaveJSProperty('paused', false);
});
