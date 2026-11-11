import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync, backup } from 'node:sqlite';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fixture } from './test-fixtures.mjs';

async function result(response, status=200){assert.equal(response.status,status,await response.clone().text());return response.json();}
async function rpc(c,method,...args){return (await result(await (method==='createProject'?c.recordedProject(args[0]):c.rpc(method,...args)))).result;}
test('presentation decisions keep one thread, notifications and reset clear newly-created identities',async t=>{
  const app=await fixture(t,{presentation:true}),owner=app.client(),viewer=app.client();
  const seeded=(await owner.register('ScenarioOwner')).user;
  const project=await rpc(owner,'createProject',{title:'A shared song',category:'single',status:'published',goalAmount:1000});
  const offer=await result(await owner.request(`/api/projects/${project.id}/offers`,'POST',{need:'Production',deliverable:'A production pass',requirements:'Keep the groove',deadline:null,status:'open',compensation:{kind:'fee',amount:200,currency:'USD'}}),201);
  const media=await result(await owner.upload(),201);
  const db=new DatabaseSync(join(app.dataDir,'nebula.sqlite'));
  db.prepare("INSERT INTO presentation_settings VALUES('scenario',?)").run(JSON.stringify({version:1,actors:[{id:seeded.artistId,name:seeded.name,role:'artist',email:'owner@example.invalid',needs:['Production'],mediaId:media.id}],pairs:[]}));
  await backup(db,join(app.dataDir,'initial.sqlite'));
  const newcomer=(await viewer.register('ScenarioNewcomer')).user,upload=await result(await viewer.upload(),201);
  const thread=await result(await viewer.request(`/api/offers/${offer.id}/conversations`,'POST',{operationId:randomUUID(),introduction:'Here is my idea',text:'Listen to this direction',offerRevision:offer.revision,acceptTerms:true,mediaId:upload.id}),201);
  assert.equal(thread.admission,'pending');
  assert.equal((await result(await viewer.request('/api/presentation/events','POST',{action:'accept'}))).changed,1);
  const accepted=await result(await viewer.request(`/api/collaborations/${thread.id}`));assert.equal(accepted.id,thread.id);assert.equal(accepted.admission,'accepted');assert.equal(accepted.status,'accepted');
  assert.ok(accepted.messages.some(m=>m.text.startsWith('Welcome aboard')));
  const count=db.prepare('SELECT count(*) n FROM artist_notifications').get().n;
  assert.equal((await result(await viewer.request('/api/presentation/events','POST',{action:'accept'}))).changed,0);
  assert.equal(db.prepare('SELECT count(*) n FROM artist_notifications').get().n,count);
  await result(await viewer.request('/api/presentation/reset','POST',{confirm:true}));
  assert.equal((await result(await viewer.request('/api/session'))).user,null);
  const state=JSON.parse(db.prepare('SELECT value FROM state').get().value);assert.equal(state.accounts.some(a=>a.id===newcomer.artistId),false);
  assert.equal(db.prepare('SELECT count(*) n FROM collaborations').get().n,0);db.close();
});
test('incoming scenario proposals target the active new artist and do not repeat',async t=>{
  const app=await fixture(t,{presentation:true}),seed=app.client(),viewer=app.client();
  const seeded=(await seed.register('SeedProducer')).user,media=await result(await seed.upload(),201);
  const db=new DatabaseSync(join(app.dataDir,'nebula.sqlite'));
  db.prepare("INSERT INTO presentation_settings VALUES('scenario',?)").run(JSON.stringify({version:1,actors:[{id:seeded.artistId,name:seeded.name,role:'artist',needs:['Production'],mediaId:media.id}],pairs:[]}));
  const newcomer=(await viewer.register('OpportunityOwner')).user;
  const p=await rpc(viewer,'createProject',{title:'Open arrangement',category:'single',status:'published',goalAmount:1000});
  await result(await viewer.request(`/api/projects/${p.id}/offers`,'POST',{need:'Production',deliverable:'An arrangement',requirements:'Keep room for vocals',deadline:null,status:'open',compensation:{kind:'split',percent:15}}),201);
  await rpc(viewer,'updateProject',p.id,{status:'draft'});
  assert.equal((await result(await viewer.request('/api/presentation/events','POST',{action:'incoming'}))).changed,0);
  assert.equal(db.prepare('SELECT count(*) n FROM presentation_events').get().n,0);
  await rpc(viewer,'updateProject',p.id,{status:'published'});
  assert.equal((await result(await viewer.request('/api/presentation/events','POST',{action:'incoming'}))).changed,1);
  assert.equal((await result(await viewer.request('/api/presentation/events','POST',{action:'incoming'}))).changed,0);
  const rows=db.prepare('SELECT * FROM collaborations').all();assert.equal(rows.length,1);assert.equal(rows[0].owner,newcomer.artistId);assert.equal(rows[0].applicant,seeded.artistId);assert.equal(rows[0].admission,'pending');db.close();
});
test('presentation controls are unavailable in the standard server',async t=>{const app=await fixture(t);assert.equal((await app.client().request('/api/presentation')).status,404);});

test('presentation restart retains baseline-only media without serving it before reset', async t => {
  const { writeFile, access } = await import('node:fs/promises');
  const app = await fixture(t, { presentation: true }), owner = app.client();
  const seeded = (await owner.register('BaselineOwner')).user;
  const media = await result(await owner.upload(), 201);
  const db = new DatabaseSync(join(app.dataDir, 'nebula.sqlite'));
  db.prepare("INSERT INTO presentation_settings VALUES('scenario',?)").run(JSON.stringify({ version: 1, principalId: seeded.artistId, actors: [], pairs: [] }));
  await backup(db, join(app.dataDir, 'initial.sqlite'));
  db.prepare('DELETE FROM media WHERE id=?').run(media.id);
  db.close();
  const orphan = join(app.dataDir, 'media', randomUUID());
  await writeFile(orphan, 'unfinished upload');
  await app.restart();
  await access(join(app.dataDir, 'media', media.id));
  await assert.rejects(access(orphan), { code: 'ENOENT' });
  assert.equal((await owner.request(`/media/${media.id}`)).status, 404);
  await result(await owner.request('/api/presentation/reset', 'POST', { confirm: true }));
  assert.equal((await owner.request(`/media/${media.id}`)).status, 200);
});
