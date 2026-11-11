import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const scene=JSON.parse(readFileSync('presentation/closing-scene.json','utf8'));
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
test.use({launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}});

test('reference download, camera take, discard, keep and private draft',async({page})=>{
 test.setTimeout(90000);
 await page.addInitScript(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);(window as any).__captures=[];navigator.mediaDevices.getUserMedia=async constraints=>{const stream=await original(constraints);(window as any).__captures.push(stream);return stream;};});
 const call=async(path:string,data?:unknown,method=data===undefined?'GET':'POST')=>{const response=await page.request.fetch(path,{method,headers,data});expect(response.ok(),await response.text()).toBeTruthy();return response.json();};
 await call('/api/presentation/reset',{confirm:true});await call('/api/presentation/switch',{accountId:19});
 await page.goto(`/messages/offer/${scene.sets[0].offerId}`);
 await expect(page.getByRole('region',{name:'Reference',exact:true})).toBeVisible();
 const link=page.getByRole('link',{name:'Download reference',exact:true});await expect(link).toBeVisible();
 const downloadPromise=page.waitForEvent('download');await link.click();const download=await downloadPromise;expect(await download.failure()).toBeNull();expect(await download.path()).toBeTruthy();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Record video',exact:true}).click();
 const camera=page.getByLabel('Recording camera preview');await expect(camera).toBeVisible();await expect.poll(()=>camera.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.4);
 await page.getByRole('button',{name:'Stop recording',exact:true}).click();await expect(page.getByLabel('Recorded contribution')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>(window as any).__captures.flatMap((s:MediaStream)=>s.getTracks()).every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
 await page.getByRole('button',{name:'Discard take',exact:true}).click();await expect(page.getByLabel('Recorded contribution')).toHaveCount(0);
 await page.getByRole('button',{name:'Record audio',exact:true}).click();await expect(page.getByText('Recording your microphone…',{exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>(window as any).__captures.length)).toBe(2);await page.waitForTimeout(800);
 await page.getByRole('button',{name:'Stop recording',exact:true}).click();await expect(page.getByLabel('Recorded contribution')).toBeVisible();
 await page.getByRole('button',{name:'Use recording',exact:true}).click();await expect(page.getByLabel('Contribution preview')).toHaveJSProperty('tagName','AUDIO');
 await page.getByRole('button',{name:'Save & exit',exact:true}).click();await expect(page).toHaveURL(/\/messages$/);
 const saved=await call(`/api/offers/${scene.sets[0].offerId}/conversations`);expect(saved.draft.preparation.contribution.kind).toBe('audio');
 await call('/api/presentation/switch',{accountId:scene.sets[0].owner});expect((await page.request.get(saved.draft.preparation.contribution.url)).status()).toBe(404);
 await call('/api/presentation/switch',{accountId:19});await page.goto(`/messages/offer/${scene.sets[0].offerId}`);await expect(page.getByLabel('Contribution preview')).toHaveJSProperty('tagName','AUDIO');
 await expect.poll(()=>page.evaluate(()=>(window as any).__captures.flatMap((s:MediaStream)=>s.getTracks()).every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
});

test('permission denial leaves uploads available and cancelling capture releases devices',async({page})=>{
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
 await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});await page.request.post('/api/presentation/switch',{headers,data:{accountId:19}});
 await page.goto(`/messages/offer/${scene.sets[0].offerId}`);await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Record audio',exact:true}).click();
 await expect(page.getByText('Camera or microphone access was not granted. You can upload a file instead.',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Upload file',{exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Use prepared take',exact:true})).toBeEnabled();
});

test('framing invalidates only the rendered result and preserves an additional attachment',async({page})=>{
 test.setTimeout(90000);
 await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});await page.request.post('/api/presentation/switch',{headers,data:{accountId:19}});
 await page.goto(`/messages/offer/${scene.sets[0].offerId}`);await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Use prepared take',exact:true}).click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Render proposal',exact:true}).click();await expect(page.getByRole('button',{name:'Your proposal',exact:true})).toBeVisible({timeout:35000});
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Introduction',{exact:true}).fill('Keep this introduction');await page.getByLabel('Your proposal',{exact:true}).fill('Keep this proposal');
 await page.getByLabel('Work files (audio, video, PDF or ZIP)',{exact:true}).setInputFiles({name:'notes.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nDemo proposal notes\n%%EOF')});
 await expect(page.getByRole('button',{name:'Remove notes.pdf',exact:true})).toBeVisible();
 const audio=Buffer.alloc(44+32000);audio.write('RIFF');audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(1,22);audio.writeUInt32LE(8000,24);audio.writeUInt32LE(16000,28);audio.writeUInt16LE(2,32);audio.writeUInt16LE(16,34);audio.write('data',36);audio.writeUInt32LE(32000,40);
 await page.getByLabel('Work files (audio, video, PDF or ZIP)',{exact:true}).setInputFiles({name:'extra.wav',mimeType:'audio/wav',buffer:audio});await expect(page.getByRole('button',{name:'Remove extra.wav',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Back',exact:true}).click();
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'Adjust contribution framing',exact:true}).press('Shift+ArrowRight');
 await expect(page.getByRole('button',{name:'Your proposal',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Remove notes.pdf',exact:true})).toBeVisible();
 await expect(page.getByLabel('Introduction',{exact:true})).toHaveValue('Keep this introduction');await expect(page.getByLabel('Your proposal',{exact:true})).toHaveValue('Keep this proposal');
 await page.getByRole('button',{name:'Save & exit',exact:true}).click();await expect(page).toHaveURL(/\/messages$/);
 const draft=await (await page.request.get(`/api/offers/${scene.sets[0].offerId}/conversations`)).json();expect(draft.draft.files).toHaveLength(2);expect(draft.draft.files[0].name).toBe('notes.pdf');expect(draft.draft.preparation.composition.contribution.x).toBeCloseTo(.8);expect(draft.draft.preparation.resultId).toBeNull();
 await page.goto(`/messages/offer/${scene.sets[0].offerId}`);await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Your proposal',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Remove extra.wav',exact:true})).toBeVisible();await expect(page.getByLabel('Introduction',{exact:true})).toHaveValue('Keep this introduction');
});

test('a long reference uses the existing clip selector and restores the selected video fragment',async({page})=>{
 test.setTimeout(60000);
 const call=async(path:string,data?:unknown,method=data===undefined?'GET':'POST')=>{const r=await page.request.fetch(path,{method,headers,data});expect(r.ok(),await r.text()).toBeTruthy();return r.json();};
 await call('/api/presentation/reset',{confirm:true});await call('/api/presentation/switch',{accountId:1});
 const seconds=80,rate=8000,bytes=Buffer.alloc(44+seconds*rate*2);bytes.write('RIFF',0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(bytes.length-44,40);
 for(let i=0;i<rate*seconds;i++)bytes.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*220/rate)*2000),44+i*2);
 const uploaded=await page.request.post('/api/uploads',{headers:{...headers,'Content-Type':'application/octet-stream','X-Media-Kind':'audio'},data:bytes});expect(uploaded.ok()).toBe(true);const reference=await uploaded.json();
 const {result:project}=await call('/api/rpc',{method:'createProject',args:[{operationId:crypto.randomUUID(),title:'Long reference browser test',category:'Single',status:'draft',goalAmount:1000,songs:[{title:'Long song',description:''}]}]});
 const offer=await call(`/api/projects/${project.id}/offers`,{referenceMediaId:reference.id,need:'Feature',deliverable:'Video take',requirements:'',deadline:null,status:'open',compensation:{kind:'fee',amount:100,currency:'USD'}});
 await call('/api/rpc',{method:'updateProject',args:[project.id,{status:'published'}]});await call('/api/presentation/switch',{accountId:19});await page.goto(`/messages/offer/${offer.id}`);await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByLabel('Upload file',{exact:true}).setInputFiles(`presentation/assets/${scene.sets[0].contribution}`);
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.getByRole('button',{name:'Clip duration: 60 seconds',exact:true})).toBeVisible();await page.getByRole('button',{name:'Clip duration: 60 seconds',exact:true}).click();
 await expect(page.getByRole('button',{name:'Clip duration: 15 seconds',exact:true})).toBeVisible();await page.getByRole('slider',{name:'Move selected fragment',exact:true}).press('End');
 await expect(page.getByRole('slider',{name:'Move selected fragment',exact:true})).toHaveAttribute('aria-valuenow','65');
 await page.getByRole('button',{name:'Save & exit',exact:true}).click();await expect(page).toHaveURL(/\/messages$/);
 await page.goto(`/messages/offer/${offer.id}`);await expect(page.getByRole('slider',{name:'Move selected fragment',exact:true})).toHaveAttribute('aria-valuenow','65');const restored=await call(`/api/offers/${offer.id}/conversations`);expect(restored.draft.preparation.fragment).toEqual({startSeconds:65,endSeconds:80});expect(restored.draft.preparation.composition.layout).toBe('vertical-single');
});

test('late cancelled device permission cannot interrupt a newer recording and navigation releases it',async({page})=>{
 await page.addInitScript(()=>{
  const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);let calls=0;(window as any).__captures=[];
  navigator.mediaDevices.getUserMedia=async constraints=>{if(++calls===1)return new Promise<MediaStream>((_,reject)=>{(window as any).__rejectPermission=()=>reject(new DOMException('Cancelled prompt','NotAllowedError'));});const stream=await original(constraints);(window as any).__captures.push(stream);return stream;};
 });
 await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});await page.request.post('/api/presentation/switch',{headers,data:{accountId:19}});await page.goto(`/messages/offer/${scene.sets[0].offerId}`);await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Record video',exact:true}).click();await expect(page.getByRole('button',{name:'Cancel recording',exact:true})).toBeVisible();await page.getByRole('button',{name:'Cancel recording',exact:true}).click();
 await page.getByRole('button',{name:'Record video',exact:true}).click();await expect(page.getByRole('button',{name:'Stop recording',exact:true})).toBeVisible();await page.evaluate(()=>(window as any).__rejectPermission());
 await expect.poll(()=>page.evaluate(()=>(window as any).__captures[0].getTracks().every((t:MediaStreamTrack)=>t.readyState==='live'))).toBe(true);await expect(page.getByRole('button',{name:'Stop recording',exact:true})).toBeVisible();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('link',{name:'profile',exact:true}).click();await expect(page).toHaveURL(/\/profile$/);
 await expect.poll(()=>page.evaluate(()=>(window as any).__captures.flatMap((s:MediaStream)=>s.getTracks()).every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
});
