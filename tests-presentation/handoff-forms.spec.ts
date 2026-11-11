import { test, expect, type Page } from '@playwright/test';
const headers = { Origin: 'http://127.0.0.1:4177', 'X-Nebula-Request': '1' };
async function rpc(page: Page, method: string, ...args: unknown[]) {
  const r = await page.request.post('/api/rpc', { headers, data: { method, args } });
  expect(r.ok(), await r.text()).toBe(true); return (await r.json()).result;
}
test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.request.post('/api/presentation/reset', { headers, data: { confirm: true } });
  await page.setViewportSize({ width: 1440, height: 900 });
});

test('registration validates, preserves Back, guards departure and creates once after retry', async ({ page }) => {
  await rpc(page, 'logout'); await page.goto('/register');
  await page.getByRole('button', { name: /investor fund projects/i }).click();
  const next = page.getByRole('button', { name: 'continue', exact: true });
  await next.click(); await expect(page.getByText('enter at least 2 characters.')).toBeVisible();
  await page.getByLabel(/^full name/).fill('Handoff account');
  await next.dblclick(); await expect(page.getByLabel('email address', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'back', exact: true }).click();
  await expect(page.getByLabel(/^full name/)).toHaveValue('Handoff account');
  page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('link', { name: 'Nebula home', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await next.click(); await page.getByLabel('email address', { exact: true }).fill(`handoff-${Date.now()}@example.invalid`);
  await next.click(); await page.getByLabel('password', { exact: true }).fill('Nebula2026!');
  await page.getByLabel('confirm password', { exact: true }).fill('Nebula2026!');
  let writes = 0;
  await page.route('**/api/rpc', route => {
    if (route.request().postDataJSON()?.method !== 'register') return route.continue();
    writes++; return writes === 1 ? route.fulfill({ status: 503, json: { error: 'Registration unavailable' } }) : route.continue();
  });
  await page.getByRole('button', { name: 'create account', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Registration unavailable');
  await expect(page.getByLabel('password', { exact: true })).toHaveValue('Nebula2026!');
  await page.getByRole('button', { name: 'create account', exact: true }).dblclick();
  await expect(page).toHaveURL(/\/explore$/); expect(writes).toBe(2);
});

test('song list validates, retains Back and cancelled reload, retries without losing revision', async ({ page }, info) => {
  const project = await rpc(page, 'createProject', { operationId: crypto.randomUUID(), title: 'Handoff songs', category: 'EP', status: 'draft', goalAmount: 0, songs: [{ title: 'First', description: '' }] });
  await page.goto('/profile'); await page.getByRole('button', { name: 'edit Handoff songs', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const form = page.getByRole('form', { name: 'Song list editor', exact: true });
  await form.getByLabel('Song 1 title', { exact: true }).fill('');
  await form.getByRole('button', { name: 'Review songs', exact: true }).click();
  await expect(form.getByLabel('Song 1 title', { exact: true })).toBeVisible();
  await form.getByLabel('Song 1 title', { exact: true }).fill('Preserved song');
  page.once('dialog', dialog => dialog.dismiss()); await form.getByRole('button', { name: 'Reload songs', exact: true }).click();
  await expect(form.getByLabel('Song 1 title', { exact: true })).toHaveValue('Preserved song');
  await form.getByRole('button', { name: 'Review songs', exact: true }).click();
  await form.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(form.getByLabel('Song 1 title', { exact: true })).toHaveValue('Preserved song');
  await form.getByRole('button', { name: 'Review songs', exact: true }).click();
  let attempts = 0;
  await page.route(`**/api/projects/${project.id}/songs`, route => {
    if (route.request().method() !== 'PUT') return route.continue();
    attempts++; return attempts === 1 ? route.fulfill({ status: 503, json: { error: 'Song save unavailable' } }) : route.continue();
  });
  await form.getByRole('button', { name: 'Save songs', exact: true }).click();
  await expect(form.getByRole('alert')).toContainText('Song save unavailable');
  await form.getByRole('button', { name: 'Save songs', exact: true }).dblclick();
  await expect(form.getByLabel('Song 1 title', { exact: true })).toHaveValue('Preserved song');
  expect(attempts).toBe(2);
  const saved = await (await page.request.get(`/api/projects/${project.id}/songs`)).json();
  expect(saved.songs[0].title).toBe('Preserved song');
  await page.screenshot({ path: info.outputPath('songs-after.png') });
});

test('publication audio uses one source, rejects metadata-only readiness and recovers replacement failure', async ({ page }) => {
  await page.goto('/publish'); const next = page.getByRole('button', { name: 'Continue', exact: true });
  const file = page.getByLabel('Audio or video', { exact: true });
  await file.setInputFiles('artifacts/nebula/public/discovery-demo/soft-signal.wav');
  await expect(next).toBeEnabled(); await expect(page.locator('audio')).toHaveCount(1);
  await page.getByRole('button', { name: 'Play Publication preview', exact: true }).click();
  await expect(page.locator('audio')).toHaveJSProperty('paused', false);
  await next.dblclick(); await expect(page.locator('.guided-heading h2')).toHaveText('Details');
  await expect(page.locator('audio')).toHaveJSProperty('paused', true);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.route('**/media/**', route => route.fulfill({ status: 200, contentType: 'audio/wav', body: 'broken audio' }));
  await file.setInputFiles('presentation/assets/audio/afterglow.mp3');
  await expect(page.getByRole('alert').filter({ hasText: 'This audio cannot be played.' })).toBeVisible();
  await expect(next).toBeDisabled(); await expect(page.locator('audio')).toHaveCount(1);
  await page.locator('audio').dispatchEvent('loadedmetadata'); await expect(next).toBeDisabled();
  await page.unroute('**/media/**'); await file.setInputFiles('artifacts/nebula/public/discovery-demo/soft-signal.wav');
  await expect(next).toBeEnabled(); await expect(page.locator('audio')).toHaveCount(1);
  await next.click(); await page.getByLabel('Title', { exact: true }).fill('Recovered publication');
  await next.click(); await next.click();
  let attempts = 0; const tokens: string[] = [];
  await page.route('**/api/publications', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    attempts++; tokens.push(route.request().postDataJSON().operationId);
    if (attempts === 1) { await route.fetch(); await route.fulfill({ status: 503, json: { error: 'Publication response lost' } }); }
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Publication response lost');
  await page.getByRole('button', { name: 'Publish', exact: true }).dblclick();
  await expect(page).toHaveURL(/\/studio$/);
  expect(attempts).toBe(2); expect(tokens[0]).toBeTruthy(); expect(tokens[0]).toBe(tokens[1]);
  const records = await (await page.request.get('/api/publications?mine=1')).json();
  expect(records.items.filter((post: any) => post.title === 'Recovered publication')).toHaveLength(1);
});

test('project save retries a real lost response without losing fields or creating another project', async ({ page }) => {
  await page.goto('/profile?create=project&intent=retry');
  await page.getByLabel('TITLE', { exact: true }).fill('Recovered project');
  let writes = 0; const tokens: string[] = [];
  await page.route('**/api/rpc', async route => {
    const body = route.request().postDataJSON();
    if (body?.method !== 'createProject') return route.continue();
    writes++; tokens.push(body.args[0].operationId);
    if (writes === 1) { await route.fetch(); await route.fulfill({ status: 503, json: { error: 'Project response lost' } }); }
    else await route.continue();
  });
  const save = page.getByRole('button', { name: 'Save & exit', exact: true });
  await save.click(); await expect(page.getByRole('alert')).toContainText('Project response lost');
  await expect(page.getByLabel('TITLE', { exact: true })).toHaveValue('Recovered project');
  await save.dblclick(); await expect(page).toHaveURL(/\/profile$/);
  expect(writes).toBe(2); expect(tokens[0]).toBeTruthy(); expect(tokens[0]).toBe(tokens[1]);
  const projects = await rpc(page, 'listProjects');
  expect(projects.filter((project: any) => project.title === 'Recovered project')).toHaveLength(1);
});
