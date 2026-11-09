import type { DatabaseSync } from 'node:sqlite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { SessionUser } from '../lib/local/src/types.js';
import type { CollaborationDetail, CollaborationOffer } from '../lib/local/src/collaborations.js';
import { ensure } from './validation.js';

type Actor = { id: number; name: string; email: string; role: string; needs: string[]; mediaId: string; picture?: string };
export type Scenario = { version: number; principalId?: number; actors: Actor[]; pairs: { sourceId: number; resultId?: number; offerId?: number; contributionPath: string; contributionKind?: 'audio'|'video'; title: string; startSeconds?: number; endSeconds?: number; baseGain?: number; contributionGain?: number }[] };
type Thread = { id: number; owner: number; applicant: number; admission: string; status: string; updated: string; revision: number };

/** Presentation orchestration is opt-in, local-only, and calls the same product operations as the UI. */
export function presentation(d: { db: DatabaseSync; directory: string; current(req: IncomingMessage): SessionUser;
  user(id: number): SessionUser | null; publicProject(id: number): boolean; session(req: IncomingMessage, res: ServerResponse, user: SessionUser | null): void;
  body(req: IncomingMessage): Promise<Record<string, unknown>>; json(res: ServerResponse, value: unknown): void }) {
  const { db } = d;
  db.exec(`CREATE TABLE IF NOT EXISTS presentation_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS presentation_events(key TEXT PRIMARY KEY,state TEXT NOT NULL,created INTEGER NOT NULL);
    INSERT OR IGNORE INTO presentation_settings VALUES('mode','guided');`);
  let busy = false;
  const scenario = (): Scenario | null => {
    const row = db.prepare("SELECT value FROM presentation_settings WHERE key='scenario'").get() as { value: string } | undefined;
    return row ? JSON.parse(row.value) : null;
  };
  const mode = () => (db.prepare("SELECT value FROM presentation_settings WHERE key='mode'").get() as { value: string }).value;
  async function asActor<T>(origin: string, actor: number, path: string, method = 'GET', input?: unknown): Promise<T> {
    const token = randomBytes(32).toString('hex'), hash = createHash('sha256').update(token).digest('hex');
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash, actor, Date.now() + 120_000);
    try {
      const response = await fetch(origin + path, { method, headers: { Cookie: `nebula_session=${token}`, Origin: origin, 'X-Nebula-Request': '1', 'Content-Type': 'application/json' }, body: input === undefined ? undefined : JSON.stringify(input) });
      const data = await response.json() as T & { error?: string };
      ensure(response.ok, data.error ?? 'Scenario action could not be completed.', response.status);
      return data;
    } finally { db.prepare('DELETE FROM sessions WHERE token=?').run(hash); }
  }
  async function once(key: string, action: () => Promise<void>) {
    if (db.prepare('SELECT 1 FROM presentation_events WHERE key=?').get(key)) return false;
    db.prepare("INSERT INTO presentation_events VALUES(?,'running',?)").run(key, Date.now());
    try { await action(); db.prepare("UPDATE presentation_events SET state='done' WHERE key=?").run(key); return true; }
    catch (error) { db.prepare('DELETE FROM presentation_events WHERE key=?').run(key); throw error; }
  }
  async function advance(origin: string, viewer: number, action: string, automatic = false) {
    const s = scenario(); ensure(s, 'Prepare the presentation scenario first.', 409);
    const seeded = new Set(s.actors.map(a => a.id));
    const oldEnough = (date: string) => !automatic || Date.now() - Date.parse(date) > 10_000;
    let changed = 0;
    const threads = db.prepare('SELECT * FROM collaborations WHERE owner=? OR applicant=? ORDER BY id DESC').all(viewer, viewer) as Thread[];
    for (const thread of threads) {
      if (!oldEnough(thread.updated)) continue;
      const actor = thread.owner === viewer ? thread.applicant : thread.owner;
      if (!seeded.has(actor)) continue;
      const run = async (event: string, fn: () => Promise<void>) => { if (await once(`${event}:${thread.id}`, fn)) changed++; };
      if (thread.applicant === viewer && thread.status === 'submitted' && thread.admission === 'pending' && ['auto','accept','reject'].includes(action)) {
        await run('decision', async () => {
          const detail = await asActor<CollaborationDetail>(origin, actor, `/api/collaborations/${thread.id}`);
          const proposal = detail.submissions.filter(s => s.kind === 'proposal').at(-1)!;
          await asActor(origin, actor, `/api/collaborations/${thread.id}`, 'PATCH', { operationId: `scenario-decision-${thread.id}`, action: action === 'reject' ? 'reject' : 'accept', revision: detail.revision, submissionId: proposal.id, offerRevision: detail.currentOffer.revision, response: 'Thank you for sharing your take. I am going in a different direction for this track, but I enjoyed hearing your approach.' });
          if (action !== 'reject') await asActor(origin, actor, `/api/collaborations/${thread.id}/messages`, 'POST', { operationId: `scenario-welcome-${thread.id}`, text: `Welcome aboard! Your approach fits ${detail.projectTitle}. Let's keep the space in the first section and build into the final hook. Send your next version here when it is ready.` });
        });
      } else if (thread.admission === 'accepted' && ['auto','reply','delivery'].includes(action)) {
        if (thread.owner === viewer && thread.status === 'accepted' && action !== 'reply') {
          await run(`delivery-${thread.revision ?? thread.updated}`, async () => {
            const detail = await asActor<CollaborationDetail>(origin, actor, `/api/collaborations/${thread.id}`);
            const mediaId = s.actors.find(a => a.id === actor)!.mediaId;
            await asActor(origin, actor, `/api/collaborations/${thread.id}`, 'PATCH', { operationId: `scenario-delivery-${thread.id}-${detail.revision}`, revision: detail.revision, action: 'deliver', mediaId, mediaIds: [mediaId], text: 'Here is the finished pass for review. I kept the dynamics open and left room for the lead. Let me know if you would like any adjustments.' });
          });
        } else if (thread.owner === actor && thread.status === 'delivered' && action === 'auto') {
          await run('complete', async () => {
            const detail = await asActor<CollaborationDetail>(origin, actor, `/api/collaborations/${thread.id}`);
            await asActor(origin, actor, `/api/collaborations/${thread.id}`, 'PATCH', { operationId: `scenario-complete-${thread.id}`, revision: detail.revision, action: 'complete' });
          });
        } else {
          const last = db.prepare('SELECT id,author FROM collaboration_messages WHERE thread=? ORDER BY id DESC LIMIT 1').get(thread.id) as { id: number; author: number } | undefined;
          if (last?.author === viewer) await run(`reply-${last.id}`, async () => {
            await asActor(origin, actor, `/api/collaborations/${thread.id}/messages`, 'POST', { operationId: `scenario-reply-${thread.id}-${last.id}`, text: 'Thanks for the update. I will listen with the project in mind. Keeping the arrangement spacious should give both parts room to breathe.' });
          });
        }
      }
    }
    if (['auto','incoming'].includes(action) && !seeded.has(viewer)) {
      const offers = db.prepare('SELECT id,project,data,created FROM collaboration_offers WHERE owner=?').all(viewer) as { id: number; project: number; data: string; created: string }[];
      for (const offer of offers) {
        const terms = JSON.parse(offer.data); if (terms.status !== 'open' || !oldEnough(offer.created) || !d.publicProject(offer.project)) continue;
        const actor = s.actors.find(a => a.role === 'artist' && a.needs.includes(terms.need)); if (!actor) continue;
        if (db.prepare('SELECT 1 FROM presentation_events WHERE key=?').get(`incoming:${offer.id}`)) continue;
        const availableOffers = await asActor<CollaborationOffer[]>(origin, actor.id, `/api/projects/${offer.project}/offers`);
        const current = availableOffers.find(o => o.id === offer.id); if (!current?.available) continue;
        if (await once(`incoming:${offer.id}`, async () => {
          await asActor(origin, actor.id, `/api/offers/${offer.id}/conversations`, 'POST', { operationId: `scenario-incoming-${offer.id}`, introduction: `Hi! I saw your ${terms.need.toLowerCase()} opportunity. I would love to explore the sound with you.`, text: 'I attached a recent piece so you can hear my approach. Happy to discuss the direction and adapt the part to your track.', offerRevision: current.revision, acceptTerms: true, mediaId: actor.mediaId, mediaIds: [actor.mediaId] });
        })) changed++;
      }
    }
    // General requests keep their own admission policy and original thread.
    if (['auto','accept','reply','reject'].includes(action)) {
      const general = db.prepare('SELECT * FROM artist_conversations WHERE sender=? OR recipient=?').all(viewer,viewer) as {id:number;sender:number;recipient:number;admission:string;revision:number;updated:string}[];
      for(const thread of general) {
        const actor=thread.sender===viewer?thread.recipient:thread.sender;
        if(!seeded.has(actor)||!oldEnough(thread.updated))continue;
        if(thread.sender===viewer&&thread.admission==='pending'&&action!=='reply') {
          if(await once(`general-decision:${thread.id}`,async()=>{await asActor(origin,actor,`/api/messages/general/${thread.id}`,'PATCH',{operationId:`scenario-general-decision-${thread.id}`,revision:thread.revision,action:action==='reject'?'reject':'accept',response:'Thanks for reaching out. I am at capacity on projects this week.'});}))changed++;
        } else if(thread.admission==='accepted'&&action!=='reject') {
          const last=db.prepare('SELECT id,author FROM artist_messages WHERE thread=? ORDER BY id DESC LIMIT 1').get(thread.id) as {id:number;author:number}|undefined;
          if(last?.author===viewer&&await once(`general-reply:${last.id}`,async()=>{await asActor(origin,actor,`/api/messages/general/${thread.id}/messages`,'POST',{operationId:`scenario-general-reply-${last.id}`,text:'Thanks for reaching out! I would love to hear what you are working on. Share a project or a track and we can find a direction together.'});}))changed++;
        }
      }
    }
    if(action==='auto'&&!seeded.has(viewer)) {
      const posts=db.prepare("SELECT id,created FROM posts WHERE owner=? AND json_extract(data,'$.status')='published'").all(viewer) as {id:number;created:string}[];
      for(const post of posts) {
        if(!oldEnough(post.created))continue;
        const actor=s.actors.filter(a=>a.role==='artist')[post.id%6]; if(!actor)continue;
        if(await once(`publication-response:${post.id}`,async()=>{
          await asActor(origin,actor.id,`/api/publications/${post.id}/star`,'PUT',{enabled:true});
          await asActor(origin,actor.id,`/api/publications/${post.id}/comments`,'POST',{text:'Glad you shared this. There is room to take this sound somewhere interesting.'});
          await asActor(origin,actor.id,`/api/artists/${viewer}/follow`,'PUT',{});
        }))changed++;
      }
    }
    return changed;
  }
  async function handle(req: IncomingMessage, res: ServerResponse, url: URL) {
    if (!url.pathname.startsWith('/api/presentation')) return false;
    ensure(req.socket.remoteAddress === '127.0.0.1' || req.socket.remoteAddress === '::1' || req.socket.remoteAddress === '::ffff:127.0.0.1', 'Presentation controls are local only.', 403);
    if (req.method === 'GET' && url.pathname === '/api/presentation') {
      d.json(res, { enabled: true, mode: mode(), accounts: (() => { const scene=scenario(), principal=scene?.principalId?d.user(scene.principalId):null; const accounts=scene?.actors.map(({id,name,role,picture})=>({id,name,role,picture}))??[]; return principal&&!accounts.some(a=>a.id===scene!.principalId)?[{id:scene!.principalId!,name:principal.name,role:principal.role,picture:principal.picture??undefined},...accounts]:accounts; })(), pairs: scenario()?.pairs.map(({sourceId,resultId,offerId,title,startSeconds,endSeconds,baseGain,contributionGain})=>({sourceId,resultId,offerId,title,startSeconds,endSeconds,baseGain,contributionGain})) ?? [] }); return true;
    }
    ensure(req.method === 'POST', 'Method not allowed.',405);
    const input = await d.body(req);
    if(url.pathname==='/api/presentation/switch') {
      const target=Number(input.accountId); ensure(scenario()?.actors.some(a=>a.id===target) || target===scenario()?.principalId || target===0,'Choose a presentation account.');
      d.session(req,res,target ? d.user(target) : null);d.json(res,{ok:true});return true;
    }
    if(url.pathname==='/api/presentation/mode') {ensure(['guided','autonomous'].includes(String(input.mode)),'Choose a mode.');db.prepare("UPDATE presentation_settings SET value=? WHERE key='mode'").run(String(input.mode));d.json(res,{ok:true});return true;}
    if(url.pathname==='/api/presentation/reset') {
      ensure(input.confirm===true,'Confirm restoration.');ensure(!busy,'Wait for the current event to finish.',409);
      const baseline=join(d.directory,'initial.sqlite');ensure(existsSync(baseline),'Initial scenario is unavailable.',409);
      // Explicit restoration also returns already-open presentation browsers to the prepared identity.
      const openSessions=db.prepare('SELECT token,expires FROM sessions WHERE expires>?').all(Date.now()) as {token:string;expires:number}[];
      db.prepare('ATTACH DATABASE ? AS initial').run(baseline);
      try {
        const tables=db.prepare("SELECT name FROM initial.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {name:string}[];
        db.exec('BEGIN IMMEDIATE');
        try { for(const {name} of tables){ensure(/^[a-z_]+$/.test(name),'Invalid snapshot.');db.exec(`DELETE FROM main.${name}; INSERT INTO main.${name} SELECT * FROM initial.${name};`);} if(!tables.some(t=>t.name==='proposal_drafts'))db.exec('DELETE FROM proposal_drafts'); db.exec('DELETE FROM sessions; DELETE FROM rate_limits; DELETE FROM feed_snapshots'); const principalId=scenario()?.principalId; if(principalId&&d.user(principalId))for(const session of openSessions)db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(session.token,principalId,session.expires); db.exec('COMMIT'); }
        catch(e){db.exec('ROLLBACK');throw e;}
      } finally {db.exec('DETACH DATABASE initial');}
      d.session(req,res,scenario()?.principalId?d.user(scenario()!.principalId!):null);d.json(res,{ok:true});return true;
    }
    if(url.pathname==='/api/presentation/contribution') {
      const user=d.current(req), pair=scenario()?.pairs.find(p=>p.sourceId===Number(input.sourceId));ensure(pair&&user.artistId,'No prepared contribution for this original.',404);
      const token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash,user.artistId,Date.now()+120_000);
      try {
        const bytes=await readFile(join(d.directory,'prepared',pair.contributionPath));
        const response=await fetch(url.origin+'/api/uploads',{method:'POST',headers:{Cookie:`nebula_session=${token}`,Origin:url.origin,'X-Nebula-Request':'1','X-Media-Kind':pair.contributionKind??'audio','X-File-Name':encodeURIComponent(pair.contributionPath),...(input.draftId?{'X-Remix-Draft':String(input.draftId)}:{}),'Content-Type':'application/octet-stream'},body:bytes});
        const result=await response.json();ensure(response.ok,result.error??'Could not load contribution.',response.status);d.json(res,result);
      } finally {db.prepare('DELETE FROM sessions WHERE token=?').run(hash);}return true;
    }
    ensure(url.pathname==='/api/presentation/events','Not found.',404);
    const user=d.current(req); const action=String(input.action??'auto');ensure(['auto','accept','reject','reply','incoming','delivery'].includes(action),'Unknown event.');
    if(busy || (action==='auto'&&mode()!=='autonomous') || !user.artistId){d.json(res,{changed:0});return true;}
    busy=true;
    try { d.json(res,{changed:await advance(url.origin,user.artistId,action,action==='auto')}); } finally {busy=false;}
    return true;
  }
  return {handle, principal: () => scenario()?.principalId ? d.user(scenario()!.principalId!) : null};
}
