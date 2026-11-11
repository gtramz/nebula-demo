import {test,expect,type Page} from '@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
async function call(page:Page,path:string,data?:unknown){const r=await page.request.fetch(path,{method:data===undefined?'GET':'POST',headers,data});expect(r.ok(),await r.text()).toBe(true);return r.json();}
test.beforeEach(async({page})=>{await call(page,'/api/presentation/reset',{confirm:true});});

test('gramz catalog uses the shared profile, preserves LUNA and exposes real demo opportunities',async({page},info)=>{
 const status=await call(page,'/api/presentation');expect(status.principalId).toBe(21);expect(status.catalog.artistId).toBe(21);
 const catalog=status.catalogs.find((c:any)=>c.artistId===32);expect(catalog.releases).toHaveLength(11);expect(catalog.releases.some((r:any)=>/luna/i.test(r.title))).toBe(false);
 await page.goto('/artist/32');await expect(page.getByRole('heading',{name:'gramz',exact:true})).toBeVisible();await expect(page.getByText(/Music by gramz\. Explore releases/)).toHaveCount(0);await expect(page.getByText(/These catalog releases use silent previews/)).toHaveCount(0);await expect(page.getByRole('region',{name:'Featured recording: luna',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Music',exact:true}).click();const disc=page.getByRole('region',{name:'Discography',exact:true});await expect(disc.getByRole('heading',{level:3})).toHaveCount(11);
 for(const img of await disc.locator('img').all()){await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);}await disc.scrollIntoViewIfNeeded();
 await page.screenshot({path:info.outputPath('gramz-discography.png')});await page.getByRole('heading',{name:'gramz',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('gramz-profile.png')});
 const noPop=catalog.releases.find((r:any)=>r.title==='No Pop');await disc.locator(`a[href="/project/${noPop.projectId}"]`).click();await expect(page.getByRole('heading',{name:'No Pop',exact:true,level:1})).toBeVisible();await expect(page.getByText('Silent demo preview',{exact:true})).toHaveCount(0);await expect(page.getByRole('region',{name:/^Track player:/})).toBeVisible();await expect(page.getByText(/Deliverable: a featured vocal contribution/).first()).toBeVisible();
 await page.getByRole('button',{name:'Play: No Pop',exact:true}).click();await expect.poll(async()=>Number(await page.getByRole('slider',{name:'Track position for No Pop',exact:true}).inputValue())).toBeGreaterThan(.1);
 await page.screenshot({path:info.outputPath('gramz-project.png')});await page.getByRole('link',{name:'Back to artist',exact:true}).click();await expect(page.getByRole('tab',{name:'Music',exact:true})).toHaveAttribute('aria-selected','true');
 for(const [q,need,comp,title] of [['No Pop','Feature','split','No Pop'],['No Regrets','Mix','fee','No Regrets']]){
  const query=`/api/opportunities/projects?mode=following&q=${encodeURIComponent(q)}&participation=${need}&compensationKinds=${comp}`;const results=await call(page,query);expect(results.items.map((i:any)=>i.project.title)).toEqual([title]);expect(results.items[0].project.goalAmount).toBe(0);expect(results.items[0].offers[0].workId).toBeTruthy();
  expect((await call(page,query.replace(`compensationKinds=${comp}`,`compensationKinds=${comp==='fee'?'split':'fee'}`))).items).toHaveLength(0);
 }
 await page.goto('/explore');await page.getByRole('button',{name:'Following',exact:true}).click();await page.getByRole('combobox').fill('No Pop');await page.getByRole('combobox').press('Enter');await expect(page.getByRole('article',{name:'No Pop',exact:true})).toHaveCount(1);await page.getByRole('button',{name:/^Filters/}).click();await page.getByRole('checkbox',{name:'Feature',exact:true}).check();await page.getByRole('button',{name:/^Apply filters/}).click();await expect(page.getByRole('article',{name:'No Pop',exact:true})).toHaveCount(1);await expect(page.getByRole('article',{name:'No Pop',exact:true})).not.toContainText('Demo opportunity');await page.screenshot({path:info.outputPath('gramz-home.png')});
 await call(page,'/api/presentation/switch',{accountId:32});expect((await call(page,'/api/opportunities/projects?mode=following&q=No%20Pop')).items).toHaveLength(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('mutual followers and accepted empty contact support private Share and identity isolation',async({page})=>{
 expect((await call(page,'/api/artists/32/social')).isFollowing).toBe(true);
 const target=(await call(page,'/api/messages/share-targets?source=chats')).items.find((i:any)=>i.artistId===32);expect(target.destination.kind).toBe('general');expect(target.canSend).toBe(true);
 const path=`/api/messages/general/${target.destination.id}`;expect((await call(page,path)).messages).toHaveLength(0);
 const posts=(await call(page,'/api/publications')).items;const post=posts.find((p:any)=>p.artistId===32&&p.media.kind==='video');expect(post).toBeTruthy();
 const sent=await call(page,'/api/messages/share',{recipientId:32,publicationId:post.id,destination:target.destination,operationId:crypto.randomUUID(),note:'Temporary integration check'});expect(sent.admission).toBe('accepted');
 await call(page,'/api/presentation/switch',{accountId:32});expect((await call(page,'/api/artists/21/social')).isFollowing).toBe(true);expect((await call(page,path)).messages).toHaveLength(1);expect((await call(page,'/api/messages/share-targets?source=chats')).items.some((i:any)=>i.artistId===21)).toBe(true);
 await call(page,'/api/presentation/switch',{accountId:33});expect((await page.request.get(path)).status()).toBe(404);expect((await call(page,'/api/messages/share-targets?source=chats')).items.some((i:any)=>i.destination?.id===target.destination.id)).toBe(false);
});

test('eight imported videos load with real media; comments, Share and project return preserve Discovery',async({page},info)=>{
 test.setTimeout(120000);
 const posts=(await call(page,'/api/publications')).items.filter((p:any)=>p.artistId===32&&p.media.kind==='video');expect(posts).toHaveLength(8);expect(new Set(posts.map((p:any)=>p.media.id)).size).toBe(8);
 for(const post of posts){
  await page.goto(`/discovery?post=post-${post.id}`);const active=page.locator('article[data-active=true]');await expect(active).toContainText(post.title);const video=active.locator('video');await expect.poll(()=>video.evaluate((m:HTMLVideoElement)=>m.readyState)).toBeGreaterThanOrEqual(2);
  await video.evaluate(async(m:HTMLVideoElement)=>{await m.play();});await expect.poll(()=>video.evaluate((m:HTMLVideoElement)=>m.currentTime)).toBeGreaterThan(0);
  expect(await page.locator('audio,video').evaluateAll((ms:HTMLMediaElement[])=>ms.filter(m=>!m.paused).length)).toBe(1);
 }
 const linked=posts.find((p:any)=>p.projectId);await page.goto(`/discovery?post=post-${linked.id}`);const active=page.locator('article[data-active=true]');await expect(active).toContainText(linked.title);
 await active.locator('video').evaluate(async(m:HTMLVideoElement)=>{await m.play();});await active.getByRole('button',{name:'Comments',exact:true}).click();await page.getByLabel('Add a comment',{exact:true}).fill('Temporary gramz clip check');await page.getByRole('button',{name:'Post comment',exact:true}).click();await expect(page.getByText('Temporary gramz clip check',{exact:true})).toBeVisible();await expect(active.locator('video')).toHaveJSProperty('paused',false);await page.getByRole('button',{name:'Close comments',exact:true}).click();await active.getByRole('button',{name:'Share',exact:true}).click();await expect(page.getByRole('dialog',{name:'Share',exact:true}).getByRole('button',{name:'Select gramz',exact:true})).toBeVisible();await page.keyboard.press('Escape');
 await page.screenshot({path:info.outputPath('gramz-discovery.png')});
 // Direct project route preserves the current feed anchor through browser history.
 await page.goto(`/project/${linked.projectId}`);await expect(page.getByRole('heading',{name:linked.project.title,exact:true,level:1})).toBeVisible();await page.goBack();await expect(page.locator('article[data-active=true]')).toContainText(linked.title);
 await page.locator('.discovery-feed').evaluate(el=>el.scrollBy({top:el.clientHeight,behavior:'instant'}));await expect.poll(()=>page.locator('audio,video').evaluateAll((ms:HTMLMediaElement[])=>ms.filter(m=>!m.paused).length)).toBeLessThanOrEqual(1);
 expect(await page.locator('.discovery-post').count()).toBeLessThanOrEqual(5);
});
