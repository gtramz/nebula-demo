import { test, expect, type Page } from '@playwright/test';
const headers = { Origin: 'http://127.0.0.1:4177', 'X-Nebula-Request': '1' };
async function call(page: Page, path: string, data?: unknown) {
  const response = await page.request.fetch(path, { method: data === undefined ? 'GET' : 'POST', headers, data });
  expect(response.ok(), await response.text()).toBe(true); return response.json();
}
const next = (page: Page) => page.getByRole('button', { name: 'Continue', exact: true }).click();
async function stage(page: Page, title: string) { await expect(page.locator('.guided-heading h2')).toHaveText(title); }
async function capture(page: Page, path: string) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const footer = await page.locator('.guided-footer').boundingBox();
  expect(footer!.y).toBeGreaterThan(0); expect(footer!.y + footer!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({path});
}
test.beforeEach(async ({page}) => { await call(page, '/api/presentation/reset', {confirm:true}); });

for (const kind of ['audio', 'video'] as const) test(`guided ${kind} publication preserves inputs, draft and publish`, async ({page}, info) => {
  test.setTimeout(90000);
  await page.goto('/publish'); await stage(page,'Media');
  await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Step 4: Review'})).toBeDisabled();
  await page.getByLabel('Audio or video',{exact:true}).setInputFiles(kind === 'audio' ? 'artifacts/nebula/public/discovery-demo/soft-signal.wav' : 'presentation/assets/video/marea-session.mp4');
  await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();
  await capture(page,info.outputPath(`${kind}-media.png`));
  await page.locator(`${kind}`).evaluate(async (media:HTMLMediaElement) => { await media.play(); });
  await next(page); await stage(page,'Details');
  expect(await page.locator(kind).evaluate((media:HTMLMediaElement)=>media.paused)).toBe(true);
  await next(page); await stage(page,'Details'); // Required title cannot be skipped.
  // Let the scheduled validation focus settle before typing into consecutive fields.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.getByLabel('Title',{exact:true}).fill(`Guided ${kind} test`);
  await page.getByLabel('Description',{exact:true}).fill('Kept while moving between steps.');
  await next(page); await stage(page,'Project');
  await page.getByLabel('Allow other artists to remix this publication',{exact:true}).check();
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await expect(page.getByLabel('Title',{exact:true})).toHaveValue(`Guided ${kind} test`);
  await next(page); await expect(page.getByLabel('Allow other artists to remix this publication',{exact:true})).toBeChecked();
  await next(page); await stage(page,'Review');
  await capture(page,info.outputPath(`${kind}-review.png`));
  await page.getByRole('button',{name:'Save & exit',exact:true}).click(); await expect(page).toHaveURL(/\/studio$/);
  const own=(await call(page,'/api/publications?mine=1')).items;
  const draft=own.find((p:any)=>p.title===`Guided ${kind} test`);expect(draft.status).toBe('draft');expect(draft.allowRemix).toBe(true);
  await page.goto(`/publish/${draft.id}`);await stage(page,'Media');await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();
  await next(page); await expect(page.getByLabel('Description',{exact:true})).toHaveValue('Kept while moving between steps.'); await next(page);await next(page);
  await page.route('**/api/publications/*',route=>route.request().method()==='PATCH'?route.fulfill({status:503,json:{error:'Temporary save failure'}}):route.continue());
  await page.getByRole('button',{name:'Publish',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await stage(page,'Review');
  await page.unroute('**/api/publications/*');await page.getByRole('button',{name:'Publish',exact:true}).click();await expect(page).toHaveURL(/\/studio$/);
  const saved=await call(page,`/api/publications/${draft.id}`);expect(saved.status).toBe('published');expect(saved.media.id).toBe(draft.media.id);
  await page.goto(`/publish/${draft.id}`);await stage(page,'Media');await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Save & exit',exact:true}).click();await expect(page).toHaveURL(/\/studio$/);expect((await call(page,`/api/publications/${draft.id}`)).status).toBe('published');
});

test('guided project validates stages, preserves songs and publishes a scoped opportunity', async ({page},info) => {
  test.setTimeout(90000);
  await page.goto('/profile?create=project');await stage(page,'Identity');
  await expect(page.getByRole('heading',{name:'Profile',exact:true})).toHaveCount(0);
  await next(page);await stage(page,'Identity');
  await page.getByLabel('TITLE',{exact:true}).fill('Guided project test');await page.getByLabel('CATEGORY',{exact:true}).selectOption('EP');
  for(const width of info.project.name==='desktop'?[768,1024,1440]:[390]) {await page.setViewportSize({width,height:844});await capture(page,info.outputPath(`project-identity-${width}.png`));}
  await next(page);await stage(page,'Songs & story');await page.getByLabel('PITCH (Short description)',{exact:true}).fill('Our next record.');
  await page.getByRole('button',{name:'Add song',exact:true}).click();await next(page);await stage(page,'Songs & story');
  await page.getByLabel('Song 1 title',{exact:true}).fill('First song');await next(page);await stage(page,'Opportunities');
  await page.getByLabel('Find collaborators for this project',{exact:true}).check();await page.getByRole('combobox',{name:'Opportunity scope',exact:true}).selectOption('0');
  await page.getByLabel('Expected deliverable',{exact:true}).fill('One vocal verse');await next(page);await stage(page,'Opportunities');
  await expect(page.getByRole('alert').last()).toContainText('Choose a musical reference');
  await page.getByLabel('Upload reference audio or video',{exact:true}).setInputFiles('presentation/assets/audio/afterglow.mp3');
  await expect(page.getByLabel('Opportunity reference',{exact:true})).toBeVisible();await next(page);await stage(page,'Review');
  await page.getByLabel('STATUS',{exact:true}).selectOption('published');
  await page.getByRole('button',{name:'Step 2: Songs & story'}).click();await expect(page.getByLabel('Song 1 title',{exact:true})).toHaveValue('First song');
  await page.getByRole('button',{name:'Step 4: Review'}).click();await expect(page.getByLabel('STATUS',{exact:true})).toHaveValue('published');
  await capture(page,info.outputPath('project-review.png'));
  await page.getByRole('button',{name:'Publish project',exact:true}).click();await expect(page).toHaveURL(/\/profile$/);
  const projects=(await call(page,'/api/rpc',{method:'listProjects',args:[]})).result;
  const project=projects.find((p:any)=>p.title==='Guided project test');expect(project.status).toBe('published');
  const offers=await call(page,`/api/projects/${project.id}/offers`);expect(offers).toHaveLength(1);expect(offers[0].workTitle).toBe('First song');expect(offers[0].available).toBe(true);
});

test('Save & exit creates a real private project without publishing',async({page})=>{
  await page.goto('/profile?create=project');await page.getByLabel('TITLE',{exact:true}).fill('Private guided draft');
  await page.getByRole('button',{name:'Save & exit',exact:true}).click();await expect(page).toHaveURL(/\/profile$/);
  const projects=(await call(page,'/api/rpc',{method:'listProjects',args:[]})).result;expect(projects.filter((p:any)=>p.title==='Private guided draft')).toHaveLength(1);expect(projects.find((p:any)=>p.title==='Private guided draft').status).toBe('draft');
});

test('new project formats reserve tracklists for Album and EP without losing in-progress songs', async ({page}, info) => {
  await page.goto('/profile?create=project');
  const category=page.getByLabel('CATEGORY',{exact:true});
  await expect(category.locator('option')).toHaveText(['Album','EP','Tour','Music video']);
  await page.getByLabel('TITLE',{exact:true}).fill('Format switch project');
  await next(page);
  for(const title of ['First track','Second track']) {
    await page.getByRole('button',{name:'Add song',exact:true}).click();
    await page.getByLabel(`Song ${title==='First track'?1:2} title`,{exact:true}).fill(title);
  }
  await next(page);
  await page.getByLabel('Find collaborators for this project',{exact:true}).check();
  await page.getByRole('combobox',{name:'Opportunity scope',exact:true}).selectOption('1');
  await page.getByLabel('Upload reference audio or video',{exact:true}).setInputFiles('presentation/assets/audio/afterglow.mp3');
  await expect(page.getByLabel('Opportunity reference',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Step 1: Identity',exact:true}).click();
  await category.selectOption('EP');await next(page);
  await expect(page.getByLabel('Song 2 title',{exact:true})).toHaveValue('Second track');
  for(const format of ['Tour','Video']) {
    await page.getByRole('button',{name:'Step 1: Identity',exact:true}).click();
    await category.selectOption(format);await next(page);await stage(page,'Story');
    await expect(page.getByRole('button',{name:'Add song',exact:true})).toHaveCount(0);
    await expect(page.getByLabel('Use an existing song',{exact:true})).toHaveCount(0);
    await next(page);
    await expect(page.getByRole('combobox',{name:'Opportunity scope',exact:true})).toHaveValue('');
    await expect(page.getByLabel('Opportunity reference',{exact:true})).toHaveCount(0);
    await expect(page.getByRole('combobox',{name:'Opportunity scope',exact:true}).locator('option')).toHaveText(['Entire project']);
  }
  await page.getByRole('button',{name:'Step 1: Identity',exact:true}).click();
  await category.selectOption('Album');await next(page);
  await expect(page.getByLabel('Song 1 title',{exact:true})).toHaveValue('First track');
  await expect(page.getByLabel('Song 2 title',{exact:true})).toHaveValue('Second track');
  // An unfinished hidden track must neither block saving nor be submitted as a video tracklist.
  await page.getByRole('button',{name:'Add song',exact:true}).click();
  await page.getByRole('button',{name:'Step 1: Identity',exact:true}).click();
  await category.selectOption('Video');await next(page);await next(page);
  await page.getByLabel('Find collaborators for this project',{exact:true}).uncheck();
  await next(page);await stage(page,'Review');
  await expect(page.locator('.creation-summary')).toContainText('Music video');
  await expect(page.locator('.creation-summary dt').filter({hasText:/^Songs$/})).toHaveCount(0);
  await capture(page,info.outputPath('music-video-review.png'));
  await page.getByRole('button',{name:'Save project',exact:true}).click();
  await expect(page).toHaveURL(/\/profile$/);
  const projects=(await call(page,'/api/rpc',{method:'listProjects',args:[]})).result;
  const project=projects.find((p:any)=>p.title==='Format switch project');
  expect(project.category).toBe('Video');expect(project.status).toBe('draft');
  expect((await call(page,`/api/projects/${project.id}/songs`)).songs).toHaveLength(0);
  expect(await call(page,`/api/projects/${project.id}/offers`)).toHaveLength(0);
});

test('existing Single projects retain their format and songs when editing details', async ({page}) => {
  const projects=(await call(page,'/api/rpc',{method:'listProjects',args:[]})).result;
  const single=projects.find((p:any)=>p.category==='Single'&&p.artistId===21);
  expect(single).toBeTruthy();
  const songs=await call(page,`/api/projects/${single.id}/songs`);
  await page.goto('/profile');
  await page.getByRole('button',{name:`edit ${single.title}`,exact:true}).click();
  await expect(page.getByLabel('CATEGORY',{exact:true})).toHaveValue('Single');
  await expect(page.getByLabel('CATEGORY',{exact:true}).locator('option[value="Video"]')).toHaveText('Music video');
  await page.getByRole('button',{name:'SAVE PROJECT',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Edit Project',exact:true})).toHaveCount(0);
  const after=(await call(page,'/api/rpc',{method:'listProjects',args:[]})).result.find((p:any)=>p.id===single.id);
  expect(after.category).toBe('Single');expect(after.title).toBe(single.title);
  expect(await call(page,`/api/projects/${single.id}/songs`)).toEqual(songs);
});
