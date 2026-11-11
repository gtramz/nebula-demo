import {test,expect} from '@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
const back=(page:any)=>page.locator('a[data-contextual-return=true]').first();
test('Create returns to its origin, Remix step Back stays in the studio, and explicit original is unchanged',async({page})=>{
 await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:19}});
 await page.goto('/discovery?post=post-15');
 const active=page.locator('article[data-active=true]');await expect(active).toBeVisible();const original=await active.getAttribute('aria-label');
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Create',exact:true}).click();await page.getByRole('menuitem',{name:'Publish audio or video',exact:true}).click();
 await expect(back(page)).toHaveText('Back to Discovery');await back(page).click();await expect(active).toHaveAttribute('aria-label',original!);
 await active.getByRole('button',{name:'Remix',exact:true}).click();await expect(page).toHaveURL(/\/studio\/remix$/);
 await expect(back(page)).toHaveText('Back to Discovery');await expect(page.getByRole('link',{name:'Open original',exact:true})).toHaveAttribute('href','/discovery?post=post-15');
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).click();await expect(page).toHaveURL(/\/studio\/remix$/);
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Open Forge',exact:true}).click();await page.getByRole('button',{name:'Review your version',exact:true}).click();await expect(page.getByLabel('Finished version',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Remix title',{exact:true}).fill('Unsaved private version');let count=0;
 page.on('dialog',async dialog=>{count++;await dialog.dismiss();});await back(page).click();await expect(page.getByLabel('Remix title',{exact:true})).toHaveValue('Unsaved private version');expect(count).toBe(1);
 page.removeAllListeners('dialog');page.once('dialog',dialog=>dialog.accept());await back(page).click();await expect(active).toHaveAttribute('aria-label',original!);
});

test('identity switching invalidates return history, including after returning to the same account',async({page})=>{
 await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});await page.request.post('/api/presentation/switch',{headers,data:{accountId:19}});
 await page.goto('/profile');await page.getByRole('link',{name:/Saved publications/}).click();await expect(back(page)).toHaveText('Back to profile');
 const previous=await page.evaluate(()=>history.state);
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:21}});await page.reload();await expect(back(page)).toHaveText('Go to profile');
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:19}});await page.reload();await expect(back(page)).toHaveText('Go to profile');
 // An old native entry has the prior account scope: it cannot revive its route chain.
 await page.evaluate(state=>{history.replaceState(state,'');dispatchEvent(new PopStateEvent('popstate',{state}));},previous);
 await expect(back(page)).toHaveText('Go to profile');
});

test('replaced legacy Remix routes keep the originating page and direct entry has a fallback',async({page})=>{
 await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});await page.request.post('/api/presentation/switch',{headers,data:{accountId:19}});
 await page.goto('/saved');await expect(back(page)).toHaveText('Go to profile');
 // Exercise the legacy external route through the same SPA history API used by links.
 await page.evaluate(()=>{history.pushState(null,'','/remix/15?mode=video');});
 await expect(page).toHaveURL(/\/studio\/remix$/);await expect(back(page)).toHaveText('Back to saved publications');
 await back(page).click();await expect(page).toHaveURL(/\/saved$/);
 await page.goto('/studio/remix');await expect(back(page)).toHaveText('Go to studio');
});
