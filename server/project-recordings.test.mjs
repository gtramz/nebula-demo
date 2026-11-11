import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fixture} from './test-fixtures.mjs';
const op=x=>({...x,operationId:randomUUID()});
async function json(r,status=200){assert.equal(r.status,status,await r.clone().text());return r.json();}
async function setup(t){const app=await fixture(t),a=app.client(),b=app.client(),guest=app.client();await a.register('RecordingArtist');await b.register('OtherArtist');return{app,a,b,guest};}
async function media(a){return json(await a.upload(),201);}
const rec=m=>({id:randomUUID(),mediaId:m.id});
const song=(title,recordings=[])=>({title,description:'',recordings});
async function create(a,extra={}){return (await json(await a.rpc('createProject',op({title:'Recording project',category:'EP',status:'draft',goalAmount:0,songs:[],...extra})))).result;}
async function tracks(a,p){return json(await a.request(`/api/projects/${p.id}/songs`));}
const entries=t=>t.songs.map(s=>({workId:s.id,revision:s.revision,title:s.title,description:s.description,recordings:s.recordings}));
async function post(a,m,extra={}){return json(await a.request('/api/publications','POST',op({title:'Track post',description:'',mediaId:m.id,coverId:null,allowRemix:false,status:'published',projectId:null,...extra})),201);}

test('recordings: Single cardinality, draft-only empty projects, audio funding reference and rollback',async t=>{
 const {a}=await setup(t),m=await media(a),r=rec(m);
 for(const category of ['Single','EP','Album','Video']){
  assert.equal((await a.rpc('createProject',op({title:'Empty release',category,status:'published',goalAmount:0,songs:[]}))).status,400);
  await create(a,{category});
 }
 const input=op({title:'One track',category:'Single',status:'published',goalAmount:0,songs:[song('Only',[r])],primaryRecordingId:r.id});
 const p=(await json(await a.rpc('createProject',input))).result;assert.equal((await json(await a.rpc('createProject',input))).result.id,p.id);
 assert.equal((await a.rpc('createProject',op({...input,songs:[song('First',[r]),song('Second')]}))).status,400);
 assert.equal((await tracks(a,p)).songs.length,1);
 const v=await create(a,{category:'Video',goalAmount:1000,status:'funding',songs:[song('Demo',[rec(m)])]});assert.equal(v.category,'Video');
 const video=await json(await a.upload(await readFile(new URL('../presentation/assets/video/marea-session.mp4',import.meta.url)),'video'),201);
 assert.equal((await a.rpc('createProject',op({title:'Video-only funding',category:'Video',goalAmount:1000,status:'funding',songs:[song('Needs an audio demo',[rec(video)])]}))).status,400);
 await create(a,{title:'Finished video',category:'Video',goalAmount:0,status:'published',songs:[song('Finished',[rec(video)])]});
 const draft=await create(a);assert.equal((await a.rpc('updateProject',draft.id,{status:'published'})).status,400);
 assert.equal((await json(await a.rpc('getProject',draft.id))).result.project.status,'draft');
});

test('recordings: principal survives ordering, media permissions, no automatic posts, and atomic retries',async t=>{
 const {a,guest,app}=await setup(t),m1=await media(a),m2=await media(a),r1=rec(m1),r2=rec(m2);
 const p=await create(a,{goalAmount:500,status:'funding',songs:[song('First',[r1]),song('Principal',[r2])],primaryRecordingId:r2.id});
 assert.equal((await json(await a.request('/api/publications?mine=1'))).items.length,0);
 assert.equal((await guest.request(`/media/${m2.id}`)).status,200);
 assert.equal((await a.request(`/api/uploads/${m2.id}`,'DELETE')).status,409);
 assert.ok(!(await json(await a.request('/api/uploads'))).some(m=>m.id===m2.id));
 const home=()=>guest.request('/api/opportunities/projects').then(r=>r.json()).then(data=>data.items.find(i=>i.project.id===p.id));
 assert.equal((await home()).preview.media.id,m2.id);
 const old=await tracks(a,p), input=op({revision:old.revision,songs:entries(old).reverse(),primaryRecordingId:r2.id});
 const saved=await json(await a.request(`/api/projects/${p.id}/songs`,'PUT',input));
 assert.deepEqual(await json(await a.request(`/api/projects/${p.id}/songs`,'PUT',input)),saved);
 assert.equal((await home()).preview.media.id,m2.id);
 assert.equal((await a.request(`/api/projects/${p.id}/songs`,'PUT',op({...input}))).status,409);
 const update=op({pitch:'Saved once',expected:p,tracklist:{revision:saved.revision,songs:entries(saved),primaryRecordingId:r1.id}});
 await json(await a.rpc('updateProject',p.id,update));await json(await a.rpc('updateProject',p.id,update));assert.equal((await home()).preview.media.id,m1.id);
 await app.restart();assert.equal((await tracks(a,p)).primaryRecordingId,r1.id);
 const privateProject=await create(a,{songs:[song('Private',[rec(await media(a))])]});
 const privateRecording=(await tracks(a,privateProject)).songs[0].recordings[0];assert.equal((await guest.request(`/media/${privateRecording.mediaId}`)).status,404);
});

test('recordings: existing posts link once, keep identities and never move from another project',async t=>{
 const {a,b}=await setup(t),m=await media(a),published=await post(a,m),r={...rec(m),publicationId:published.id,publicationRevision:published.revision};
 const p=await create(a,{songs:[song('Linked',[r])]});
 const linked=await json(await a.request(`/api/publications/${published.id}`));assert.equal(linked.projectId,p.id);assert.equal(linked.id,published.id);
 assert.equal((await json(await a.request('/api/publications?mine=1'))).items.length,1);
 assert.equal((await a.rpc('createProject',op({title:'Move prohibited',category:'EP',status:'draft',goalAmount:0,songs:[song('No',[{...r,id:randomUUID(),publicationRevision:linked.revision}])]}))).status,409);
 assert.equal((await b.rpc('createProject',op({title:'Foreign',category:'EP',status:'draft',goalAmount:0,songs:[song('No',[{...r,id:randomUUID()}])]}))).status,400);
 const current=await tracks(a,p);assert.equal(current.songs[0].recordings[0].publicationRevision,linked.revision);
 await json(await a.rpc('updateProject',p.id,{status:'published'}));
 const after=await json(await a.request(`/api/publications/${published.id}`));assert.equal(after.media.id,m.id);
});

test('recordings: Publish creates song atomically, public post keeps draft project private, errors retry without duplicates',async t=>{
 const {a,guest}=await setup(t),p=await create(a,{category:'Single'}),m=await media(a);
 const input=op({title:'New single',description:'',mediaId:m.id,coverId:null,allowRemix:false,status:'published',projectId:p.id,newSong:{title:'Single song',description:'',tracklistRevision:(await tracks(a,p)).revision}});
 const pub=await json(await a.request('/api/publications','POST',input),201);assert.equal((await json(await a.request('/api/publications','POST',input),201)).id,pub.id);
 const visible=await json(await guest.request(`/api/publications/${pub.id}`));assert.equal(visible.project,null);assert.equal(visible.song,null);
 assert.equal((await tracks(a,p)).songs.length,1);
 assert.equal((await a.request('/api/publications','POST',op({...input,title:'Second song',newSong:{...input.newSong,tracklistRevision:(await tracks(a,p)).revision}}))).status,400);
 await json(await a.rpc('updateProject',p.id,{status:'published'}));
 assert.equal((await json(await guest.request(`/api/publications/${pub.id}`))).project.id,p.id);
});

test('recordings: withdrawn principal stays unavailable, never falls back, and draft posts stay private',async t=>{
 const {a,guest}=await setup(t),m=await media(a),published=await post(a,m),r={...rec(m),publicationId:published.id,publicationRevision:published.revision};
 const p=await create(a,{goalAmount:500,status:'funding',songs:[song('Main',[r]),song('Other',[rec(await media(a))])],primaryRecordingId:r.id});
 const current=await json(await a.request(`/api/publications/${published.id}`));
 await json(await a.request(`/api/publications/${published.id}`,'PATCH',op({...current,status:'withdrawn'})));
 const home=(await json(await guest.request('/api/opportunities/projects'))).items.find(i=>i.project.id===p.id);assert.equal(home.preview,null);assert.equal(home.previewSelection,true);
 assert.equal((await guest.request(`/media/${m.id}`)).status,404);
 const list=await tracks(a,p);assert.equal(list.songs[0].recordings[0].available,false);
 assert.equal((await a.request(`/api/projects/${p.id}/songs`,'PUT',op({revision:list.revision,songs:entries(list),primaryRecordingId:r.id}))).status,400);
 const privatePost=await post(a,await media(a),{status:'draft'});
 assert.equal((await a.rpc('createProject',op({title:'No leak',category:'Single',status:'published',goalAmount:0,songs:[song('Private',[{id:randomUUID(),mediaId:privatePost.media.id,publicationId:privatePost.id,publicationRevision:privatePost.revision}])]}))).status,400);
 assert.equal((await guest.request(`/media/${privatePost.media.id}`)).status,404);
});

test('recordings: category change rolls back, title-only legacy edits remain compatible, and own post search paginates before slicing',async t=>{
 const {a,app}=await setup(t),p=await create(a,{songs:[song('One'),song('Two')]});
 assert.equal((await a.rpc('updateProject',p.id,{category:'Single'})).status,400);
 assert.equal((await json(await a.rpc('getProject',p.id))).result.project.category,'EP');
 await json(await a.rpc('updateProject',p.id,{title:'Renamed without recording'}));
 const m=await media(a);for(let i=0;i<23;i++)await post(a,m,{title:i%2?'Other':`Needle ${i}`});
 const found=await json(await a.request('/api/publications?mine=1&q=Needle'));assert.equal(found.items.length,12);assert.equal(found.nextCursor,null);
 const first=await json(await a.request('/api/publications?mine=1'));assert.equal(first.items.length,20);
 const second=await json(await a.request(`/api/publications?mine=1&before=${first.nextCursor}`));assert.equal(second.items.length,3);
 assert.equal(new Set([...first.items,...second.items].map(p=>p.id)).size,23);
});


test('recordings: unlinking preserves the post and social history, stale edits cannot overwrite withdrawal',async t=>{
 const {a}=await setup(t),m=await media(a),pub=await post(a,m),r={...rec(m),publicationId:pub.id,publicationRevision:pub.revision};
 const p=await create(a,{songs:[song('Linked',[r])]});
 await json(await a.request(`/api/publications/${pub.id}/comments`,'POST',{text:'Keep this comment'}),201);
 const old=await tracks(a,p),linked=await json(await a.request(`/api/publications/${pub.id}`));
 await json(await a.request(`/api/publications/${pub.id}`,'PATCH',op({...linked,description:'Concurrent change'})));
 assert.equal((await a.request(`/api/projects/${p.id}/songs`,'PUT',op({revision:old.revision,songs:entries(old).map(s=>({...s,recordings:[]})),primaryRecordingId:null}))).status,409);
 const fresh=await tracks(a,p);
 await json(await a.request(`/api/projects/${p.id}/songs`,'PUT',op({revision:fresh.revision,songs:entries(fresh).map(s=>({...s,recordings:[]})),primaryRecordingId:null})));
 const independent=await json(await a.request(`/api/publications/${pub.id}`));assert.equal(independent.projectId,null);assert.equal(independent.status,'published');assert.equal(independent.media.id,m.id);assert.equal(independent.social.comments,1);
});
