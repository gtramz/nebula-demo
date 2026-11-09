/** Add the two audiovisual examples to an isolated copy, preserving the current scene. */
import { DatabaseSync, backup } from 'node:sqlite';
import { cp, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createNebulaServer } from '../dist-server/server/app.js';
const dir=resolve('.data/presentation-closing-stage'),assets=resolve('presentation/assets');
const sets=JSON.parse(await readFile(join(assets,'audiovisual-sets.json'),'utf8')).sets;
if(sets.some(s=>!s.ready))throw new Error('Both native performances must be complete before staging.');
await mkdir(dir,{recursive:true});
if(!existsSync(join(dir,'nebula.sqlite'))){
 const live=new DatabaseSync(resolve('.data/presentation/nebula.sqlite'));await backup(live,join(dir,'nebula.sqlite'));live.close();
 await copyFile(join(dir,'nebula.sqlite'),join(dir,'base.sqlite'));
 await cp('.data/presentation/media',join(dir,'media'),{recursive:true});await cp('.data/presentation/prepared',join(dir,'prepared'),{recursive:true});
 await copyFile('.data/presentation/initial.sqlite',join(dir,'initial.sqlite'));
}
const db=new DatabaseSync(join(dir,'nebula.sqlite'));
if(db.prepare("SELECT 1 FROM presentation_settings WHERE key='audiovisual-close'").get()){console.log('Audiovisual scene already staged.');db.close();process.exit(0);}
const server=await createNebulaServer({dataDir:dir,publicDir:resolve('artifacts/nebula/dist/public'),presentation:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
function client(){let cookie='';return{async call(path,method='GET',input,extra={}){const r=await fetch(origin+path,{method,headers:{Origin:origin,'X-Nebula-Request':'1',Cookie:cookie,...(input&&!Buffer.isBuffer(input)?{'Content-Type':'application/json'}:{}),...extra},body:input===undefined?undefined:Buffer.isBuffer(input)?input:JSON.stringify(input)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const d=await r.json();if(!r.ok)throw new Error(`${path} ${r.status}: ${JSON.stringify(d)}`);return d;},async upload(path,kind){return this.call('/api/uploads','POST',await readFile(path),{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(basename(path)),'X-Media-Kind':kind});},async rpc(method,...args){return(await this.call('/api/rpc','POST',{method,args})).result;}};}
const scene=JSON.parse(db.prepare("SELECT value FROM presentation_settings WHERE key='scenario'").get().value),mapping=[];
try{
 for(const s of sets){
  const owner=client(),contributor=client();await owner.call('/api/presentation/switch','POST',{accountId:s.owner});await contributor.call('/api/presentation/switch','POST',{accountId:s.contributor});
  const original=await owner.upload(join(assets,s.original),s.sourceKind),take=await contributor.upload(join(assets,s.contribution),'video'),result=await contributor.upload(join(assets,s.result),'video');
  const cover=await owner.upload(join(assets,s.key==='marea-voice'?'covers/marea.jpg':'covers/afterglow.jpg'),'image');
  const source=await owner.call('/api/publications','POST',{title:s.title,description:s.need==='Verse'?'A short live instrumental, with room for your verse. Open the song to hear the brief and add a prepared vocal take.':'The opening rhythm of Afterglow. Add a percussion performance and shape the next version.',mediaId:original.id,coverId:cover.id,projectId:s.project,workId:s.work,allowRemix:true,status:'published'});
  const offerInput={workId:s.work,referenceMediaId:original.id,need:s.need,deliverable:s.need==='Verse'?'A filmed vocal verse over this studio instrumental fragment':'A filmed percussion groove over the ten-second rhythm sketch',requirements:'Keep the original audible. Send a mixed video preview and a short note. One revision; shared credit. Prepared performances are available in the studio.',deadline:null,status:'open',compensation:s.need==='Verse'?{kind:'split',percent:15}:{kind:'fee',amount:300,currency:'USD'}};
  const past=await owner.call(`/api/projects/${s.project}/offers`,'POST',offerInput);
  const thread=await contributor.call(`/api/offers/${past.id}/conversations`,'POST',{operationId:randomUUID(),introduction:s.need==='Verse'?'I wrote a verse around the pulse of your studio take.':'I kept the rhythm sparse so the song has room to breathe.',text:'The video contains my performance mixed with your reference.',offerRevision:past.revision,acceptTerms:true,mediaId:result.id});
  let detail=await owner.call(`/api/collaborations/${thread.id}`);await owner.call(`/api/collaborations/${thread.id}`,'PATCH',{operationId:randomUUID(),action:'accept',revision:detail.revision,offerRevision:detail.currentOffer.revision,submissionId:detail.submissions.at(-1).id});
  detail=await contributor.call(`/api/collaborations/${thread.id}`);await contributor.call(`/api/collaborations/${thread.id}`,'PATCH',{operationId:randomUUID(),action:'deliver',revision:detail.revision,mediaId:result.id,text:'The finished performance, preserving the original recording.'});
  detail=await owner.call(`/api/collaborations/${thread.id}`);await owner.call(`/api/collaborations/${thread.id}`,'PATCH',{operationId:randomUUID(),action:'complete',revision:detail.revision});
  await owner.call(`/api/collaborations/${thread.id}/messages`,'POST',{operationId:randomUUID(),text:'Approved. Let’s share this version with both credits.'});
  const resultCover=await contributor.upload(join(assets,`video/${s.key}-cover.jpg`),'image');
  const published=await contributor.call('/api/publications','POST',{title:s.resultTitle,description:`Created with ${source.artistName} for ${source.project.title} · ${source.song.title}. Compare the original and our finished performance below.`,mediaId:result.id,coverId:resultCover.id,projectId:null,allowRemix:false,status:'published'});
  // Authorized fictional collaboration fixture. New user remixes still follow private draft rules.
  const raw=JSON.parse(db.prepare('SELECT data FROM posts WHERE id=?').get(published.id).data);
  raw.remix={sourceId:source.id,sourceRevision:source.revision,startSeconds:0,endSeconds:s.durationSeconds,baseGain:s.baseGain,voiceGain:s.contributionGain,voiceOffset:0,contributionKind:'video',artistId:s.owner,artistName:source.artistName,title:source.title,projectId:s.project,grantedAt:new Date().toISOString(),sourceMediaId:original.id};
  db.prepare('UPDATE posts SET data=? WHERE id=?').run(JSON.stringify(raw),published.id);
  const liveOffer=await owner.call(`/api/projects/${s.project}/offers`,'POST',offerInput);
  await copyFile(join(assets,s.contribution),join(dir,'prepared',basename(s.contribution)));
  scene.pairs.push({sourceId:source.id,resultId:published.id,offerId:liveOffer.id,contributionPath:basename(s.contribution),contributionKind:'video',title:s.need==='Verse'?'Dante · vocal verse':'Inés · percussion groove',startSeconds:0,endSeconds:s.durationSeconds,baseGain:s.baseGain,contributionGain:s.contributionGain});
  mapping.push({...s,sourceId:source.id,resultId:published.id,offerId:liveOffer.id,pastThreadId:thread.id});
 }
 const sol=client();await sol.call('/api/presentation/switch','POST',{accountId:19});
 const session=await sol.call('/api/session');
 if(!session.user.artist.genreIds?.length)await sol.rpc('updateArtist',{name:session.user.artist.name,genreIds:['rnb','electronic'],genre:'R&B / Electronic'});
 await sol.call(`/api/publications/${mapping[1].resultId}/save`,'PUT',{enabled:true});
 // A musical request received by the principal, using the exact linked ten-second reference.
 const ref=await sol.upload(join(assets,sets[1].original),'audio');
 const incomingOffer=await sol.call('/api/projects/20/offers','POST',{workId:10,referenceMediaId:ref.id,need:'Production',deliverable:'Percussion for the shared Afterglow reference sketch',requirements:'Reference shared by Lía Soren for this arrangement. Keep the original part and add a sparse percussion performance.',deadline:null,status:'open',compensation:{kind:'fee',amount:300,currency:'USD'}});
 const ines=client();await ines.call('/api/presentation/switch','POST',{accountId:5});const result=await ines.upload(join(assets,sets[1].result),'video');
 const incoming=await ines.call(`/api/offers/${incomingOffer.id}/conversations`,'POST',{operationId:randomUUID(),introduction:'I built a percussion part around the shared reference for your arrangement.',text:'Hear the original alongside the new woodblock and shaker part.',offerRevision:incomingOffer.revision,acceptTerms:true,mediaId:result.id});
 scene.principalId=19;db.prepare("UPDATE presentation_settings SET value=? WHERE key='scenario'").run(JSON.stringify(scene));
 db.prepare("UPDATE presentation_settings SET value='guided' WHERE key='mode'").run();
 const report={sets:mapping,incomingThreadId:incoming.id,incomingOfferId:incomingOffer.id,principalId:19};
 db.prepare("INSERT INTO presentation_settings VALUES('audiovisual-close',?)").run(JSON.stringify(report));
 await writeFile(join(dir,'closing-scene.json'),JSON.stringify(report,null,2));await writeFile('presentation/closing-scene.json',JSON.stringify(report,null,2));
 db.exec('DELETE FROM rate_limits; DELETE FROM feed_snapshots;');
 console.log(JSON.stringify(report,null,2));
}finally{await new Promise(r=>{server.close(r);server.closeAllConnections();});db.close();}
const final=new DatabaseSync(join(dir,'nebula.sqlite'));await backup(final,join(dir,'initial.sqlite'));final.close();
const initial=new DatabaseSync(join(dir,'initial.sqlite'));initial.exec('DELETE FROM sessions; DELETE FROM rate_limits; DELETE FROM feed_snapshots;');initial.close();
