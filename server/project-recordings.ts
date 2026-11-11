import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { ensure, id, object, text } from './validation.js';
import type { Project } from '../lib/local/src/types.js';
import type { ProjectRecording } from '../lib/local/src/works.js';

export function projectRecordings(db: DatabaseSync, project: (id: number, viewer: number | null) => Project | null, privateMedia: (id: string) => boolean) {
  db.exec(`CREATE TABLE IF NOT EXISTS project_recordings(id TEXT PRIMARY KEY, project INTEGER NOT NULL, work INTEGER NOT NULL, media TEXT NOT NULL, publication INTEGER, UNIQUE(project,publication));
    CREATE INDEX IF NOT EXISTS project_recordings_media ON project_recordings(media);
    CREATE TABLE IF NOT EXISTS project_recording_settings(project INTEGER PRIMARY KEY, primary_id TEXT);`);
  type Row = {id:string;project:number;work:number;media:string;publication:number|null};
  type Media = {id:string;owner:number;kind:string;mime:string;size:number;name:string};
  const rows = (p:number) => db.prepare('SELECT * FROM project_recordings WHERE project=?').all(p) as Row[];
  function dto(r:Row, viewer:number|null):ProjectRecording|null {
    const p=project(r.project,viewer); if(!p)return null;
    const m=db.prepare('SELECT * FROM media WHERE id=?').get(r.media) as Media|undefined;
    const post=r.publication ? db.prepare('SELECT owner,data,revision FROM posts WHERE id=?').get(r.publication) as {owner:number;data:string;revision:number}|undefined : undefined;
    const data=post?JSON.parse(post.data):null;
    const available=!!m && (!r.publication || !!data && data.status==='published' && data.projectId===r.project && data.workId===r.work && data.mediaId===r.media);
    if(!available && viewer!==p.artistId)return null;
    return {id:r.id,mediaId:r.media,publicationId:r.publication,publicationRevision:post?.revision,available,
      media: m && (available || viewer===p.artistId) ? {id:m.id,name:m.name,kind:m.kind as 'audio'|'video',mime:m.mime,size:m.size,url:`/media/${m.id}`} : null};
  }
  function list(p:number,viewer:number|null) {return rows(p).map(r=>({workId:r.work,recording:dto(r,viewer)})).filter(r=>r.recording!==null) as {workId:number;recording:ProjectRecording}[];}
  function primary(p:number):string|null|undefined {return (db.prepare('SELECT primary_id FROM project_recording_settings WHERE project=?').get(p) as {primary_id:string|null}|undefined)?.primary_id;}
  function save(p:number,owner:number,entries:{workId:number;recordings?:unknown}[],selected:unknown) {
    const old=rows(p), keep=new Set<string>();
    for(const entry of entries) {
      if(entry.recordings===undefined){for(const r of old.filter(r=>r.work===entry.workId))keep.add(r.id);continue;}
      ensure(Array.isArray(entry.recordings),'Choose recordings for the song.');
      const kinds=new Set<string>();
      for(const value of entry.recordings) {
        const input=object(value), recordingId=input.id==null?randomUUID():text(input.id,'Recording ID',100,16), mediaId=text(input.mediaId,'Media',36,36);
        ensure(!keep.has(recordingId),'A recording can only appear once.');
        const previous=db.prepare('SELECT * FROM project_recordings WHERE id=?').get(recordingId) as Row|undefined;
        ensure(!previous || previous.project===p && previous.work===entry.workId,'Recording belongs to another song.',409);
        const m=db.prepare('SELECT * FROM media WHERE id=?').get(mediaId) as Media|undefined;
        ensure(m && m.owner===owner && ['audio','video'].includes(m.kind) && !privateMedia(mediaId),'Choose your own available audio or video.');
        ensure(!kinds.has(m.kind),'Choose only one audio and one video per song.'); kinds.add(m.kind);
        const publication=input.publicationId==null?null:id(input.publicationId);
        if(publication) {
          const post=db.prepare('SELECT owner,data,revision FROM posts WHERE id=?').get(publication) as {owner:number;data:string;revision:number}|undefined;
          ensure(post?.owner===owner,'Publication not found.',404); const data=JSON.parse(post.data);
          ensure(data.mediaId===mediaId,'The publication media changed. Reload your selection.',409);
          ensure(data.projectId==null || data.projectId===p,'This post already belongs to another project.',409);
          ensure(data.workId==null || data.workId===entry.workId,'This post already belongs to another song.',409);
          ensure(input.publicationRevision===post.revision,'The publication changed. Reload your selection.',409);
          if(data.projectId!==p || data.workId!==entry.workId)db.prepare('UPDATE posts SET data=?,revision=revision+1,updated=? WHERE id=?').run(JSON.stringify({...data,projectId:p,workId:entry.workId}),new Date().toISOString(),publication);
        }
        db.prepare('INSERT INTO project_recordings VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET media=excluded.media,publication=excluded.publication').run(recordingId,p,entry.workId,mediaId,publication);keep.add(recordingId);
      }
    }
    for(const r of old)if(!keep.has(r.id)){
      if(r.publication){const post=db.prepare('SELECT data FROM posts WHERE id=?').get(r.publication) as {data:string}|undefined;const data=post?JSON.parse(post.data):null;
        if(data?.projectId===p && data.workId===r.work)db.prepare('UPDATE posts SET data=?,revision=revision+1,updated=? WHERE id=?').run(JSON.stringify({...data,projectId:null,workId:null}),new Date().toISOString(),r.publication);
      }
      db.prepare('DELETE FROM project_recordings WHERE id=?').run(r.id);
    }
    if(selected===undefined && primary(p)===undefined && keep.size)selected=[...keep][0];
    // Omission preserves the previous explicit selection. Null is a deliberate empty selection.
    if(selected!==undefined) {
      ensure(selected===null || typeof selected==='string' && keep.has(selected),'Choose a principal recording included in this project.');
      db.prepare('INSERT INTO project_recording_settings VALUES(?,?) ON CONFLICT(project) DO UPDATE SET primary_id=excluded.primary_id').run(p,selected as string|null);
    }
  }
  function validate(p:number,owner:number) {
    const value=project(p,owner);ensure(value,'Project not found.',404);
    if(!['single','ep','album','video'].includes(value.category.toLowerCase()))return;
    const songs=db.prepare('SELECT work FROM project_works WHERE project=?').all(p);
    if(['single','video'].includes(value.category.toLowerCase()))ensure(songs.length<=1,'Single and Music video projects contain one song.');
    if(value.status==='draft')return;
    const recordings=list(p,owner).map(r=>r.recording).filter(r=>r.available);
    const audio=recordings.filter(r=>r.media?.kind==='audio');
    ensure(songs.length>0 && (value.category.toLowerCase()==='video' && value.goalAmount===0 ? recordings.length>0 : audio.length>0),value.category.toLowerCase()==='video'?'Add an audio reference before publishing a Music video funding project.':'Add an audio recording before publishing this project.');
    const chosen=primary(p);
    if(chosen!==undefined)ensure(!!chosen && recordings.some(r=>r.id===chosen),'Choose an available principal recording for Home.');
  }
  function preview(p:number,viewer:number|null) {
    const selected=primary(p);if(selected===undefined)return undefined;
    const row=rows(p).find(r=>r.id===selected),recording=row?dto(row,viewer):null;
    if(!recording?.available||!recording.media)return null;
    const song=db.prepare('SELECT title FROM works WHERE id=?').get(row!.work) as {title:string};
    return {media:recording.media,title:song.title,...(row!.publication?{publicationId:row!.publication,saved:viewer!==null && !!db.prepare('SELECT 1 FROM saves WHERE post=? AND account=?').get(row!.publication,viewer)}:{})};
  }
  function mediaUsed(media:string){return !!db.prepare('SELECT 1 FROM project_recordings WHERE media=?').get(media);}
  function canReadMedia(media:string,viewer:number|null){return (db.prepare('SELECT * FROM project_recordings WHERE media=?').all(media) as Row[]).some(r=>dto(r,viewer)?.available);}
  function syncPost(postId:number) {
    const post=db.prepare('SELECT owner,data,revision FROM posts WHERE id=?').get(postId) as {owner:number;data:string;revision:number};const data=JSON.parse(post.data);
    const prior=db.prepare('SELECT * FROM project_recordings WHERE publication=?').all(postId) as Row[];
    for(const p of new Set([...prior.map(r=>r.project),...(data.projectId&&data.workId?[data.projectId]:[])]))db.prepare('INSERT INTO project_tracklists VALUES(?,1) ON CONFLICT(project) DO UPDATE SET revision=revision+1').run(p);
    // Retain unavailable references when withdrawn/unlinked; never substitute another preview.
    if(!data.projectId||!data.workId)return;
    if(prior.some(r=>r.project===data.projectId&&r.work===data.workId&&r.media===data.mediaId))return;
    const media=db.prepare('SELECT kind FROM media WHERE id=?').get(data.mediaId) as {kind:string};
    const siblings=rows(data.projectId).filter(r=>r.work===data.workId && r.publication!==postId);
    const direct=siblings.find(r=>r.media===data.mediaId && !r.publication);
    if(direct){db.prepare('UPDATE project_recordings SET publication=? WHERE id=?').run(postId,direct.id);return;}
    // Additional posts can reference the same song without replacing its selected recording.
    if(siblings.some(r=>(db.prepare('SELECT kind FROM media WHERE id=?').get(r.media) as {kind:string})?.kind===media.kind))return;
    const r=prior.find(r=>r.project===data.projectId&&r.work===data.workId),rid=r?.id??randomUUID();
    db.prepare('INSERT INTO project_recordings VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET media=excluded.media').run(rid,data.projectId,data.workId,data.mediaId,postId);
    if(primary(data.projectId)===undefined)db.prepare('INSERT INTO project_recording_settings VALUES(?,?)').run(data.projectId,rid);
  }
  return {list,primary,save,validate,preview,mediaUsed,canReadMedia,syncPost};
}
