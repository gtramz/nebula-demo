import {test,expect,type Page} from '@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
const active=(page:Page)=>page.locator('article[data-active=true]');
const originalButton=(page:Page)=>active(page).getByRole('button',{name:'Original sound: Marea Alta · studio instrumental',exact:true});
async function open(page:Page){
 expect((await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}})).ok()).toBe(true);
 await page.setViewportSize({width:390,height:900});await page.goto('/discovery?post=post-14');
 await expect(originalButton(page)).toBeVisible();await expect.poll(()=>active(page).locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
}

test('split video fills mobile with a centered seam; desktop and transport remain intact',async({page},info)=>{
 await open(page);
 for(const size of [{width:390,height:900},{width:636,height:930},{width:767,height:900},{width:667,height:375},{width:768,height:900},{width:1440,height:900}]){
  await page.setViewportSize(size);const post=active(page),video=post.locator('video');
  expect(await video.count()).toBe(1);await video.evaluate((v:HTMLVideoElement)=>{v.pause();v.currentTime=2;});
  if(size.width<768){
   const feed=(await page.locator('.discovery-feed').boundingBox())!,picture=(await post.locator('.adaptive-video-picture').boundingBox())!;
   expect(picture.x).toBeCloseTo(feed.x,0);expect(picture.y).toBeCloseTo(feed.y,0);expect(picture.width).toBeCloseTo(feed.width,0);expect(picture.height).toBeCloseTo(feed.height,0);
   await expect(video).toHaveCSS('object-fit','cover');await expect(video).toHaveCSS('object-position','50% 50%');
   await expect(post.getByRole('link',{name:/^Remix of/})).toHaveCount(0);await expect(post.getByRole('button',{name:'Compare versions',exact:true})).toHaveCount(0);await expect(post.getByRole('button',{name:'Remixes of remixes are unavailable',exact:true})).toHaveCount(0);
   const thumb=(await originalButton(page).boundingBox())!;expect(thumb.width).toBe(48);expect(thumb.height).toBe(48);expect(thumb.y+thumb.height).toBeLessThanOrEqual(feed.y+feed.height);
  }else{
   await expect(post.locator('.adaptive-video')).toHaveAttribute('data-layout','side-by-side');await expect(originalButton(page)).toHaveCount(0);
   await expect(post.getByRole('link',{name:/^Remix of/})).toBeVisible();await expect(post.getByRole('button',{name:'Compare versions',exact:true})).toBeVisible();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`remix-${size.width}.png`)});
 }
 await page.setViewportSize({width:390,height:900});expect(await videoTime(page)).toBeCloseTo(2,1);
});
async function videoTime(page:Page){return active(page).locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime);}

test('original sheet keeps credits, lazy comparison, navigation, focus and paused feed position',async({page},info)=>{
 await open(page);const post=active(page),video=post.locator('video');
 const source=await(await page.request.get('/api/publications/13')).json();await expect(originalButton(page).locator('img')).toHaveAttribute('src',source.coverUrl);
 const play=post.getByRole('button',{name:'Play Marea Alta · Dante’s verse',exact:true});if(await play.isVisible())await play.click();
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(false);
 const scroll=await page.locator('.discovery-feed').evaluate(e=>e.scrollTop);await originalButton(page).click();
 const dialog=page.getByRole('dialog',{name:'Original sound',exact:true});await expect(dialog).toBeVisible();await expect(video).toHaveJSProperty('paused',true);
 await expect(dialog.getByText('Remix by Dante Vela',{exact:true})).toBeVisible();await expect(dialog.locator('audio,video')).toHaveCount(0);
 await expect(dialog.getByRole('link',{name:'Open original',exact:true})).toBeVisible();
 await expect(dialog).toHaveCSS('opacity','1');
 await page.screenshot({path:info.outputPath('original-sheet.png')});
 await dialog.getByRole('button',{name:'Compare versions',exact:true}).click();await expect(dialog.getByLabel('Compare Original',{exact:true})).toBeVisible();
 expect(await dialog.locator('audio,video').evaluateAll((ms:HTMLMediaElement[])=>ms.every(m=>m.paused))).toBe(true);
 await dialog.getByLabel('Compare Original',{exact:true}).evaluate((m:HTMLMediaElement)=>m.play());await expect(video).toHaveJSProperty('paused',true);
 await expect.poll(()=>page.locator('audio,video').evaluateAll((ms:HTMLMediaElement[])=>ms.filter(m=>!m.paused).length)).toBe(1);
 await page.keyboard.press('Escape');await expect(originalButton(page)).toBeFocused();await expect(video).toHaveJSProperty('paused',true);
 expect(await page.locator('.discovery-feed').evaluate(e=>e.scrollTop)).toBe(scroll);
 await originalButton(page).click();await page.getByRole('dialog').getByRole('link',{name:/^View project/}).click();await expect(page).toHaveURL(/\/project\/12\?song=4/);await page.goBack();await expect(originalButton(page)).toBeVisible();
 await originalButton(page).click();await page.getByRole('dialog').getByRole('link',{name:'Open original',exact:true}).click();await expect(page).toHaveURL(/post=post-13/);await page.goBack();await expect(originalButton(page)).toBeVisible();
});

test('original without project, failed covers and transient errors never invent destinations',async({page})=>{
 await page.route('**/api/publications/13',async route=>{const r=await route.fetch();const source=await r.json();source.project=null;source.coverUrl='/missing-original-cover.png';await route.fulfill({json:source});});
 await open(page);await expect(originalButton(page).locator('svg')).toBeVisible();await originalButton(page).click();
 await expect(page.getByRole('dialog').getByRole('link',{name:'Open original',exact:true})).toBeVisible();await expect(page.getByRole('dialog').getByRole('link',{name:/View project/})).toHaveCount(0);
 await page.keyboard.press('Escape');await page.unroute('**/api/publications/13');
 await page.route('**/api/publications/13',r=>r.fulfill({status:503,json:{error:'Unavailable'}}));await page.reload();await originalButton(page).click();
 await expect(page.getByRole('dialog').getByRole('button',{name:'Try again',exact:true})).toBeVisible();await expect(page.getByRole('dialog').getByRole('link')).toHaveCount(0);
 await page.unroute('**/api/publications/13');await page.getByRole('dialog').getByRole('button',{name:'Try again',exact:true}).click();await expect(page.getByRole('dialog').getByRole('link',{name:'Open original',exact:true})).toBeVisible();
});

test('revoked original remains historical without links or media, even if its thumbnail was cached',async({page})=>{
 await open(page);await expect(originalButton(page).locator('img')).toBeVisible();
 await page.route('**/api/publications/13',r=>r.fulfill({status:404,json:{error:'Original unavailable'}}));
 await originalButton(page).click();const dialog=page.getByRole('dialog');
 await expect(dialog.getByText('The original is no longer available.',{exact:true})).toBeVisible();
 await expect(dialog.getByText('Marea Alta · studio instrumental',{exact:true})).toBeVisible();await expect(dialog.getByRole('link')).toHaveCount(0);await expect(dialog.locator('audio,video')).toHaveCount(0);await expect(dialog.getByRole('button',{name:'Compare versions',exact:true})).toHaveCount(0);
});


test('original cover falls back to its project; distant originals are not fetched',async({page})=>{
 let requests=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/api/publications/13')requests++;});
 await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});await page.setViewportSize({width:390,height:900});await page.goto('/discovery?post=post-3');
 await expect(active(page).getByRole('heading',{name:'Low Tide',exact:true})).toBeVisible();expect(requests).toBe(0);
 await page.route('**/api/publications/13',async route=>{const r=await route.fetch();const source=await r.json();source.coverUrl='/missing-original-cover.png';await route.fulfill({json:source});});
 await page.goto('/discovery?post=post-14');
 const source=await(await page.request.get('/api/publications/13')).json();expect(source.project.coverUrl).toBeTruthy();
 await expect(originalButton(page).locator('img')).toHaveAttribute('src',source.project.coverUrl);
});
