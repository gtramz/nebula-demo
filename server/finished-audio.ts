import { randomUUID, createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, unlink, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { remixDrafts } from './remix-drafts.js';
import { ensure, sniffMedia, text, id, HttpError } from './validation.js';
import { mediaTool } from './waveforms.js';

export type FinishedAudioEntry = { sourceId:number; sourceMediaId:string; resultId:number; resultMediaId:string; filename:string; sha256:string; duration:number };
const run = promisify(execFile);
/** Trusted local manifest only. No client URLs, paths, mixes, or DAW operations. */
export function finishedAudio(d:{db:DatabaseSync;directory:string;drafts:ReturnType<typeof remixDrafts>;available(sourceId:number,owner:number):void;maxStorageBytes?:number}) {
  const pending=new Map<string,Promise<unknown>>();
  function entries():FinishedAudioEntry[] {
    const row=d.db.prepare("SELECT value FROM presentation_settings WHERE key='forge-results-v1'").get() as {value:string}|undefined;
    return row ? JSON.parse(row.value).results : [];
  }
  async function receive(input:Record<string,unknown>,owner:number,checkSession:()=>void) {
    const draftId=text(input.draftId,'Draft',36,36),revision=id(input.revision),sourceId=id(input.sourceId);
    ensure(input.path == null && input.url == null && input.mediaId == null,'Choose a registered version.');
    checkSession();
    const context=d.drafts.finishedContext(draftId,owner,revision);
    ensure(context.saved.settings.sourceId===sourceId,'This version belongs to another original.');
    d.available(sourceId,owner);
    if(context.saved.renderId)return context.draft;
    const key=`${owner}:${draftId}:${revision}`;
    if(pending.has(key)){await pending.get(key);checkSession();return d.drafts.finishedContext(draftId,owner,revision).draft;}
    ensure(pending.size<4,'Version preparation is busy. Try again shortly.',503);
    const job=(async()=>{
      const entry=entries().find(e=>e.sourceId===sourceId);
      ensure(entry,'No version available yet',404);
      ensure(entry.sourceMediaId===context.saved.sourceMediaId && /^[a-zA-Z0-9._-]+$/.test(entry.filename),'The prepared version no longer matches this original.',409);
      // A retired or replaced result must never be used as a hidden alternate source.
      const verifyResult=()=>{
      const result=d.db.prepare('SELECT data FROM posts WHERE id=?').get(entry.resultId) as {data:string}|undefined;
      const resultData=result&&JSON.parse(result.data);
      ensure(resultData?.status==='published' && resultData.mediaId===entry.resultMediaId && resultData.remix?.sourceId===sourceId,'No version available yet',404);
      d.available(entry.resultId,owner);
      };
      verifyResult();
      const path=join(d.directory,'prepared',entry.filename);
      const size=(await stat(path).catch(()=>{throw new HttpError(503,'The version is unavailable. Try again.');})).size;
      ensure(size>0&&size<=100*1024*1024,'Finished audio must be up to 100 MB.',413);
      const bytes=await readFile(path),detected=sniffMedia(bytes.subarray(0,512));
      ensure((detected?.kind==='audio'||detected?.mime==='video/mp4')&&createHash('sha256').update(bytes).digest('hex')===entry.sha256,'Prepared audio failed verification.',422);
      let probe;
      try{const {stdout}=await run(mediaTool('ffprobe'),['-v','error','-protocol_whitelist','file,pipe','-format_whitelist','wav,mp3,ogg,mov,matroska,webm','-show_entries','format=duration:stream=codec_type','-of','json',path],{timeout:60000,maxBuffer:1024*1024});probe=JSON.parse(stdout);}
      catch{throw new HttpError(503,'The version could not be verified. Try again.');}
      const duration=Number(probe.format?.duration);
      ensure(Number.isFinite(duration)&&duration>=.1&&duration<=600&&Math.abs(duration-entry.duration)<.1&&probe.streams?.some((s:{codec_type:string})=>s.codec_type==='audio')&&!probe.streams?.some((s:{codec_type:string})=>s.codec_type==='video'),'Choose a finished audio file up to 10 minutes.',422);
      const mediaId=randomUUID(),destination=join(d.directory,'media',mediaId);let committed=false;
      try{
        await writeFile(destination,bytes,{flag:'wx',mode:0o600});
        checkSession();d.available(sourceId,owner);verifyResult();
        d.db.exec('BEGIN IMMEDIATE');
        try{
          const latest=d.drafts.finishedContext(draftId,owner,revision);
          ensure(!latest.saved.renderId,'A version has already been received.',409);
          const total=(d.db.prepare('SELECT COALESCE(SUM(size),0) n FROM media').get() as {n:number}).n;
          const owned=(d.db.prepare('SELECT COALESCE(SUM(size),0) n FROM media WHERE owner=?').get(owner) as {n:number}).n;
          ensure(total+size<=(d.maxStorageBytes??5*1024**3)&&owned+size<=1024**3,'Storage limit reached.',413);
          d.db.prepare('INSERT INTO media(id,owner,kind,mime,size,created,name) VALUES(?,?,?,?,?,?,?)').run(mediaId,owner,'audio',detected!.mime==='video/mp4'?'audio/mp4':detected!.mime,size,Date.now(),entry.filename);
          d.drafts.bind(mediaId,draftId,owner);
          const received=d.drafts.receiveFinished(draftId,owner,revision,mediaId,duration);
          d.db.exec('COMMIT');committed=true;return received;
        }catch(e){d.db.exec('ROLLBACK');throw e;}
      }finally{if(!committed)await unlink(destination).catch(()=>{});}
    })();
    pending.set(key,job);try{return await job;}finally{pending.delete(key);}
  }
  return {receive};
}
