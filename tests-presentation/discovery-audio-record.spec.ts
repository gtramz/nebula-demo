import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const headers = { Origin: 'http://127.0.0.1:4177', 'X-Nebula-Request': '1' };
const card = (page: Page) => page.locator('article[data-active=true]');
const audio = (page: Page) => card(page).locator('audio');
const record = (page: Page) => card(page).locator('.discovery-record-art');
const disc = (page: Page) => card(page).locator('.discovery-vinyl');
const surface = (page: Page) => card(page).locator('.discovery-video-tap');
async function open(page: Page, id = 3) {
  await page.goto(`/discovery?post=post-${id}`);
  await expect(surface(page)).toBeEnabled({ timeout: 20000 });
  await expect(audio(page)).toHaveJSProperty('readyState', 4, { timeout: 15000 });
  if (await audio(page).evaluate((m: HTMLMediaElement) => m.paused)) await surface(page).click();
  await expect(record(page)).toHaveAttribute('data-turning', 'true');
}
async function fits(page: Page) {
  const player = card(page).locator('.discovery-media'), bounds = (await player.boundingBox())!;
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await player.evaluate(e => e.scrollHeight <= e.clientHeight + 1)).toBe(true);
  for (const target of [card(page).getByRole('slider', { name: /^Seek / }), card(page).locator('.discovery-audio-project')]) {
    if (!await target.isVisible()) continue;
    const box = (await target.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(bounds.x - 1); expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
    expect(box.y).toBeGreaterThanOrEqual(bounds.y - 1); expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1);
  }
}
async function publication(page: Page, cover = false) {
  async function upload(path: string, kind: string) {
    const r = await page.request.post('/api/uploads', { headers: { ...headers, 'Content-Type': 'application/octet-stream', 'X-Media-Kind': kind }, data: await readFile(path) });
    expect(r.ok(), await r.text()).toBe(true); return r.json();
  }
  const media = await upload('artifacts/nebula/public/discovery-demo/soft-signal.wav', 'audio');
  const image = cover ? await upload('presentation/assets/covers/luna-original.png', 'image') : null;
  const r = await page.request.post('/api/publications', { headers, data: { operationId: crypto.randomUUID(), title: 'Independent audio with a deliberately long title that must remain readable through Details without pushing the waveform outside the card', description: 'New audio uses the same record layout automatically.', mediaId: media.id, coverId: image?.id ?? null, projectId: null, allowRemix: true, status: 'published' } });
  expect(r.ok(), await r.text()).toBe(true); return r.json();
}
test.beforeEach(async ({ page }) => {
  expect((await page.request.post('/api/presentation/reset', { headers, data: { confirm: true } })).ok()).toBe(true);
});

test('audio covers, backgrounds and controls fit Low Tide, Luna and CHILZ Remix at all target widths', async ({ page }, info) => {
  test.setTimeout(180000);
  const mobile = info.project.name === 'mobile';
  const sizes = mobile ? [[375,667],[390,844],[430,932]] : [[1280,720],[1440,900]];
  const palettes = new Set<string>();
  for (const id of [3,17,18]) {
    await page.setViewportSize({ width: sizes[0][0], height: sizes[0][1] }); await open(page, id);
    const post = await (await page.request.get(`/api/publications/${id}`)).json();
    await expect(card(page).locator('.discovery-audio-byline')).toContainText(post.artistName);
    await expect(card(page).locator('.discovery-record-sleeve img')).toHaveAttribute('src', post.coverUrl);
    await expect(card(page).locator('.discovery-artwork')).toHaveAttribute('data-loading', 'false');
    await expect.poll(() => card(page).locator('.discovery-audio-ambient').evaluate(e => e.style.getPropertyValue('--ambient-a'))).not.toBe('#172027');
    palettes.add(await card(page).locator('.discovery-audio-ambient').getAttribute('style') ?? '');
    for (const [width,height] of sizes) {
      await page.setViewportSize({width,height}); await fits(page);
      await page.screenshot({path:info.outputPath(`audio-${id}-${width}.png`),animations:'allow'});
    }
    const source = await audio(page).elementHandle();
    await card(page).getByRole('button',{name:'Comments',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Conversation',exact:true})).toBeVisible();
    await expect(audio(page)).toHaveJSProperty('paused',mobile);
    await expect(record(page)).toHaveAttribute('data-turning',String(!mobile));
    await fits(page);await page.screenshot({path:info.outputPath(`audio-${id}-comments.png`)});
    await page.getByRole('button',{name:'Close panel',exact:true}).click();
    expect(await source!.evaluate(e=>e.isConnected)).toBe(true);
    await expect(record(page)).toHaveAttribute('data-turning','true');
  }
  expect(palettes.size).toBeGreaterThan(1);
});

test('record follows actual play, pause, seek, waiting, visibility and feed navigation without resetting its angle', async ({page},info) => {
  await open(page);
  const transform=()=>disc(page).evaluate(e=>getComputedStyle(e).transform);
  const first=await transform();await expect.poll(transform).not.toBe(first);
  await surface(page).click();await expect(audio(page)).toHaveJSProperty('paused',true);await expect(record(page)).toHaveAttribute('data-turning','false');
  // CSS animation pause is committed on the rendering frame after React updates data-turning.
  await disc(page).evaluate(async e=>{await e.getAnimations()[0].ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
  const paused=await transform(),elapsed=await disc(page).evaluate(e=>Number(e.getAnimations()[0].currentTime));
  await page.waitForTimeout(250);expect(await transform()).toBe(paused);
  await card(page).getByRole('slider',{name:/^Seek /}).fill('5');expect(await transform()).toBe(paused);await expect(audio(page)).toHaveJSProperty('paused',true);
  await surface(page).click();await expect(record(page)).toHaveAttribute('data-turning','true');
  await expect.poll(()=>disc(page).evaluate(e=>Number(e.getAnimations()[0].currentTime))).toBeGreaterThan(elapsed);
  if(info.project.name==='desktop'){
    await surface(page).hover();await card(page).locator('.discovery-desktop-volume').getByRole('button').click();
    await expect(record(page)).toHaveAttribute('data-turning','true');await expect(audio(page)).toHaveJSProperty('paused',false);
    const group=card(page).locator('.discovery-desktop-volume');
    await audio(page).evaluate((e:HTMLMediaElement)=>{e.volume=.6;e.muted=true;});
    await group.getByRole('button').focus();await page.keyboard.press('Tab');
    await expect(group.locator('input')).toBeFocused();await page.keyboard.press('ArrowRight');
    await expect(audio(page)).toHaveJSProperty('volume',.65);await expect(audio(page)).toHaveJSProperty('muted',false);
    await expect(record(page)).toHaveAttribute('data-turning','true');
  }
  // Exercise the same media events emitted during real buffering without replacing the audio.
  await audio(page).evaluate(e=>e.dispatchEvent(new Event('waiting')));await expect(record(page)).toHaveAttribute('data-turning','false');
  await audio(page).evaluate(e=>e.dispatchEvent(new Event('playing')));await expect(record(page)).toHaveAttribute('data-turning','true');
  // Headless Chrome does not consistently hide background tabs; test the visibility listener explicitly.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(audio(page)).toHaveJSProperty('paused',true);await expect(record(page)).toHaveAttribute('data-turning','false');
  await page.evaluate(()=>{Reflect.deleteProperty(document,'hidden');document.dispatchEvent(new Event('visibilitychange'));});
  await expect(record(page)).toHaveAttribute('data-turning','true');
  const old=page.locator('article[data-index="0"] .discovery-record-art');
  await page.locator('.discovery-feed').focus();await page.keyboard.press('ArrowDown');await expect(card(page)).toHaveAttribute('data-index','1');await expect(old).toHaveAttribute('data-turning','false');
  await expect.poll(()=>page.locator('audio,video').evaluateAll((items:HTMLMediaElement[])=>items.filter(m=>!m.paused).length)).toBe(1);
});

test('new independent audio handles long titles, missing cover and unavailable waveform with functional seek and Details', async ({page},info) => {
  const post=await publication(page);
  await page.route(`**/api/publications/${post.id}/waveform*`,r=>r.fulfill({status:503,json:{error:'Waveform unavailable'}}));
  await open(page,post.id);await expect(card(page).getByLabel('No cover artwork',{exact:true})).toBeVisible();
  await expect(card(page).locator('.discovery-audio-project')).toHaveCount(0);await expect(card(page).locator('.discovery-waveform')).toHaveCount(0);
  await expect(card(page).locator('.discovery-audio-byline')).toContainText(post.artistName);
  await fits(page);await card(page).getByRole('slider',{name:/^Seek /}).fill('3');await expect.poll(()=>audio(page).evaluate((e:HTMLMediaElement)=>e.currentTime)).toBeGreaterThanOrEqual(3);
  await card(page).getByRole('button',{name:`Read description of ${post.title}`,exact:true}).click();
  const panel=page.getByRole('dialog',{name:'About this publication'});await expect(panel).toContainText(post.title);await expect(panel).toContainText(post.description);
  await expect(record(page)).toHaveAttribute('data-turning','false');await page.getByRole('button',{name:'Close panel',exact:true}).click();await expect(record(page)).toHaveAttribute('data-turning','true');
  await page.screenshot({path:info.outputPath('independent-no-cover.png')});
});

test('failed artwork and media are recoverable and never spin an unavailable recording', async ({page}) => {
  const post=await publication(page,true);
  await page.route(`**${post.coverUrl}`,r=>r.abort());await page.route(`**${post.media.url}`,r=>r.fulfill({status:404,body:'Unavailable'}));
  await page.goto(`/discovery?post=post-${post.id}`);
  await expect(card(page).getByRole('button',{name:'Retry playback',exact:true})).toBeVisible({timeout:20000});
  await expect(record(page)).toHaveAttribute('data-turning','false');await expect(card(page).getByRole('button',{name:'Retry artwork',exact:true})).toBeVisible();
  await expect(card(page).locator('.discovery-audio-ambient')).toHaveCSS('--ambient-a','#172027');
  await page.unroute(`**${post.coverUrl}`);await card(page).getByRole('button',{name:'Retry artwork',exact:true}).click();
  await expect(card(page).locator('.discovery-artwork')).toHaveAttribute('data-loading','false');
  await expect.poll(()=>card(page).locator('.discovery-audio-ambient').evaluate(e=>e.style.getPropertyValue('--ambient-a'))).not.toBe('#172027');
  await page.unroute(`**${post.media.url}`);await card(page).getByRole('button',{name:'Retry playback',exact:true}).click();
  await expect(record(page)).toHaveAttribute('data-turning','true');await expect(audio(page)).toHaveJSProperty('paused',false);
});

test('reduced motion leaves the record still while audio and waveform progress', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});await open(page);
  await expect(disc(page)).toHaveCSS('animation-name','none');await expect(disc(page)).toHaveCSS('transform','none');
  const time=await audio(page).evaluate((e:HTMLMediaElement)=>e.currentTime);
  await expect.poll(()=>audio(page).evaluate((e:HTMLMediaElement)=>e.currentTime)).toBeGreaterThan(time);
  await expect(disc(page)).toHaveCSS('transform','none');
});

test('landscape keeps audio controls reachable without adding an inner scroller', async ({page},info) => {
  const mobile=info.project.name==='mobile';await page.setViewportSize(mobile?{width:844,height:390}:{width:1280,height:540});
  await open(page,18);await fits(page);await page.screenshot({path:info.outputPath('audio-landscape.png')});
  for(const button of await card(page).locator('.discovery-actions > button').all()){
    const box=(await button.boundingBox())!;expect(box.x+box.width).toBeLessThanOrEqual(page.viewportSize()!.width);expect(box.y+box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  await surface(page).click();await expect(audio(page)).toHaveJSProperty('paused',true);
  await card(page).getByRole('button',{name:'Comments',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Conversation',exact:true})).toBeVisible();await fits(page);
  await page.screenshot({path:info.outputPath('audio-landscape-comments.png')});
});
