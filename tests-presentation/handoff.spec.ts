import { test, expect, type Page } from '@playwright/test';
const headers = { Origin: 'http://127.0.0.1:4177', 'X-Nebula-Request': '1' };
async function request(page: Page, path: string, data?: object, method = 'POST') {
  const response = await page.request.fetch(path, { method: data ? method : 'GET', headers, data, maxRetries: data ? 0 : 2 });
  expect(response.ok(), await response.text()).toBe(true); return response.json();
}
test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await request(page, '/api/presentation/reset', { confirm: true });
  await page.setViewportSize({ width: 1440, height: 900 });
});

test('handoff profile cleanup preserves artwork and destinations; empty search is silent', async ({ page }, info) => {
  await page.goto('/artist/21');
  await expect(page.getByRole('heading', { name: 'Discography', exact: true })).toBeVisible();
  await expect(page.getByText(/^RELEASES \//)).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open in Discovery', exact: true })).toHaveCount(0);
  const discography = page.getByRole('region', { name: 'Discography' });
  await expect(discography.locator('a[href^="/project/"] img').first()).toBeVisible();
  await expect(discography.locator('.absolute.bottom-3')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('artist-after.png') });
  await page.goto('/search');
  await expect(page.getByText('Search artists and projects.', { exact: true })).toHaveCount(0);
  await page.locator('input').first().fill('   ');
  await expect(page.locator('#search-status')).toHaveText('');
  await page.locator('input').first().fill('luna');
  await expect(page.getByRole('link', { name: /luna/i }).first()).toBeVisible({ timeout: 15000 });
});

test('handoff notifications anchor to the bell, read without deletion and preserve search', async ({ page }, info) => {
  await page.goto('/search');
  await page.locator('input').first().fill('luna');
  const source = await page.locator('input').first().elementHandle();
  const before = await request(page, '/api/notifications');
  expect(before.unreadCount).toBeGreaterThan(0);
  const bell = page.locator('[data-notification-bell]:visible').first();
  await bell.click();
  const panel = page.getByRole('dialog', { name: 'Notifications', exact: true });
  await expect(panel).toBeVisible();
  await expect(panel.getByText('STAY IN THE LOOP')).toHaveCount(0);
  const bounds = (await panel.boundingBox())!, anchor = (await bell.boundingBox())!;
  expect(bounds.width).toBeLessThanOrEqual(380); expect(bounds.height).toBeLessThanOrEqual(480);
  expect(bounds.x).toBeGreaterThanOrEqual(anchor.x);
  await expect(panel.locator('article').first()).toBeVisible();
  await expect.poll(async () => { const p = (await panel.boundingBox())!, b = (await bell.boundingBox())!; return Math.abs(p.y + p.height - b.y - b.height); }).toBeLessThan(3);
  await page.screenshot({ path: info.outputPath('notifications-after.png'), animations: 'disabled' });
  await panel.getByRole('button', { name: 'Mark all as read', exact: true }).click();
  await expect(panel.getByText('You’re all caught up.', { exact: true })).toBeVisible();
  const after = await request(page, '/api/notifications');
  expect(after.items.length).toBe(before.items.length);
  expect((await request(page, '/api/notifications?unreadOnly=1')).items).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(bell).toBeFocused(); await expect(page.locator('input').first()).toHaveValue('luna');
  expect(await source!.evaluate(element => element.isConnected)).toBe(true);
});

test('handoff messages keep the list beside a real thread, peer avatar and draft through polling', async ({ page, browser }, info) => {
  const thread = await request(page, '/api/messages/requests', { recipientId: 19, text: 'Handoff conversation', operationId: crypto.randomUUID() });
  const peer = await browser.newContext({ baseURL: 'http://127.0.0.1:4177' });
  try {
    await peer.request.post('/api/presentation/switch', { headers, data: { accountId: 19 } });
    const result = await peer.request.patch(`/api/messages/general/${thread.id}`, { headers, data: { action: 'accept', revision: thread.revision, operationId: crypto.randomUUID() } });
    expect(result.ok(), await result.text()).toBe(true);
    for (let i = 0; i < 14; i++) await request(page, `/api/messages/general/${thread.id}/messages`, { text: `Earlier message ${i}`, operationId: crypto.randomUUID() });
    await page.goto(`/messages/general/${thread.id}`);
    const inbox = page.getByRole('complementary', { name: 'Conversation list' });
    const row = inbox.locator(`a[href="/messages/general/${thread.id}"]`);
    await expect(row).toHaveAttribute('aria-current', 'page');
    const card = (await request(page, '/api/messages')).items.find((item: any) => item.kind === 'general' && item.id === thread.id);
    expect(card.counterpartId).toBe(19);
    if (card.counterpartPicture) await expect(row.locator('img')).toHaveAttribute('src', card.counterpartPicture);
    const composer = page.getByLabel('Message', { exact: true });
    await composer.fill('Draft survives polling'); await composer.evaluate(element => { (window as any).__handoffComposer = element; });
    const transcript = page.locator('[aria-label="Messages"]');
    await transcript.evaluate(element => { element.scrollTop = 120; });
    const scroll = await transcript.evaluate(element => element.scrollTop); expect(scroll).toBeGreaterThan(0);
    await page.waitForTimeout(11000);
    expect(await transcript.evaluate(element => element.scrollTop)).toBe(scroll);
    await expect(composer).toHaveValue('Draft survives polling');
    expect(await composer.evaluate(element => element === (window as any).__handoffComposer)).toBe(true);
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.locator('[aria-label="Messages"] article').getByText('Draft survives polling', { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('messages-after.png') });
  } finally { await peer.close(); }
});

test('handoff Discovery retains intro, decorative backdrop and tap pause', async ({ page }, info) => {
  const start = Date.now(); await page.goto('/discovery?post=post-17');
  await expect(page.getByRole('status', { name: 'Preparing Discovery' })).toBeVisible();
  await expect(page.locator('.discovery-thinking-dots')).toHaveCount(0);
  const card = page.locator('article[data-active=true]');
  await expect(card.locator('.discovery-video-tap')).toBeEnabled({ timeout: 15000 });
  expect(Date.now() - start).toBeGreaterThanOrEqual(4900);
  await expect(card.locator('.discovery-ambient')).toHaveCSS('pointer-events', 'none');
  await card.locator('.discovery-video-tap').click();
  await expect(card.locator('audio')).toHaveJSProperty('paused', true);
  await expect(card.locator('.discovery-video-play-icon')).toBeVisible();
  await page.screenshot({ path: info.outputPath('discovery-after.png') });
});

test('handoff identity wizard retains values, blocks invalid input and recovers a failed save', async ({ page }, info) => {
  await page.goto('/profile?edit=1');
  const next = page.getByRole('button', { name: 'Continue', exact: true });
  await page.getByLabel('artist name', { exact: true }).fill('');
  await next.click(); await expect(page.locator('.guided-heading h2')).toHaveText('Identity');
  await page.getByLabel('artist name', { exact: true }).fill('CHILZ');
  await page.getByLabel('bio', { exact: true }).fill('A preserved profile draft.');
  await next.click(); await expect(page.locator('.guided-heading h2')).toHaveText('Creative profile');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByLabel('bio', { exact: true })).toHaveValue('A preserved profile draft.');
  for (const title of ['Creative profile', 'Public details', 'Preferences', 'Review']) {
    await next.click(); await expect(page.locator('.guided-heading h2')).toHaveText(title);
  }
  await page.route('**/api/rpc', route => route.request().postDataJSON()?.method === 'updateArtistIdentity' ? route.fulfill({ status: 503, json: { error: 'Temporary identity failure' } }) : route.continue());
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Temporary identity failure');
  await page.screenshot({ path: info.outputPath('identity-retry.png') });
  await page.unroute('**/api/rpc');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.locator('.guided-heading h2')).toHaveCount(0);
  const current = await request(page, '/api/session');
  expect(current.user.artist.bio).toBe('A preserved profile draft.');
});

test('handoff fresh project intent resets only after guarded navigation', async ({ page }) => {
  await page.goto('/profile?create=project&intent=first');
  await page.getByLabel('TITLE', { exact: true }).fill('Keep this draft');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('TITLE', { exact: true })).toHaveValue('Keep this draft');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.goto('/profile?create=project&intent=second');
  await expect(page.getByLabel('TITLE', { exact: true })).toHaveValue('');
});

test('handoff notification navigation respects a cancelled dirty-form guard', async ({ page }) => {
  await page.goto('/profile?create=project');
  await page.getByLabel('TITLE', { exact: true }).fill('Do not discard this title');
  const before = await request(page, '/api/notifications?unreadOnly=1');
  await page.locator('[data-notification-bell]:visible').first().click();
  const panel = page.getByRole('dialog', { name: 'Notifications', exact: true });
  page.once('dialog', dialog => dialog.dismiss());
  await panel.getByRole('link', { name: /^View / }).first().click();
  await expect(panel).toBeVisible();
  expect((await request(page, '/api/notifications?unreadOnly=1')).items.map((item: any) => item.id)).toEqual(before.items.map((item: any) => item.id));
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('TITLE', { exact: true })).toHaveValue('Do not discard this title');
});
