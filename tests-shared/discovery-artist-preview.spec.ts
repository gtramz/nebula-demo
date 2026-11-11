import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const headers = { Origin: 'http://127.0.0.1:4175', 'X-Nebula-Request': '1' };
const active = (page: Page) => page.locator('.discovery-post[data-active=true]');
const preview = (page: Page) => page.getByRole('dialog', { name: 'Preview Artist', exact: true });
async function rpc(page: Page, method: string, ...args: unknown[]) {
  const response = await page.request.post('/api/rpc', { headers, data: { method, args } });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).result;
}
async function register(page: Page, name: string, role = 'artist') {
  const email = `${crypto.randomUUID()}@example.invalid`;
  return { user: await rpc(page, 'register', { name, role, email, password: 'preview123' }), email };
}
async function fixture(page: Page) {
  const owner = await register(page, 'Preview Artist');
  await rpc(page, 'updateArtistIdentity', {
    profile: { bio: 'Independent songs from a real artist profile.', basedIn: 'Mexico City', creativeRoles: ['producer', 'songwriter'], genreIds: ['jazz'], collaborationAvailability: 'open' },
    preferences: { discovery: { genres: ['PRIVATE_PREVIEW_PREFERENCE'] } },
  });
  const upload = await page.request.post('/api/uploads', {
    headers: { ...headers, 'X-Media-Kind': 'audio', 'Content-Type': 'application/octet-stream' },
    data: await readFile('artifacts/nebula/public/discovery-demo/soft-signal.wav'),
  });
  expect(upload.ok(), await upload.text()).toBe(true);
  const publication = await page.request.post('/api/publications', {
    headers, data: { title: 'Artist preview sound', description: 'A publication with a separate artist preview.', mediaId: (await upload.json()).id, coverId: null, projectId: null, allowRemix: true, status: 'published' },
  });
  expect(publication.ok(), await publication.text()).toBe(true);
  const post = await publication.json();
  const viewer = await register(page, 'Preview Viewer');
  return { owner, viewer, post, href: `/discovery?post=post-${post.id}` };
}

test('artist rail opens real details on demand, supports keyboard and touch, and preserves media', async ({ page }, info) => {
  const { owner, href } = await fixture(page);
  let profileRequests = 0;
  await page.route('**/api/rpc', async route => {
    if (route.request().postDataJSON()?.method === 'getPublicArtist') profileRequests++;
    await route.continue();
  });
  await page.goto(href);
  const article = active(page), avatar = article.getByRole('button', { name: 'About Preview Artist', exact: true });
  await expect(article.getByRole('button', { name: 'Follow', exact: true })).toBeEnabled();
  expect(profileRequests).toBe(0);
  await expect(article.locator('.discovery-author')).toHaveCount(0);
  const avatarBox = (await avatar.boundingBox())!, likeBox = (await article.getByRole('button', { name: 'Like', exact: true }).boundingBox())!;
  expect(avatarBox.y + avatarBox.height).toBeLessThanOrEqual(likeBox.y);
  const badgeBox = (await article.locator('.discovery-artist-follow').boundingBox())!;
  expect(badgeBox.x).toBeLessThan(avatarBox.x); expect(badgeBox.y).toBeLessThan(avatarBox.y);
  const media = await article.locator('audio').elementHandle();
  await expect.poll(() => media!.evaluate((element: HTMLMediaElement) => element.readyState)).toBeGreaterThanOrEqual(2);
  await media!.evaluate((element: HTMLMediaElement) => { element.pause(); element.currentTime = 1; element.volume = .37; });
  if (info.project.name === 'desktop') await avatar.hover(); else await avatar.tap();
  await expect(preview(page)).toBeVisible();
  await expect(preview(page)).toContainText('Independent songs from a real artist profile.');
  await expect(preview(page)).toContainText('Music Producer · Songwriter');
  await expect(preview(page)).toContainText('Jazz');
  await expect(preview(page)).toContainText('Mexico City');
  await expect(preview(page)).toContainText('Open to collaborate');
  await expect(preview(page)).not.toContainText('PRIVATE_PREVIEW_PREFERENCE');
  await expect(preview(page)).not.toContainText(owner.email);
  expect(profileRequests).toBe(1);
  await expect(preview(page).getByRole('link', { name: 'View profile', exact: true })).toHaveAttribute('href', `/artist/${owner.user.artistId}`);
  const cardBox = (await preview(page).boundingBox())!;
  expect(cardBox.x).toBeGreaterThanOrEqual(0); expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(await media!.evaluate((element: HTMLMediaElement) => element.isConnected && element.paused && element.currentTime === 1 && element.volume === .37)).toBe(true);
  await page.screenshot({ path: info.outputPath('artist-preview.png'), animations: 'disabled' });
  await page.keyboard.press('Escape'); await expect(preview(page)).toHaveCount(0);
  await avatar.focus(); await avatar.press('Enter'); await expect(preview(page)).toBeVisible();
  await page.keyboard.press('Escape'); await expect(avatar).toBeFocused();
  await avatar.press('Enter'); await preview(page).getByRole('link', { name: 'View profile', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/artist/${owner.user.artistId}$`));
});

test('the avatar badge uses persisted follow state, retries failed changes and syncs tabs', async ({ page, context }) => {
  const { owner, href } = await fixture(page);
  await page.goto(href);
  await active(page).getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(active(page).getByRole('button', { name: 'Following', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect((await (await page.request.get(`/api/artists/${owner.user.artistId}/social`)).json()).isFollowing).toBe(true);
  const other = await context.newPage(); await other.goto(`/artist/${owner.user.artistId}`);
  await other.getByRole('button', { name: 'Following', exact: true }).click();
  await expect(active(page).getByRole('button', { name: 'Follow', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await other.close();
  const followPath = `**/api/artists/${owner.user.artistId}/follow`;
  await page.route(followPath, route => route.fulfill({ status: 503, json: { error: 'Temporary follow failure.' } }));
  await active(page).getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(preview(page).getByRole('alert')).toContainText('Temporary follow failure. Try again.');
  await expect(active(page).getByRole('button', { name: 'Follow', exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect((await (await page.request.get(`/api/artists/${owner.user.artistId}/social`)).json()).isFollowing).toBe(false);
  await page.unroute(followPath); await page.keyboard.press('Escape');
  await active(page).getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(active(page).getByRole('button', { name: 'Following', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await expect(active(page).getByRole('button', { name: 'Following', exact: true })).toBeVisible();
});

test('profile and follow failures remain explicit; account changes preserve role and self guards', async ({ page }) => {
  const { owner, href } = await fixture(page);
  let failProfile = true;
  await page.route('**/api/rpc', async route => {
    if (failProfile && route.request().postDataJSON()?.method === 'getPublicArtist') await route.fulfill({ status: 503, json: { error: 'Artist profile temporarily unavailable.' } });
    else await route.continue();
  });
  await page.goto(href); await active(page).getByRole('button', { name: 'About Preview Artist', exact: true }).click();
  await expect(preview(page).getByRole('alert')).toContainText('Artist details are unavailable.');
  failProfile = false; await preview(page).getByRole('button', { name: 'Retry artist details', exact: true }).click();
  await expect(preview(page)).toContainText('Independent songs from a real artist profile.');
  await rpc(page, 'logout'); await page.reload();
  await expect(active(page).getByRole('link', { name: 'Sign in to follow', exact: true })).toBeVisible();
  await register(page, 'Preview Investor', 'investor'); await page.goto(href);
  await expect(active(page).locator('.discovery-follow-button')).toHaveCount(0);
  await rpc(page, 'login', { email: owner.email, password: 'preview123', role: 'artist' }); await page.goto(href);
  await expect(active(page).locator('.discovery-follow-button')).toHaveCount(0);
  await register(page, 'Fresh Preview Viewer'); await page.goto(href);
  await expect(active(page).getByRole('button', { name: 'Follow', exact: true })).toHaveAttribute('aria-pressed', 'false');
  const socialPath = `**/api/artists/${owner.user.artistId}/social`;
  await page.route(socialPath, route => route.fulfill({ status: 503, json: { error: 'Follow summary unavailable.' } }));
  await page.reload(); await expect(active(page).getByRole('button', { name: 'Retry follow information', exact: true })).toBeVisible();
  await active(page).getByRole('button', { name: 'About Preview Artist', exact: true }).click();
  await expect(preview(page).getByRole('alert')).toContainText('Follow information is unavailable.');
  await page.unroute(socialPath); await preview(page).getByRole('button', { name: 'Retry follow information', exact: true }).click();
  await expect(active(page).getByRole('button', { name: 'Follow', exact: true })).toHaveAttribute('aria-pressed', 'false');
});
