import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest, type Publication, type RecordingInput, type UploadedMedia } from '@nebula/local';
import { useAuth } from '@/context/AuthContext';
import { uploadMedia } from '@/features/discovery/publication-api';
import { AntiqAudioPlayer } from '@/components/antiq-audio-player';
import { controlStyles } from '@/components/antiq/workspace';
const {field,button}=controlStyles;
export type RecordingDraft = RecordingInput & {media?: UploadedMedia|null;available?: boolean;playable?:boolean};
export function RecordingFields({value,onChange,projectId,workId,category,primary,onPrimary,onBusy,onUseSong,disabled=false}:{
  disabled?:boolean;value:RecordingDraft[];onChange:(next:RecordingDraft[]|((current:RecordingDraft[])=>RecordingDraft[]),metadataOnly?:boolean)=>void;projectId?:number;workId?:number;category:string;
  primary?:string|null;onPrimary:(id:string|null)=>void;onBusy:(busy:boolean)=>void;onUseSong:(post:Publication,recording:RecordingDraft)=>void;
}) {
  const {user}=useAuth(),[search,setSearch]=useState(''),[open,setOpen]=useState(false),[error,setError]=useState(''),[progress,setProgress]=useState<number|null>(null);
  const abort=useRef<AbortController|null>(null),alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;abort.current?.abort();};},[]);
  const posts=useInfiniteQuery({queryKey:['recording-posts',user?.artistId,search],initialPageParam:null as number|null,
    queryFn:({pageParam,signal})=>apiRequest<{items:Publication[];nextCursor:number|null}>(`/api/publications?mine=1&q=${encodeURIComponent(search)}${pageParam?`&before=${pageParam}`:''}`,{signal}),getNextPageParam:page=>page.nextCursor??undefined,enabled:open});
  function add(recording:RecordingDraft){
    if(value.some(r=>r.media?.kind===recording.media?.kind)){setError(`This song already has ${recording.media?.kind}. Remove that recording before choosing another.`);return;}
    onChange(current=>[...current,recording]);if(!primary && recording.available!==false)onPrimary(recording.id);setError('');
  }
  async function upload(file?:File){if(!file||abort.current)return;const controller=new AbortController();abort.current=controller;setProgress(0);onBusy(true);setError('');
    try{if(!file.type.startsWith('audio/')||file.size>100*1024*1024)throw new Error('Choose an MP3, WAV or OGG audio file up to 100 MB.');
      const media=await uploadMedia(file,'audio',setProgress,controller.signal);if(alive.current)add({id:crypto.randomUUID(),mediaId:media.id,media,available:true,playable:false});
    }catch(e){if(alive.current)setError((e as Error).message);}finally{abort.current=null;if(alive.current){setProgress(null);onBusy(false);}}
  }
  return <div className="space-y-3" aria-label="Song recordings">
    {value.map(recording=><div key={recording.id} className="rounded-xl border border-border p-3 space-y-3">
      <p className="text-sm">{recording.media?.name??recording.mediaId} · {recording.publicationId?'Linked post':'Project recording'}</p>
      {recording.available===false?<p role="status">This post is not publicly available. Choose another principal recording before publishing.</p>:recording.media?.kind==='audio'?<AntiqAudioPlayer src={recording.media.url} label="Project recording preview" onPlayable={ready=>{if(recording.playable!==undefined&&recording.playable!==ready)onChange(current=>current.map(r=>r.id===recording.id?{...r,playable:ready}:r),true);}}/>:recording.media?.kind==='video'?<video src={recording.media.url} controls playsInline preload="metadata" onLoadedData={()=>{if(recording.playable===false)onChange(current=>current.map(r=>r.id===recording.id?{...r,playable:true}:r),true);}} className="max-h-56 w-full"/>:null}
      <label className="flex gap-2 items-center"><input type="radio" name="principal-recording" checked={primary===recording.id} disabled={disabled||recording.available===false} onChange={()=>onPrimary(recording.id)}/>Principal in Home</label>
      <button type="button" className={button} disabled={disabled} onClick={()=>{onChange(current=>current.filter(r=>r.id!==recording.id));if(primary===recording.id)onPrimary(null);}}>Remove recording</button>
    </div>)}
    {!value.some(r=>r.media?.kind==='audio')&&<label className="block space-y-2">Upload audio<input aria-label="Upload song audio" type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/ogg" disabled={disabled||progress!==null} className={field} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label>}
    {progress!==null&&<div role="status">Uploading… {progress}% <button type="button" onClick={()=>abort.current?.abort()}>Cancel upload</button></div>}
    <button type="button" className={button} onClick={()=>setOpen(!open)}>{open?'Close posts':'Choose an existing post'}</button>
    {open&&<div className="space-y-3 border border-border p-3"><label className="block">Search your posts<input className={field} value={search} onChange={e=>setSearch(e.target.value)}/></label>
      {posts.isPending&&<p role="status">Loading your posts…</p>}
      {posts.data?.pages.flatMap(page=>page.items).map(post=>{const blocked=!!post.projectId&&post.projectId!==projectId || !!workId&&!!post.workId&&post.workId!==workId || category!=='Video'&&post.media.kind!=='audio' || value.some(r=>r.media?.kind===post.media.kind);
        return <button type="button" key={post.id} disabled={disabled||blocked} className={`${button} w-full text-left disabled:opacity-40`} onClick={()=>{const recording={id:crypto.randomUUID(),mediaId:post.media.id,publicationId:post.id,publicationRevision:post.revision,media:post.media,playable:false,available:post.status==='published'};onUseSong(post,recording);if(!primary&&recording.available)onPrimary(recording.id);setError('');}}><span>{post.title} · {post.media.kind} · {post.status}{post.projectId?` · ${post.project?.title??'Linked project'}`:' · Independent'}</span></button>;})}
      {posts.data&&!posts.data.pages.some(page=>page.items.length)&&<p>No matching posts.</p>}
      {posts.error&&<p role="alert">Could not load posts. <button type="button" onClick={()=>void(posts.isFetchNextPageError?posts.fetchNextPage():posts.refetch())}>Retry posts</button></p>}
      {posts.hasNextPage&&<button type="button" className={button} disabled={posts.isFetching} onClick={()=>void posts.fetchNextPage()}>More posts</button>}
    </div>}
    {error&&<p role="alert">{error}</p>}
  </div>;
}
