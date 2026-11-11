import {test,expect,type Page} from '@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
const active=(page:Page)=>page.locator('article[data-active=true]');
const media=(page:Page)=>active(page).locator('audio,video');
async function open(page:Page,id=3){
 expect((await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}})).ok()).toBe(true);
 await page.goto(`/discovery?post=post-${id}`);
 await expect.poll(()=>media(page).evaluate((m:HTMLMediaElement)=>m.readyState)).toBeGreaterThanOrEqual(2);
}
async function start(page:Page){if(await media(page).evaluate((m:HTMLMediaElement)=>m.paused))await active(page).getByRole('button',{name:/^Play /}).click();await exclusive(page);}
async function exclusive(page:Page){
 await expect.poll(()=>media(page).evaluate((m:HTMLMediaElement)=>!m.paused&&!m.muted&&m.volume===1)).toBe(true);
 await expect.poll(()=>page.locator('audio,video').evaluateAll((ms:HTMLMediaElement[])=>ms.filter(m=>!m.paused).length)).toBe(1);
 expect(await page.locator('article:not([data-active=true]) audio,article:not([data-active=true]) video').evaluateAll((ms:HTMLMediaElement[])=>ms.every(m=>m.paused))).toBe(true);
}
async function next(page:Page){const before=await active(page).getAttribute('aria-label');await page.getByRole('region',{name:'Discovery feed'}).focus();await page.keyboard.press('ArrowDown');await expect(active(page)).not.toHaveAttribute('aria-label',before!);}

test('scroll switches audible playback exclusively between real audio and video; no mobile volume row',async({page},info)=>{
 await open(page);await start(page);
 const kinds=new Set<string>();
 for(let i=0;i<7;i++){
  await exclusive(page);kinds.add(await media(page).evaluate(m=>m.tagName));
  await expect(active(page).locator('.discovery-playback')).toHaveCount(0);
  if(info.project.name==='mobile'){await expect(active(page).getByRole('slider',{name:/Volume/})).toHaveCount(0);await expect(active(page).getByRole('button',{name:/^(Mute|Unmute) /})).toBeHidden();}
  await next(page);
 }
 expect([...kinds]).toEqual(expect.arrayContaining(['AUDIO','VIDEO']));await exclusive(page);
 // Native wheel/touch must advance without the playback tap intercepting the gesture.
 const feed=page.getByRole('region',{name:'Discovery feed'}),box=(await feed.boundingBox())!,before=await active(page).getAttribute('aria-label');
 if(info.project.name==='mobile'){
  const cdp=await page.context().newCDPSession(page),x=box.x+box.width*.35,y=box.y+box.height*.7;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*box.height*.075}]});await page.waitForTimeout(20);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 }else{await page.mouse.move(box.x+box.width*.35,box.y+box.height*.5);await page.mouse.wheel(0,box.height*.8);}
 await expect(active(page)).not.toHaveAttribute('aria-label',before!);await exclusive(page);
 await page.screenshot({path:info.outputPath('discovery-audible.png')});
});

test('cover pauses audio, waveform seeks, comments keep playback while other panels and navigation stop it without restarting on resize',async({page},info)=>{
 await open(page);await start(page);
 await active(page).getByRole('button',{name:'Pause Low Tide',exact:true}).click();await expect(media(page)).toHaveJSProperty('paused',true);
 await page.setViewportSize({width:info.project.name==='mobile'?636:1024,height:930});
 await expect(media(page)).toHaveJSProperty('paused',true);
 await active(page).getByRole('slider',{name:'Seek Low Tide',exact:true}).fill('5');await expect.poll(()=>media(page).evaluate((m:HTMLMediaElement)=>m.currentTime)).toBeCloseTo(5,1);
 await active(page).getByRole('button',{name:'Play Low Tide',exact:true}).press('Space');await exclusive(page);
 await active(page).getByRole('button',{name:'Comments',exact:true}).click();await exclusive(page);
 await page.getByRole('button',{name:'Close comments',exact:true}).click();await exclusive(page);
 await active(page).getByRole('button',{name:/view project/i}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
 await active(page).getByRole('button',{name:'Play Low Tide',exact:true}).click();await exclusive(page);
 const old=await media(page).elementHandle();await page.locator('#primary-navigation a[href="/explore"]').click();expect(await old!.evaluate((m:HTMLMediaElement)=>m.paused)).toBe(true);
});

for(const id of [11,14])test(`delayed video ${id} cannot resume or silence the next active publication`,async({page})=>{
 await page.addInitScript(()=>{
  const play=HTMLMediaElement.prototype.play;let pending=true;
  HTMLMediaElement.prototype.play=function(){
   if(pending&&this.tagName==='VIDEO'){pending=false;const target=this;return new Promise<void>((resolve,reject)=>{(window as any).releaseOld=()=>play.call(target).then(resolve,reject);});}
   return play.call(this);
  };
 });
 await open(page,id);const old=await media(page).elementHandle();await next(page);await start(page);
 await page.evaluate(()=>{(window as any).releaseOld();});
 await expect.poll(()=>old!.evaluate((m:HTMLMediaElement)=>m.paused)).toBe(true);await exclusive(page);
});

test('autoplay denial keeps sound enabled and provides a working tap fallback',async({page})=>{
 await page.addInitScript(()=>{
  const play=HTMLMediaElement.prototype.play;let interacted=false;
  document.addEventListener('click',()=>{interacted=true;},true);
  HTMLMediaElement.prototype.play=function(){return interacted?play.call(this):Promise.reject(new DOMException('Autoplay blocked','NotAllowedError'));};
 });
 await open(page,11);await expect(active(page).getByText('Tap to play with sound.')).toBeVisible();
 await expect(media(page)).toHaveJSProperty('muted',false);await expect(media(page)).toHaveJSProperty('paused',true);
 await start(page);await expect(active(page).getByText('Tap to play with sound.')).toHaveCount(0);await next(page);await exclusive(page);
});

test('mobile uses device volume after desktop mute without reviving manually paused playback',async({page})=>{
 await open(page,11);await page.setViewportSize({width:1024,height:900});await start(page);
 await active(page).getByRole('button',{name:'Mute Marea Alta — rooftop session',exact:true}).click();await expect(media(page)).toHaveJSProperty('muted',true);
 await active(page).getByRole('button',{name:'Pause Marea Alta — rooftop session',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await expect(media(page)).toHaveJSProperty('muted',false);await expect(media(page)).toHaveJSProperty('paused',true);
 await expect(active(page).getByRole('button',{name:/^(Mute|Unmute) /})).toBeHidden();
});

test('hidden document stops playback and remains paused until an explicit tap',async({page})=>{
 await open(page);await start(page);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(media(page)).toHaveJSProperty('paused',true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(media(page)).toHaveJSProperty('paused',true);await start(page);
});

for (const id of [3, 11, 14]) test(`comments preserve playback and manual pause for publication ${id}`, async ({page}, info) => {
 await open(page,id); await start(page);
 const original=await media(page).elementHandle();
 await active(page).getByRole('button',{name:'Comments',exact:true}).click();
 const comments=page.getByRole('complementary',{name:'Publication comments',exact:true});await expect(comments).toBeVisible();
 await page.getByLabel('Add a comment',{exact:true}).fill('Listening while writing a comment.');
 await exclusive(page);
 expect(await original!.evaluate(m=>m.isConnected&&m===document.querySelector('article[data-active=true] audio,article[data-active=true] video'))).toBe(true);
 const time=await media(page).evaluate((m:HTMLMediaElement)=>m.currentTime);
 await expect.poll(()=>media(page).evaluate((m:HTMLMediaElement)=>m.currentTime)).not.toBe(time);
 await page.getByRole('button',{name:'Post comment',exact:true}).click();
 await expect(comments.getByText('Listening while writing a comment.',{exact:true})).toBeVisible();await exclusive(page);
 await active(page).getByRole('button',{name:/^Pause /}).click();await expect(media(page)).toHaveJSProperty('paused',true);
 await page.getByRole('button',{name:'Close comments',exact:true}).click();await expect(media(page)).toHaveJSProperty('paused',true);
 await active(page).getByRole('button',{name:'Comments',exact:true}).click();await expect(media(page)).toHaveJSProperty('paused',true);
 await active(page).getByRole('button',{name:/^Play /}).click();await exclusive(page);
 await page.screenshot({path:info.outputPath(`comments-playing-${id}.png`)});
 await page.getByRole('button',{name:'Close comments',exact:true}).focus();await page.keyboard.press('Escape');await exclusive(page);
 await next(page);expect(await original!.evaluate((m:HTMLMediaElement)=>m.paused)).toBe(true);await start(page);
});


for (const id of [3, 11, 14]) test(`expanded description preserves playback and manual pause for publication ${id}`, async ({page}) => {
 await open(page,id);await start(page);
 const element=await media(page).elementHandle();
 await element!.evaluate((m:HTMLMediaElement)=>{m.currentTime=1;m.volume=.7;});
 const description=active(page).getByRole('button',{name:/^Read description of /});
 await description.click();await expect(page.getByRole('dialog',{name:'About this publication'})).toBeVisible();
 await expect.poll(()=>element!.evaluate((m:HTMLMediaElement)=>m.currentTime)).toBeGreaterThan(1.15);
 expect(await element!.evaluate((m:HTMLMediaElement)=>({paused:m.paused,volume:m.volume}))).toEqual({paused:false,volume:.7});
 expect(await page.locator('audio,video').evaluateAll((items:HTMLMediaElement[])=>items.filter(m=>!m.paused).length)).toBe(1);
 await page.keyboard.press('Escape');await expect(description).toBeFocused();await expect(media(page)).toHaveJSProperty('paused',false);
 await active(page).getByRole('button',{name:/^Pause /}).first().click();await expect(media(page)).toHaveJSProperty('paused',true);
 await description.click();await expect(page.getByRole('dialog')).toBeVisible();await expect(media(page)).toHaveJSProperty('paused',true);
 await page.getByRole('button',{name:'Close panel',exact:true}).click();await expect(media(page)).toHaveJSProperty('paused',true);
 await next(page);await start(page);expect(await element!.evaluate((m:HTMLMediaElement)=>m.paused)).toBe(true);
});
