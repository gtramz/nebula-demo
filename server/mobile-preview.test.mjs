import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './test-fixtures.mjs';
for(const presentation of [false,true])test(`frame access is limited to same-origin presentation HTML (${presentation})`,async t=>{
 const app=await fixture(t,{presentation});const client=app.client();
 for(const path of ['/presentation/mobile','/discovery']){
  const response=await client.request(path),html=await response.text();assert.equal(response.status,200);
  assert.equal(response.headers.get('x-frame-options'),presentation?'SAMEORIGIN':'DENY');
  assert.ok(html.includes(presentation&&path==='/presentation/mobile'?"frame-src 'self'":"frame-src 'none'"));
 }
 assert.equal((await client.request('/api/session')).headers.get('x-frame-options'),'DENY');
 assert.equal((await client.request('/media/missing')).headers.get('x-frame-options'),'DENY');
});
