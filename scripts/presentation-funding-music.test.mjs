import test from 'node:test';import assert from 'node:assert/strict';import{DatabaseSync}from'node:sqlite';import{copyFile,mkdtemp,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import{installFundingMusic}from'./presentation-funding-music.mjs';
test('project music reuses owned works without changing LUNA, media, posts or contributions; repeat is safe',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nebula-funding-music-'));let db;
 try{
  await copyFile('presentation/seed/scene.sqlite',join(dir,'scene.sqlite'));db=new DatabaseSync(join(dir,'scene.sqlite'));
  const existing=db.prepare("SELECT value FROM presentation_settings WHERE key='funding-music-v1'").get();
  if(existing){const r=JSON.parse(existing.value),s=JSON.parse(db.prepare('SELECT value FROM state WHERE id=1').get().value);s.projects=s.projects.filter(p=>p.id!==r.gramzProjectId);db.prepare('UPDATE state SET value=? WHERE id=1').run(JSON.stringify(s));for(const id of [r.gramzProjectId,r.chilzProjectId]){db.prepare('DELETE FROM project_works WHERE project=?').run(id);db.prepare('DELETE FROM project_tracklists WHERE project=?').run(id);}db.prepare("DELETE FROM presentation_settings WHERE key='funding-music-v1'").run();}
  const before=JSON.parse(db.prepare('SELECT value FROM state WHERE id=1').get().value);
  const stable=['works','posts','media','collaboration_offers','collaborations','artist_follows'];const snapshots=stable.map(t=>JSON.stringify(db.prepare(`SELECT * FROM ${t}`).all()));
  const result=installFundingMusic(db),after=JSON.parse(db.prepare('SELECT value FROM state WHERE id=1').get().value);
  assert.equal(result.changed,true);assert.deepEqual(after.projects.slice(0,before.projects.length),before.projects);
  for(const key of Object.keys(before).filter(k=>!['projects','nextId'].includes(k)))assert.deepEqual(after[key],before[key]);
  stable.forEach((t,i)=>assert.equal(JSON.stringify(db.prepare(`SELECT * FROM ${t}`).all()),snapshots[i]));
  for(const [id,ids]of[[result.chilzProjectId,result.chilzWorkIds],[result.gramzProjectId,[result.gramzWorkId]]])assert.deepEqual(db.prepare('SELECT work FROM project_works WHERE project=? ORDER BY position').all(id).map(r=>r.work),ids);
  const saved=db.prepare('SELECT value FROM state WHERE id=1').get().value;assert.equal(installFundingMusic(db).changed,false);assert.equal(db.prepare('SELECT value FROM state WHERE id=1').get().value,saved);
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});
