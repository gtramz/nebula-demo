import {test,expect} from '@playwright/test';

test('prepared presentation works with external traffic blocked, including remix render and comparison',async({page})=>{
  const external:string[]=[];
  await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.protocol==='http:'&&url.hostname==='127.0.0.1')return route.continue();external.push(url.origin);return route.abort();});
  await page.goto('/presentation');await page.getByRole('button',{name:'Lía Soren Artist',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Find your next project.'})).toBeVisible();
  await page.getByRole('button',{name:'Create',exact:true}).click();await expect(page.getByRole('menuitem',{name:'Publish audio or video'})).toBeVisible();await page.keyboard.press('Escape');
  await page.goto('/discovery?post=post-4');await expect(page.getByRole('heading',{name:'Marea Alta',exact:true})).toBeVisible();
  await page.locator('article[data-active=true]').getByRole('button',{name:'Remix',exact:true}).click();await expect(page.getByRole('button',{name:/Use prepared take/})).toBeEnabled();
  await page.getByRole('button',{name:/Use prepared take/}).click();await expect(page.getByText(/Your contribution is ready/)).toBeVisible();
  await page.getByRole('button',{name:'Build preview',exact:true}).click();await expect(page.getByRole('region',{name:'Remix preview'}).locator('audio')).toBeVisible();
  await page.getByText('Compare versions',{exact:true}).click();
  const seek=page.getByRole('slider',{name:/Comparison position/});await seek.fill('12');
  await page.getByRole('button',{name:'Contribution',exact:true}).click();await expect.poll(()=>page.getByLabel('Compare Contribution',{exact:true}).evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeCloseTo(12,1);
  await page.getByLabel('Compare Contribution',{exact:true}).evaluate((a:HTMLAudioElement)=>a.play());
  const before=await page.getByLabel('Compare Contribution',{exact:true}).evaluate((a:HTMLAudioElement)=>a.currentTime);
  await page.getByRole('button',{name:'Your version',exact:true}).click();
  await expect.poll(()=>page.getByLabel('Compare Your version',{exact:true}).evaluate((a:HTMLAudioElement)=>!a.paused)).toBe(true);
  const after=await page.getByLabel('Compare Your version',{exact:true}).evaluate((a:HTMLAudioElement)=>a.currentTime);expect(after).toBeGreaterThanOrEqual(before-.1);expect(after).toBeLessThan(before+1);
  expect(await page.locator('audio,video').evaluateAll((items:HTMLMediaElement[])=>items.filter(a=>!a.paused&&!a.muted).length)).toBe(1);

  await page.getByRole('button',{name:'Save remix draft',exact:true}).click();await expect(page.getByText('Remix draft saved',{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByRole('button',{name:'Build preview',exact:true})).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(external).toEqual([]);
});
