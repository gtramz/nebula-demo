import { test, expect, type Page } from '@playwright/test';

const headers = { Origin: 'http://127.0.0.1:4177', 'X-Nebula-Request': '1' };
const active = (page: Page) => page.locator('article[data-active=true]');
const media = (page: Page) => active(page).locator('audio,video');
const trigger = (page: Page) => active(page).getByRole('button', { name: /view project/i });
const dialog = (page: Page) => page.getByRole('dialog', { name: 'The project', exact: true });
async function open(page: Page, id: number) {
  await page.goto(`/discovery?post=post-${id}`);
  await expect(active(page).locator('.discovery-video-tap')).toBeEnabled({ timeout: 20000 });
  await expect.poll(() => media(page).evaluate((e: HTMLMediaElement) => e.readyState)).toBeGreaterThanOrEqual(2);
  if (await media(page).evaluate((e: HTMLMediaElement) => e.paused)) await active(page).locator('.discovery-video-tap').click();
  await expect(media(page)).toHaveJSProperty('paused', false);
}
async function fits(page: Page) {
  const panel = dialog(page), box = (await panel.boundingBox())!, viewport = page.viewportSize()!;
  expect(box.height).toBeLessThanOrEqual(viewport.height * .88 + 1);
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  if (viewport.width >= 768) {
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(1);
    expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(1);
  } else expect(Math.abs(box.y + box.height - viewport.height)).toBeLessThan(1);
  const cta = panel.getByRole('link', { name: 'View full project', exact: true }), button = (await cta.boundingBox())!;
  expect(button.y).toBeGreaterThanOrEqual(box.y); expect(button.y + button.height).toBeLessThanOrEqual(box.y + box.height);
  expect(await cta.evaluate(e => { const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); })).toBe(true);
  expect(await panel.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
}
test.beforeEach(async ({ page }) => {
  expect((await page.request.post('/api/presentation/reset', { headers, data: { confirm: true } })).ok()).toBe(true);
});

test('public audio, video and remix show the project overview at target widths and retain the song destination', async ({ page }, info) => {
  test.setTimeout(150000);
  const sizes = info.project.name === 'mobile' ? [[375,667],[390,844],[430,932]] : [[1280,720],[1440,900]];
  for (const id of [3,11,18]) {
    await page.setViewportSize({width:sizes[0][0],height:sizes[0][1]}); await open(page,id);
    const post = await (await page.request.get(`/api/publications/${id}`)).json(), source = await media(page).elementHandle();
    const projectRequests:string[]=[];const watch=(r:any)=>{if(/\/api\/projects\//.test(r.url()))projectRequests.push(r.url());};page.on('request',watch);
    await trigger(page).click();await expect(dialog(page)).toBeVisible();await expect(media(page)).toHaveJSProperty('paused',true);
    await expect(dialog(page).getByRole('heading',{name:post.project.title,exact:true})).toBeVisible();
    await expect(dialog(page).locator('.discovery-project-artist')).toHaveText(post.project.artistName);
    await expect(dialog(page).locator('.discovery-project-stage')).toHaveText(post.project.status);
    if(post.project.coverUrl) await expect(dialog(page).locator('.discovery-project-cover img')).toHaveAttribute('src',post.project.coverUrl);
    await expect(dialog(page).getByRole('region',{name:'Project funding'})).toHaveCount(0);
    await expect(dialog(page).locator('form,progress')).toHaveCount(0);
    await expect(dialog(page).getByRole('region',{name:'Available opportunities'})).toHaveCount(post.offers.some((o:any)=>o.available)?1:0);
    for(const [width,height] of sizes){await page.setViewportSize({width,height});await fits(page);await page.screenshot({path:info.outputPath(`project-${id}-${width}.png`),scale:'css',animations:'disabled'});}
    const destination=`/project/${post.project.id}${post.song?.id?`?song=${post.song.id}`:''}`;
    await expect(dialog(page).getByRole('link',{name:'View full project',exact:true})).toHaveAttribute('href',destination);
    expect(projectRequests).toEqual([]);page.off('request',watch);
    await dialog(page).getByRole('button',{name:'Close panel',exact:true}).click();await expect(trigger(page)).toBeFocused();
    expect(await source!.evaluate(e=>e.isConnected)).toBe(true);await expect(media(page)).toHaveJSProperty('paused',false);
    await trigger(page).click();await dialog(page).getByRole('link',{name:'View full project',exact:true}).click();
    await expect(page).toHaveURL(new RegExp(destination.replace('?', '\\?')+'$'));expect(await source!.evaluate((e:HTMLMediaElement)=>e.paused)).toBe(true);
  }
});

test('Escape and overlay close restore focus, manual pause, feed position and the same player', async ({page}) => {
  await open(page,3);const source=await media(page).elementHandle();
  await active(page).locator('.discovery-video-tap').click();await active(page).getByRole('slider',{name:/^Seek /}).fill('5');
  const index=await active(page).getAttribute('data-index');
  for(const close of ['keyboard','overlay']){
    await trigger(page).focus();await page.keyboard.press('Enter');await expect(dialog(page)).toBeVisible();
    await page.keyboard.press('Tab');expect(await dialog(page).evaluate(e=>e.contains(document.activeElement))).toBe(true);
    if(close==='keyboard')await page.keyboard.press('Escape');else await page.mouse.click(4,4);
    await expect(dialog(page)).toHaveCount(0);await expect(trigger(page)).toBeFocused();
    expect(await source!.evaluate((e:HTMLMediaElement)=>({connected:e.isConnected,paused:e.paused,time:e.currentTime}))).toEqual({connected:true,paused:true,time:5});
    await expect(active(page)).toHaveAttribute('data-index',index!);
  }
  await active(page).locator('.discovery-video-tap').click();await expect(media(page)).toHaveJSProperty('paused',false);
});

test('long public summaries, more than three opportunities and missing or failed project covers keep the footer reachable', async ({page},info) => {
  const title='A project with a very long title that wraps without hiding its full project destination';
  await page.route('**/api/publications/3',async route=>{const response=await route.fetch(),post=await response.json();post.project={...post.project,title,story:'A detailed project story. '.repeat(80),coverUrl:null};post.offers=Array.from({length:5},(_,i)=>({id:900+i,need:`Creative role ${i+1}`,available:true,deliverable:'Demo',compensation:{kind:'fee',amount:100,currency:'USD'}}));await route.fulfill({response,json:post});});
  await open(page,3);await trigger(page).click();await expect(dialog(page).getByRole('img',{name:'No project artwork',exact:true})).toBeVisible();
  await expect(dialog(page).getByRole('listitem')).toHaveCount(3);await expect(dialog(page)).toContainText('+2 more opportunities');
  await expect(dialog(page).locator('.discovery-project-description')).toHaveCSS('-webkit-line-clamp','4');
  expect(await dialog(page).locator('.discovery-project-description').evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);
  await page.setViewportSize(info.project.name==='mobile'?{width:667,height:375}:{width:1280,height:440});await fits(page);
  await dialog(page).locator('.discovery-project-summary').evaluate(e=>{e.scrollTop=e.scrollHeight;});await fits(page);
  await page.screenshot({path:info.outputPath('project-short-long-content.png'),scale:'css',animations:'disabled'});
  await page.keyboard.press('Escape');await page.unroute('**/api/publications/3');
  const post=await (await page.request.get('/api/publications/3')).json();
  await page.route('**/api/publications/3',async route=>{const response=await route.fetch(),data=await response.json();data.project.coverUrl='/missing-project-cover.png';await route.fulfill({response,json:data});});
  await page.route('**/missing-project-cover.png',r=>r.fulfill({status:404,body:'Missing'}));await open(page,3);await trigger(page).click();
  await expect(dialog(page).getByRole('img',{name:'No project artwork',exact:true})).toBeVisible();await fits(page);
  expect(post.coverUrl).toBeTruthy();await expect(dialog(page).locator('.discovery-project-cover img')).toHaveCount(0);
});

test('a publication without a public project exposes no project preview',async({page})=>{
  await page.route('**/api/publications/3',async route=>{const response=await route.fetch(),post=await response.json();post.project=null;post.offers=[];await route.fulfill({response,json:post});});
  await open(page,3);await expect(trigger(page)).toHaveCount(0);await expect(page.getByRole('link',{name:'View full project',exact:true})).toHaveCount(0);
});
