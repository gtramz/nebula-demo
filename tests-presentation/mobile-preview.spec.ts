import {test,expect} from '@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};

test('More opens a separate real mobile viewport; resizing preserves the active remix and navigation',async({page},info)=>{
 await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});
 await page.setViewportSize({width:1440,height:1000});await page.goto('/profile');
 await page.getByRole('button',{name:'More',exact:true}).click();
 const [preview]=await Promise.all([page.waitForEvent('popup'),page.getByRole('menuitem',{name:'Mobile view',exact:true}).click()]);
 await expect(page).toHaveURL(/profile$/);await expect(preview).toHaveURL(/presentation\/mobile\?path=/);
 await preview.goto('/presentation/mobile?path='+encodeURIComponent('/discovery?post=post-14'));
 const frame=preview.frameLocator('iframe'),post=frame.locator('article[data-active=true]');
 await expect(post.getByRole('heading',{name:'Marea Alta · Dante’s verse',exact:true})).toBeVisible();
 await expect(post.locator('.adaptive-video')).toHaveAttribute('data-layout','stacked');
 expect(await frame.locator('body').evaluate(()=>innerWidth)).toBe(390);
 await post.locator('video').evaluate((v:HTMLVideoElement)=>v.pause());await post.getByRole('slider',{name:/^Seek /}).fill('3');
 const sameFrame=preview.frames()[1],sameVideo=await post.locator('video').elementHandle();
 await preview.getByLabel('Screen size').selectOption('2');
 await expect.poll(()=>frame.locator('body').evaluate(()=>innerWidth)).toBe(430);expect(preview.frames()[1]).toBe(sameFrame);
 expect(await sameVideo!.evaluate(v=>v.isConnected&&v===document.querySelector('article[data-active=true] video'))).toBe(true);
 expect(await post.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeCloseTo(3,1);
 await preview.getByLabel('Screen size').selectOption('0');await preview.getByRole('button',{name:'Rotate preview'}).click();
 await expect.poll(()=>frame.locator('body').evaluate(()=>[innerWidth,innerHeight])).toEqual([667,375]);
 await preview.getByRole('button',{name:'Rotate preview'}).click();await preview.getByLabel('Screen size').selectOption('1');
 await post.getByRole('button',{name:/Original sound:/}).click();await expect(frame.getByRole('dialog',{name:'Original sound'})).toBeVisible();
 await preview.keyboard.press('Escape');await expect(post.locator('video')).toHaveJSProperty('paused',true);
 await frame.getByRole('region',{name:'Discovery feed'}).focus();await preview.keyboard.press('ArrowDown');await expect(post).toHaveAttribute('data-index','1');
 await preview.getByLabel('Screen size').selectOption('2');await expect(post).toHaveAttribute('data-index','1');
 const remembered=await post.getAttribute('aria-label');
 await frame.locator('#primary-navigation a[href="/profile"]').click();await expect(frame.getByRole('heading',{name:'Profile',exact:true})).toBeVisible();
 await frame.getByRole('button',{name:'More',exact:true}).click();await expect(frame.getByRole('menuitem',{name:'Mobile view',exact:true})).toHaveCount(0);await preview.keyboard.press('Escape');
 await frame.locator('#primary-navigation a[href="/discovery"]').click();await expect(post).toHaveAttribute('aria-label',remembered!);
 await preview.screenshot({path:info.outputPath('mobile-preview.png')});
 await preview.close();
});

test('preview rejects external or recursive frame destinations',async({page})=>{
 for(const path of ['https://example.com/','/presentation/mobile','/api/session']){
  await page.goto('/presentation/mobile?path='+encodeURIComponent(path));await expect(page.locator('iframe')).toHaveAttribute('src','/discovery');
  await expect(page.frameLocator('iframe').getByRole('region',{name:'Discovery feed'})).toBeVisible();
 }
});
