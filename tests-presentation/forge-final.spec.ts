import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
async function setup(page:any,source=17){await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});await page.request.post('/api/presentation/switch',{headers,data:{accountId:19}});await page.goto(`/remix/${source}`);await page.getByRole('button',{name:'Start private remix',exact:true}).click();}
const next=(page:any)=>page.getByRole('button',{name:'Continue',exact:true}).click();
async function noCreation(page:any){await expect(page.locator('input[type=file],input[type=range]:not(.antiq-audio-player input[type=range]),canvas')).toHaveCount(0);await expect(page.getByRole('button',{name:/Record audio|Build preview|Use Nebula editor|Reset volumes/})).toHaveCount(0);}

test('LUNA full audio, compact layouts, exclusive comparison and real save with no audio editor',async({page},info)=>{
 await setup(page);await page.emulateMedia({reducedMotion:'reduce'});await noCreation(page);
 await expect.poll(()=>page.getByLabel('Full original',{exact:true}).evaluate((a:HTMLAudioElement)=>a.duration)).toBeGreaterThan(175);
 for(const width of [390,768,1024,1440]){await page.setViewportSize({width,height:850});await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeInViewport();await page.screenshot({path:info.outputPath(`forge-original-${width}.png`)});}
 const color=await page.getByRole('button',{name:'Remix with Forge',exact:true}).locator('strong').evaluate(e=>getComputedStyle(e).color);expect(color).toBe('rgb(16, 19, 0)');
 await next(page);await expect(page.getByRole('heading',{name:'Open Forge',exact:true})).toBeFocused();await page.getByRole('button',{name:'Open Forge',exact:true}).focus();await page.keyboard.press('Enter');await noCreation(page);
 const before=(await(await page.request.get('/api/remix-drafts')).json()).items[0];expect(before.render).toBeNull();
 for(const width of [390,768,1024,1440]){await page.setViewportSize({width,height:650});await page.locator('.forge-demo-card').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));await page.screenshot({path:info.outputPath(`forge-workspace-${width}.png`)});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'Review your version',exact:true})).toBeInViewport();}
 await page.getByRole('button',{name:'Review your version',exact:true}).click();await expect(page.getByRole('region',{name:'Finished version player',exact:true})).toBeVisible();await noCreation(page);
 await expect.poll(()=>page.getByLabel('Finished version',{exact:true}).evaluate((a:HTMLAudioElement)=>a.duration)).toBeGreaterThan(175);
 await page.getByLabel('Finished version',{exact:true}).evaluate((a:HTMLAudioElement)=>a.play());await page.getByRole('button',{name:'Original',exact:true}).click();await expect(page.getByRole('region',{name:'Full original player',exact:true})).toBeVisible();expect(await page.locator('audio').count()).toBe(1);
 await page.getByLabel('Full original',{exact:true}).evaluate((a:HTMLAudioElement)=>a.play());await next(page);expect(await page.locator('audio').count()).toBe(0);
 await page.getByLabel('Remix title',{exact:true}).fill('LUNA full private version');await page.getByRole('button',{name:'Step 1: Original',exact:true}).click();page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Create a video remix',exact:true}).click();await expect(page.getByRole('heading',{name:'Original',exact:true})).toBeVisible();await page.getByRole('button',{name:'Step 4: Save your version',exact:true}).click();await expect(page.getByLabel('Remix title',{exact:true})).toHaveValue('LUNA full private version');await page.getByRole('button',{name:'Save remix draft',exact:true}).click();await expect(page.getByText('Remix draft saved',{exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('forge-saved.png')});const saved=(await(await page.request.get('/api/remix-drafts')).json()).items[0];expect(saved.finalAudio.duration).toBeGreaterThan(175);expect(saved.render.id).not.toBe('368b5b8d-1210-4954-9ec3-13d871e6a116');expect(saved.contribution).toBeNull();
});

test('receive failure, unavailable version and retry keep the workspace and never invent audio',async({page})=>{
 await setup(page,15);await next(page);await page.getByRole('button',{name:'Open Forge',exact:true}).click();let status=503;
 await page.route('**/api/presentation/contribution',r=>r.fulfill({status,contentType:'application/json',body:JSON.stringify({error:status===404?'No version available yet':'Version unavailable. Try again.'})}));
 await page.getByRole('button',{name:'Review your version',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Try again');await expect(page.getByRole('button',{name:'Review your version',exact:true})).toBeEnabled();
 status=404;await page.getByRole('button',{name:'Review your version',exact:true}).click();await expect(page.getByRole('alert')).toHaveText('No version available yet');await expect(page.locator('audio')).toHaveCount(0);
 await page.unroute('**/api/presentation/contribution');await page.getByRole('button',{name:'Review your version',exact:true}).click();await expect(page.getByRole('region',{name:'Finished version player',exact:true})).toBeVisible();
});

test('finished Forge version can be submitted with attribution and private owner review',async({page})=>{
 await setup(page,15);await next(page);await page.getByRole('button',{name:'Open Forge',exact:true}).click();await page.getByRole('button',{name:'Review your version',exact:true}).click();await expect(page.getByRole('region',{name:'Finished version player',exact:true})).toBeVisible();await next(page);await page.getByRole('button',{name:'Save remix draft',exact:true}).click();await expect(page.getByText('Remix draft saved',{exact:true})).toBeVisible();const draft=(await(await page.request.get('/api/remix-drafts')).json()).items[0];
 await page.goto(`/messages/offer/15?draft=${draft.id}`);await next(page);await page.getByRole('button',{name:'Use saved remix',exact:true}).click();await next(page);await next(page);
 await page.getByLabel('Introduction',{exact:true}).fill('My finished version');await page.getByLabel('Your proposal',{exact:true}).fill('A version for the project');await page.getByRole('checkbox',{name:'I reviewed the current deliverable, compensation and terms.',exact:true}).check();await page.getByRole('button',{name:'Send request',exact:true}).click();await expect(page).toHaveURL(/\/messages\/collaboration\/\d+/);const url=page.url(),id=url.split('/').at(-1);
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:1}});await page.goto(url);const response=await page.request.get(`/api/collaborations/${id}`);expect(response.ok()).toBe(true);const data=await response.json();expect(data.submissions[0].remix.draftId).toBe(draft.id);expect((await page.request.get(draft.render.url)).status()).toBe(200);
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:6}});expect((await page.request.get(draft.render.url)).status()).toBe(404);
});

test('legacy audio draft files remain recoverable and Forge starts a separate draft',async({page})=>{
 await setup(page,1);await page.getByRole('button',{name:'Save & exit',exact:true}).click();
 const post=await(await page.request.get('/api/publications/1')).json();const created=await(await page.request.post('/api/remix-drafts',{headers,data:{sourceId:1,sourceRevision:post.revision,requestKey:crypto.randomUUID()}})).json();
 const upload=async()=>{const response=await page.request.post('/api/uploads',{headers:{...headers,'X-Remix-Draft':created.id,'X-Media-Kind':'audio','X-File-Name':'old.wav','Content-Type':'application/octet-stream'},data:readFileSync('artifacts/nebula/public/discovery-demo/soft-signal.wav')});expect(response.ok()).toBe(true);return response.json();};
 const contribution=await upload(),render=await upload();const response=await page.request.patch(`/api/remix-drafts/${created.id}`,{headers,data:{revision:1,title:'Legacy audio backup',description:'Preserved original draft',settings:{...created.settings,endSeconds:2},contributionId:contribution.id,contributionDuration:2,renderId:render.id}});expect(response.ok()).toBe(true);const old=await response.json();
 await page.reload();const row=page.locator('article').filter({hasText:old.title}).first();await row.getByRole('button',{name:'Resume draft',exact:true}).click();await expect(page.getByText('Your saved files remain in this draft. Forge starts a separate version.')).toBeVisible();await expect(page.getByLabel('Saved version',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Download saved contribution'})).toHaveAttribute('href',contribution.url);await page.getByRole('button',{name:'Remix with Forge',exact:true}).click();await expect(page.getByRole('region',{name:'Full original player',exact:true})).toBeVisible();
 const unchanged=await(await page.request.get(`/api/remix-drafts/${old.id}`)).json();expect(unchanged).toEqual(old);
});


test('video permission denial keeps upload available and does not affect Forge',async({page})=>{
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
 await setup(page,13);await next(page);await page.getByRole('button',{name:'Record video',exact:true}).click();await expect(page.getByText('Camera or microphone access was not granted. You can upload a file instead.')).toBeVisible();
 await page.getByLabel('Upload video',{exact:true}).setInputFiles('presentation/assets/video/marea-vocal-take.mp4');await expect(page.getByText(/Your contribution is ready/)).toBeVisible();await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();
});
