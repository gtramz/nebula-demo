import {test, expect, type Page} from '@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
async function call(page:Page,path:string,data?:unknown) {const r=await page.request.fetch(path,{method:data===undefined?'GET':'POST',headers,data});expect(r.ok(),await r.text()).toBe(true);return r.json();}
test.beforeEach(async({page})=>{await call(page,'/api/presentation/reset',{confirm:true});});

test('Music keeps scoped references; Versions load on demand and pause previous playback',async({page},info)=>{
 await page.goto('/project/12?song=4');
 await expect(page.getByRole('tab',{name:'Music',exact:true})).toHaveAttribute('aria-selected','true');
 const song=page.getByRole('group',{name:'Song: Marea Alta',exact:true});
 await expect(song.locator('button[aria-expanded]').first()).toHaveAttribute('aria-expanded','true');
 await expect(song).toContainText('15% royalty split');
 await expect(page.getByText('Make it together.',{exact:true})).toHaveCount(0);
 await expect(page.getByText('No project-wide offers. Explore individual songs for more opportunities.')).toHaveCount(0);
 await song.getByRole('button',{name:/^Play /}).first().click();
 const original=await song.locator('audio').elementHandle();
 await expect.poll(()=>original!.evaluate((a:HTMLMediaElement)=>a.currentTime)).toBeGreaterThan(.1);
 await page.getByRole('tab',{name:/^Versions/}).click();
 await expect.poll(()=>original!.evaluate((a:HTMLMediaElement)=>a.paused)).toBe(true);
 await expect(page.locator('video,audio')).toHaveCount(0);
 const version=page.getByRole('article',{name:'Marea Alta · Dante’s verse',exact:true});
 await version.getByRole('button').click();
 await expect(version.locator('video')).toHaveCount(1);
 await expect(version).toContainText('Original:');
 await version.locator('summary').filter({hasText:'Compare versions'}).click();
 await expect(version.getByRole('group',{name:'Compare versions'})).toBeVisible();
 await version.getByRole('button',{name:'Original',exact:true}).click();
 const compare=version.getByLabel('Compare Original',{exact:true});
 await compare.evaluate((a:HTMLMediaElement)=>a.play());
 const player=await compare.elementHandle();
 await page.getByRole('tab',{name:'Music',exact:true}).click();
 await expect.poll(()=>player!.evaluate((a:HTMLMediaElement)=>a.paused)).toBe(true);
 await page.getByRole('tab',{name:/^Versions/}).click();
 await version.getByRole('link',{name:'Open in Discovery',exact:true}).click();
 await expect(page.locator('article[data-active=true]')).toContainText('Dante');
 await page.goBack();
 await expect(page.getByRole('tab',{name:/^Versions/})).toHaveAttribute('aria-selected','true');
 await expect(version.locator('video')).toHaveCount(1); // comparison remains an explicit, on-demand action after returning
 await page.screenshot({path:info.outputPath('versions-open.png'),fullPage:true});
});

test('catalog song rows are shared, one detail opens, owner controls survive and no private media leaks',async({page})=>{
 const status=await call(page,'/api/presentation');const release=status.catalog.releases.find((r:any)=>r.tracks.length>1);const track=release.tracks[1];
 await call(page,`/api/projects/${release.projectId}/offers`,{workId:track.workId,need:'Mix',deliverable:'A finished stereo mix',requirements:'Keep the original credits.',deadline:null,status:'open',compensation:{kind:'fee',amount:150,currency:'USD'}});
 await page.goto(`/project/${release.projectId}`);
 const song=page.getByRole('group',{name:`Song: ${track.title}`,exact:true});
 await expect(song.locator('button[aria-expanded]').first()).toHaveAttribute('aria-expanded','true');
 await expect(song.getByRole('region',{name:`Track player: ${track.title}`})).toBeVisible();
 await expect(song.getByRole('button',{name:'Edit offer',exact:true})).toBeVisible();
 await expect(song.getByText('Keep the original credits.',{exact:false})).toBeHidden();
 await song.locator('summary').filter({hasText:'Full terms'}).click();
 await expect(song.getByText('Keep the original credits.',{exact:false})).toBeVisible();
 const first=page.getByRole('group',{name:`Song: ${release.tracks[0].title}`,exact:true});
 await first.locator('button[aria-expanded]').first().click();
 await expect(song.locator('button[aria-expanded]').first()).toHaveAttribute('aria-expanded','false');
 await expect(first.getByRole('button',{name:'Add opportunity',exact:true})).toBeVisible();
 await expect(first.getByText('No open collaboration offers.',{exact:true})).toHaveCount(0);
 await call(page,'/api/presentation/switch',{accountId:19});await page.reload();
 await expect(page.getByRole('button',{name:'Add opportunity',exact:true})).toHaveCount(0);
 await expect(song.getByRole('button',{name:'Submit proposal',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:/^Versions/}).click();await expect(page.getByText('No versions shared yet.',{exact:true})).toBeVisible();
});

test('Music and Versions fit every breakpoint and explicit song links open the matching row',async({page},info)=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [390,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  await page.goto('/project/47?song=11');
  const song=page.getByRole('group',{name:'Song: Brain',exact:true});
  await expect(song.locator('button[aria-expanded]').first()).toHaveAttribute('aria-expanded','true');
  await expect(page.getByRole('region',{name:'Featured recording: luna - chilz remix',exact:true})).toHaveCount(1);
  await page.locator('[data-page-scroll]').evaluate(el=>{const t=el.querySelector('[role=tablist]')!;el.scrollTop+=t.getBoundingClientRect().top-el.getBoundingClientRect().top-16;});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole('region',{name:'Featured recording: luna - chilz remix',exact:true}).locator('.audio-preview-wave svg')).toBeVisible();await page.getByRole('tablist',{name:'Project content'}).evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:info.outputPath(`music-${width}.png`),animations:'disabled'});
  await page.goto('/project/12');await page.getByRole('tab',{name:/^Versions/}).click();
  await page.getByRole('article',{name:'Marea Alta · Dante’s verse',exact:true}).getByRole('button').click();
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
  await page.locator('video').evaluate(async(v:HTMLVideoElement)=>{await v.play();});
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.3);
  await page.locator('video').evaluate((v:HTMLVideoElement)=>v.pause());
  await page.locator('[data-page-scroll]').evaluate(el=>{const t=el.querySelector('[role=tablist]')!;el.scrollTop+=t.getBoundingClientRect().top-el.getBoundingClientRect().top-16;});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('tablist',{name:'Project content'}).evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:info.outputPath(`versions-${width}.png`),animations:'disabled'});
 }
 expect(errors).toEqual([]);
});

test('owner offer actions, empty songs and Artist/Investor/visitor access remain distinct',async({page})=>{
 const status=await call(page,'/api/presentation');
 const result=await call(page,'/api/rpc',{method:'createProject',args:[{title:'Project UI checks',category:'EP',status:'published',goalAmount:0,operationId:crypto.randomUUID(),songs:[{title:'Unrecorded work',description:'A real description.'}]}]});
 const project=result.result,songs=await call(page,`/api/projects/${project.id}/songs`);
 const offer=await call(page,`/api/projects/${project.id}/offers`,{workId:songs.songs[0].id,need:'Master',deliverable:'Stereo master',requirements:'Deliver WAV.',deadline:null,status:'open',compensation:{kind:'fee',amount:200,currency:'USD'}});
 await page.goto(`/project/${project.id}`);
 await expect(page.locator('audio,video')).toHaveCount(0);
 await expect(page.getByRole('region',{name:/Track player:/})).toHaveCount(0);
 const scope=page.getByRole('group',{name:'Song: Unrecorded work',exact:true});
 await scope.getByRole('button',{name:'Edit offer',exact:true}).click();
 await scope.getByRole('textbox',{name:'Expected deliverable',exact:true}).fill('Stereo master at 24 bit');
 await scope.getByRole('button',{name:'Save offer',exact:true}).click();await expect(scope.getByRole('form',{name:'Offer editor'})).toHaveCount(0);await expect(scope.getByText('Stereo master at 24 bit',{exact:true}).first()).toBeVisible();
 await scope.getByRole('button',{name:'Close offer',exact:true}).click();await expect(scope.getByText('closed',{exact:true})).toBeVisible();
 expect((await call(page,`/api/projects/${project.id}/offers`)).find((o:any)=>o.id===offer.id).status).toBe('closed');
 await call(page,`/api/projects/${project.id}/offers`,{workId:songs.songs[0].id,need:'Feature',deliverable:'Guest vocals',requirements:'',deadline:null,status:'open',compensation:{kind:'split',percent:10}});
 const investor=status.accounts.find((a:any)=>a.role==='investor');
 await call(page,'/api/presentation/switch',{accountId:investor.id});await page.reload();
 await expect(page.getByRole('button',{name:'Edit offer',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Submit proposal',exact:true})).toHaveCount(0);
 await expect(page.getByText('An artist account is required to apply.',{exact:true})).toBeVisible();
 await call(page,'/api/rpc',{method:'logout',args:[]});await page.reload();
 await expect(page.getByRole('link',{name:'Log in to collaborate',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Add opportunity',exact:true})).toHaveCount(0);
 await expect(page.getByRole('complementary',{name:'Project funding'})).toHaveCount(0);
});
