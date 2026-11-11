import {test,expect,type Page} from '@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
const active=(page:Page)=>page.locator('article[data-active=true]');
const media=(page:Page)=>active(page).locator('audio,video');
async function open(page:Page,id:number){
 const reset=await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});expect(reset.ok()).toBe(true);
 await page.goto(`/discovery?post=post-${id}`);await media(page).waitFor({state:'attached'});
 // Start through the real control so reduced-motion and autoplay policy use the same fixture.
 await media(page).evaluate((m:HTMLMediaElement)=>m.pause());await active(page).locator('.discovery-video-tap').press('Enter');
 await expect(media(page)).toHaveJSProperty('paused',false);
 await expect.poll(()=>media(page).evaluate((m:HTMLMediaElement)=>m.readyState),{timeout:15000}).toBeGreaterThanOrEqual(2);
 await expect.poll(()=>media(page).evaluate((m:HTMLMediaElement)=>m.currentTime),{timeout:10000}).toBeGreaterThan(0);
}
async function pauseThroughControl(page:Page){
 // A DOM pause is not a user's pause: enabling sound may legitimately resume autoplay.
 if(await media(page).evaluate((m:HTMLMediaElement)=>m.paused))await active(page).locator('.discovery-video-tap').click();
 await expect(media(page)).toHaveJSProperty('paused',false);
 await active(page).locator('.discovery-video-tap').click();
 await expect(media(page)).toHaveJSProperty('paused',true);
}
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

for(const id of [3,11,14]) test(`desktop volume ${id}: hover tray, drag and mute preserve the media`,async({page},info)=>{
 await open(page,id);
 const source=await media(page).elementHandle();
 const group=active(page).locator('.discovery-desktop-volume'),button=group.getByRole('button');
 const tray=group.locator('.discovery-desktop-volume-slider'),slider=group.locator('input');
 for(const width of [1440,768]){
  await page.setViewportSize({width,height:930});
  if(width===768)await active(page).getByRole('button',{name:'Comments',exact:true}).click();
  await pauseThroughControl(page);
  await media(page).evaluate((m:HTMLMediaElement)=>{m.currentTime=2;m.volume=.6;m.muted=false;});
  await page.mouse.move(0,0);await expect(slider).toBeHidden();await expect(tray).toHaveCSS('pointer-events','none');
  await active(page).locator('h2').hover();await expect(slider).toBeHidden();
  const before=await button.boundingBox();
  await button.hover();await expect(slider).toBeVisible();await expect(tray).toHaveCSS('opacity','1');
  expect(await button.boundingBox()).toEqual(before);
  const bounds=await tray.boundingBox(),card=await active(page).locator('.discovery-media').boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(card!.x);expect(bounds!.y).toBeGreaterThanOrEqual(card!.y);
  expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(card!.x+card!.width);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(card!.y+card!.height);
  await page.screenshot({path:info.outputPath(`${id}-${width}-volume-hover.png`)});
  await button.click();await expect(media(page)).toHaveJSProperty('muted',true);await expect(media(page)).toHaveJSProperty('volume',.6);
  await slider.hover();await expect(slider).toBeVisible();
  const range=await slider.boundingBox();
  await page.mouse.move(range!.x+range!.width*.25,range!.y+range!.height/2);await page.mouse.down();
  await page.mouse.move(range!.x+range!.width+24,range!.y-24,{steps:6});await expect(slider).toBeVisible();
  await expect(media(page)).toHaveJSProperty('muted',false);
  await page.mouse.up();await page.mouse.move(0,0);await expect(slider).toBeHidden();
  expect(await source!.evaluate((m:HTMLMediaElement)=>m.isConnected&&m.paused&&m.currentTime===2)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});

test('desktop volume supports keyboard focus and reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await open(page,11);
 const transport=active(page).locator('.discovery-desktop-transport'),group=transport.locator('.discovery-desktop-volume');
 const slider=group.locator('input'),tray=group.locator('.discovery-desktop-volume-slider');
 await media(page).evaluate((m:HTMLMediaElement)=>{m.pause();m.volume=.6;m.muted=true;});
 await page.mouse.move(0,0);await expect(slider).toBeHidden();
 await transport.getByRole('button',{name:'Resume playback',exact:true}).focus();await page.keyboard.press('Tab');
 await expect(group.getByRole('button')).toBeFocused();await expect(slider).toBeVisible();
 expect(await tray.evaluate(element=>Math.max(...getComputedStyle(element).transitionDuration.split(',').map(parseFloat)))).toBeLessThanOrEqual(.001);
 await page.keyboard.press('Tab');await expect(slider).toBeFocused();await page.keyboard.press('ArrowRight');
 await expect(media(page)).toHaveJSProperty('volume',.65);await expect(media(page)).toHaveJSProperty('muted',false);await expect(media(page)).toHaveJSProperty('paused',true);
 await page.keyboard.press('ArrowLeft');await expect(media(page)).toHaveJSProperty('volume',.6);
 await page.keyboard.press('Tab');await expect(transport.getByRole('button',{name:'Full screen',exact:true})).toBeFocused();await expect(slider).toBeHidden();
});

test('desktop touch volume opens on tap and dismisses outside the controls',async({browser})=>{
 const context=await browser.newContext({viewport:{width:932,height:930},hasTouch:true}),page=await context.newPage();
 try{
  await open(page,11);await pauseThroughControl(page);await media(page).evaluate((m:HTMLMediaElement)=>{m.volume=.6;m.muted=false;});
  const group=active(page).locator('.discovery-desktop-volume'),slider=group.locator('input'),tray=group.locator('.discovery-desktop-volume-slider');
  await expect(slider).toBeHidden();await group.getByRole('button').tap();await expect(slider).toBeVisible();await expect(tray).toHaveCSS('opacity','1');await expect(media(page)).toHaveJSProperty('muted',true);
  await slider.tap();await expect(media(page)).toHaveJSProperty('muted',false);await expect(slider).toBeVisible();await expect(media(page)).toHaveJSProperty('paused',true);
  await active(page).locator('h2').tap();await expect(slider).toBeHidden();
 }finally{await context.close();}
});

test('compact follow uses actual relationship and errors retry',async({page},info)=>{
 await open(page,3);
 const id=await active(page).locator('.discovery-artist-trigger').getAttribute('data-artist-id');
 const follow=active(page).getByRole('button',{name:'Follow',exact:true});await expect(follow).toBeVisible();
 await page.setViewportSize({width:983,height:930});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await active(page).locator('.discovery-artist').screenshot({path:info.outputPath('follow-alignment.png')});
 await follow.click();await expect(active(page).getByRole('button',{name:'Following',exact:true})).toHaveAttribute('aria-pressed','true');
 expect((await(await page.request.get(`/api/artists/${id}/social`)).json()).isFollowing).toBe(true);
 await active(page).getByRole('button',{name:'Following',exact:true}).click();await expect(follow).toHaveAttribute('aria-pressed','false');
 await page.route(`**/api/artists/${id}/follow`,route=>route.fulfill({status:503,json:{error:'Unavailable for this test'}}));await follow.click();await expect(page.getByRole('alert')).toContainText('Try again');await page.unroute(`**/api/artists/${id}/follow`);await follow.click();await expect(active(page).getByRole('button',{name:'Following',exact:true})).toBeVisible();
});

test('follow syncs across tabs and identity changes isolate drafts and role actions',async({page,context})=>{
 await open(page,3);
 const artistId=await active(page).locator('.discovery-artist-trigger').getAttribute('data-artist-id');
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
