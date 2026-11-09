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
