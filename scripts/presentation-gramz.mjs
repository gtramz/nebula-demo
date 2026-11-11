import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { follows } from '../dist-server/server/follows.js';
import { notifications } from '../dist-server/server/notifications.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const setting=(db,key)=>{const row=db.prepare('SELECT value FROM presentation_settings WHERE key=?').get(key);return row?JSON.parse(row.value):null;};
const uuid=key=>{const h=hash(key);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const imageData=path=>`data:image/jpeg;base64,${readFileSync(join(root,'artifacts/nebula/public',path)).toString('base64')}`;
/** Explicit additive import on a backed-up, stopped presentation database. No implicit reset or credentials changes. */
export function installGramzCatalog(db,{mediaDirectory,reference=JSON.parse(readFileSync(join(root,'presentation/gramz-catalog.json'),'utf8'))}={}){
 const previous=setting(db,'gramz-import');if(previous)return {changed:false,...previous};
 const luna=setting(db,'luna-example'),legacy=setting(db,'artist-catalog'),scenario=setting(db,'scenario');
 if(!luna||!legacy||!scenario)throw new Error('Install CHILZ and the existing LUNA example first.');
 const state=JSON.parse(db.prepare('SELECT value FROM state WHERE id=1').get().value);
 const mapped=luna.accounts.find(a=>a.name==='gramz'),account=state.accounts.find(a=>a.id===mapped?.id&&a.email==='gramz.demo@nebula.local'&&a.role==='artist'),artist=state.artists.find(a=>a.id===account?.id);
 if(!account||!artist||!state.accounts.some(a=>a.id===legacy.artistId&&a.role==='artist'))throw new Error('Existing gramz and CHILZ identities must match their mappings.');
 if(reference.version!==1||reference.releases.some(r=>/\bluna\b/i.test(r.title))||reference.clips.some(c=>/\bluna\b/i.test(c.sourceTitle)))throw new Error('Invalid reference or excluded LUNA content.');
 const catalogKey=`artist-catalog:${artist.id}`;if(setting(db,catalogKey))throw new Error('Catalog already exists without import receipt.');
 const media=reference.clips.flatMap(clip=>[['video',clip.media,'video/mp4'],['image',clip.cover,'image/jpeg']].map(([kind,asset,mime])=>({id:uuid(`gramz:${clip.sourcePlatform}:${clip.sourceId}:${kind}`),path:asset.path,sha256:asset.sha256,size:asset.size,kind,mime,source:clip.source})));
 for(const asset of [reference.picture,...reference.releases.map(r=>r.artwork)])if(hash(readFileSync(join(root,'artifacts/nebula/public',asset.path)))!==asset.sha256)throw new Error('Catalog image checksum mismatch.');
 for(const asset of media)if(hash(readFileSync(join(root,asset.path)))!==asset.sha256)throw new Error('Clip checksum mismatch.');
 const resolveArtist=id=>state.artists.find(a=>a.id===id&&state.accounts.some(account=>account.id===id&&account.role==='artist'));
 const graph=follows(db,resolveArtist),alerts=notifications(db,resolveArtist),copied=[];
 db.exec('BEGIN IMMEDIATE');
 try{
  const now=new Date().toISOString();
  artist.picture=imageData(reference.picture.path);
  const links=[{label:'Spotify',url:reference.source},{label:'YouTube',url:'https://www.youtube.com/@dongramzz'},{label:'TikTok',url:'https://www.tiktok.com/@dongramzz'},{label:'SyncUp Team · releases',url:'https://music.youtube.com/@syncupteam'}];
  artist.externalLinks=[...links,...(artist.externalLinks??[]).filter(link=>!links.some(v=>v.url===link.url))].slice(0,6);
  state.nextId=Math.max(state.nextId,...state.accounts.map(a=>a.id+1),...state.projects.map(p=>p.id+1));
  const catalog={version:1,artistId:artist.id,artistName:artist.name,source:reference.source,picture:reference.picture.path,releases:[]};
  const bySource=new Map();
  for(const release of reference.releases){
   const marker=`${release.sourcePlatform}:${release.sourceId}`;
   if(state.projects.some(p=>p.presentationCatalogId===marker))throw new Error('Release exists without import mapping: '+marker);
   const projectId=state.nextId++,artists=release.tracks.map(t=>t.artists).join('; ');
   state.projects.push({id:projectId,artistId:artist.id,title:release.title,category:release.type,pitch:`${release.formatLabel??release.type} · ${release.year}${release.dateKind==='upload'?' upload':''}${['No Pop','No Regrets'].includes(release.title)?' · Demo opportunity':''}`,story:`${release.title} · ${artists}. ${release.dateKind==='upload'?'Official audio published on YouTube; the year refers to that upload.':'Verified Spotify release.'} Catalog playback is a silent visual preview.`,coverUrl:imageData(release.artwork.path),presentationCatalogId:marker,status:'published',currency:'USD',goalAmount:0,useOfFunds:[],createdAt:now});
   const tracks=release.tracks.map((track,position)=>{const workId=Number(db.prepare('INSERT INTO works(owner,title,description,created,updated) VALUES(?,?,?,?,?)').run(artist.id,track.title,track.artists,now,now).lastInsertRowid);db.prepare('INSERT INTO project_works(project,work,position) VALUES(?,?,?)').run(projectId,workId,position);return {...track,workId};});
   db.prepare('INSERT INTO project_tracklists(project,revision) VALUES(?,1)').run(projectId);
   const {artwork,...rest}=release;const record={...rest,projectId,coverUrl:artwork.path,tracks};catalog.releases.push(record);bySource.set(release.sourceId,record);
  }
  const offerIds=[];
  for(const spec of [{title:'No Pop',need:'Feature',deliverable:'Demo opportunity · a featured vocal contribution',compensation:{kind:'split',percent:10}},{title:'No Regrets',need:'Mix',deliverable:'Demo opportunity · a completed stereo mix',compensation:{kind:'fee',amount:150,currency:'USD'}}]){
   const release=catalog.releases.find(r=>r.title===spec.title);if(!release)throw new Error('Required demo opportunity release missing.');
   const data={need:spec.need,deliverable:spec.deliverable,requirements:'Demo opportunity for testing the collaboration flow only. These are fictional presentation terms, not an actual commission or royalty agreement. Catalog audio is not supplied; upload a test contribution to try the proposal flow.',deadline:null,status:'open',compensation:spec.compensation,workId:release.tracks[0].workId,workTitle:release.tracks[0].title,referenceMediaId:null};
   offerIds.push(Number(db.prepare('INSERT INTO collaboration_offers(project,owner,title,data,created) VALUES(?,?,?,?,?)').run(release.projectId,artist.id,release.title,JSON.stringify(data),now).lastInsertRowid));
  }
  for(const asset of media){
   if(db.prepare('SELECT id FROM media WHERE id=?').get(asset.id))throw new Error('Media ID collision; no existing media will be replaced.');
   db.prepare('INSERT INTO media(id,owner,kind,mime,size,created,name) VALUES(?,?,?,?,?,?,?)').run(asset.id,artist.id,asset.kind,asset.mime,asset.size,Date.now(),asset.path.split('/').at(-1));
   if(mediaDirectory){mkdirSync(mediaDirectory,{recursive:true});const dest=join(mediaDirectory,asset.id);if(existsSync(dest)){if(hash(readFileSync(dest))!==asset.sha256)throw new Error('Media destination collision.');}else{copyFileSync(join(root,asset.path),dest,constants.COPYFILE_EXCL);copied.push(dest);}}
  }
  const posts=reference.clips.map(clip=>{
   const release=clip.projectSourceId?bySource.get(clip.projectSourceId):null;if(clip.projectSourceId&&!release)throw new Error('Clip project mapping missing.');
   const data={title:clip.title,description:`${clip.sourceTitle.trim()}\nOriginally posted by gramz on ${clip.sourcePlatform==='youtube'?'YouTube':'TikTok'}.`,mediaId:uuid(`gramz:${clip.sourcePlatform}:${clip.sourceId}:video`),coverId:uuid(`gramz:${clip.sourcePlatform}:${clip.sourceId}:image`),projectId:release?.projectId??null,workId:release?.tracks[0].workId??null,allowRemix:false,status:'published',remix:null};
   const id=Number(db.prepare('INSERT INTO posts(owner,data,created,updated) VALUES(?,?,?,?)').run(artist.id,JSON.stringify(data),now,now).lastInsertRowid);return {id,source:clip.source,sourceId:clip.sourceId,projectId:data.projectId,mediaId:data.mediaId,coverId:data.coverId};
  });
  for(const [from,to] of [[artist.id,legacy.artistId],[legacy.artistId,artist.id]]){const change=graph.change(from,to,true);if(change.event)alerts.recordFollow(change.event);}
  const a=Math.min(artist.id,legacy.artistId),b=Math.max(artist.id,legacy.artistId);let chat=db.prepare('SELECT id,admission FROM artist_conversations WHERE pair_a=? AND pair_b=?').get(a,b);
  if(chat&&chat.admission!=='accepted')throw new Error('An existing unaccepted conversation requires explicit review; it was not replaced.');
  if(!chat){chat={id:Number(db.prepare("INSERT INTO artist_conversations(sender,recipient,pair_a,pair_b,admission,created,updated) VALUES(?,?,?,?,'accepted',?,?)").run(artist.id,legacy.artistId,a,b,now,now).lastInsertRowid)};}
  scenario.personas=(scenario.personas??[]).map(p=>p.id===artist.id?{...p,picture:artist.picture}:p);
  const receipt={version:1,artistId:artist.id,referenceSha256:hash(JSON.stringify(reference)),catalog,posts,offerIds,contactId:chat.id,media};
  db.prepare('UPDATE state SET value=? WHERE id=1').run(JSON.stringify(state));db.prepare("UPDATE presentation_settings SET value=? WHERE key='scenario'").run(JSON.stringify(scenario));
  db.prepare('INSERT INTO presentation_settings(key,value) VALUES(?,?)').run(catalogKey,JSON.stringify(catalog));db.prepare("INSERT INTO presentation_settings(key,value) VALUES('gramz-import',?)").run(JSON.stringify(receipt));
  db.exec('COMMIT');return {changed:true,...receipt};
 }catch(error){db.exec('ROLLBACK');for(const path of copied)unlinkSync(path);throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const path=process.argv[2];if(!path)throw new Error('Pass the backed-up database path explicitly.');const at=process.argv.indexOf('--media-directory');if(at>=0&&!process.argv[at+1])throw new Error('Missing media directory.');const db=new DatabaseSync(resolve(path));try{const r=installGramzCatalog(db,{mediaDirectory:at>=0?resolve(process.argv[at+1]):undefined});console.log(JSON.stringify({changed:r.changed,artistId:r.artistId,projects:r.catalog.releases.length,posts:r.posts.length,contactId:r.contactId}));}finally{db.close();}
}
