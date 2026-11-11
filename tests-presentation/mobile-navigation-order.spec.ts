import {test,expect} from '@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
test('mobile Home first, video Discovery and centered Create retain routes and desktop layout',async({page},info)=>{
 await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:19}});
 await page.goto('/received');
 const nav=page.getByRole('navigation',{name:'Primary navigation'}),create=nav.getByRole('button',{name:'Create',exact:true});
 for(const width of [320,390,578,767,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  const mobile=width<768;
  await expect.poll(()=>nav.getByRole('link').evaluateAll(links=>links.map(l=>l.getAttribute('aria-label')))).toEqual(mobile?['home','discovery','search','messages','profile']:['discovery','home','search','received','messages','saved','profile']);
  await expect(nav).toHaveCount(1);
  await expect(nav.locator('a[aria-current=page]')).toHaveAttribute('aria-label',mobile?'profile':'received');
  await expect(nav.getByRole('link',{name:'discovery',exact:true}).locator(mobile?'.lucide-clapperboard':'.lucide-compass')).toBeVisible();
  const boxes=await nav.locator('.primary-link:visible').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,label:el.getAttribute('aria-label')}}));
  for(const box of boxes){expect(box.w).toBeGreaterThanOrEqual(44);expect(box.h).toBeGreaterThanOrEqual(44);}
  if(mobile){
   expect(boxes.map(b=>b.label)).toEqual(['home','discovery','search','Create','messages','profile']);
   const c=await create.boundingBox();expect(c!.x+c!.width/2).toBeCloseTo(width/2,0);
   for(let i=1;i<boxes.length;i++)expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i-1].x+boxes[i-1].w-1);
   await nav.getByRole('link',{name:'search',exact:true}).focus();await page.keyboard.press('Tab');await expect(create).toBeFocused();await page.keyboard.press('Tab');await expect(nav.getByRole('link',{name:'messages',exact:true})).toBeFocused();
  }else expect(boxes[0].label).toBe('Create');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if([390,1440].includes(width))await page.screenshot({path:info.outputPath(`navigation-${width}.png`)});
 }
 await page.setViewportSize({width:390,height:844});await create.click();
 for(const name of ['Publish audio or video','Create project','Remix studio','Continue a draft'])await expect(page.getByRole('menuitem',{name,exact:true})).toBeVisible();
 await page.getByRole('menuitem',{name:'Publish audio or video',exact:true}).click();await expect(page).toHaveURL(/\/publish$/);
 await nav.getByRole('link',{name:'home',exact:true}).click();await expect(page).toHaveURL(/\/explore$/);
 await nav.getByRole('link',{name:'discovery',exact:true}).click();await expect(page.getByRole('region',{name:'Discovery feed'})).toBeVisible();
 await page.goto('/profile');await expect(page.getByRole('heading',{name:'Profile',exact:true})).toBeVisible();
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:7}});await page.goto('/pledges');
 await expect.poll(()=>nav.getByRole('link').evaluateAll(links=>links.map(l=>l.getAttribute('aria-label')))).toEqual(['explore','discovery','search','pledges','profile']);
 await expect(create).toHaveCount(0);await expect(nav.getByRole('link',{name:'pledges',exact:true})).toHaveAttribute('aria-current','page');
});
