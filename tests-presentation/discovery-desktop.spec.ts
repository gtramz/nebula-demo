import {test,expect,type Page} from '@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
const active=(page:Page)=>page.locator('article[data-active=true]');
const media=(page:Page)=>active(page).locator('audio,video');
async function open(page:Page,id:number){await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});await page.goto(`/discovery?post=post-${id}`);await expect.poll(()=>media(page).evaluate((m:HTMLMediaElement)=>m.readyState)).toBeGreaterThanOrEqual(2);}
test.beforeEach(async({},info)=>test.skip(info.project.name!=='desktop','Desktop-specific presentation; mobile covered by playback/layout suites'));
for(const id of [3,11,14]) test(`desktop media ${id}: layout, comments, drafts and single-source playback`,async({page},info)=>{
 await open(page,id);const originalName=await active(page).getAttribute('aria-label');
 for(const width of [768,932,1024,1280,1440]){
  await page.setViewportSize({width,height:930});
  await expect(page.getByRole('heading',{name:/discovery/i,level:1})).toHaveCount(1);
  const feed=await page.locator('.discovery-feed').boundingBox();expect(feed!.height).toBeGreaterThan(900);
  const source=await media(page).elementHandle();await media(page).evaluate((m:HTMLMediaElement)=>{m.pause();m.currentTime=2;m.volume=.6;});
  await active(page).getByRole('button',{name:'Comments',exact:true}).click();
  const panel=page.getByRole('complementary',{name:'Publication comments'});await expect(panel).toBeVisible();
  expect((await panel.boundingBox())!.width).toBe(width>=1280?360:320);
  expect(await source!.evaluate((m:HTMLMediaElement)=>m.isConnected&&m.paused&&m.volume===.6)).toBe(true);
  await expect(page.getByRole('button',{name:'Next post',exact:true})).toBeVisible();
  await page.getByLabel('Add a comment',{exact:true}).fill(`Draft ${id}`);
  await page.screenshot({path:info.outputPath(`${id}-${width}-comments.png`)});
  await page.getByRole('button',{name:'Close comments',exact:true}).click();
  expect(await source!.evaluate((m:HTMLMediaElement)=>m.isConnected&&m.paused&&m.currentTime===2)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`${id}-${width}-closed.png`)});
 }
 await active(page).getByRole('button',{name:'Comments',exact:true}).click();await expect(page.getByLabel('Add a comment',{exact:true})).toHaveValue(`Draft ${id}`);
 await expect(page.locator('[data-index="1"] audio,[data-index="1"] video')).toHaveAttribute('preload','auto');
 await page.getByRole('button',{name:'Next post',exact:true}).click();await expect(active(page)).not.toHaveAttribute('aria-label',originalName!);
 await expect(page.getByLabel('Add a comment',{exact:true})).toHaveValue('');await page.getByLabel('Add a comment',{exact:true}).fill('Second publication draft');
 await page.getByRole('button',{name:'Close comments',exact:true}).focus();await page.keyboard.press('Escape');await expect(active(page).getByRole('button',{name:'Comments',exact:true})).toBeFocused();
 await active(page).getByRole('button',{name:'Comments',exact:true}).click();await expect(page.getByLabel('Add a comment',{exact:true})).toHaveValue('Second publication draft');
 await page.getByRole('button',{name:'Previous post',exact:true}).click();await expect(active(page)).toHaveAttribute('aria-label',originalName!);await expect(page.getByLabel('Add a comment',{exact:true})).toHaveValue(`Draft ${id}`);
 await page.getByRole('button',{name:'Close comments',exact:true}).focus();await page.keyboard.press('Escape');await expect(page.getByRole('complementary',{name:'Publication comments'})).toHaveCount(0);await expect(active(page).getByRole('button',{name:'Comments',exact:true})).toBeFocused();
 await media(page).evaluate((m:HTMLMediaElement)=>m.pause());
 await active(page).getByRole('button',{name:'Resume playback',exact:true}).focus();await page.keyboard.press('Enter');await expect(media(page)).toHaveJSProperty('paused',false);
 await active(page).getByRole('button',{name:'Full screen',exact:true}).click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);await page.evaluate(()=>document.exitFullscreen());
 await page.setViewportSize({width:932,height:600});await page.screenshot({path:info.outputPath(`${id}-short.png`)});expect(await active(page).locator('audio,video').count()).toBe(1);
});

test('compact follow uses actual relationship and errors retry',async({page},info)=>{
 await open(page,3);
 const author=await active(page).locator('.discovery-author a').first().getAttribute('href');const id=author!.split('/').at(-1);
 const follow=active(page).getByRole('button',{name:'Follow',exact:true});await expect(follow).toBeVisible();
 await page.setViewportSize({width:983,height:930});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await active(page).locator('.discovery-author').screenshot({path:info.outputPath('follow-alignment.png')});
 await follow.click();await expect(active(page).getByRole('button',{name:'Following',exact:true})).toHaveAttribute('aria-pressed','true');
 expect((await(await page.request.get(`/api/artists/${id}/social`)).json()).isFollowing).toBe(true);
 await active(page).getByRole('button',{name:'Following',exact:true}).click();await expect(follow).toHaveAttribute('aria-pressed','false');
 await page.route(`**/api/artists/${id}/follow`,route=>route.fulfill({status:503,json:{error:'Unavailable for this test'}}));await follow.click();await expect(active(page).getByRole('alert')).toContainText('Try again');await page.unroute(`**/api/artists/${id}/follow`);await follow.click();await expect(active(page).getByRole('button',{name:'Following',exact:true})).toBeVisible();
});

test('follow syncs across tabs and identity changes isolate drafts and role actions',async({page,context})=>{
 await open(page,3);
 const artistId=(await active(page).locator('.discovery-author a').first().getAttribute('href'))!.split('/').at(-1);
 const other=await context.newPage();await other.goto(`/artist/${artistId}`);
 await other.getByRole('button',{name:'Follow',exact:true}).click();
 await expect(active(page).getByRole('button',{name:'Following',exact:true})).toBeVisible();
 await other.getByRole('button',{name:'Following',exact:true}).click();await expect(active(page).getByRole('button',{name:'Follow',exact:true})).toBeVisible();await other.close();
 await active(page).getByRole('button',{name:'Comments',exact:true}).click();await page.getByLabel('Add a comment',{exact:true}).fill('CHILZ private unsent draft');
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:4}});
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect.poll(()=>page.locator('textarea').evaluateAll((elements:HTMLTextAreaElement[])=>elements.some(e=>e.value==='CHILZ private unsent draft'))).toBe(false);
 if(!await page.getByLabel('Add a comment',{exact:true}).count())await active(page).getByRole('button',{name:'Comments',exact:true}).click();await expect(page.getByLabel('Add a comment',{exact:true})).toHaveValue('');
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:7}});await page.reload();await expect(active(page).locator('.discovery-follow-button')).toHaveCount(0);
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:0}});await page.reload();await expect(active(page).getByRole('link',{name:'Sign in to follow',exact:true})).toBeVisible();
});
