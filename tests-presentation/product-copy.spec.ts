import { test, expect, type Page } from '@playwright/test';
import { projectProductCopy, offerProductDeliverable } from '../artifacts/nebula/src/features/presentation/product-copy';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
async function call(page:Page,path:string,data?:unknown){const r=await page.request.fetch(path,{method:data===undefined?'GET':'POST',headers,data});expect(r.ok(),await r.text()).toBeTruthy();return r.json();}
test.beforeEach(async({page})=>{await call(page,'/api/presentation/reset',{confirm:true});});

test('catalog cleanup is display-only, exact and scoped; edited copy and financial terms survive',async({page})=>{
 const status=await call(page,'/api/presentation'),catalogs=status.catalogs??[status.catalog];
 const projects=(await call(page,'/api/rpc',{method:'listProjects',args:[]})).result;
 const noPop=projects.find((p:any)=>p.title==='No Pop');const before=JSON.stringify(noPop);
 expect(projectProductCopy(noPop,catalogs,status.featuredRemix)).toEqual({pitch:'Single · 2024',story:''});
 expect(JSON.stringify(noPop)).toBe(before);
 expect(projectProductCopy({...noPop,id:99999},catalogs).story).toBe(noPop.story);
 expect(projectProductCopy({...noPop,artistId:99999},catalogs).pitch).toBe(noPop.pitch);
 expect(projectProductCopy({...noPop,pitch:'My demo recording',story:'Uploaded from Spotify is my own description.'},catalogs)).toEqual({pitch:'My demo recording',story:'Uploaded from Spotify is my own description.'});
 const offers=await call(page,`/api/projects/${noPop.id}/offers`),offer=offers[0],saved=JSON.stringify(offer);
 expect(offerProductDeliverable(offer,catalogs)).toBe('a featured vocal contribution');
 expect(offerProductDeliverable({...offer,deliverable:'Demo opportunity · my own terms'},catalogs)).toBe('Demo opportunity · my own terms');
 expect(offerProductDeliverable({...offer,projectId:99999},catalogs)).toBe(offer.deliverable);
 expect(JSON.stringify(offer)).toBe(saved);expect(offer.compensation).toEqual({kind:'split',percent:10});
 await page.goto(`/project/${noPop.id}`);await expect(page.getByRole('heading',{name:'No Pop',exact:true}).first()).toBeVisible();
 await expect(page.getByText('Demo opportunity · a featured vocal contribution',{exact:true})).toHaveCount(0);
 await expect(page.getByText(offer.requirements,{exact:false})).toBeVisible();
 const after=await call(page,`/api/projects/${noPop.id}/offers`);expect(after[0]).toEqual(offer);
});

test('clean catalog and Home retain players, source links, creation, navigation and data',async({page},info)=>{
 await page.goto('/artist/32');await expect(page.getByRole('heading',{name:'gramz',exact:true})).toBeVisible();
 await expect(page.getByText(/Catalog audio previews|Music by gramz\. Explore/)).toHaveCount(0);
 await page.goto('/explore');await expect(page.getByPlaceholder('Search projects, artists, opportunities...')).toBeVisible();
 await expect(page.locator('.opportunity-card').first()).toBeVisible();
 await expect(page.getByText(/Demo opportunity/)).toHaveCount(0);
 await page.screenshot({path:info.outputPath('home.png'),fullPage:false});
 const status=await call(page,'/api/presentation'),release=status.catalog.releases.find((r:any)=>r.title==='Monkey Business');
 await page.goto(`/project/${release.projectId}`);const player=page.getByRole('region',{name:'Track player: Feelz',exact:true});
 await expect(player).toBeVisible();await expect(page.getByText(/Silent demo preview|No audio included|Catalog previews are silent|Explore the tracklist below/)).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Open release on Spotify'})).toHaveAttribute('href',release.source);
 await player.getByRole('button',{name:'Play: Feelz',exact:true}).click();await expect.poll(async()=>Number(await player.getByRole('slider').inputValue())).toBeGreaterThan(.1);
 await player.getByRole('button',{name:'Pause: Feelz',exact:true}).click();await expect(page.locator('audio,video')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('catalog.png'),fullPage:false});
 await page.goto('/profile');await expect(page.getByRole('link',{name:'Saved publications',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'More',exact:true}).click();await expect(page.getByRole('menuitem',{name:'Mobile view',exact:true})).toBeVisible();
 await expect(page.getByRole('menuitem',{name:/restore|reset|demo|perspective/i})).toHaveCount(0);
 await page.keyboard.press('Escape');await page.goto('/presentation');await expect(page.getByRole('heading',{name:'Change perspective'})).toBeVisible();await expect(page.getByRole('button',{name:'Restore scenario'})).toBeVisible();
});

test('visitor, investor and recoverable errors keep useful states without implementation prose',async({page},info)=>{
 const status=await call(page,'/api/presentation'),investor=status.accounts.find((a:any)=>a.role==='investor');
 await call(page,'/api/presentation/switch',{accountId:investor.id});await page.goto('/pledges');await expect(page.getByRole('heading',{name:/pledges/i})).toBeVisible();
 await page.screenshot({path:info.outputPath('investor.png'),fullPage:false});
 await call(page,'/api/presentation/switch',{accountId:status.principalId});await page.goto('/notifications');
 await expect(page.getByText(/Updates from your requests|does not send a read receipt|local server/)).toHaveCount(0);
 await page.route('**/api/saved*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Please try again later.'})}));
 await page.goto('/saved'); // The existing recovery remains visible for failed requests.
 await expect(page.getByRole('heading',{name:'Saved publications',exact:true})).toBeVisible();
 await expect(page.getByRole('alert')).toContainText('Please try again later.');await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
 await call(page,'/api/rpc',{method:'logout',args:[]});await page.goto('/saved');await expect(page.getByText('Log in to see your private collection.')).toBeVisible();
 await page.goto('/register');await expect(page.getByText(/local preview|saved in this browser|demo version/i)).toHaveCount(0);
 await page.screenshot({path:info.outputPath('register.png'),fullPage:false});
});
