import { test, expect, type Page } from '@playwright/test';

const active = (page: Page) => page.locator('.discovery-post[data-active=true]');
// Modal menus correctly hide the background from the accessibility tree; its
// geometry still needs inspection while that menu owns focus.
const feed = (page: Page) => page.locator('.discovery-feed');
async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/discovery?demo=1');
  await expect(active(page)).toHaveAttribute('data-index', '0');
  await expect.poll(() => active(page).locator('video').evaluate((media: HTMLMediaElement) => media.readyState)).toBeGreaterThanOrEqual(2);
}
async function snapped(page: Page, index: number) {
  await expect(active(page)).toHaveAttribute('data-index', String(index));
  await expect.poll(() => feed(page).evaluate(element => Math.abs(element.scrollTop - Number(element.querySelector('[data-active=true]')?.getAttribute('data-index')) * element.clientHeight))).toBeLessThan(2);
  await expect(feed(page)).not.toHaveAttribute('data-scrolling', 'true');
}
async function record(page: Page) {
  await feed(page).evaluate(element => {
    const start = performance.now(), height = element.clientHeight;
    const frames: { t: number; y: number }[] = [], changes: { t: number; index: number; y: number }[] = [];
    let frame = 0;
    const sample = (time: number) => { frames.push({ t: time - start, y: element.scrollTop }); frame = requestAnimationFrame(sample); };
    frame = requestAnimationFrame(sample);
    const observer = new MutationObserver(records => {
      for (const mutation of records) if ((mutation.target as Element).getAttribute('data-active') === 'true') changes.push({ t: performance.now() - start, index: Number((mutation.target as Element).getAttribute('data-index')), y: element.scrollTop });
    });
    observer.observe(element, { attributes: true, attributeFilter: ['data-active'], subtree: true });
    (window as any).__scrollRecording = { stop: () => { cancelAnimationFrame(frame); observer.disconnect(); return { height, frames, changes }; } };
  });
}
async function recording(page: Page) {
  return page.evaluate(() => (window as any).__scrollRecording.stop()) as Promise<{ height: number; frames: { t: number; y: number }[]; changes: { t: number; index: number; y: number }[] }>;
}

test('Next and keyboard animate through real positions, selecting one stable player only at the snap', async ({ page }, info) => {
  await open(page);
  const previous = await active(page).locator('video').elementHandle();
  const prepared = await page.locator('[data-index="1"] audio').elementHandle();
  await previous!.evaluate((media: HTMLMediaElement) => { media.pause(); media.currentTime = 1.25; media.volume = .42; });
  await record(page);
  await page.getByRole('button', { name: 'Next post', exact: true }).click();
  await snapped(page, 1);
  const trace = await recording(page);
  expect(trace.frames.some(frame => frame.y > 2 && frame.y < trace.height - 2)).toBe(true);
  expect(trace.changes.map(change => change.index)).toEqual([1]);
  expect(trace.changes.every(change => Math.abs(change.y - change.index * trace.height) <= 2)).toBe(true);
  expect(await prepared!.evaluate(media => media === document.querySelector('[data-active=true] audio'))).toBe(true);
  expect(await previous!.evaluate((media: HTMLMediaElement) => media.isConnected && media.paused && media.volume === .42 && media.currentTime === 1.25)).toBe(true);
  await feed(page).focus(); await page.keyboard.press('ArrowUp'); await snapped(page, 0);
  await previous!.evaluate((media: HTMLMediaElement) => media.pause());
  expect(await previous!.evaluate((media: HTMLMediaElement) => media.isConnected && media.volume === .42 && media.currentTime >= 1.25 && media.currentTime < 2)).toBe(true);
  expect(await page.locator('article:not([data-active=true]) audio,article:not([data-active=true]) video').evaluateAll((media: HTMLMediaElement[]) => media.every(item => item.paused))).toBe(true);
  await info.attach('scroll-positions.json', { body: Buffer.from(JSON.stringify(trace, null, 2)), contentType: 'application/json' });
});

test('one decaying trackpad burst advances one post; a later reverse gesture remains responsive', async ({ page }, info) => {
  await open(page); await record(page);
  const box = (await feed(page).boundingBox())!;
  await page.mouse.move(box.x + box.width * .3, box.y + box.height * .4);
  for (const delta of [80, 140, 210, 280, 360, 420, 460, 420, 360, 280, 210, 140, 80, 40]) { await page.mouse.wheel(0, delta); await page.waitForTimeout(16); }
  await snapped(page, 1);
  // A quiet interval separates physical gestures; residual inertia is still the
  // same burst even when it outlasts the first publication's smooth transition.
  await page.waitForTimeout(220); await expect(active(page)).toHaveAttribute('data-index', '1');
  const trace = await recording(page);
  expect(trace.changes.map(change => change.index)).toEqual([1]);
  await page.mouse.wheel(0, -90); await snapped(page, 0);
  const prepared = await page.locator('[data-index="1"] audio').elementHandle();
  await record(page); await page.getByRole('button', { name: 'Next post', exact: true }).click(); await snapped(page, 1);
  const nextTrace = await recording(page);
  expect(nextTrace.frames.some(frame => frame.y > 2 && frame.y < nextTrace.height - 2)).toBe(true);
  expect(nextTrace.changes.map(change => change.index)).toEqual([1]);
  expect(await prepared!.evaluate(media => media === document.querySelector('[data-active=true] audio'))).toBe(true);
  await info.attach('wheel-burst-positions.json', { body: Buffer.from(JSON.stringify(trace, null, 2)), contentType: 'application/json' });
  await info.attach('next-positions.json', { body: Buffer.from(JSON.stringify(nextTrace, null, 2)), contentType: 'application/json' });
});

test('native swipes retain the current window until release and snap, without a second audible source', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Real touch panning is exercised in the mobile browser.');
  await open(page); await record(page);
  const cdp = await page.context().newCDPSession(page), box = (await feed(page).boundingBox())!;
  const x = Math.round(box.x + box.width * .35), y = Math.round(box.y + box.height * .8);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 9; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.round(y - step * box.height * .075) }] });
    await page.waitForTimeout(16);
  }
  expect(await feed(page).evaluate(element => element.scrollTop / element.clientHeight)).toBeGreaterThan(.5);
  await expect(active(page)).toHaveAttribute('data-index', '0');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
  await snapped(page, 1);
  const trace = await recording(page);
  expect(trace.changes.map(change => change.index)).toEqual([1]);
  expect(trace.changes.every(change => Math.abs(change.y - change.index * trace.height) <= 2)).toBe(true);
  expect(await page.locator('audio,video').evaluateAll((media: HTMLMediaElement[]) => media.filter(item => !item.paused).length)).toBeLessThanOrEqual(1);
  expect(await page.locator('article:not([data-active=true]) audio,article:not([data-active=true]) video').evaluateAll((media: HTMLMediaElement[]) => media.every(item => item.paused))).toBe(true);
  await info.attach('native-swipe-positions.json', { body: Buffer.from(JSON.stringify(trace, null, 2)), contentType: 'application/json' });
});

test('reduced motion is immediate and a held navigation key never adds native scrolling', async ({ page }) => {
  await open(page); await page.emulateMedia({ reducedMotion: 'reduce' });
  await record(page); await page.getByRole('button', { name: 'Next post', exact: true }).click(); await snapped(page, 1);
  const trace = await recording(page);
  expect(trace.frames.some(frame => frame.y > 2 && frame.y < trace.height - 2)).toBe(false);
  await feed(page).focus(); await page.keyboard.press('ArrowUp'); await snapped(page, 0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await feed(page).focus(); await page.keyboard.down('ArrowDown');
  for (let repeat = 0; repeat < 12; repeat++) { await page.keyboard.down('ArrowDown'); await page.waitForTimeout(60); }
  await page.keyboard.up('ArrowDown'); await snapped(page, 1);
  await page.waitForTimeout(180); await expect(active(page)).toHaveAttribute('data-index', '1');
});

test('a missing scrollend and cancelled motion recover without selecting half-visible media', async ({ page }) => {
  await page.addInitScript(() => {
    const add = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type: string, listener: any, options: any) {
      if (type === 'scrollend' && this instanceof HTMLElement && this.classList.contains('discovery-feed')) return;
      return add.call(this, type, listener, options);
    };
  });
  await open(page);
  await feed(page).evaluate(element => { element.style.scrollSnapType = 'none'; element.scrollTo({ top: element.clientHeight * .62, behavior: 'instant' }); });
  await page.waitForTimeout(180); await expect(active(page)).toHaveAttribute('data-index', '0');
  await expect(feed(page)).not.toHaveAttribute('data-scrolling', 'true');
  await feed(page).evaluate(element => { element.dispatchEvent(new TouchEvent('touchcancel', { bubbles: true, touches: [] })); element.style.scrollSnapType = ''; element.scrollTo({ top: element.clientHeight, behavior: 'instant' }); });
  await snapped(page, 1);
  await page.getByRole('button', { name: 'Next post', exact: true }).click(); await snapped(page, 2);
  await feed(page).focus(); await page.keyboard.press('ArrowUp'); await snapped(page, 1);
});

test('opening a modal menu during motion cancels to the selected post and never leaves a latch', async ({ page }) => {
  const account = await page.request.post('/api/rpc', {
    headers: { Origin: 'http://127.0.0.1:4175', 'X-Nebula-Request': '1' },
    data: { method: 'register', args: [{ name: 'Scroll smoke artist', role: 'artist', email: `${crypto.randomUUID()}@example.invalid`, password: 'preview123' }] },
  });
  expect(account.ok(), await account.text()).toBe(true);
  await open(page);
  await page.getByRole('button', { name: 'Next post', exact: true }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await snapped(page, 0);
  await page.keyboard.press('Escape'); await expect(page.getByRole('menu')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next post', exact: true }).click(); await snapped(page, 1);
});

test('nested metadata and modal/card controls keep their scroll and release the feed cleanly', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The constrained desktop metadata reader owns its own scroll.');
  await page.setViewportSize({ width: 1440, height: 320 }); await open(page);
  const metadata = active(page).locator('.discovery-post-info');
  expect(await metadata.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await metadata.hover(); await page.mouse.wheel(0, 180);
  await expect.poll(() => metadata.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await expect(active(page)).toHaveAttribute('data-index', '0');
  expect(await feed(page).evaluate(element => element.scrollTop)).toBe(0);
  await active(page).getByRole('button', { name: 'Read description of after hours', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await expect(feed(page)).toHaveAttribute('data-scroll-locked', 'true');
  await page.getByRole('dialog').hover(); await page.mouse.wheel(0, 600); await page.keyboard.press('ArrowDown');
  await expect(active(page)).toHaveAttribute('data-index', '0');
  await page.keyboard.press('Escape'); await expect(feed(page)).toHaveAttribute('data-scroll-locked', 'false');
  await page.setViewportSize({ width: 1440, height: 930 });
  await active(page).getByRole('button', { name: 'About Luna Vale', exact: true }).click();
  const card = page.getByRole('dialog', { name: 'Luna Vale', exact: true }); await expect(card).toBeVisible();
  await card.hover(); await page.mouse.wheel(0, 500); await page.keyboard.press('ArrowDown');
  await expect(active(page)).toHaveAttribute('data-index', '0');
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Next post', exact: true }).click(); await snapped(page, 1);
});
