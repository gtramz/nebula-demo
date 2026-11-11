import {test,expect} from '@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
async function scene(page:any){expect((await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}})).ok()).toBe(true);}
test('split result preserves both halves, one media clock and transport through resize',async({page},info)=>{
 await scene(page);await page.goto('/discovery?post=post-14');
 const post=page.locator('article[data-active=true]'),video=post.locator('video'),surface=post.locator('.adaptive-video');
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 expect(await video.count()).toBe(1);
 await expect(post.locator('.discovery-playback')).toHaveCount(0);
 for(const width of [390,768,1024,1440,767]){
  await page.setViewportSize({width,height:900});
  await expect(surface).toHaveAttribute('data-layout',width<768?'stacked':'side-by-side');
  await video.evaluate((v:HTMLVideoElement)=>{v.pause();v.currentTime=2;v.volume=.6;});
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.seeking)).toBe(false);
  const box=await surface.locator('.adaptive-video-picture').boundingBox();expect(box!.width).toBeGreaterThan(width<768?220:450);
  if(width<768){const feed=await page.locator('.discovery-feed').boundingBox();expect(box!.width).toBeCloseTo(feed!.width,0);expect(box!.height).toBeCloseTo(feed!.height,0);}else expect(box!.width/box!.height).toBeCloseTo(9/4,1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(width>=768){
   const difference=await surface.locator('canvas').evaluate((c:HTMLCanvasElement)=>{
    const v=c.parentElement!.querySelector('video')!,expected=document.createElement('canvas');expected.width=1440;expected.height=640;
    const p=expected.getContext('2d')!;p.drawImage(v,0,0,720,640,0,0,720,640);p.drawImage(v,0,640,720,640,720,0,720,640);
    const a=p.getImageData(0,0,1440,640).data,b=c.getContext('2d')!.getImageData(0,0,1440,640).data;let sum=0;for(let i=0;i<a.length;i+=31)sum+=Math.abs(a[i]-b[i]);return sum/(a.length/31);
   });expect(difference).toBeLessThan(2);
  }
  await page.screenshot({path:info.outputPath(`split-${width}.png`)});
 }
 const state=await video.evaluate((v:HTMLVideoElement)=>({time:v.currentTime,volume:v.volume}));
 await page.setViewportSize({width:1440,height:900});expect(await video.evaluate((v:HTMLVideoElement)=>({time:v.currentTime,volume:v.volume}))).toEqual(state);
 await post.getByRole('button',{name:'Play Marea Alta · Dante’s verse',exact:true}).click();await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(false);
 await post.getByRole('button',{name:'Pause Marea Alta · Dante’s verse',exact:true}).click();await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true);
 await post.getByRole('slider',{name:'Seek Marea Alta · Dante’s verse',exact:true}).press('ArrowRight');expect(await video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(state.time);
});
test('ordinary Discovery video uses tap, small seek and device-volume controls',async({page},info)=>{
 await scene(page);await page.goto('/discovery?post=post-11');const post=page.locator('article[data-active=true]'),video=post.locator('video');
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 await video.evaluate((v:HTMLVideoElement)=>v.pause());
 await post.getByRole('button',{name:'Play Marea Alta — rooftop session',exact:true}).click();await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(false);
 await post.getByRole('button',{name:'Pause Marea Alta — rooftop session',exact:true}).press('Space');await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true);
 expect(await video.evaluate((v:HTMLVideoElement)=>v.muted)).toBe(false);
 await expect(post.getByRole('slider',{name:/Volume/})).toHaveCount(info.project.name==='mobile'?0:1);await expect(post.locator('.discovery-playback')).toHaveCount(0);
 const seek=post.getByRole('slider',{name:/Seek/});expect((await seek.boundingBox())!.height).toBeGreaterThanOrEqual(44);
 expect(await seek.evaluate(el=>el.parentElement!.getBoundingClientRect().height)).toBeLessThanOrEqual(16);
 await page.screenshot({path:info.outputPath('discovery-minimal.png')});
});
test('canvas failure falls back to intact vertical media; submitted example uses adaptive playback',async({page})=>{
 await scene(page);await page.setViewportSize({width:1024,height:900});
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args:any[]){if(this.width===1440)return null;return original.apply(this,args as any);} as any;});
 await page.goto('/discovery?post=post-14');const post=page.locator('article[data-active=true]');
 await expect(post.getByText(/Horizontal view unavailable/)).toBeVisible();await expect(post.locator('.adaptive-video')).toHaveAttribute('data-layout','stacked');
 expect((await post.locator('video').evaluate((v:HTMLVideoElement)=>[v.videoWidth,v.videoHeight]))).toEqual([720,1280]);
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:4}});await page.goto('/messages/collaboration/8');
 await expect(page.locator('.adaptive-video').first()).toBeVisible();
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:2}});await page.reload();await expect(page.locator('.adaptive-video').first()).toBeVisible();
});

test('audio controls sit above navigation without a bottom void',async({page},info)=>{
 await scene(page);await page.goto('/discovery?post=post-3');
 const post=page.locator('article[data-active=true]');await expect(post.locator('.is-audio')).toBeVisible();
 for(const width of [390,521,767]){await page.setViewportSize({width,height:930});const controls=await post.locator('.discovery-media-controls').boundingBox(),nav=await page.getByRole('navigation',{name:'Primary navigation'}).boundingBox();expect(nav!.y-(controls!.y+controls!.height)).toBeLessThan(30);expect(nav!.y-(controls!.y+controls!.height)).toBeGreaterThanOrEqual(0);const cover=await post.locator('.discovery-cover').boundingBox();expect(cover!.width/cover!.height).toBeCloseTo(1,1);await page.screenshot({path:info.outputPath(`audio-${width}.png`)});}
});

test('split playback supports fullscreen and landscape without restarting the media',async({page})=>{
 await scene(page);await page.goto('/discovery?post=post-14');
 const post=page.locator('article[data-active=true]'),video=post.locator('video');
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 await video.evaluate((v:HTMLVideoElement)=>{v.pause();v.currentTime=2;});
 await page.setViewportSize({width:767,height:430});
 await expect(post.locator('.adaptive-video')).toHaveAttribute('data-layout','stacked');
 await page.setViewportSize({width:1024,height:600});
 await expect(post.locator('.adaptive-video')).toHaveAttribute('data-layout','side-by-side');
 expect(await video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeCloseTo(2,1);
 await post.getByRole('button',{name:'Full screen',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 await post.getByRole('button',{name:'Full screen',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
 await expect(page.getByRole('navigation',{name:'Primary navigation'})).toBeVisible();
});
