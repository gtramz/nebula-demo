import { RecordingFields, type RecordingDraft } from './recordings';
import { MorphAdvanceButton, type MorphAdvanceHandle } from '@/components/blob-face';
import { CreationFrame, useCreationSteps } from '@/components/guided/creation';
import { JourneyBack } from '@/components/guided/journey';
import { SectionSkeleton } from '@/components/loading-states';
import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearch } from 'wouter';
import { apiRequest, isServerMode, musicalProject, type Song, type SongEntry, type Tracklist } from '@nebula/local';
import { useAuth } from '@/context/AuthContext';
import { useLeaveGuard } from '@/components/shell/navigation-guard';
import { controlStyles } from '@/components/antiq/workspace';
const {button,field,primary}=controlStyles;
export function useSongs(projectId?:number|null) {
  const {user}=useAuth();
  return useQuery({queryKey:['project-songs',projectId,user?`${user.role}:${user.artistId??user.investorId}`:'guest'],queryFn:({signal})=>apiRequest<Tracklist>(`/api/projects/${projectId}/songs`,{signal}),enabled:isServerMode()&&!!projectId});
}
export function SongSelector({projectId,value,onChange}: {projectId:number;value?:number|null;onChange:(id:number|null)=>void}) {
  const query=useSongs(projectId);
  return <div className="space-y-2"><label className="block">Song (optional)<select className={field} value={value??''} onChange={e=>onChange(e.target.value?Number(e.target.value):null)} disabled={query.isPending||!!query.error}><option value="">Project-wide</option>{query.data?.songs.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>{query.error&&<p role="alert">{query.error.message} <button type="button" className={button} onClick={()=>void query.refetch()}>Retry songs</button></p>}</div>;
}
export function SongFields({value,onChange,disabled=false,references={},category='Album',projectId,primary,onPrimary,onBusy}:{value:SongEntry[];onChange:(value:SongEntry[]|((current:SongEntry[])=>SongEntry[]),metadataOnly?:boolean)=>void;disabled?:boolean;references?:Record<number,string[]>;category?:string;projectId?:number;primary?:string|null;onPrimary?:(id:string|null)=>void;onBusy?:(busy:boolean)=>void}) {
  const {user}=useAuth();
  const library=useQuery({queryKey:['my-songs',user?.artistId],queryFn:({signal})=>apiRequest<Song[]>('/api/works',{signal}),enabled:isServerMode()&&user?.role==='artist'});
  const maximum=['Single','Video'].includes(category)?1:100;
  const uploads=useRef(new Set<number>()),[uploading,setUploading]=useState(false);
  function uploadState(index:number,busy:boolean){if(busy)uploads.current.add(index);else uploads.current.delete(index);const active=uploads.current.size>0;setUploading(active);onBusy?.(active);}
  function move(index:number,delta:number){const rows=[...value];[rows[index],rows[index+delta]]=[rows[index+delta],rows[index]];onChange(rows);}
  return <fieldset disabled={disabled} className="space-y-4 min-w-0"><legend className="text-xl font-bold">Songs</legend><p className="text-sm text-muted">{category==='Video'?'Choose one song. Funding requires an audio demo; the finished music video can be linked later.':maximum===1?'One song with one audio recording.':'Add and order your songs, then choose the principal recording for Home.'} Recordings uploaded here do not create Discovery posts.</p>
    {value.map((song,index)=><div key={song.clientId??song.workId??`new-${index}`} className="border border-border p-4 space-y-3" role="group" aria-label={`Song ${index+1}`}>
      <label className="block">Song {index+1} title<input className={field} disabled={uploading} required maxLength={160} value={song.title} onChange={e=>onChange(value.map((s,i)=>i===index?{...s,title:e.target.value}:s))}/></label>
      <label className="block">Song {index+1} description<textarea className={field} disabled={uploading} maxLength={4000} value={song.description} onChange={e=>onChange(value.map((s,i)=>i===index?{...s,description:e.target.value}:s))}/></label>
      <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={uploading||!index} onClick={()=>move(index,-1)} aria-label={`Move song ${index+1} up`}>Move up</button><button type="button" className={button} disabled={uploading||index===value.length-1} onClick={()=>move(index,1)} aria-label={`Move song ${index+1} down`}>Move down</button><button type="button" className={button} disabled={uploading||!!references[song.workId??0]?.length} onClick={()=>onChange(value.filter((_,i)=>i!==index))}>Remove from list</button></div>
      {!!references[song.workId??0]?.length&&<p className="text-sm text-muted">Cannot remove: referenced by {references[song.workId!].join(', ')}.</p>}
      {onPrimary&&<RecordingFields value={(song.recordings??[]) as RecordingDraft[]} projectId={projectId} workId={song.workId} category={category} primary={primary} onPrimary={onPrimary} disabled={uploading} onBusy={busy=>uploadState(index,busy)}
        onChange={(update,metadataOnly)=>onChange(current=>current.map((s,i)=>(s.clientId??s.workId??i)===(song.clientId??song.workId??index)?{...s,recordings:typeof update==='function'?update((s.recordings??[]) as RecordingDraft[]):update}:s),metadataOnly)}
        onUseSong={(post,recording)=>onChange(current=>current.map((s,i)=>(s.clientId??s.workId??i)===(song.clientId??song.workId??index)?{...s,...(post.song?{workId:post.song.id,revision:post.song.revision,title:post.song.title,description:post.song.description}:{title:s.title||post.title}),recordings:[...(s.recordings??[]),recording]}:s))}/>}
      {song.workId&&<p className="text-xs text-muted">Edits affect this song in every project where you included it. Historical proposal terms remain unchanged.</p>}
    </div>)}
    {value.length>maximum&&<p role="alert">This format allows one song. Resolve the song selection before saving; no songs have been removed.</p>}
    <button type="button" className={button} disabled={uploading||value.length>=maximum} onClick={()=>onChange([...value,{clientId:crypto.randomUUID(),title:'',description:''}])}>Add song</button>
    <label className="block">Use an existing song<select className={field} value="" disabled={uploading||library.isPending||!!library.error||value.length>=maximum} onChange={e=>{const song=library.data?.find(s=>s.id===Number(e.target.value));if(song)onChange([...value,{workId:song.id,revision:song.revision,title:song.title,description:song.description}]);}}><option value="">Choose your song</option>{library.data?.filter(s=>!value.some(v=>v.workId===s.id)).map(s=><option key={s.id} value={s.id}>{s.title} · #{s.id}</option>)}</select></label>
    {library.error&&<p role="alert">{library.error.message} <button type="button" onClick={()=>void library.refetch()}>Retry song library</button></p>}
  </fieldset>;
}
export function SongManager({projectId,status,onStateChange}:{projectId:number;status:string;onStateChange?:(state:{dirty:boolean;busy:boolean})=>void}) {
  const query=useSongs(projectId),client=useQueryClient();
  const [draft,setDraft]=useState<{revision:number;songs:SongEntry[]}|null>(null),[error,setError]=useState(''),[pending,setPending]=useState(false);
  const operation=useRef({key:'',id:''}), advance=useRef<MorphAdvanceHandle>(null);
  const flow=useCreationSteps(), [advancing,setAdvancing]=useState(false);
  useLeaveGuard(draft?'Leave without saving your song list?':null);
  useEffect(()=>{onStateChange?.({dirty:!!draft,busy:pending||advancing});},[draft,pending,advancing,onStateChange]);
  if(query.isPending)return <SectionSkeleton variant="form" label="Loading song list editor" rows={3}/>;
  if(query.error&&!query.data)return <p role="alert">{query.error.message} <button type="button" onClick={()=>void query.refetch()}>Retry songs</button></p>;
  const current=query.data!,rows=draft?.songs??current.songs.map(s=>({workId:s.id,revision:s.revision,title:s.title,description:s.description}));
  async function persist() {
    if(!draft||pending)return false;setPending(true);setError('');
    const key=JSON.stringify(draft);if(operation.current.key!==key)operation.current={key,id:crypto.randomUUID()};
    try {await apiRequest(`/api/projects/${projectId}/songs`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,operationId:operation.current.id})});await Promise.all(['project-songs','my-songs','offers','publication','publications','discovery-feed','opportunity-projects'].map(key=>client.invalidateQueries({queryKey:[key]})));return true;}catch(e){setError((e as Error).message);return false;}finally{setPending(false);}
  }
  return <form ref={flow.form} noValidate className="song-list-editor space-y-4 border-t border-border pt-6" aria-label="Song list editor" onSubmit={event=>{event.preventDefault();if(!pending&&!advancing)advance.current?.run();}}>
    <CreationFrame label="Song list" steps={['Songs','Review']} flow={flow} locked={pending||advancing} context={<p className="text-sm text-muted">{status==='draft'?'These songs are private while the project is a draft.':'Saved titles and descriptions are public.'} Song-list changes save separately from project details.</p>} footer={<>
      {flow.step>0&&<JourneyBack disabled={pending||advancing} onClick={()=>flow.go(0)}/>}
      <button type="button" className={button} disabled={pending||advancing} onClick={()=>{if(!draft||confirm('Discard your song-list draft and reload current songs?')){setDraft(null);setError('');flow.reveal(0);void query.refetch();}}}>Reload songs</button>
      <MorphAdvanceButton ref={advance} buttonType="submit" disabled={pending||!draft} onPendingChange={setAdvancing} onBeforeAdvance={()=>flow.validate()} onAttempt={()=>flow.step===1?persist():undefined} onAdvance={()=>{if(flow.step===0)flow.go(1);else{setDraft(null);flow.reveal(0);}}} buttonClassName="guided-next" faceSize={72}>{flow.step===0?'Review songs':'Save songs'}</MorphAdvanceButton>
    </>}>
      <section data-creation-step="0" hidden={flow.step!==0}><SongFields value={rows} disabled={pending||advancing} references={Object.fromEntries(current.songs.map(s=>[s.id,s.references]))} onChange={update=>setDraft(previous=>({revision:previous?.revision??current.revision,songs:typeof update==='function'?update(previous?.songs??rows):update}))}/></section>
      <section hidden={flow.step!==1} className="creation-summary"><h3>{rows.length} songs</h3><ol>{rows.map((song,index)=><li key={song.workId??index}><strong>{index+1}. {song.title}</strong><p className="text-sm text-muted">{song.description}</p></li>)}</ol></section>
      {error&&<p role="alert">{error}</p>}
    </CreationFrame>
  </form>;
}
export function ProjectSongs({projectId,category,status,renderOffers,renderRecording}:{projectId:number;category:string;status:string;renderRecording?:(song:Song)=>React.ReactNode;renderOffers:(id:number)=>React.ReactNode}) {
  const query=useSongs(projectId),search=useSearch();
  const selected=Number(new URLSearchParams(search).get('song'));
  if(!isServerMode()||!musicalProject(category))return null;
  return <section aria-label="Project songs" className="space-y-4"><h2 className="text-2xl font-bold">Songs</h2>{query.isPending&&<SectionSkeleton variant="list" label="Loading project songs" rows={3}/>}{query.error&&<p role="alert">{query.error.message}<button className={button} onClick={()=>void query.refetch()}>Retry songs</button></p>}
    {query.data&&selected>0&&!query.data.songs.some(s=>s.id===selected)&&<p role="status">This song is not available in this project.</p>}
    {query.data&&!query.data.songs.length&&<p className="text-sm text-muted">No structured songs added yet.</p>}
    {query.data?.songs.map((song,index)=>{const recording=status!=='draft'?renderRecording?.(song):null;return <div key={song.id} id={`song-${song.id}`} role="group" aria-label={`Song: ${song.title}`} className={`scroll-mt-4 p-5 border space-y-3 ${selected===song.id?'border-accent':'border-border'}`}>
      <h3 className="text-xl font-semibold">{index+1}. {song.title}</h3>{selected===song.id&&<p className="text-accent text-sm">Selected song</p>}{!recording && <p className="whitespace-pre-wrap break-words">{song.description}</p>}
      <p className="text-sm text-muted">Explore the song and its open opportunities.</p>
      {renderOffers(song.id)}
      {recording ?? (status==='draft'?<p className="text-sm text-muted">No public recording shared for this private project.</p>:<RelatedPublications projectId={projectId} workId={song.id}/>)}
    </div>;})}
  </section>;
}
export function RelatedPublications({projectId,workId}:{projectId:number;workId:number}) {
  const query=useInfiniteQuery({queryKey:['song-publications',projectId,workId],initialPageParam:null as number|null,queryFn:({signal,pageParam})=>apiRequest<{items:{id:number;title:string}[];nextCursor:number|null}>(`/api/publications?project=${projectId}&song=${workId}${pageParam?`&before=${pageParam}`:''}`,{signal}),getNextPageParam:page=>page.nextCursor??undefined});
  const items=query.data?.pages.flatMap(page=>page.items)??[];
  return <div>{items.length>0&&<ul>{items.map(post=><li key={post.id}><Link className="underline min-h-11 inline-flex items-center" href={`/discovery?post=post-${post.id}`}>View publication: {post.title}</Link></li>)}</ul>}{query.error?<p role="alert">Publications could not load. <button className={button} onClick={()=>void(query.isFetchNextPageError?query.fetchNextPage():query.refetch())}>Retry publications</button></p>:query.isPending?<SectionSkeleton variant="list" label="Loading song publications" rows={2}/>:!items.length&&<p className="text-sm text-muted">No public recording shared for this song.</p>}{query.hasNextPage&&<button className={button} disabled={query.isFetching} onClick={()=>void query.fetchNextPage()}>More publications</button>}</div>;
}
