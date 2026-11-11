import {test,expect} from '@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
test('Home shows real linked LUNA recordings and compact catalog transports',async({page},info)=>{
 await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});
 const scene=await (await page.request.get('/api/presentation')).json();
 await page.goto('/explore');
 let previous:any;
 for(const [name,recording] of [['LUNA · Next phase',scene.featuredRemix.original],['CHILZ · Next chapter',scene.featuredRemix.remix]] as const){
  const card=page.getByRole('article',{name,exact:true});await page.locator('.opportunity-card-slot').filter({has:page.locator(`article[aria-label="${name}"]`)}).scrollIntoViewIfNeeded();
  await expect(card.locator('.audio-preview')).toBeVisible();
  await expect(card.locator('.audio-preview-wave svg')).toBeVisible({timeout:15000});
  await card.getByRole('button',{name:`Play ${recording.title}`,exact:true}).click();
  const audio=card.locator('audio');expect(await audio.getAttribute('src')).toContain(recording.mediaId);
  await expect.poll(()=>audio.evaluate((a:HTMLMediaElement)=>a.currentTime)).toBeGreaterThan(.1);
  if(previous)await expect.poll(()=>previous.evaluate((a:HTMLMediaElement)=>a.paused)).toBe(true);
  previous=audio;
 }
 for(const name of ['No Pop','No Regrets']){
  const card=page.getByRole('article',{name,exact:true});await page.locator('.opportunity-card-slot').filter({has:page.locator(`article[aria-label="${name}"]`)}).scrollIntoViewIfNeeded();
  await expect(card.locator('.audio-preview-wave svg')).toBeVisible();await expect(card.locator('audio')).toHaveCount(0);
  await card.getByRole('button',{name:`Play: ${name}`,exact:true}).click();
  await expect(card.getByRole('slider')).not.toHaveValue('0');
  await expect.poll(()=>previous.evaluate((a:HTMLMediaElement)=>a.paused)).toBe(true);
  await card.getByRole('button',{name:`Pause: ${name}`,exact:true}).click();
  await page.screenshot({path:info.outputPath(`${name.replaceAll(' ','-')}.png`)});
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
