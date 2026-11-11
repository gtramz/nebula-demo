import type {DatabaseSync} from 'node:sqlite';
import {mayReceiveRequest,type MessageStorage,type GeneralRow} from './message-storage.js';
import type {NotificationService} from './notifications.js';
import {ensure,id,text} from './validation.js';
type Chat={kind:'general'|'collaboration';id:number;recipient:number;context:string|null;updated:string};
type Dependencies={db:DatabaseSync;store:MessageStorage;alerts:NotificationService;artist:(id:number)=>{id:number;name:string;picture?:string|null}|undefined;publication:(id:number,viewer:number)=>{title:string}};
export function publicationSharing(d:Dependencies){
 const {db,store}=d;
 function chats(viewer:number):Chat[]{return db.prepare(`SELECT 'general' kind,id,CASE WHEN sender=? THEN recipient ELSE sender END recipient,project_title context,updated FROM artist_conversations WHERE admission='accepted' AND (sender=? OR recipient=?)
 UNION ALL SELECT 'collaboration' kind,id,CASE WHEN owner=? THEN applicant ELSE owner END recipient,CASE WHEN json_valid(terms) THEN json_extract(terms,'$.projectTitle') ELSE NULL END context,updated FROM collaborations WHERE (admission='accepted' OR request_policy=0) AND (owner=? OR applicant=?) ORDER BY updated DESC,kind DESC,id DESC`).all(viewer,viewer,viewer,viewer,viewer,viewer) as Chat[];}
 function pair(a:number,b:number){return db.prepare('SELECT * FROM artist_conversations WHERE pair_a=? AND pair_b=?').get(Math.min(a,b),Math.max(a,b)) as GeneralRow|undefined;}
 function targets(viewer:number,url:URL){
  const source=url.searchParams.get('source')??'all',query=(url.searchParams.get('q')??'').trim().slice(0,100),offset=Number(url.searchParams.get('offset')??0);
  ensure(['all','chats','following'].includes(source)&&Number.isSafeInteger(offset)&&offset>=0,'Invalid share search.');
  const followed=new Set((db.prepare('SELECT artist FROM artist_follows WHERE follower=? ORDER BY id DESC').all(viewer) as {artist:number}[]).map(r=>r.artist));
  const recent=chats(viewer),byArtist=new Map<number,Chat>();for(const chat of recent)if(!byArtist.has(chat.recipient))byArtist.set(chat.recipient,chat);
  const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const values=[...new Set([...byArtist.keys(),...followed])].flatMap(artistId=>{
   if(artistId===viewer)return [];const a=d.artist(artistId),chat=byArtist.get(artistId);if(!a||source==='chats'&&!chat||source==='following'&&!followed.has(artistId))return [];
   if(query&&!normalize(`${a.name} ${chat?.context??''}`).includes(normalize(query)))return [];
   const existing=chat?undefined:pair(viewer,artistId);
   return [{artistId,name:a.name,picture:a.picture??null,destination:chat?{kind:chat.kind,id:chat.id}:null,context:chat?.context??null,canSend:!existing,reason:existing?existing.admission==='pending'?'Request pending':'Request closed':chat?'Chat':'New request'}];
  });
  return {items:values.slice(offset,offset+24),nextCursor:offset+24<values.length?offset+24:null};
 }
 function send(viewer:number,data:Record<string,unknown>){
  return store.operation(viewer,data.operationId,'publication:share',data,()=>{
   const recipient=id(data.recipientId),publicationId=id(data.publicationId);ensure(recipient!==viewer,'You cannot share with yourself.');ensure(d.artist(recipient),'Artist not found.',404);
   const publication=d.publication(publicationId,viewer),note=text(data.note??'','Message',1000),value=`${note?note+'\n\n':''}Shared publication: ${publication.title}\n/discovery?post=post-${publicationId}`,now=new Date().toISOString();
   if(data.destination!=null){
    ensure(typeof data.destination==='object'&&!Array.isArray(data.destination),'Invalid conversation.');const dest=data.destination as {kind:unknown;id:unknown};
    const chat=chats(viewer).find(c=>c.kind===dest.kind&&c.id===id(dest.id)&&c.recipient===recipient);ensure(chat,'Conversation unavailable. Close and reopen Share.',409);
    if(chat.kind==='general'){
     db.prepare("INSERT INTO artist_messages(thread,author,kind,text,created) VALUES(?,?,'message',?,?)").run(chat.id,viewer,value,now);
     db.prepare('UPDATE artist_conversations SET updated=? WHERE id=?').run(now,chat.id);store.activity('general',chat.id,viewer,'message',now);d.alerts.recordConversation(recipient,viewer,chat.id,'conversation.message',now);
    }else{
     db.prepare('INSERT INTO collaboration_messages(thread,author,text,created) VALUES(?,?,?,?)').run(chat.id,viewer,value,now);
     db.prepare('UPDATE collaborations SET updated=? WHERE id=?').run(now,chat.id);store.activity('collaboration',chat.id,viewer,'message',now);d.alerts.record(recipient,viewer,chat.id,'message',now);
    }
    return {kind:chat.kind,id:chat.id,admission:'accepted'};
   }
   ensure(db.prepare('SELECT 1 FROM artist_follows WHERE follower=? AND artist=?').get(viewer,recipient),'Follow this artist or choose an existing chat.',409);
   ensure(mayReceiveRequest('general'),'This artist cannot receive requests.',403);
   ensure(!pair(viewer,recipient),'A request already exists. Close and reopen Share.',409);
   const result=db.prepare('INSERT INTO artist_conversations(sender,recipient,pair_a,pair_b,created,updated) VALUES(?,?,?,?,?,?)').run(viewer,recipient,Math.min(viewer,recipient),Math.max(viewer,recipient),now,now);
   const thread=Number(result.lastInsertRowid);db.prepare("INSERT INTO artist_messages(thread,author,kind,text,created) VALUES(?,?,'request',?,?)").run(thread,viewer,value,now);
   store.activity('general',thread,viewer,'request',now);d.alerts.recordConversation(recipient,viewer,thread,'conversation.requested',now);
   return {kind:'general',id:thread,admission:'pending'};
  });
 }
 return {targets,send};
}
