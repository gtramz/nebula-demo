import { test, expect, type Page } from '@playwright/test';

const headers = { Origin: 'http://127.0.0.1:4177', 'X-Nebula-Request': '1' };
const player = (page: Page, label = 'Full original') => page.getByRole('region', { name: `${label} player`, exact: true });
const audio = (page: Page, label = 'Full original') => page.getByLabel(label, { exact: true });
async function setup(page: Page, prepare?: (src: string) => Promise<void>) {
  expect((await page.request.post('/api/presentation/reset', { headers, data: { confirm: true } })).ok()).toBe(true);
  expect((await page.request.post('/api/presentation/switch', { headers, data: { accountId: 19 } })).ok()).toBe(true);
  const original = await (await page.request.get('/api/publications/17')).json();
  await prepare?.(original.media.url);
  await page.goto('/remix/17');
  await page.getByRole('button', { name: 'Start private remix', exact: true }).click();
  await expect(player(page)).toBeVisible();
  return original;
}
async function play(page: Page, label = 'Full original') {
  await player(page, label).getByRole('button', { name: `Play ${label}`, exact: true }).click();
  await expect(audio(page, label)).toHaveJSProperty('paused', false);
  await expect.poll(() => audio(page, label).evaluate((element: HTMLAudioElement) => element.readyState), { timeout: 15000 }).toBeGreaterThanOrEqual(2);
  await expect.poll(() => audio(page, label).evaluate((element: HTMLAudioElement) => element.currentTime), { timeout: 10000 }).toBeGreaterThan(0);
  await expect(player(page, label).locator('[data-blob-mood="happy"]')).toBeVisible();
}

test('Forge audio transport keeps real media, canonical play feedback and compact controls', async ({ page }, info) => {
  const original = await setup(page), source = await audio(page).elementHandle();
  await expect(audio(page)).toHaveJSProperty('controls', false);
  await expect(player(page).locator('[data-blob-mood]')).toHaveCount(0);
  await play(page);
  const face = player(page).locator('[data-blob-mood="happy"]');
  await expect(face.locator('svg')).toHaveAttribute('viewBox', '0 0 512 512');
  const shape = await face.locator('svg > path').first().getAttribute('d');
  const firstTime = await audio(page).evaluate((element: HTMLAudioElement) => element.currentTime);
  await expect.poll(() => audio(page).evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(firstTime + .3);
  await player(page).getByRole('button', { name: 'Pause Full original', exact: true }).click();
  await expect(audio(page)).toHaveJSProperty('paused', true);
  await expect(player(page).locator('[data-blob-mood]')).toHaveCount(0);
  const seek = player(page).getByRole('slider', { name: 'Seek Full original', exact: true });
  const beforeSeek = Number(await seek.inputValue());
  await seek.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => audio(page).evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(beforeSeek);
  await expect(audio(page)).toHaveJSProperty('paused', true);

  const mute = player(page).getByRole('button', { name: 'Mute Full original', exact: true });
  const tray = player(page).locator('.antiq-audio-volume-tray'), volume = tray.locator('input');
  await page.mouse.move(0, 0); await expect(volume).toBeHidden(); await expect(tray).toHaveCSS('pointer-events', 'none');
  if (info.project.name === 'mobile') await mute.tap(); else { await mute.hover(); await mute.click(); }
  await expect(tray).toHaveCSS('opacity', '1'); await expect(audio(page)).toHaveJSProperty('muted', true);
  await volume.focus(); await page.keyboard.press('ArrowLeft');
  await expect(audio(page)).toHaveJSProperty('volume', .95); await expect(audio(page)).toHaveJSProperty('muted', false);
  await player(page).getByRole('button', { name: 'Audio options Full original', exact: true }).click();
  const options = page.getByRole('dialog', { name: 'Audio options Full original', exact: true });
  await options.getByLabel('Playback speed Full original', { exact: true }).selectOption('1.5');
  await expect(audio(page)).toHaveJSProperty('playbackRate', 1.5);
  const download = options.getByRole('link', { name: 'Download Full original', exact: true });
  await expect(download).toHaveAttribute('href', original.media.url); await expect(download).toHaveAttribute('download', /.*/);
  const downloaded = page.waitForEvent('download'); await download.click(); expect(await (await downloaded).failure()).toBeNull();
  await page.keyboard.press('Escape');

  await play(page); await expect(player(page).locator('[data-blob-mood="happy"] svg > path').first()).toHaveAttribute('d', shape!);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await player(page).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await source!.evaluate((element: HTMLAudioElement) => element.isConnected && !element.paused && element === document.querySelector('audio[aria-label="Full original"]'))).toBe(true);
    const bounds = await player(page).boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await player(page).screenshot({ path: info.outputPath(`forge-player-${width}.png`) });
  }
});

test('Forge media pauses for other playback, notifications, steps and version changes', async ({ page }) => {
  await setup(page); await play(page);
  await page.evaluate(async () => {
    const other = document.createElement('audio'); other.dataset.playerProbe = 'true'; other.src = '/discovery-demo/soft-signal.wav'; document.body.append(other); await other.play();
  });
  await expect(audio(page)).toHaveJSProperty('paused', true);
  await play(page); await expect(page.locator('audio[data-player-probe]')).toHaveJSProperty('paused', true);
  await page.locator('audio[data-player-probe]').evaluate((element: HTMLAudioElement) => { element.pause(); element.remove(); });
  await page.locator('[data-notification-bell]:visible').first().click();
  await expect(page.getByRole('dialog', { name: 'Notifications', exact: true })).toBeVisible();
  await expect(audio(page)).toHaveJSProperty('paused', true); await expect(page.locator('.antiq-audio-play')).toBeDisabled();
  await page.getByRole('button', { name: 'Close notifications', exact: true }).click();
  await expect(audio(page)).toHaveJSProperty('paused', true); await play(page);
  const original = await audio(page).elementHandle();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect.poll(() => original!.evaluate((element: HTMLAudioElement) => !element.isConnected && element.paused)).toBe(true);
  await expect(page.locator('audio')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open Forge', exact: true }).click();
  await page.getByRole('button', { name: 'Review your version', exact: true }).click();
  await expect(player(page, 'Finished version')).toBeVisible(); await expect(page.locator('audio')).toHaveCount(1);
  await expect(audio(page, 'Finished version')).toHaveJSProperty('paused', true); await play(page, 'Finished version');
  const finished = await audio(page, 'Finished version').elementHandle();
  await page.getByRole('button', { name: 'Original', exact: true }).click();
  expect(await finished!.evaluate((element: HTMLAudioElement) => !element.isConnected && element.paused)).toBe(true);
  await expect(player(page)).toBeVisible(); await expect(page.locator('audio')).toHaveCount(1); await expect(audio(page)).toHaveJSProperty('paused', true);
});

test('Forge audio retries a real load failure and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let fail = true;
  await setup(page, async src => {
    await page.route(`**${src}`, route => fail ? route.fulfill({ status: 503, body: '' }) : route.continue());
  });
  const source = await audio(page).elementHandle();
  await expect(player(page).getByRole('alert')).toContainText('The original could not load. Try again.');
  await expect(page.getByRole('alert')).toHaveCount(1); await expect(player(page).locator('[data-blob-mood]')).toHaveCount(0);
  fail = false; await player(page).getByRole('button', { name: 'Retry Full original', exact: true }).click();
  await expect.poll(() => audio(page).evaluate((element: HTMLAudioElement) => element.currentTime), { timeout: 15000 }).toBeGreaterThan(0);
  await expect(player(page).getByRole('alert')).toHaveCount(0);
  const face = player(page).locator('[data-blob-mood="happy"]'); await expect(face).toBeVisible(); await expect(face).toHaveCSS('opacity', '1');
  expect(await face.evaluate(element => ['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(getComputedStyle(element).transform))).toBe(true);
  expect(await source!.evaluate((element: HTMLAudioElement) => element.isConnected && element === document.querySelector('audio[aria-label="Full original"]'))).toBe(true);
});
