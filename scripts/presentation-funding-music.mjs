import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const key='funding-music-v1';
export function installFundingMusic(db) {
 db.exec('BEGIN IMMEDIATE');
 try {
  const setting=name=>{const r=db.prepare('SELECT value FROM presentation_settings WHERE key=?').get(name);return r?JSON.parse(r.value):null;};
  const previous=setting(key);if(previous){db.exec('COMMIT');return {changed:false,...previous};}
  const luna=setting('luna-example'),funding=setting('chilz-funding-v1'),catalog=setting('artist-catalog');
  if(!luna||!funding||!catalog)throw new Error('Install mapped LUNA, CHILZ and funding first.');
  const state=JSON.parse(db.prepare('SELECT value FROM state WHERE id=1').get().value);
  const chilz=state.projects.find(p=>p.id===funding.projectId&&p.artistId===catalog.artistId);
  const gramz=state.accounts.find(a=>a.id===luna.original.artistIds[0]&&a.role==='artist'&&a.email==='gramz.demo@nebula.local');
  const original=state.projects.find(p=>p.id===luna.original.projectId&&p.artistId===gramz?.id);
  if(!chilz||!gramz||!original)throw new Error('Mapped owners or projects unavailable.');
  state.nextId=Math.max(state.nextId,...[...state.accounts,...state.projects,...state.investments].map(item=>item.id+1));
  const gramzProject={id:state.nextId++,artistId:gramz.id,title:'LUNA · Next phase',category:'EP',
   pitch:'luna · gramz & SANNFERNNA',story:'A new chapter around luna. Recording, sound and visual direction.',coverUrl:original.coverUrl,
   status:'funding',currency:'USD',goalAmount:3000,useOfFunds:[{label:'Production',percentage:60},{label:'Visuals',percentage:40}],createdAt:new Date().toISOString()};
  state.projects.push(gramzProject);
  const tracks=[luna.remix.workId,...catalog.releases.slice(0,2).map(release=>release.tracks[0].workId)];
  function attach(project,workIds){
   let added=0;
   let position=Number(db.prepare('SELECT COALESCE(MAX(position),-1) AS n FROM project_works WHERE project=?').get(project.id).n)+1;
   for(const workId of workIds){
    const work=db.prepare('SELECT owner FROM works WHERE id=?').get(workId);
    if(work?.owner!==project.artistId)throw new Error('Only the artist’s existing songs may be included.');
    if(!db.prepare('SELECT 1 FROM project_works WHERE project=? AND work=?').get(project.id,workId)){db.prepare('INSERT INTO project_works(project,work,position) VALUES(?,?,?)').run(project.id,workId,position++);added++;}
   }
   if(added)db.prepare('INSERT INTO project_tracklists(project,revision) VALUES(?,1) ON CONFLICT(project) DO UPDATE SET revision=revision+1').run(project.id);
  }
  attach(chilz,tracks);attach(gramzProject,[luna.original.workId]);
  const receipt={version:1,chilzProjectId:chilz.id,chilzWorkIds:tracks,gramzProjectId:gramzProject.id,gramzWorkId:luna.original.workId};
  db.prepare('UPDATE state SET value=? WHERE id=1').run(JSON.stringify(state));db.prepare('INSERT INTO presentation_settings(key,value) VALUES(?,?)').run(key,JSON.stringify(receipt));
  db.exec('COMMIT');return {changed:true,...receipt};
 } catch(error){db.exec('ROLLBACK');throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(!process.argv[2])throw new Error('Pass a backed-up, stopped presentation database.');
 const db=new DatabaseSync(resolve(process.argv[2]));try{console.log(JSON.stringify(installFundingMusic(db)));}finally{db.close();}
}
