import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {join} from 'node:path';
import {fixture} from './test-fixtures.mjs';
const op=x=>({...x,operationId:randomUUID()});
async function json(r,status=200){assert.equal(r.status,status,await r.clone().text());return r.json();}
async function setup(t){const app=await fixture(t),a=app.client(),b=app.client(),c=app.client();const A=(await a.register('Sender')).user,B=(await b.register('Recipient')).user;await c.register('Other');const media=await json(await a.upload(),201);const post=await json(await a.request('/api/publications','POST',{title:'Shared sound',description:'Test',mediaId:media.id,coverId:null,projectId:null,allowRemix:false,status:'published'}),201);await json(await a.request(`/api/artists/${B.artistId}/follow`,'PUT',{enabled:true}));return{app,a,b,c,A,B,post};}
test('sharing to following creates one private request; accepted chat receives subsequent shares and notification links',async t=>{
 const {app,a,b,c,A,B,post}=await setup(t);
 const targets=await json(await a.request('/api/messages/share-targets?q=recipient&source=following'));assert.equal(targets.items.length,1);assert.equal(targets.items[0].destination,null);assert.equal(targets.items[0].canSend,true);assert.equal('email' in targets.items[0],false);
 const data=op({publicationId:post.id,recipientId:B.artistId,note:'Listen to this',destination:null});
 const [r1,r2]=await Promise.all([a.request('/api/messages/share','POST',data),a.request('/api/messages/share','POST',data)]);const sent=await json(r1,201);assert.deepEqual(await json(r2,201),sent);assert.equal(sent.admission,'pending');
 const path=`/api/messages/general/${sent.id}`,thread=await json(await b.request(path));assert.equal(thread.messages.length,1);assert.match(thread.messages[0].text,new RegExp(`/discovery\\?post=post-${post.id}`));assert.equal(thread.senderId,A.artistId);assert.equal((await c.request(path)).status,404);
 const notice=(await json(await b.request('/api/notifications'))).items[0];assert.equal(notice.kind,'conversation.requested');assert.equal(notice.target.id,sent.id);
 assert.equal((await json(await a.request('/api/messages/share-targets'))).items[0].canSend,false);
 assert.equal((await a.request('/api/messages/share','POST',op({...data}))).status,409);
 await json(await b.request(path,'PATCH',op({action:'accept',revision:thread.revision})));
 const target=(await json(await a.request('/api/messages/share-targets?source=chats'))).items[0];assert.equal(target.destination.id,sent.id);
 const next=op({publicationId:post.id,recipientId:B.artistId,destination:target.destination,note:'Another listen'});await json(await a.request('/api/messages/share','POST',next),201);await app.restart();await json(await a.request('/api/messages/share','POST',next),201);
 assert.equal((await json(await b.request(path))).messages.filter(m=>m.text.includes('Another listen')).length,1);
 assert.equal((await json(await c.request('/api/messages/share-targets'))).items.length,0);
 await json(await a.request(`/api/publications/${post.id}`,'PATCH',{...post,status:'withdrawn'}));assert.equal((await a.request('/api/messages/share','POST',op({...next}))).status,404);
});
test('share enforces identity, recipient, conversation membership and request admission',async t=>{
 const {app,a,b,c,A,B,post}=await setup(t),guest=app.client(),investor=app.client();await investor.register('Investor','investor');
 for(const client of [guest,investor]){assert.equal((await client.request('/api/messages/share-targets')).status,client===guest?401:403);assert.equal((await client.request('/api/messages/share','POST',op({publicationId:post.id,recipientId:B.artistId}))).status,client===guest?401:403);}
 assert.equal((await a.request('/api/messages/share','POST',op({publicationId:post.id,recipientId:A.artistId}))).status,400);
 assert.equal((await c.request('/api/messages/share','POST',op({publicationId:post.id,recipientId:B.artistId}))).status,409);
 const result=await json(await a.request('/api/messages/share','POST',op({publicationId:post.id,recipientId:B.artistId})),201);
 assert.equal((await c.request('/api/messages/share','POST',op({publicationId:post.id,recipientId:B.artistId,destination:{kind:'general',id:result.id}}))).status,409);
 assert.equal((await a.request('/api/messages/share','POST',op({publicationId:post.id,recipientId:B.artistId,destination:{kind:'general',id:result.id}}))).status,409);
 await json(await b.request(`/api/messages/general/${result.id}`,'PATCH',op({action:'reject',revision:1,response:'No thanks'})));
 assert.equal((await json(await a.request('/api/messages/share-targets'))).items[0].reason,'Request closed');assert.equal((await a.request('/api/messages/share','POST',op({publicationId:post.id,recipientId:B.artistId}))).status,409);
});
test('accepted collaboration is reused without changing work, attachments or terms',async t=>{
 const {a,b,A,B,post}=await setup(t);const project=(await json(await b.rpc('createProject',{title:'Sessions',category:'single',goalAmount:1000,status:'published'}))).result;
 const offer=await json(await b.request(`/api/projects/${project.id}/offers`,'POST',{need:'Verse',deliverable:'Dry vocal',requirements:'One verse',deadline:null,status:'open',compensation:{kind:'split',percent:10}}),201);
 const thread=await json(await a.legacyConversation(offer.id));const before=await json(await b.request(`/api/collaborations/${thread.id}`));
 const target=(await json(await a.request('/api/messages/share-targets'))).items[0];assert.equal(target.destination.kind,'collaboration');
 await json(await a.request('/api/messages/share','POST',op({publicationId:post.id,recipientId:B.artistId,destination:target.destination})),201);
 const after=await json(await b.request(`/api/collaborations/${thread.id}`));assert.equal(after.messages.length,before.messages.length+1);assert.deepEqual(after.terms,before.terms);assert.deepEqual(after.submissions,before.submissions);assert.equal(after.status,before.status);
 assert.match(after.messages.at(-1).text,/Shared publication: Shared sound/);
});
test('notification failure rolls back request, message, activity and idempotency receipt',async t=>{
 const {app,a,B,post}=await setup(t);const db=new DatabaseSync(join(app.dataDir,'nebula.sqlite'));t.after(()=>db.close());
 db.exec("CREATE TRIGGER fail_share BEFORE INSERT ON artist_notifications BEGIN SELECT RAISE(ABORT,'share test failure'); END;");
 assert.equal((await a.request('/api/messages/share','POST',op({publicationId:post.id,recipientId:B.artistId}))).status,500);
 for(const table of ['artist_conversations','artist_messages','conversation_activity','message_operations'])assert.equal(db.prepare(`SELECT count(*) n FROM ${table}`).get().n,0);
});
