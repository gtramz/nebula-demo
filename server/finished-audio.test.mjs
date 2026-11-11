import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,copyFile,rm,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createNebulaServer} from '../dist-server/server/app.js';

test('finished Forge audio: full registered files, idempotence, privacy, revision control and atomic failure',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'nebula-forge-'));
 await copyFile('.data/presentation/initial.sqlite',join(dir,'nebula.sqlite'));
 await cp('.data/presentation/media',join(dir,'media'),{recursive:true});await cp('.data/presentation/prepared',join(dir,'prepared'),{recursive:true});
 let server,origin;
 async function start(){server=await createNebulaServer({dataDir:dir,publicDir:resolve('artifacts/nebula/dist/public'),presentation:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;}
 async function stop(){server.closeAllConnections();await new Promise(r=>server.close(r));}
 await start();const db=new DatabaseSync(join(dir,'nebula.sqlite'));
 t.after(async()=>{db.close();await stop();await rm(dir,{recursive:true,force:true});});
 function client(){let cookie='';return async(path,method='GET',data)=>{const r=await fetch(origin+path,{method,headers:{Origin:origin,'X-Nebula-Request':'1','Content-Type':'application/json',Cookie:cookie},body:data===undefined?undefined:JSON.stringify(data)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;};}
 const a=client(),b=client();
 async function json(r,status=200){assert.equal(r.status,status,await r.clone().text());return r.json();}
 await json(await a('/api/presentation/switch','POST',{accountId:19}));await json(await b('/api/presentation/switch','POST',{accountId:21}));
 const create=async(sourceId=17)=>json(await a('/api/remix-drafts','POST',{sourceId,sourceRevision:1,requestKey:randomUUID(),workflow:'finished-audio'}),201);
 const receive=(draft,patch={})=>a('/api/presentation/contribution','POST',{purpose:'finished-audio',sourceId:draft.settings.sourceId,draftId:draft.id,revision:draft.revision,...patch});
 const beforePosts=db.prepare('SELECT * FROM posts ORDER BY id').all();
 for(const sourceId of [17,4,1,15]){
  const draft=await create(sourceId),before=db.prepare('SELECT COUNT(*) n FROM media').get().n;
  const [first,second]=await Promise.all([receive(draft),receive(draft)]);const saved=await json(first),again=await json(second);
  assert.equal(saved.workflow,'finished-audio');assert.equal(saved.contribution,null);assert.equal(saved.render.id,again.render.id);assert.equal(saved.revision,2);assert.equal(db.prepare('SELECT COUNT(*) n FROM media').get().n,before+1);
  assert.equal((await json(await receive(draft))).render.id,saved.render.id); // lost response retry
  const registry=JSON.parse(db.prepare("SELECT value FROM presentation_settings WHERE key='forge-results-v1'").get().value).results.find(e=>e.sourceId===sourceId);
  const bytes=await readFile(join(dir,'media',saved.render.id));assert.equal(createHash('sha256').update(bytes).digest('hex'),registry.sha256);
  if(sourceId===17)assert.ok(saved.finalAudio.duration>175&&saved.finalAudio.duration<176);
  assert.equal((await b(saved.render.url)).status,404);assert.equal((await b(`/api/remix-drafts/${saved.id}`)).status,404);
  assert.equal((await b('/api/presentation/contribution','POST',{purpose:'finished-audio',sourceId,draftId:saved.id,revision:2})).status,404);
  assert.equal((await a(`/api/remix-drafts/${saved.id}`,'PATCH',{revision:2,action:'prepare-render'})).status,400);
  assert.equal((await a(`/api/remix-drafts/${saved.id}`,'PATCH',{revision:2,title:'forged',description:'',renderId:saved.render.id})).status,400);
  const named=await json(await a(`/api/remix-drafts/${saved.id}`,'PATCH',{revision:2,title:'Private final version',description:'Full audio'}));assert.equal(named.render.id,saved.render.id);
  assert.equal((await a(`/api/remix-drafts/${saved.id}`,'PATCH',{revision:2,title:'Stale tab',description:''})).status,409);
  assert.equal((await receive(draft)).status,409);
 }
 assert.deepEqual(db.prepare('SELECT * FROM posts ORDER BY id').all(),beforePosts);
 const draft=await create(17),before=db.prepare('SELECT COUNT(*) n FROM media').get().n,files=(await readdir(join(dir,'media'))).sort();
 assert.equal((await receive(draft,{sourceId:4})).status,400);assert.equal((await receive(draft,{url:'https://example.com/anything'})).status,400);
 db.exec("CREATE TRIGGER fail_final BEFORE UPDATE ON remix_drafts WHEN json_extract(new.data,'$.renderId') IS NOT NULL BEGIN SELECT RAISE(ABORT,'test write failure'); END;");
 assert.equal((await receive(draft)).status,500);assert.equal(db.prepare('SELECT COUNT(*) n FROM media').get().n,before);assert.deepEqual((await readdir(join(dir,'media'))).sort(),files);
 db.exec('DROP TRIGGER fail_final');
 const registered=db.prepare("SELECT value FROM presentation_settings WHERE key='forge-results-v1'").get().value;
 db.prepare("UPDATE presentation_settings SET value=? WHERE key='forge-results-v1'").run(JSON.stringify({version:1,results:[]}));assert.equal((await receive(draft)).status,404);
 db.prepare("UPDATE presentation_settings SET value=? WHERE key='forge-results-v1'").run(registered);
 const wrong=JSON.parse(registered);wrong.results.find(e=>e.sourceId===17).duration=601;db.prepare("UPDATE presentation_settings SET value=? WHERE key='forge-results-v1'").run(JSON.stringify(wrong));assert.equal((await receive(draft)).status,422);
 db.prepare("UPDATE presentation_settings SET value=? WHERE key='forge-results-v1'").run(registered);
 const good=await json(await receive(draft));await stop();await start();assert.equal((await json(await a(`/api/remix-drafts/${draft.id}`))).render.id,good.render.id);
 const post=db.prepare('SELECT data FROM posts WHERE id=17').get().data;db.prepare('UPDATE posts SET data=? WHERE id=17').run(JSON.stringify({...JSON.parse(post),allowRemix:false}));
 assert.equal((await receive(good)).status,409);assert.equal((await a(`/api/remix-drafts/${draft.id}`,'PATCH',{revision:good.revision,title:'No permission',description:''})).status,409);
 db.prepare('UPDATE posts SET data=? WHERE id=17').run(post);
 await json(await b('/api/presentation/switch','POST',{accountId:7}));assert.equal((await b('/api/presentation/contribution','POST',{purpose:'finished-audio',sourceId:17,draftId:draft.id,revision:2})).status,403);
 await json(await b('/api/presentation/switch','POST',{accountId:0}));assert.equal((await b('/api/presentation/contribution','POST',{purpose:'finished-audio',sourceId:17,draftId:draft.id,revision:2})).status,401);
});
