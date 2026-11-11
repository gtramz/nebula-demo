import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {fixture} from './test-fixtures.mjs';
const postInput = (media, extra = {}) => ({ title: 'A real sound', description: 'Original publication', mediaId: media.id, coverId: null, projectId: null, allowRemix: false, status: 'draft', ...extra });


import { follows } from '../dist-server/server/follows.js';

test('follow graph is idempotent, bounded, indexed and emits only actual insertions', () => {
 const db=new DatabaseSync(':memory:');
 const graph=follows(db,id=>id<=30?{id,name:`Artist ${id}`,picture:null,email:'NEVER_PUBLIC'}:undefined);
 assert.throws(()=>graph.change(1,1,true));assert.throws(()=>graph.change(1,99,true));
 const first=graph.change(1,2,true);assert.equal(first.event.type,'artist.followed');assert.equal(graph.change(1,2,true).event,null);
 for(let i=3;i<=30;i++)graph.change(1,i,true);
 const page=graph.list(1,'following',1,Number.MAX_SAFE_INTEGER);assert.equal(page.items.length,24);assert.ok(page.nextCursor);
 const next=graph.list(1,'following',1,page.nextCursor);assert.equal(next.items.length,5);assert.equal(next.nextCursor,null);
 assert.equal(new Set([...page.items,...next.items].map(a=>a.id)).size,29);assert.ok(!JSON.stringify(page).includes('NEVER_PUBLIC'));
 graph.change(1,2,false);graph.change(1,2,false);assert.equal(graph.summary(2,1).followers,0);
 assert.ok(graph.change(1,2,true).event.relationshipId>first.event.relationshipId);db.close();
});

test('artist follows enforce permissions and privacy, persist, and scope Home before pagination',async t=>{
 const app=await fixture(t),a=app.client(),b=app.client(),c=app.client(),investor=app.client(),guest=app.client();
 const A=(await a.register('Follower')).user.artistId,B=(await b.register('Followed')).user.artistId,C=(await c.register('OtherArtist')).user.artistId,I=(await investor.register('Investor','investor')).user.investorId;
 const path=`/api/artists/${B}/follow`,summary=()=>b.request(`/api/artists/${B}/social`).then(r=>r.json());
 assert.equal((await guest.request(path,'PUT')).status,401);assert.equal((await investor.request(path,'PUT')).status,403);
 assert.equal((await a.request(`/api/artists/${I}/follow`,'PUT')).status,404);assert.equal((await a.request(`/api/artists/${A}/follow`,'PUT')).status,400);
 assert.equal((await a.request(path,'PUT',undefined,{Origin:'https://bad.invalid'})).status,403);
 await Promise.all([a.request(path,'PUT'),a.request(path,'PUT')]);assert.equal((await summary()).followers,1);
 assert.equal((await(await a.request(`/api/artists/${A}/social`)).json()).following,1);
 const list=await(await guest.request(`/api/artists/${B}/followers`)).json();assert.deepEqual(Object.keys(list.items[0]).sort(),['id','isFollowing','name','picture']);assert.equal(list.items[0].id,A);
 assert.equal((await guest.request('/api/opportunities/projects?mode=following')).status,401);assert.equal((await investor.request('/api/opportunities/projects?mode=following')).status,403);
 const create=async(client,title,status='funding')=>(await(await client.recordedProject({title,category:'EP',status,goalAmount:1000})).json()).result;
 const older=await create(b,'Unique opportunity','published');
 const offer=await b.request(`/api/projects/${older.id}/offers`,'POST',{need:'Production',deliverable:'Unique stems',requirements:'',deadline:null,status:'open',compensation:{kind:'fee',amount:200,currency:'USD'}});assert.equal(offer.status,201);
 await b.request(`/api/projects/${older.id}/offers`,'POST',{need:'Mix',deliverable:'Mix',requirements:'',deadline:null,status:'open',compensation:{kind:'split',percent:10}});
 await create(b,'Secret Project','draft');await create(b,'Closed Project','closed');await create(c,'Unfollowed project');
 for(let i=0;i<25;i++)await create(b,`Funding ${i}`);
 const get=async q=>(await(await a.request('/api/opportunities/projects?mode=following'+q)).json());
 const first=await get('');assert.equal(first.items.length,24);assert.equal(first.eligibleCount,26);assert.equal(first.followedArtistCount,1);assert.ok(first.items.every(x=>x.project.artistId===B));
 const next=await get('&cursor='+encodeURIComponent(first.nextPageCursor));assert.equal(next.items.length,2);
 assert.equal(new Set([...first.items,...next.items].map(x=>x.project.id)).size,26);
 assert.deepEqual((await get('&q=Unique&participation=Production&compensationKinds=fee')).items.map(x=>x.project.id),[older.id]);
 assert.equal((await get('&participation=Production&compensationKinds=split')).items.length,0);
 const hints=await(await a.request('/api/opportunities/suggestions?mode=following&q=Unique')).json();assert.ok(hints.items.some(x=>x.href===`/project/${older.id}`));
 assert.equal((await(await a.request('/api/opportunities/suggestions?mode=following&q=Unfollowed')).json()).items.length,0);
 assert.equal((await a.rpc('getMyArtistPreferences')).status,200);assert.equal((await guest.rpc('getMyArtistPreferences')).status,401);
 await app.restart();assert.equal((await summary()).followers,1);assert.equal((await get('')).eligibleCount,26);
 await a.rpc('logout');await a.rpc('login',{email:'Follower@example.invalid',password:'preview123'});assert.equal((await(await a.request(`/api/artists/${B}/social`)).json()).isFollowing,true);
 await a.request(path,'DELETE');await a.request(path,'DELETE');assert.equal((await summary()).followers,0);assert.equal((await get('')).items.length,0);
 assert.ok((await(await guest.request('/api/opportunities/projects')).json()).items.length>0);
});
