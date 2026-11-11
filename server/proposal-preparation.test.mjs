import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync,backup} from 'node:sqlite';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fixture} from './test-fixtures.mjs';
async function result(r,status=200){assert.equal(r.status,status,await r.clone().text());return r.json();}
async function rpc(c,m,...a){return(await result(await c.rpc(m,...a))).result;}
test('reference scope, draft privacy, restart and proposal decisions preserve the same thread',async t=>{
 const app=await fixture(t,{presentation:true}),owner=app.client(),artist=app.client(),other=app.client();
 await owner.register('ReferenceOwner');await artist.register('ProposalArtist');await other.register('UnrelatedArtist');
 const reference=await result(await owner.upload(),201),contribution=await result(await artist.upload(),201);
 const p=await rpc(owner,'createProject',{operationId:randomUUID(),title:'Two songs',category:'EP',status:'draft',goalAmount:1000,songs:[{title:'First',description:''},{title:'Second',description:''}]});
 const songs=await result(await owner.request(`/api/projects/${p.id}/songs`));
 const input={workId:songs.songs[1].id,referenceMediaId:reference.id,need:'Feature',deliverable:'A melodic feature',requirements:'Keep the pulse',deadline:null,status:'open',compensation:{kind:'split',percent:15}};
 const offer=await result(await owner.request(`/api/projects/${p.id}/offers`,'POST',input),201);
 assert.equal(offer.workTitle,'Second');assert.equal((await artist.request(reference.url)).status,404);
 await rpc(owner,'updateProject',p.id,{status:'published'});
 assert.equal((await artist.request(reference.url)).status,200);
 const snapshot=new DatabaseSync(join(app.dataDir,'nebula.sqlite'));await backup(snapshot,join(app.dataDir,'initial.sqlite'));snapshot.close();
 const oldBaseline=new DatabaseSync(join(app.dataDir,'initial.sqlite'));oldBaseline.exec('DROP TABLE proposal_drafts');oldBaseline.close();
 await result(await artist.request(`/api/projects/${p.id}/offers`,'POST',input),404);
 const value={introduction:'Hello',description:'My own take',files:[contribution],preparation:{contribution,baseGain:.7,voiceGain:.5}};
 await result(await artist.request(`/api/offers/${offer.id}/conversations`,'PATCH',value));
 assert.equal((await result(await owner.request('/api/collaborations'))).items.length,0);
 assert.equal((await owner.request(contribution.url)).status,404);
 assert.equal((await result(await other.request(`/api/offers/${offer.id}/conversations`))).draft,null);
 await result(await other.request(`/api/offers/${offer.id}/conversations`,'PATCH',value),400);
 await app.restart();
 const draft=await result(await artist.request(`/api/offers/${offer.id}/conversations`));assert.equal(draft.draft.files[0].id,contribution.id);assert.equal(draft.existing,null);
 const sent=await result(await artist.request(`/api/offers/${offer.id}/conversations`,'POST',{introduction:'Hello',text:'My own take',mediaId:contribution.id,offerRevision:1,acceptTerms:true,operationId:randomUUID()}),201);
 const review=await result(await owner.request(`/api/collaborations/${sent.id}`));assert.equal(review.submissions[0].terms.reference.id,reference.id);assert.equal(review.submissions[0].terms.workTitle,'Second');
 assert.equal((await owner.request(contribution.url)).status,200);assert.equal((await other.request(contribution.url)).status,404);
 await result(await owner.request(`/api/collaborations/${sent.id}`,'PATCH',{action:'accept',revision:review.revision,submissionId:review.submissions[0].id,offerRevision:review.currentOffer.revision,operationId:randomUUID()}));
 await result(await artist.request(`/api/collaborations/${sent.id}/messages`,'POST',{text:'Ready for the next version',operationId:randomUUID()}),201);
 const accepted=await result(await owner.request(`/api/collaborations/${sent.id}`));assert.equal(accepted.admission,'accepted');assert.ok(accepted.messages.some(m=>m.text==='Ready for the next version'));
 const offer2=await result(await owner.request(`/api/projects/${p.id}/offers`,'POST',input),201);
 const sent2=await result(await artist.request(`/api/offers/${offer2.id}/conversations`,'POST',{introduction:'Another direction',text:'Second take',mediaId:contribution.id,offerRevision:1,acceptTerms:true,operationId:randomUUID()}),201);
 await result(await owner.request(`/api/collaborations/${sent2.id}`,'PATCH',{action:'reject',revision:sent2.revision,response:'Looking for a quieter direction',operationId:randomUUID()}));
 const rejected=await result(await artist.request(`/api/collaborations/${sent2.id}`));assert.equal(rejected.admission,'rejected');assert.ok(rejected.messages.some(m=>m.text==='Looking for a quieter direction'));
 await result(await artist.request(`/api/collaborations/${sent2.id}/messages`,'POST',{text:'Cannot send',operationId:randomUUID()}),409);
 await result(await artist.request(`/api/offers/${offer2.id}/conversations`,'PATCH',value),409);
 const offer3=await result(await owner.request(`/api/projects/${p.id}/offers`,'POST',input),201);await result(await artist.request(`/api/offers/${offer3.id}/conversations`,'PATCH',value));
 for(let i=0;i<2;i++){await result(await artist.request('/api/presentation/reset','POST',{confirm:true}));const restored=new DatabaseSync(join(app.dataDir,'nebula.sqlite'));assert.equal(restored.prepare('SELECT count(*) n FROM proposal_drafts').get().n,0);assert.equal(restored.prepare('SELECT count(*) n FROM collaborations').get().n,0);assert.equal(JSON.parse(restored.prepare('SELECT data FROM collaboration_offers WHERE id=?').get(offer.id).data).referenceMediaId,reference.id);restored.close();}
});

test('proposal framing and reference fragment persist privately and follow the submitted work',async t=>{
 const app=await fixture(t),owner=app.client(),artist=app.client(),other=app.client(),guest=app.client();
 await owner.register('FramingOwner');await artist.register('FramingArtist');await other.register('FramingOther');
 const reference=await result(await owner.upload(),201),raw=await result(await artist.upload(),201);
 const video=Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0,105,115,111,109,109,112,52,50]);
 const contribution=await result(await artist.upload(video,'video'),201),render=await result(await artist.upload(video,'video'),201);
 const project=await rpc(owner,'createProject',{operationId:randomUUID(),title:'Framing session',category:'Single',status:'draft',goalAmount:1000,songs:[{title:'Reference song',description:''}]});
 const input={referenceMediaId:reference.id,need:'Feature',deliverable:'A video contribution',requirements:'',deadline:null,status:'open',compensation:{kind:'split',percent:10}};
 const offer=await result(await owner.request(`/api/projects/${project.id}/offers`,'POST',input),201);
 assert.equal((await guest.request(`${reference.url}?download=1`)).status,404);
 await rpc(owner,'updateProject',project.id,{status:'published'});
 const download=await artist.request(`${reference.url}?download=1`);assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/^attachment;/);
 const composition={version:1,layout:'vertical-single',source:{x:.5,y:.5},contribution:{x:.8,y:.2}};
 const preparation={contribution,resultId:render.id,baseGain:.7,voiceGain:.5,referenceId:reference.id,fragment:{startSeconds:1,endSeconds:3},composition};
 const value={introduction:'My direction',description:'This part of the song',files:[render],preparation};
 await result(await artist.request(`/api/offers/${offer.id}/conversations`,'PATCH',value));
 for(const invalid of [
  {...preparation,fragment:{startSeconds:10,endSeconds:5}},
  {...preparation,fragment:{startSeconds:0,endSeconds:61}},
  {...preparation,composition:{...composition,contribution:{x:2,y:.5}}},
  {...preparation,composition:{...composition,layout:'vertical-split'}},
  {...preparation,contribution:raw},
  {...preparation,resultId:contribution.id},
 ]) await result(await artist.request(`/api/offers/${offer.id}/conversations`,'PATCH',{...value,preparation:invalid}),400);
 await result(await artist.request(`/api/offers/${offer.id}/conversations`,'PATCH',{...value,preparation:{...preparation,referenceId:raw.id}}),409);
 await app.restart();
 const restored=(await result(await artist.request(`/api/offers/${offer.id}/conversations`))).draft;
 assert.equal(restored.preparation.resultId,render.id);
 assert.deepEqual(restored.preparation.fragment,preparation.fragment);assert.deepEqual(restored.preparation.composition,composition);
 await result(await artist.request(`/api/offers/${offer.id}/conversations`,'PATCH',{...value,files:[raw],preparation:{...preparation,resultId:null}}));
 const invalidated=(await result(await artist.request(`/api/offers/${offer.id}/conversations`))).draft;
 assert.equal(invalidated.preparation.resultId,null);assert.equal(invalidated.files[0].id,raw.id);assert.equal(invalidated.preparation.contribution.id,contribution.id);
 assert.equal((await result(await other.request(`/api/offers/${offer.id}/conversations`))).draft,null);
 assert.equal((await owner.request(`${render.url}?download=1`)).status,404);
 const sent=await result(await artist.request(`/api/offers/${offer.id}/conversations`,'POST',{introduction:value.introduction,text:value.description,mediaId:render.id,offerRevision:1,acceptTerms:true,operationId:randomUUID(),preparation}),201);
 const review=await result(await owner.request(`/api/collaborations/${sent.id}`));
 assert.deepEqual(review.submissions[0].preparation,{version:1,referenceId:reference.id,fragment:preparation.fragment,composition});
 assert.equal((await owner.request(`${render.url}?download=1`)).status,200);
 assert.equal((await owner.request(`${contribution.url}?download=1`)).status,404);
 assert.equal((await other.request(`${render.url}?download=1`)).status,404);
 assert.equal((await other.request(`/api/collaborations/${sent.id}`)).status,404);
});
