import{test,expect,type Page}from'@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
async function call(page:Page,path:string,data?:unknown){const r=await page.request.fetch(path,{method:data===undefined?'GET':'POST',headers,data});expect(r.ok(),await r.text()).toBe(true);return r.json();}
test('funding projects have existing songs, real LUNA playback, catalog transports and unchanged attribution',async({page},info)=>{
 await call(page,'/api/presentation/reset',{confirm:true});const scene=await call(page,'/api/presentation');
 const projects=(await call(page,'/api/rpc',{method:'listProjects',args:[]})).result;
 const chilz=projects.find((p:any)=>p.title==='CHILZ · Next chapter'),gramz=projects.find((p:any)=>p.title==='LUNA · Next phase');expect(chilz).toBeTruthy();expect(gramz).toBeTruthy();
 for(const [project,recording,count]of[[chilz,scene.featuredRemix.remix,3],[gramz,scene.featuredRemix.original,1]] as const){
  await page.goto(`/project/${project.id}`);
  await expect(page.getByRole('heading',{name:project.title,exact:true})).toBeVisible();
  const songs=await call(page,`/api/projects/${project.id}/songs`);expect(songs.songs).toHaveLength(count);expect(songs.songs[0].id).toBe(recording.workId);
  const player=page.getByRole('region',{name:`Featured recording: ${recording.title}`,exact:true});await expect(player).toBeVisible();
  await player.getByRole('button',{name:`Play ${recording.title}`,exact:true}).click();const audio=player.locator('audio');
  await expect.poll(()=>audio.evaluate((m:HTMLMediaElement)=>m.currentTime)).toBeGreaterThan(.1);
  expect(await audio.getAttribute('src')).toContain(recording.mediaId);
  await expect(page.getByRole('complementary',{name:'Project funding'})).toBeVisible();
  await expect(page.getByText('No structured songs added yet.',{exact:true})).toHaveCount(0);
  await expect(page.getByText('No public recording shared for this song.',{exact:true})).toHaveCount(0);
  if(project.id===chilz.id){
   const brain=page.getByRole('region',{name:'Track player: Brain',exact:true});await expect(brain).toBeVisible();
   await brain.getByRole('button',{name:'Play: Brain',exact:true}).click();await expect.poll(()=>audio.evaluate((m:HTMLMediaElement)=>m.paused)).toBe(true);
   await expect(brain.getByRole('slider')).not.toHaveValue('0');await brain.getByRole('button',{name:'Pause: Brain',exact:true}).click();
   expect(project.raisedAmount).toBe(2000);
  }
  await page.screenshot({path:info.outputPath(`music-project-${project.id}.png`),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const original=await call(page,`/api/publications/${recording.postId}`);expect(original.projectId).toBe(recording.projectId);expect(original.media.id).toBe(recording.mediaId);
 }
 await page.goto(`/project/${scene.featuredRemix.remix.projectId}`);await expect(page.getByRole('region',{name:'Featured recording: luna - chilz remix',exact:true})).toBeVisible();
});
