import {test,expect,type Page} from '@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
const active=(page:Page)=>page.locator('article[data-active=true]');
const player=(page:Page)=>active(page).locator('audio,video');
async function open(page:Page,id=3){
 expect((await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}})).ok()).toBe(true);
 await page.goto(`/discovery?post=post-${id}`);
 await expect.poll(()=>player(page).evaluate((m:HTMLMediaElement)=>m.readyState)).toBeGreaterThanOrEqual(3);
}
async function jump(page:Page,index:number){
 await page.locator('.discovery-feed').evaluate((e,index)=>{e.scrollTo({top:index*e.clientHeight,behavior:'instant'});},index);
 await expect(active(page)).toHaveAttribute('data-index',String(index));
 await expect.poll(()=>page.locator('.discovery-feed').evaluate(e=>Math.abs(e.scrollTop-(e.querySelector('[data-active=true]') as HTMLElement).offsetTop))).toBeLessThan(1);
}
async function bounded(page:Page){
 expect(await page.locator('.discovery-post').count()).toBeLessThanOrEqual(5);
 expect(await page.locator('.discovery-feed audio,.discovery-feed video').count()).toBeLessThanOrEqual(3);
 expect(await page.locator('.discovery-snap-slot').count()).toBeGreaterThan(0);
 expect(await page.locator('.discovery-snap-slot img,.discovery-snap-slot button,.discovery-snap-slot a').count()).toBe(0);
 expect(await page.locator('article:not([data-active=true]) audio,article:not([data-active=true]) video').evaluateAll((ms:HTMLMediaElement[])=>ms.every(m=>m.paused))).toBe(true);
}

test('only the successor warms, reusing its player; posters and audio covers retain their roles',async({page})=>{
 await open(page,11);await bounded(page);
 const next=page.locator('[data-index="1"] audio,[data-index="1"] video');
 await expect(next).toHaveAttribute('preload','auto');await expect(next).toHaveJSProperty('paused',true);
 expect(await page.locator('article:not([data-active=true]) [preload=auto]').count()).toBe(1);
 const prepared=await next.elementHandle();await jump(page,1);
 expect(await prepared!.evaluate(m=>m===document.querySelector('article[data-active=true] audio,article[data-active=true] video'))).toBe(true);
 await expect(page.locator('[data-index="0"] video')).toHaveAttribute('preload','metadata');
 await expect(page.locator('[data-index="2"] audio,[data-index="2"] video')).toHaveAttribute('preload','auto');await bounded(page);
 await page.goto('/discovery?post=post-3');
 await expect(active(page).locator('.discovery-cover img')).toHaveAttribute('loading','eager');
 const cover=active(page).locator('.discovery-cover');await expect(cover.locator('a')).toHaveCount(0);await expect(cover.getByRole('button',{name:/^(Play|Pause) Low Tide$/})).toBeVisible();
 await expect(active(page).getByRole('button',{name:/view project/i})).toBeVisible();
});

test('evicted cards release media and retain playback position and social state',async({page})=>{
 await open(page);const old=await player(page).elementHandle();
 await player(page).evaluate((m:HTMLMediaElement)=>m.pause());await active(page).getByRole('slider',{name:'Seek Low Tide',exact:true}).fill('7');
 await active(page).getByRole('button',{name:'Like',exact:true}).click();await expect(active(page).getByRole('button',{name:'Like',exact:true})).toHaveAttribute('aria-pressed','true');
 await active(page).getByRole('button',{name:'Save',exact:true}).click();await expect(active(page).getByRole('button',{name:'Save',exact:true})).toHaveAttribute('aria-pressed','true');
 for(const index of [4,8,13,17,6]){await jump(page,index);await bounded(page);}
 expect(await old!.evaluate((m:HTMLMediaElement)=>!m.isConnected&&m.paused&&!m.getAttribute('src'))).toBe(true);
 await jump(page,0);await expect.poll(()=>player(page).evaluate((m:HTMLMediaElement)=>m.readyState)).toBeGreaterThanOrEqual(3);
 await player(page).evaluate((m:HTMLMediaElement)=>m.pause());
 const time=await player(page).evaluate((m:HTMLMediaElement)=>m.currentTime);expect(time).toBeGreaterThanOrEqual(7);expect(time).toBeLessThan(9);
 await expect(active(page).getByRole('button',{name:'Like',exact:true})).toHaveAttribute('aria-pressed','true');await expect(active(page).getByRole('button',{name:'Save',exact:true})).toHaveAttribute('aria-pressed','true');
 await active(page).getByRole('button',{name:/view project/i}).click();await page.getByRole('dialog').getByRole('link',{name:'View full project',exact:true}).click();await page.goBack();
 await expect(active(page).getByRole('heading',{name:'Low Tide',exact:true})).toBeVisible();await bounded(page);
});

test('save-data and slow connections suppress warming; changes, panels and visibility stop eligibility',async({page})=>{
 await page.addInitScript(()=>{
  const connection=Object.assign(new EventTarget(),{saveData:true,effectiveType:'4g'});
  Object.defineProperty(navigator,'connection',{configurable:true,get:()=>connection});
  (window as any).network=connection;
 });
 await open(page);const next=page.locator('[data-index="1"] audio,[data-index="1"] video');
 await expect(next).toHaveAttribute('preload','metadata');
 await page.evaluate(()=>{Object.assign((window as any).network,{saveData:false,effectiveType:'2g'});(window as any).network.dispatchEvent(new Event('change'));});
 await expect(next).toHaveAttribute('preload','metadata');
 await page.evaluate(()=>{(window as any).network.effectiveType='4g';(window as any).network.dispatchEvent(new Event('change'));});
 await expect(next).toHaveAttribute('preload','auto');
 await active(page).getByRole('button',{name:/Read description/}).click();await expect(next).toHaveAttribute('preload','metadata');await expect(player(page)).toHaveJSProperty('paused',true);
 await page.keyboard.press('Escape');await expect(next).toHaveAttribute('preload','auto');await expect(player(page)).toHaveJSProperty('paused',true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(next).toHaveAttribute('preload','metadata');
});

test('large native jumps keep snap geometry; pagination extends the same window on both layouts',async({page},info)=>{
 await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});
 const original=await(await page.request.get('/api/publications/3')).json();
 const items=Array.from({length:60},(_,i)=>({...original,id:1000+i,title:`Window item ${i}`,allowRemix:false,remix:undefined}));
 let nextRequests=0;
 await page.route('**/api/feed?*',route=>{
  const next=Number(new URL(route.request().url()).searchParams.get('offset')) > 0;if(next)nextRequests++;
  return route.fulfill({json:{items:next?items.slice(30):items.slice(0,30),nextCursor:next?null:30,snapshot:'window-test'}});
 });
 await page.goto('/discovery');await expect(active(page).getByRole('heading',{name:'Window item 0',exact:true})).toBeVisible();
 if(info.project.name==='desktop')await active(page).getByRole('button',{name:'Comments',exact:true}).click();
 await jump(page,28);await expect.poll(()=>nextRequests).toBe(1);await expect(page.locator('.discovery-feed > [data-index]')).toHaveCount(60);
 for(const index of [59,10,44,0]){await jump(page,index);await bounded(page);await expect(active(page).getByRole('heading',{name:`Window item ${index}`,exact:true})).toBeVisible();}
 expect(nextRequests).toBe(1);
});

test('split remix survives eviction with the original artwork, comparison and one media source',async({page},info)=>{
 await open(page,14);await player(page).evaluate((m:HTMLMediaElement)=>m.pause());
 await active(page).getByRole('slider',{name:/^Seek Marea Alta/}).fill('3');
 await jump(page,8);await jump(page,0);
 await expect.poll(()=>player(page).evaluate((m:HTMLMediaElement)=>m.readyState)).toBeGreaterThanOrEqual(3);await player(page).evaluate((m:HTMLMediaElement)=>m.pause());
 expect(await player(page).count()).toBe(1);const time=await player(page).evaluate((m:HTMLMediaElement)=>m.currentTime);expect(time).toBeGreaterThanOrEqual(3);expect(time).toBeLessThan(5);
 const mobile=info.project.name==='mobile';await expect(active(page).locator('.adaptive-video')).toHaveAttribute('data-layout',mobile?'stacked':'side-by-side');
 if(mobile){
  const original=active(page).getByRole('button',{name:'Original sound: Marea Alta · studio instrumental',exact:true});await expect(original.locator('img')).toBeVisible();await original.click();
  await page.getByRole('dialog').getByRole('button',{name:'Compare versions',exact:true}).click();
 }else await active(page).getByRole('button',{name:'Compare versions',exact:true}).click();
 await expect(page.getByRole('dialog').getByLabel('Compare Original',{exact:true})).toBeVisible();await expect(player(page)).toHaveJSProperty('paused',true);
 await page.keyboard.press('Escape');await expect(player(page)).toHaveJSProperty('paused',true);await bounded(page);
 await page.screenshot({path:info.outputPath('window-remix.png')});
});
