import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const headers = { Origin: 'http://127.0.0.1:4177', 'X-Nebula-Request': '1' };
async function call(page: Page, path: string, data?: unknown) {
  const response = await page.request.fetch(path, { method: data === undefined ? 'GET' : 'POST', headers, data });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}
async function reset(page: Page) {
  await call(page, '/api/presentation/reset', { confirm: true });
  return call(page, '/api/presentation');
}

test('catalog profiles include new real music and exclude private publications', async ({ page }) => {
  const status = await reset(page), artist = status.catalog.artistId;
  const upload = await page.request.post('/api/uploads', { headers: { ...headers, 'Content-Type': 'application/octet-stream', 'X-Media-Kind': 'audio' }, data: await readFile('artifacts/nebula/public/discovery-demo/soft-signal.wav') });
  expect(upload.ok()).toBeTruthy(); const media = await upload.json();
  const projectId = status.catalog.releases[0].projectId;
  const recording = await call(page, '/api/publications', { title: 'New CHILZ project recording', description: 'Additional public recording', mediaId: media.id, projectId, status: 'published', allowRemix: false, coverId: null });
  await call(page, '/api/publications', { title: 'PRIVATE CHILZ AUDIO', description: 'Private draft', mediaId: media.id, projectId, status: 'draft', allowRemix: false, coverId: null });
  await page.goto(`/artist/${artist}`);
  await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'View all music', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Music', exact: true })).toBeFocused();
  await expect(page.getByRole('region', { name: 'Discography', exact: true })).toBeVisible();
  const featured = page.getByRole('region', { name: 'Featured recording: luna - chilz remix', exact: true });
  await expect(featured).toBeVisible();
  await expect(page.getByRole('button', { name: /^(Play|Pause) New CHILZ project recording$/ })).toBeVisible();
  await expect(page.getByText('PRIVATE CHILZ AUDIO', { exact: true })).toHaveCount(0);
  await featured.getByRole('button', { name: 'Play luna - chilz remix', exact: true }).click();
  await page.getByRole('button', { name: 'Play New CHILZ project recording', exact: true }).click();
  await expect.poll(() => featured.locator('audio').evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true);
  expect(await page.locator('audio').evaluateAll((items: HTMLAudioElement[]) => items.filter(item => !item.paused).length)).toBe(1);
  await page.getByRole('tab', { name: 'Discovery Posts', exact: true }).click();
  await expect(page.locator('audio')).toHaveCount(0);
  await expect(page.getByRole('link', { name: `Open publication: ${recording.title}`, exact: true })).toBeVisible();
  await page.goto(`/project/${projectId}`);
  await page.getByRole('button', {name: 'New CHILZ project recording CHILZ', exact:true}).click();
  await expect(page.getByRole('button', { name: /^(Play|Pause) New CHILZ project recording$/ })).toHaveCount(1);
  await expect(page.getByText('Silent demo preview', { exact: true })).toHaveCount(0);await expect(page.getByRole('region',{name:/^Track player:/})).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Project funding' })).toHaveCount(0);
});

test('catalog projects retain song and project offers with role-appropriate proposal entry', async ({ page }) => {
  const status = await reset(page), release = status.catalog.releases.find((item: any) => item.tracks.length > 1);
  const song = release.tracks[1];
  const offer = await call(page, `/api/projects/${release.projectId}/offers`, { workId: song.workId, need: 'Mix', deliverable: 'A complete stereo mix', requirements: '', deadline: null, status: 'open', compensation: { kind: 'fee', amount: 250, currency: 'USD' } });
  await call(page, `/api/projects/${release.projectId}/offers`, { need: 'Feature', deliverable: 'A guest verse', requirements: '', deadline: null, status: 'open', compensation: { kind: 'split', percent: 10 } });
  await page.goto(`/project/${release.projectId}?song=${song.workId}`);
  await expect(page.getByRole('group', { name: `Song: ${song.title}`, exact: true })).toContainText('A complete stereo mix');
  await expect(page.getByRole('button', { name: 'Edit offer', exact: true })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Add opportunity', exact: true })).toHaveCount(2);
  await expect(page.getByRole('complementary', { name: 'Project funding' })).toHaveCount(0);
  await call(page, '/api/presentation/switch', { accountId: 19 });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Edit offer', exact: true })).toHaveCount(0);
  const songPanel = page.getByRole('group', { name: `Song: ${song.title}`, exact: true });
  await songPanel.getByRole('button', { name: 'Submit proposal', exact: true }).click();
  await expect(page).toHaveURL(`/messages/offer/${offer.id}`);
  await expect(page.getByRole('heading', { name: 'The opportunity', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Upload your complete mix or master', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Introduction', { exact: true })).toBeHidden();
  await page.goto(`/artist/${status.catalog.artistId}`);
  await expect(page.getByRole('region', { name: 'Open opportunities', exact: true })).toContainText(release.title);
  await page.getByRole('button', { name: 'View collaborations', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Collaborations', exact: true })).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'Collaborations', exact: true })).toContainText('A complete stereo mix');
  await expect(page.getByRole('link', { name: 'Message', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit Profile', exact: true })).toHaveCount(0);
});

test('shared profiles preserve tabs and scroll, with consistent layouts at all breakpoints', async ({ page }, info) => {
  test.setTimeout(100000);
  const status = await reset(page), errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const id of [21, 19, ...status.featuredRemix.original.artistIds]) {
    await page.goto(`/artist/${id}`);
    await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab')).toHaveCount(6);
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('heading', { name: status.accounts.find((a: any) => a.id === id).name, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`artist-${id}-${width}.png`), animations: 'disabled' });
      await page.getByRole('tabpanel', { name: 'Overview', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath(`artist-${id}-content-${width}.png`), animations: 'disabled' });
      await page.getByRole('heading', { name: status.accounts.find((a: any) => a.id === id).name, exact: true }).scrollIntoViewIfNeeded();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/artist/21');
  await page.getByRole('tab', { name: 'Projects', exact: true }).click();
  const panel = page.getByRole('tabpanel', { name: 'Projects', exact: true });
  const last = panel.locator('a[href^="/project/"]').last();
  await last.scrollIntoViewIfNeeded();
  const position = () => page.evaluate(() => [window.scrollY, document.body.scrollTop, document.querySelector('.shell-page')?.scrollTop ?? 0, document.querySelector('[data-page-scroll]')?.scrollTop ?? 0]);
  const saved = await position();
  expect(saved.reduce((sum, value) => sum + value, 0)).toBeGreaterThan(100);
  await last.click();
  await page.getByRole('link', { name: 'Back to artist', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Projects', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(position).toEqual(saved);
  await page.getByRole('tab', { name: 'Music', exact: true }).focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'About', exact: true })).toBeFocused();
  expect(errors).toEqual([]);
});
