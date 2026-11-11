import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync,backup} from 'node:sqlite';
import {join} from 'node:path';
import {fixture} from './test-fixtures.mjs';
const read=async r=>{assert.ok(r.ok,await r.clone().text());return r.json();};
const rpc=async(c,m,...args)=>(await read(await (m==='createProject'?c.recordedProject(args[0]):c.rpc(m,...args)))).result;
test('prepared identity opens once, explicit logout stays out, restore returns configured principal',async t=>{
 const app=await fixture(t,{presentation:true}),owner=app.client();const user=(await owner.register('PreparedArtist')).user;
 await rpc(owner,'updateArtist',{name:'PreparedArtist',bio:'Prepared biography',genreIds:['jazz']});
 const db=new DatabaseSync(join(app.dataDir,'nebula.sqlite'));
 db.prepare("INSERT INTO presentation_settings VALUES('scenario',?)").run(JSON.stringify({version:1,principalId:user.artistId,actors:[],pairs:[]}));
 await backup(db,join(app.dataDir,'initial.sqlite'));
 const fresh=app.client();assert.equal((await read(await fresh.request('/api/session'))).user.artistId,user.artistId);
 await rpc(fresh,'updateArtist',{name:'PreparedArtist',bio:'Edited biography'});await app.restart();
 assert.equal((await read(await fresh.request('/api/session'))).user.artist.bio,'Edited biography');
 await rpc(fresh,'logout');assert.equal((await read(await fresh.request('/api/session'))).user,null);assert.equal((await read(await fresh.request('/api/session'))).user,null);
 await read(await fresh.request('/api/presentation/reset','POST',{confirm:true}));
 let restored=(await read(await fresh.request('/api/session'))).user;assert.equal(restored.artistId,user.artistId);assert.equal(restored.artist.bio,'Prepared biography');
 assert.equal((await read(await owner.request('/api/session'))).user.artistId,user.artistId,'a restore from another client keeps the open browser connected to the prepared artist');
 await read(await fresh.request('/api/presentation/reset','POST',{confirm:true}));assert.equal((await read(await fresh.request('/api/session'))).user.artistId,user.artistId);db.close();
});
test('Home previews expose the exact public recording and remove withdrawn audio',async t=>{
 const app=await fixture(t),owner=app.client();await owner.register('PreviewOwner');
 const p=await rpc(owner,'createProject',{title:'Preview project',category:'single',status:'published',goalAmount:1000});
 // Restore the pre-selection legacy fixture: its Home preview is intentionally inferred.
 const legacy=new DatabaseSync(join(app.dataDir,'nebula.sqlite'));legacy.prepare('DELETE FROM project_recordings WHERE project=?').run(p.id);legacy.prepare('DELETE FROM project_recording_settings WHERE project=?').run(p.id);legacy.close();
 const media=await read(await owner.upload());
 const post=await read(await owner.request('/api/publications','POST',{title:'Actual recording',description:'',mediaId:media.id,coverId:null,projectId:p.id,allowRemix:true,status:'published'}));
 await read(await owner.request(`/api/projects/${p.id}/offers`,'POST',{need:'Mix',deliverable:'Stereo mix',requirements:'Keep the pulse',deadline:null,status:'open',compensation:{kind:'fee',amount:180,currency:'USD'}}));
 const guest=app.client(),page=await read(await guest.request('/api/opportunities/projects'));
 const preview=page.items.find(i=>i.project.id===p.id).preview;assert.equal(preview.media.id,media.id);assert.equal(preview.title,'Actual recording');assert.equal(preview.publicationId,post.id);
 const waveform=await read(await guest.request(`/api/projects/${p.id}/preview/waveform`));assert.equal(waveform.mediaId,media.id);assert.ok(waveform.peaks.some(p=>p>0));
 await read(await owner.request(`/api/publications/${post.id}`,'PATCH',{title:post.title,description:'',mediaId:media.id,coverId:null,projectId:p.id,allowRemix:true,status:'withdrawn',revision:post.revision}));
 assert.equal((await read(await guest.request('/api/opportunities/projects'))).items.find(i=>i.project.id===p.id).preview,null);
 assert.equal((await guest.request(`/api/projects/${p.id}/preview/waveform`)).status,404);
});
test('Discovery uses listening preferences independently of collaboration needs',async t=>{
 const app=await fixture(t,{presentation:true}),jazz=app.client(),house=app.client(),listener=app.client();
 const a=(await jazz.register('JazzArtist')).user,b=(await house.register('HouseArtist')).user;
 for(const [client,genre] of [[jazz,'jazz'],[house,'house']]){await rpc(client,'updateArtist',{name:genre==='jazz'?'JazzArtist':'HouseArtist',genreIds:[genre]});const media=await read(await client.upload());await read(await client.request('/api/publications','POST',{title:genre,description:'',mediaId:media.id,coverId:null,projectId:null,allowRemix:true,status:'published'}));}
 await listener.register('Listener');await rpc(listener,'updateMyArtistPreferences',{discovery:{genreIds:['jazz']},collaboration:{opportunityTypes:['Master']}});
 assert.equal((await read(await listener.request('/api/feed'))).items[0].artistId,a.artistId);
 await rpc(listener,'updateMyArtistPreferences',{discovery:{genreIds:['house']}});
 assert.equal((await read(await listener.request('/api/feed'))).items[0].artistId,b.artistId);
 assert.deepEqual((await rpc(listener,'getMyArtistPreferences')).collaboration.opportunityTypes,['Master']);
});
