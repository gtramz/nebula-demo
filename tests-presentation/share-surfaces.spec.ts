import { test, expect as baseExpect, type Page } from '@playwright/test';
const expect=baseExpect.configure({timeout:20000});
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
const active=(page:Page)=>page.locator('article[data-active=true]');
async function open(page:Page,id=3){await page.goto(`/discovery?post=post-${id}`);await expect(active(page).locator('.discovery-video-tap')).toBeEnabled();}
async function fits(page:Page){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const dialog=page.getByRole('dialog').last();await expect(dialog).toBeVisible();await expect(dialog.locator('[data-loading-variant]')).toHaveCount(0);expect(await dialog.evaluate(e=>!!(e.getAttribute('aria-label')||document.getElementById(e.getAttribute('aria-labelledby')??'')?.textContent))).toBe(true);const box=(await dialog.boundingBox())!,size=page.viewportSize()!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(size.width+1);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(size.height+1);expect(box.height).toBeLessThanOrEqual(size.height*.88+1);expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);if(size.width>=768){expect(Math.abs(box.x+box.width/2-size.width/2)).toBeLessThan(1);expect(Math.abs(box.y+box.height/2-size.height/2)).toBeLessThan(1);}else expect(Math.abs(box.y+box.height-size.height)).toBeLessThan(1);return dialog;}
test.beforeEach(async({page})=>{expect((await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}})).ok()).toBe(true);});
test('Discovery details, artist and comments share the responsive surface without moving the feed',async({page},info)=>{
 test.setTimeout(120000);await open(page,11);const media=active(page).locator('video'),source=await media.elementHandle();
 await expect(media).toHaveJSProperty('readyState',4);if(await media.evaluate((m:HTMLMediaElement)=>m.paused))await active(page).locator('.discovery-video-tap').click();
 const initial=await active(page).getAttribute('data-index'),feedTop=await page.locator('.discovery-feed').evaluate(e=>e.scrollTop);
 const sizes=info.project.name==='mobile'?[[375,812],[390,844],[430,932]]:[[1280,720],[1440,900]];
 for(const kind of ['details','artist','comments']){
  const trigger=kind==='details'?active(page).getByRole('button',{name:/Read description/}):kind==='artist'?active(page).getByRole('button',{name:/^About /}):active(page).getByRole('button',{name:'Comments',exact:true});
  await trigger.click();await expect(page.getByRole('dialog').locator('[data-loading-variant]')).toHaveCount(0);for(const [width,height] of sizes){await page.setViewportSize({width,height});await fits(page);await page.screenshot({path:info.outputPath(`${kind}-${width}.png`),scale:'css'});}
  const dialog=page.getByRole('dialog');
  if(kind==='comments'){
   await expect(media).toHaveJSProperty('paused',info.project.name==='mobile');
   await dialog.getByLabel('Add a comment',{exact:true}).fill('Draft survives modal close');
   await dialog.press('ArrowDown');await page.mouse.wheel(0,350);await expect(active(page)).toHaveAttribute('data-index',initial!);
  }
  await page.keyboard.press('Escape');await expect(trigger).toBeFocused();expect(await source!.evaluate(e=>e.isConnected)).toBe(true);await expect(media).toHaveJSProperty('paused',false);
  if(kind==='comments'){await trigger.click();await expect(page.getByLabel('Add a comment',{exact:true})).toHaveValue('Draft survives modal close');await page.keyboard.press('Escape');}
 }
 // Resizes may change pixel offsets; the active piece must remain aligned with its slot.
 await expect(active(page)).toHaveAttribute('data-index',initial!);expect(feedTop).toBeGreaterThanOrEqual(0);
 await active(page).locator('.discovery-video-tap').click();await active(page).getByRole('button',{name:'Comments',exact:true}).click();await page.keyboard.press('Escape');await expect(media).toHaveJSProperty('paused',true);
});
test('comment failures retain drafts; successful writes and deletes keep the player and feed intact',async({page},info)=>{
 await open(page,3);await active(page).getByRole('button',{name:'Comments',exact:true}).click();const dialog=page.getByRole('dialog');
 const src=await active(page).locator('audio').elementHandle();await dialog.getByLabel('Add a comment',{exact:true}).fill('Disposable modal comment');
 await page.route('**/api/publications/3/comments',route=>route.request().method()==='POST'?route.fulfill({status:503,json:{error:'Temporary comment failure'}}):route.continue());
 await dialog.getByRole('button',{name:'Post comment',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible();await expect(dialog.getByLabel('Add a comment',{exact:true})).toHaveValue('Disposable modal comment');
 await page.unroute('**/api/publications/3/comments');await dialog.getByRole('button',{name:'Post comment',exact:true}).click();await expect(dialog.getByText('Disposable modal comment',{exact:true})).toBeVisible();await expect(dialog.getByLabel('Add a comment',{exact:true})).toHaveValue('');
 const row=dialog.locator(info.project.name==='desktop'?'.comment-row':'article').filter({hasText:'Disposable modal comment'});await row.getByRole('button',{name:/Delete comment/}).click();await expect(dialog.getByText('Disposable modal comment',{exact:true})).toHaveCount(0);expect(await src!.evaluate(e=>e.isConnected)).toBe(true);
});
test('filters, connections, notifications and Julio retain actions and focus in the shared layout',async({page},info)=>{
 await page.goto('/explore');await page.getByRole('button',{name:'Search Home',exact:true}).click();const filter=page.getByRole('button',{name:/^Filters/});await filter.click();let dialog=await fits(page);await page.screenshot({path:info.outputPath(`filters-${info.project.name}.png`)});await dialog.getByRole('checkbox').first().check();await dialog.getByRole('button',{name:/Apply filters/}).click();await filter.click();await expect(page.getByRole('dialog').getByRole('checkbox').first()).toBeChecked();await page.getByRole('dialog').getByRole('button',{name:'Clear all',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:/Apply filters/}).click();
 await page.goto('/artist/32');const follows=page.getByRole('button',{name:/^\d+ followers$/});await follows.click();dialog=await fits(page);await page.screenshot({path:info.outputPath(`connections-${info.project.name}.png`)});await page.keyboard.press('Escape');await expect(follows).toBeFocused();
 for(const name of [/^Notifications \(/,/Open Julio, your co-producer/]){
  const trigger=page.getByRole('button',{name}).first();await trigger.click();dialog=await fits(page);await page.screenshot({path:info.outputPath(`${name.source.startsWith('^Notifications')?'notifications':'julio'}-${info.project.name}.png`)});await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 }
});
test('funding keeps validation, pending guards, recoverable errors and confirmation',async({page},info)=>{
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:7}});await page.goto('/project/15');await page.getByRole('button',{name:'BACK THIS PROJECT',exact:true}).click();const dialog=await fits(page);
 await dialog.locator('#pledge-amount').fill('50');await dialog.getByRole('button',{name:/CONFIRM/}).click();expect(await dialog.locator('#pledge-amount').evaluate((e:HTMLInputElement)=>e.validity.rangeUnderflow)).toBe(true);await dialog.locator('#pledge-amount').fill('250');
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});
 await page.route('**/api/rpc',async route=>{if(route.request().postDataJSON()?.method==='createInvestment'){await gate;await route.fulfill({status:503,json:{error:'Temporary funding failure'}});}else await route.continue();});
 await dialog.getByRole('button',{name:/CONFIRM/}).click();await expect(dialog.getByRole('button',{name:'Close funding'})).toBeDisabled();await page.keyboard.press('Escape');await expect(dialog).toBeVisible();release();await expect(dialog.getByRole('alert')).toBeVisible();await expect(dialog.locator('#pledge-amount')).toHaveValue('250');
 await page.screenshot({path:info.outputPath(`funding-${info.project.name}.png`)});await page.unroute('**/api/rpc');await dialog.getByRole('button',{name:/CONFIRM/}).click();await expect(page).toHaveURL(/\/receipt\/\d+/);
});
test('remix comparison and original sound keep their accessible content',async({page},info)=>{
 await open(page,18);await active(page).getByRole('button',{name:'Compare versions',exact:true}).click();await fits(page);await expect(page.getByRole('dialog')).toContainText('Compare');await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await open(page,14);await active(page).getByRole('button',{name:/^Original sound:/}).click();await fits(page);await expect(page.getByRole('dialog')).toContainText('Original sound');await page.screenshot({path:info.outputPath(`original-${info.project.name}.png`)});
});
test('guest login prompt follows the common layout and returns focus',async({page})=>{
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:0}});await open(page);const like=active(page).getByRole('button',{name:'Like',exact:true});await like.click();const dialog=await fits(page);await expect(dialog.getByRole('link',{name:'log in',exact:true})).toHaveAttribute('href','/login');await page.keyboard.press('Escape');await expect(like).toBeFocused();
});

test('mobile keyboard leaves the comment composer visible and closing restores the feed',async({page},info)=>{
 test.skip(info.project.name!=='mobile','Visual viewport keyboard scenario');await open(page,3);await active(page).getByRole('button',{name:'Comments',exact:true}).click();await page.getByLabel('Add a comment',{exact:true}).fill('Keyboard draft');
 await page.evaluate(()=>{Object.defineProperty(window.visualViewport!,'height',{configurable:true,value:340});window.visualViewport!.dispatchEvent(new Event('resize'));});
 const dialog=page.getByRole('dialog');await expect.poll(async()=>{const b=(await dialog.boundingBox())!;return b.y+b.height;}).toBeLessThanOrEqual(341);
 const send=dialog.getByRole('button',{name:'Post comment',exact:true});await send.scrollIntoViewIfNeeded();const b=(await send.boundingBox())!;expect(b.y+b.height).toBeLessThanOrEqual(341);
 await page.evaluate(()=>{delete (window.visualViewport as any).height;window.visualViewport!.dispatchEvent(new Event('resize'));});await page.keyboard.press('Escape');await expect(active(page).getByRole('button',{name:'Comments',exact:true})).toBeFocused();
});
test('long comment threads paginate inside the modal and leave the composer reachable',async({page},info)=>{
 const sample=await(await page.request.get('/api/publications/11/comments?threaded=1')).json();
 await page.route('**/api/publications/11/comments*',async route=>{
  if(route.request().method()!=='GET')return route.continue();const older=new URL(route.request().url()).searchParams.has('before');
  await route.fulfill({json:{items:Array.from({length:older?5:20},(_,i)=>({...sample.items[0],id:(older?2000:1000)+i,text:`Comment ${older?'older':'recent'} ${i}. ${'A long but readable thought about this recording. '.repeat(4)}`,replyCount:0,canDelete:false})),nextCursor:older?null:1000}});
 });
 await open(page,11);await active(page).getByRole('button',{name:'Comments',exact:true}).click();const dialog=await fits(page),rows=dialog.locator(info.project.name==='desktop'?'.comment-thread':'.discovery-comments > article');await expect(rows).toHaveCount(20);
 await dialog.getByRole('button',{name:'Older comments',exact:true}).click();await expect(rows).toHaveCount(25);await dialog.getByLabel('Add a comment',{exact:true}).fill('Pagination keeps this draft');const submit=dialog.getByRole('button',{name:'Post comment',exact:true});await submit.scrollIntoViewIfNeeded();const box=(await submit.boundingBox())!;expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(page.viewportSize()!.height);await expect(active(page)).toHaveAttribute('data-index','0');await page.screenshot({path:info.outputPath(`long-comments-${info.project.name}.png`)});
});
