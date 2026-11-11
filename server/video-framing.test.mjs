import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fixture } from './test-fixtures.mjs';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
async function value(response, status=200) { assert.equal(response.status,status,await response.clone().text()); return response.json(); }

test('video framing is persisted privately, rejects invalid crops and stale renders, and preserves legacy drafts', async t => {
  const app=await fixture(t), owner=app.client(), artist=app.client(), outsider=app.client();
  await owner.register('FramingOwner'); await artist.register('FramingArtist'); await outsider.register('FramingOutsider');
  const bytes=await readFile(new URL('../artifacts/nebula/public/discovery-demo/after-hours.webm',import.meta.url));
  const base=await value(await owner.upload(bytes,'video'),201);
  const original=await value(await owner.request('/api/publications','POST',{title:'Framing source',description:'',mediaId:base.id,coverId:null,projectId:null,allowRemix:true,status:'published'}),201);
  let draft=await value(await artist.request('/api/remix-drafts','POST',{sourceId:original.id,sourceRevision:original.revision,requestKey:randomUUID()}),201);
  const path=`/api/remix-drafts/${draft.id}`,upload=async()=>value(await artist.request('/api/uploads','POST',bytes,{'X-Remix-Draft':draft.id,'X-Media-Kind':'video','Content-Type':'application/octet-stream'}),201);
  const own=await upload(),render=await upload();
  assert.equal(draft.settings.composition.layout,'vertical-split');
  const input=()=>({revision:draft.revision,title:draft.title,description:'Preserve me',settings:{...draft.settings,startSeconds:0,endSeconds:2},contributionId:own.id,contributionDuration:3,renderId:render.id});
  const composition={...draft.settings.composition,source:{x:.1,y:.9},contribution:{x:.8,y:.3}};
  draft=await value(await artist.request(path,'PATCH',{...input(),settings:{...input().settings,composition}}));
  await app.restart();assert.deepEqual((await value(await artist.request(path))).settings.composition,composition);
  assert.equal((await outsider.request(path)).status,404);assert.equal((await outsider.request(render.url+'?download=1')).status,404);
  for(const invalid of [{...composition,version:2},{...composition,layout:'vertical-single'},{...composition,source:{x:1.1,y:.5}}]) {
    assert.equal((await artist.request(path,'PATCH',{...input(),settings:{...input().settings,composition:invalid}})).status,400);
  }
  assert.equal((await artist.request(path,'PATCH',{...input(),settings:{...input().settings,composition:{...composition,source:{x:.5,y:.5}}}})).status,409);
  const legacy=new DatabaseSync(join(app.dataDir,'nebula.sqlite'));
  const stored=JSON.parse(legacy.prepare('SELECT data FROM remix_drafts WHERE id=?').get(draft.id).data);delete stored.settings.composition;
  legacy.prepare('UPDATE remix_drafts SET data=? WHERE id=?').run(JSON.stringify(stored),draft.id);legacy.close();
  draft=await value(await artist.request(path));assert.equal(draft.settings.composition,undefined);assert.equal(draft.render.id,render.id);
  draft=await value(await artist.request(path,'PATCH',{...input(),title:'Legacy title only'}));assert.equal(draft.render.id,render.id);assert.equal(draft.settings.composition,undefined);
});
