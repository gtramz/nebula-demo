import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
test.use({launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}});
const scene=JSON.parse(readFileSync('presentation/closing-scene.json','utf8'));
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
const next=(p:Page)=>p.getByRole('button',{name:'Continue',exact:true}).click();
async function setup(page:Page){await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});await page.request.post('/api/presentation/switch',{headers,data:{accountId:19}});}
function wave(){const rate=8000,n=rate*2,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*330/rate)*3000),44+2*i);return b;}

test('guided collaboration: bounded stages, prepared video, draft, submission and private review',async({page},info)=>{
 test.setTimeout(100000);await setup(page);const item=scene.sets[0];await page.goto(`/messages/offer/${item.offerId}`);
 await expect(page.getByRole('heading',{name:'The opportunity',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Record video',exact:true})).toBeHidden();
 await expect(page.locator('.guided-cover img')).toBeVisible();
 for(const width of [390,768,1024,1440]){await page.setViewportSize({width,height:850});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeInViewport();await page.screenshot({path:info.outputPath(`collaboration-${width}.png`)});}
 await page.setViewportSize({width:info.project.name==='mobile'?390:1440,height:850});await expect(page.locator('.guided-cover img')).toBeVisible();
 await next(page);await page.getByRole('button',{name:'Use prepared take',exact:true}).click();await expect(page.getByLabel('Contribution preview')).toBeVisible();await page.screenshot({path:info.outputPath('collaboration-contribution.png')});await next(page);
 await page.getByRole('button',{name:'Render proposal',exact:true}).click();await expect(page.getByRole('button',{name:'Your proposal',exact:true})).toBeVisible({timeout:35000});await next(page);
 await page.getByLabel('Introduction',{exact:true}).fill('Guided contribution');await page.getByLabel('Your proposal',{exact:true}).fill('A private take for this song.');await page.screenshot({path:info.outputPath('collaboration-review.png')});
 await page.getByRole('button',{name:'Save private draft',exact:true}).click();await expect(page.getByText('Private draft saved. No request has been sent.',{exact:true})).toBeVisible();
 const data=await(await page.request.get(`/api/offers/${item.offerId}/conversations`)).json();expect(data.existing).toBeNull();expect(data.draft.files).toHaveLength(1);
 await page.reload();await expect(page.getByLabel('Introduction',{exact:true})).toHaveValue('Guided contribution');await expect(page.getByRole('heading',{name:'Review & send',exact:true})).toBeVisible();
 await page.getByRole('checkbox',{name:'I reviewed the current deliverable, compensation and terms.',exact:true}).check();await page.getByRole('button',{name:'Send request',exact:true}).click();await expect(page).toHaveURL(/\/messages\/collaboration\/\d+/);const url=page.url();
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:item.owner}});await page.goto(url);await expect(page.getByRole('button',{name:'Accept proposal',exact:true})).toBeVisible();expect((await page.request.get(data.draft.files[0].url)).ok()).toBe(true);
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:6}});expect((await page.request.get(data.draft.files[0].url)).status()).toBe(404);
});

test('Forge receives a finished version without mixing and saves a private draft',async({page},info)=>{
 await setup(page);await page.goto(`/remix/${scene.sets[1].sourceId}`);await page.getByRole('button',{name:'Start private remix',exact:true}).click();
 await expect(page.getByRole('button',{name:'Remix with Forge',exact:true})).toHaveAttribute('aria-pressed','true');await next(page);
 await page.getByRole('button',{name:'Open Forge',exact:true}).click();await expect(page.getByLabel('Forge workspace')).toBeVisible();
 await page.screenshot({path:info.outputPath('forge-handoff.png')});await page.getByRole('button',{name:'Review your version',exact:true}).click();
 await expect(page.getByRole('region',{name:'Finished version player',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Build preview',exact:true})).toHaveCount(0);await expect(page.getByLabel('Upload file',{exact:true})).toHaveCount(0);await next(page);
 await page.getByLabel('Remix title',{exact:true}).fill('Forge finished version');await page.getByLabel('Description',{exact:true}).fill('Private version.');await page.getByRole('button',{name:'Step 1: Original',exact:true}).click();await page.getByRole('button',{name:'Step 4: Save your version',exact:true}).click();await expect(page.getByLabel('Remix title',{exact:true})).toHaveValue('Forge finished version');
 await page.getByRole('button',{name:'Save remix draft',exact:true}).click();await expect(page.getByText('Remix draft saved',{exact:true})).toBeVisible();
 const drafts=await(await page.request.get('/api/remix-drafts')).json(),draft=drafts.items.find((d:any)=>d.title==='Forge finished version');expect(draft.render.kind).toBe('audio');expect(draft.contribution).toBeNull();expect(draft.workflow).toBe('finished-audio');expect(draft.attribution.sourceId).toBe(scene.sets[1].sourceId);
 await page.getByRole('button',{name:'Save & exit',exact:true}).click();await page.getByRole('button',{name:'Resume draft',exact:true}).click();await expect(page.getByLabel('Remix title',{exact:true})).toHaveValue('Forge finished version');
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:21}});expect((await page.request.get(`/api/remix-drafts/${draft.id}`)).status()).toBe(404);
});

test('no-reference Mix accepts finished work; save errors keep the current stage and upload',async({page})=>{
 await setup(page);const opportunities=await(await page.request.get('/api/opportunities/projects?q=No%20Regrets')).json();const project=opportunities.items[0];const offers=await(await page.request.get(`/api/projects/${project.project?.id??project.id}/offers`)).json();const offer=offers.find((o:any)=>o.need==='Mix');
 await page.goto(`/messages/offer/${offer.id}`);await expect(page.getByRole('link',{name:'Download reference'})).toHaveCount(0);await next(page);await page.getByLabel('Upload your complete mix or master',{exact:true}).setInputFiles({name:'finished.wav',mimeType:'audio/wav',buffer:wave()});await expect(page.getByLabel('Contribution preview')).toBeVisible();await next(page);await expect(page.getByRole('button',{name:'Render proposal',exact:true})).toHaveCount(0);await next(page);
 await page.getByLabel('Introduction',{exact:true}).fill('Finished work');await page.getByLabel('Your proposal',{exact:true}).fill('Stereo mix');await page.route(`**/api/offers/${offer.id}/conversations`,r=>r.request().method()==='PATCH'?r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Save unavailable. Try again.'})}):r.continue());
 await page.getByRole('button',{name:'Save & exit',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByLabel('Introduction',{exact:true})).toHaveValue('Finished work');await expect(page.getByRole('heading',{name:'Review & send',exact:true})).toBeVisible();await page.unrouteAll();await page.getByRole('button',{name:'Save & exit',exact:true}).click();await expect(page).toHaveURL(/\/messages$/);
});

test.describe('Remix capture',()=>{
 test('video format gate, recording controls, save and account isolation',async({page})=>{
  await page.addInitScript(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);(window as any).__streams=[];navigator.mediaDevices.getUserMedia=async constraints=>{const stream=await original(constraints);(window as any).__streams.push(stream);return stream;};});
  await setup(page);await page.goto(`/remix/${scene.sets[0].sourceId}`);await page.getByRole('button',{name:'Start private remix',exact:true}).click();await next(page);
  await page.getByLabel('Upload video',{exact:true}).setInputFiles({name:'wrong.wav',mimeType:'audio/wav',buffer:wave()});await expect(page.getByRole('alert')).toContainText('Choose a video contribution.');await expect(page.getByRole('button',{name:'Record audio',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Record video',exact:true}).click();await expect(page.getByRole('button',{name:'Stop recording',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Back',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Save & exit',exact:true})).toBeDisabled();
  await expect.poll(()=>page.getByLabel('Recording camera preview').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.4);await page.getByRole('button',{name:'Stop recording',exact:true}).click();await page.getByRole('button',{name:'Use recording',exact:true}).click();await expect(page.getByText(/Your contribution is ready/)).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(window as any).__streams.every((s:MediaStream)=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
  await page.getByRole('button',{name:'Save & exit',exact:true}).click();await expect(page.getByRole('button',{name:'Resume draft',exact:true})).toBeVisible();
  const drafts=await(await page.request.get('/api/remix-drafts')).json();const saved=drafts.items[0];expect(saved.contribution.kind).toBe('video');expect(saved.render).toBeNull();
  await page.request.post('/api/presentation/switch',{headers,data:{accountId:21}});await page.goto('/studio/remix');await expect(page.getByRole('button',{name:'Resume draft',exact:true})).toHaveCount(0);expect((await page.request.get(saved.contribution.url)).status()).toBe(404);
 });
});

test('audio-to-video route works with blocked session storage, keyboard and reduced motion',async({page},info)=>{
 test.setTimeout(75000);await setup(page);await page.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(`/remix/${scene.sets[1].sourceId}`);await page.getByRole('button',{name:'Start private remix',exact:true}).click();await page.getByRole('button',{name:/^Create a video remix/}).click();
 await expect(page.getByRole('heading',{name:'Choose the fragment',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Continue',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Your contribution',exact:true})).toBeFocused();
 await page.getByRole('button',{name:/Use prepared take/}).click();await expect(page.getByText(/Your contribution is ready/)).toBeVisible();await next(page);await page.getByRole('button',{name:'Build preview',exact:true}).click();await expect(page.getByRole('region',{name:'Remix preview'}).locator('video')).toBeVisible({timeout:30000});await next(page);
 await page.getByLabel('Remix title',{exact:true}).fill('Audio with my video');await page.getByRole('button',{name:'Save remix draft',exact:true}).click();await expect(page.getByText('Remix draft saved',{exact:true})).toBeVisible();
 const drafts=await(await page.request.get('/api/remix-drafts')).json();const saved=drafts.items.find((d:any)=>d.title==='Audio with my video');expect(saved.contribution.kind).toBe('video');expect(saved.settings.composition.layout).toBe('vertical-single');expect(saved.render.kind).toBe('video');
 await page.setViewportSize({width:info.project.name==='mobile'?390:1024,height:600});await page.screenshot({path:info.outputPath('remix-video-review.png')});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.reload();await page.locator('article').filter({hasText:'Audio with my video'}).getByRole('button',{name:'Resume draft',exact:true}).click();await expect(page.getByRole('button',{name:'Step 3: Framing & mix',exact:true})).toBeVisible();await expect(page.getByLabel('Remix title',{exact:true})).toHaveValue('Audio with my video');
 await page.goto(`/messages/offer/${scene.sets[1].offerId}?draft=${saved.id}`);await next(page);await page.getByRole('button',{name:'Use saved remix',exact:true}).click();await next(page);await next(page);
 await page.getByLabel('Introduction',{exact:true}).fill('My saved remix');await page.getByLabel('Your proposal',{exact:true}).fill('A video version of this song');await page.getByLabel('Work files (audio, video, PDF or ZIP)',{exact:true}).setInputFiles({name:'remix-notes.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nPrivate remix notes\n%%EOF')});await expect(page.getByRole('button',{name:'Remove remix-notes.pdf',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Save & exit',exact:true}).click();await expect(page).toHaveURL(/\/messages$/);await page.goto(`/messages/offer/${scene.sets[1].offerId}`);await page.getByRole('button',{name:'Step 4: Review & send',exact:true}).click();await expect(page.getByRole('heading',{name:'Review & send',exact:true})).toBeVisible();await expect(page.getByText('Saved remix: Audio with my video',{exact:true})).toBeVisible();
 await page.getByRole('checkbox',{name:'I reviewed the current deliverable, compensation and terms.',exact:true}).check();await page.getByRole('button',{name:'Send request',exact:true}).click();await expect(page).toHaveURL(/\/messages\/collaboration\/\d+/);const threadId=page.url().split('/').at(-1);
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:scene.sets[1].owner}});const review=await(await page.request.get(`/api/collaborations/${threadId}`)).json();expect(review.submissions[0].files).toHaveLength(2);expect(review.submissions[0].remix.originalTitle).toBeTruthy();expect((await page.request.get(saved.render.url)).status()).toBe(200);expect((await page.request.get(saved.contribution.url)).status()).toBe(404);
});

test('two guided Remix tabs preserve local text on revision conflict and recover saved work',async({page,context})=>{
 await setup(page);await page.goto(`/remix/${scene.sets[1].sourceId}`);await page.getByRole('button',{name:'Start private remix',exact:true}).click();await next(page);await page.getByRole('button',{name:'Open Forge',exact:true}).click();await page.getByRole('button',{name:'Review your version',exact:true}).click();await expect(page.getByRole('region',{name:'Finished version player',exact:true})).toBeVisible();await next(page);
 await page.getByLabel('Remix title',{exact:true}).fill('Saved version');await page.getByRole('button',{name:'Save remix draft',exact:true}).click();await expect(page.getByText('Remix draft saved',{exact:true})).toBeVisible();
 const second=await context.newPage();await second.goto('/studio/remix');await second.getByRole('button',{name:'Resume draft',exact:true}).click();await second.getByRole('button',{name:'Step 4: Save your version',exact:true}).click();
 await page.getByLabel('Remix title',{exact:true}).fill('First tab saved');await page.getByRole('button',{name:'Save remix draft',exact:true}).click();await expect(page.getByText('Remix draft saved',{exact:true})).toBeVisible();
 await second.getByLabel('Remix title',{exact:true}).fill('Second tab local text');await second.getByRole('button',{name:'Save remix draft',exact:true}).click();await expect(second.getByRole('alert')).toContainText('another tab');await expect(second.getByLabel('Remix title',{exact:true})).toHaveValue('Second tab local text');
 second.once('dialog',dialog=>dialog.accept());await second.getByRole('button',{name:'Reopen saved draft',exact:true}).click();await expect(second.getByLabel('Remix title',{exact:true})).toHaveValue('First tab saved');await second.close();
});
