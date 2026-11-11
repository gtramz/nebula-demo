import { test, expect, type Page } from '@playwright/test';
const headers = {Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
async function call(page:Page,path:string,data?:unknown) {
  const r=await page.request.fetch(path,{method:data===undefined?'GET':'POST',headers,data});
  expect(r.ok(),await r.text()).toBe(true);return r.json();
}
const next=(page:Page)=>page.getByRole('button',{name:'Continue',exact:true}).click();
async function createMenu(page:Page,item:string) {
  await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Create',exact:true}).click();
  await page.getByRole('menuitem',{name:item,exact:true}).click();
}
async function createProject(page:Page,category:string,title:string,draft=false) {
  await page.goto('/profile');await createMenu(page,'Create project');
  await page.getByLabel('TITLE',{exact:true}).fill(title);
  await page.getByLabel('CATEGORY',{exact:true}).selectOption(category);
  await next(page);
  if(category!=='Tour')for(let i=1;i<=(['Single','Video'].includes(category)?1:2);i++) {
    await page.getByRole('button',{name:'Add song',exact:true}).click();
    await page.getByLabel(`Song ${i} title`,{exact:true}).fill(`${title} track ${i}`);
    if(i===1){await page.getByLabel('Upload song audio',{exact:true}).setInputFiles('presentation/assets/audio/afterglow.mp3');await expect(page.getByRole('button',{name:'Play Project recording preview',exact:true})).toBeEnabled();}
  }
  await next(page);await next(page);
  await page.getByLabel('STATUS',{exact:true}).selectOption(draft?'draft':'published');
  await page.getByRole('button',{name:draft?'Save project':'Publish project',exact:true}).click();
  await expect(page).toHaveURL(/\/profile$/);
  const projects=(await call(page,'/api/rpc',{method:'listProjects',args:[]})).result;
  const project=projects.find((p:any)=>p.title===title);expect(project).toBeTruthy();
  return {...project,songs:(await call(page,`/api/projects/${project.id}/songs`)).songs};
}
async function fillPost(page:Page,kind:'audio'|'video',title:string,project:any) {
  await createMenu(page,'Publish audio or video');
  await page.getByLabel('Audio or video',{exact:true}).setInputFiles(kind==='audio'?'presentation/assets/audio/afterglow.mp3':'presentation/assets/video/marea-session.mp4');
  await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();await next(page);
  await page.getByLabel('Title',{exact:true}).fill(title);await page.getByLabel('Description',{exact:true}).fill('Temporary linked publication');await next(page);
  const selector=page.getByRole('combobox',{name:'Link a project (optional)',exact:true});
  // New project must be available immediately, without refreshing the app.
  await expect(selector.locator(`option[value="${project.id}"]`)).toHaveCount(1);await selector.selectOption(String(project.id));
  if(project.songs.length) {
    const song=page.getByRole('combobox',{name:'Song (optional)',exact:true});
    if(project.songs.length>1)await song.selectOption(String(project.songs[1].id));else await expect(song).toHaveValue(String(project.songs[0].id));
    await selector.selectOption('');await selector.selectOption(String(project.id));
    if(project.songs.length>1){await expect(song).toHaveValue('');await song.selectOption(String(project.songs[1].id));}else await expect(song).toHaveValue(String(project.songs[0].id));
  }
  await expect(page.getByText('Loading songs…',{exact:true})).toHaveCount(0);
  if(!['Single','Video'].includes(project.category))await expect(page.getByRole('combobox',{name:'Song (optional)',exact:true})).toBeEnabled();
  await next(page);await expect(page.getByRole('heading',{name:'Review',exact:true})).toBeVisible();await expect(page.locator('.creation-summary')).toContainText(project.title);
  await page.getByRole('button',{name:'Back',exact:true}).click();await expect(selector).toHaveValue(String(project.id));
  if(project.songs.length)await expect(page.getByRole('combobox',{name:'Song (optional)',exact:true})).toHaveValue(String((project.songs[1]??project.songs[0]).id));
  await next(page);
}
async function ownPost(page:Page,title:string) {
 const items=(await call(page,'/api/publications?mine=1')).items;
 expect(items.filter((p:any)=>p.title===title)).toHaveLength(1);return items.find((p:any)=>p.title===title);
}
test.beforeEach(async({page})=>{await call(page,'/api/presentation/reset',{confirm:true});});
test.use({actionTimeout:15000});
for(const category of ['Album','EP','Single','Video','Tour'])test(`${category}: create project then link and publish audio and video`,async({page,browser},info)=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const project=await createProject(page,category,`Link audit ${category}`);
 expect(project.status).toBe('published');expect(project.songs).toHaveLength(['Album','EP'].includes(category)?2:category==='Tour'?0:1);
 const guest=await browser.newContext({baseURL:'http://127.0.0.1:4177'});
 try {
 for(const kind of ['audio','video'] as const) {
  const title=`${category} linked ${kind}`;await fillPost(page,kind,title,project);
  if(kind==='audio') {
    await page.getByRole('button',{name:'Save & exit',exact:true}).click();await expect(page).toHaveURL(/\/studio$/);
    const draft=await ownPost(page,title);expect(draft.status).toBe('draft');expect(draft.projectId).toBe(project.id);
    expect((await guest.request.get(`/api/publications/${draft.id}`)).status()).toBe(404);
    expect((await guest.request.get(draft.media.url)).status()).toBe(404);
    await page.getByRole('article',{name:`${title} publication`,exact:true}).getByRole('link',{name:'Edit publication',exact:true}).click();
    await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();await next(page);await next(page);
    await expect(page.getByRole('combobox',{name:'Link a project (optional)',exact:true})).toHaveValue(String(project.id));
    if(project.songs.length)await expect(page.getByRole('combobox',{name:'Song (optional)',exact:true})).toHaveValue(String((project.songs[1]??project.songs[0]).id));await next(page);
  }
  await page.getByRole('button',{name:'Publish',exact:true}).click();await expect(page).toHaveURL(/\/studio$/);
  const post=await ownPost(page,title);expect(post.status).toBe('published');expect(post.projectId).toBe(project.id);expect(post.workId??null).toBe((project.songs[1]??project.songs[0])?.id??null);expect(post.media.kind).toBe(kind);
  const published=await guest.request.get(`/api/publications/${post.id}`);expect(published.status()).toBe(200);expect((await published.json()).project.id).toBe(project.id);
  expect((await guest.request.get(post.media.url)).status()).toBe(200);
  const card=page.getByRole('article',{name:`${title} publication`,exact:true});await expect(card).toContainText(project.title);
  await card.getByRole('link',{name:'View in Discovery',exact:true}).click();
  const active=page.locator('article[data-active=true]');await expect(active).toContainText(title);
  const media=active.locator(kind);await media.evaluate(async(m:HTMLMediaElement)=>{await m.play();});await expect.poll(()=>media.evaluate((m:HTMLMediaElement)=>m.currentTime)).toBeGreaterThan(0);
  await active.getByRole('button',{name:new RegExp(`${project.title}.*view project`)}).click();
  await page.getByRole('link',{name:'Open full project',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/project/${project.id}${project.songs.length?`\\?song=${(project.songs[1]??project.songs[0]).id}`:''}$`));
  await expect(page.getByRole('heading',{name:project.title,exact:true})).toBeVisible();
  if(project.songs.length){const discoveryLink=page.locator(`a[href="/discovery?post=post-${post.id}"]`).first(),expand=page.getByRole('article',{name:title,exact:true}).getByRole('button').first();await expect.poll(async()=>await discoveryLink.isVisible()||await expand.isVisible()).toBe(true);if(!await discoveryLink.isVisible())await expand.click();await expect(discoveryLink).toBeVisible();if(kind==='video'){const version=page.getByRole('article',{name:title,exact:true});if(await version.isVisible()){if(await version.getByRole('button').first().getAttribute('aria-expanded')==='false')await version.getByRole('button').first().click();await expect(version.locator('video')).toBeVisible();}}}
  await page.goBack();await expect(active).toContainText(title);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`${category}-${kind}-discovery.png`),animations:'disabled'});
 }
 expect(errors).toEqual([]);
 }finally{await guest.close();}
});

test('a public post keeps its linked draft project private until the project is published',async({page,browser})=>{
 test.setTimeout(90000);const project=await createProject(page,'EP','Private link audit',true);await fillPost(page,'audio','Public linked audio',project);await page.getByRole('button',{name:'Publish',exact:true}).click();await expect(page).toHaveURL(/\/studio$/);const post=await ownPost(page,'Public linked audio');expect(post.status).toBe('published');expect(post.projectId).toBe(project.id);
 const guest=await browser.newContext({baseURL:'http://127.0.0.1:4177'});try{
  const visible=await guest.request.get(`/api/publications/${post.id}`);expect(visible.status()).toBe(200);expect((await visible.json()).project).toBeNull();expect((await guest.request.get(post.media.url)).status()).toBe(200);
  await page.goto('/profile');await page.getByRole('button',{name:`edit ${project.title}`,exact:true}).click();await next(page);await next(page);await next(page);await page.getByLabel('STATUS',{exact:true}).selectOption('published');await page.getByRole('button',{name:'Save project',exact:true}).click();await expect(page).toHaveURL(/\/profile$/);
  const saved=await ownPost(page,'Public linked audio');expect(saved.id).toBe(post.id);expect(saved.media.id).toBe(post.media.id);expect((await(await guest.request.get(`/api/publications/${post.id}`)).json()).project.id).toBe(project.id);
 }finally{await guest.close();}
});
