import {test,expect,type APIRequestContext} from '@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
async function register(api:APIRequestContext,name:string){const r=await api.post('/api/rpc',{headers,data:{method:'register',args:[{name,email:`${crypto.randomUUID()}@example.invalid`,password:'preview123',role:'artist'}]}});expect(r.ok()).toBe(true);return(await r.json()).user;}
test.beforeEach(async({page})=>{await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});});
test('share delivers real requests and chats; partial retry does not duplicate completed sends',async({page,browser})=>{
 const bContext=await browser.newContext({baseURL:'http://127.0.0.1:4177'}),cContext=await browser.newContext({baseURL:'http://127.0.0.1:4177'});
 try{
  await register(page.request,'Share Artist A');const B=await register(bContext.request,'Share Artist B'),C=await register(cContext.request,'Share Artist C');
  for(const recipient of [B,C])expect((await page.request.put(`/api/artists/${recipient.artistId}/follow`,{headers,data:{enabled:true}})).ok()).toBe(true);
  await page.goto('/discovery?post=post-3');const active=page.locator('article[data-active=true]');await active.getByRole('button',{name:'Share',exact:true}).click();const panel=page.getByRole('dialog',{name:'Share',exact:true});await expect(panel).toBeVisible();
  await panel.getByRole('button',{name:'Select Share Artist B',exact:true}).click();await panel.getByLabel('Add a message',{exact:true}).fill('Listen to this with me');
  const response=page.waitForResponse(r=>r.url().endsWith('/api/messages/share')&&r.request().method()==='POST');await panel.getByRole('button',{name:'Send (1)',exact:true}).click();const first=await(await response).json();await expect(panel.getByText('Request sent with Share Artist B.')).toBeVisible();
  const bPage=await bContext.newPage();await bPage.goto(`/messages/general/${first.id}`);await expect(bPage.getByText(/Listen to this with me/)).toBeVisible();await expect(bPage.getByRole('link',{name:'Open shared publication',exact:true})).toHaveAttribute('href','/discovery?post=post-3');
  expect((await cContext.request.get(`/api/messages/general/${first.id}`)).status()).toBe(404);
  const thread=await(await bContext.request.get(`/api/messages/general/${first.id}`)).json();await bContext.request.patch(`/api/messages/general/${first.id}`,{headers,data:{action:'accept',revision:thread.revision,operationId:crypto.randomUUID()}});
  await panel.getByRole('button',{name:'Close panel',exact:true}).click();await active.getByRole('button',{name:'Share',exact:true}).click();
  await panel.getByRole('button',{name:'Select Share Artist B',exact:true}).click();await panel.getByRole('button',{name:'Select Share Artist C',exact:true}).click();
  await page.route('**/api/messages/share',async route=>{if(route.request().postDataJSON().recipientId===C.artistId){await route.fetch();await route.abort('failed');}else await route.continue();});
  await panel.getByRole('button',{name:'Send (2)',exact:true}).click();await expect(panel.getByText('Shared with Share Artist B.')).toBeVisible();await expect(panel.getByRole('alert')).toContainText('Cannot reach the server');
  const before=(await(await bContext.request.get(`/api/messages/general/${first.id}`)).json()).messages.length;
  await page.unroute('**/api/messages/share');await panel.getByRole('button',{name:'Send (1)',exact:true}).click();await expect(panel.getByText('Request sent with Share Artist C.')).toBeVisible();
  expect((await(await bContext.request.get(`/api/messages/general/${first.id}`)).json()).messages.length).toBe(before);
  expect((await(await cContext.request.get('/api/messages?view=requests')).json()).items).toHaveLength(1);
  expect((await(await cContext.request.get('/api/notifications')).json()).items.filter((n:any)=>n.kind==='conversation.requested')).toHaveLength(1);
  await panel.getByRole('button',{name:'Close panel',exact:true}).click();await expect(active.getByRole('button',{name:'Share',exact:true})).toBeFocused();
 }finally{await bContext.close();await cContext.close();}
});
test('share layout, real avatars, search, clipboard fallback, links, focus and identity isolation',async({page},info)=>{
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:1}});await page.goto('/discovery?post=post-11');const active=page.locator('article[data-active=true]');
 const source=await active.locator('video').elementHandle();await expect.poll(()=>source!.evaluate((m:HTMLMediaElement)=>m.readyState)).toBeGreaterThanOrEqual(2);await source!.evaluate((m:HTMLMediaElement)=>{m.pause();m.currentTime=2;});await active.getByRole('button',{name:'Share',exact:true}).click();const panel=page.getByRole('dialog',{name:'Share',exact:true});
 await expect(panel.locator('.share-person').first()).toBeVisible();await expect(panel.locator('.share-person img').first()).toBeVisible();
 for(const width of info.project.name==='desktop'?[983,1440]:[320,390,767]){await page.setViewportSize({width,height:930});const box=await panel.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);expect(box!.y+box!.height).toBeLessThanOrEqual(930);await page.screenshot({path:info.outputPath(`share-${width}.png`)});}
 await page.setViewportSize({width:767,height:390});await panel.locator('.share-person:not([disabled])').first().click();await panel.getByLabel('Add a message',{exact:true}).fill('Landscape draft');await expect(panel.getByRole('button',{name:'Send (1)',exact:true})).toBeVisible();await panel.getByRole('button',{name:'Send (1)',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('share-landscape.png')});await panel.locator('.share-person[aria-pressed=true]').click();await page.setViewportSize({width:info.project.name==='desktop'?1440:390,height:930});
 await panel.getByRole('searchbox',{name:'Search chats or following'}).fill('no person matches');await expect(panel.getByText('No matches. Try another name.')).toBeVisible();await panel.getByRole('searchbox',{name:'Search chats or following'}).fill('');
 await panel.getByRole('button',{name:'Following',exact:true}).click();await expect(panel.locator('.share-person').first()).toBeVisible();
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('unavailable');}}}));await panel.getByRole('button',{name:'Copy link',exact:true}).click();await expect(panel.getByLabel('Publication link')).toHaveValue(/post-11/);
 for(const [name,domain] of [['WhatsApp','wa.me'],['Telegram','t.me'],['Email','mailto:'],['X','x.com']])await expect(panel.getByRole('link',{name,exact:true})).toHaveAttribute('href',new RegExp(domain));
 await page.keyboard.press('Escape');await expect(active.getByRole('button',{name:'Share',exact:true})).toBeFocused();expect(await source!.evaluate((m:HTMLMediaElement)=>({connected:m.isConnected,paused:m.paused,time:m.currentTime}))).toEqual({connected:true,paused:true,time:2});
 await active.getByRole('button',{name:'Share',exact:true}).click();await panel.locator('.share-person:not([disabled])').first().click();await panel.getByLabel('Add a message',{exact:true}).fill('Private share draft');
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:7}});await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>page.locator('input').evaluateAll((els:HTMLInputElement[])=>els.some(e=>e.value==='Private share draft'))).toBe(false);
 if(!await panel.isVisible())await page.locator('article[data-active=true]').getByRole('button',{name:'Share',exact:true}).click();await expect(panel.locator('.share-person')).toHaveCount(0);await expect(panel.getByRole('button',{name:'Copy link',exact:true})).toBeVisible();
});
