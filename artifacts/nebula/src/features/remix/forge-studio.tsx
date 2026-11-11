import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, type Publication, type RemixDraft, type CollaborationOffer } from '@nebula/local';
import { Journey, JourneyContext, JourneyBack, JourneyNext, useJourney, pauseJourneyMedia } from '@/components/guided/journey';
import { useLeaveGuard } from '@/components/shell/navigation-guard';
import { useNotificationLock } from '@/features/notifications';
import { presentationAction } from '@/features/presentation';
import { AntiqAudioPlayer } from '@/components/antiq-audio-player';

const button='border border-border px-5 py-3 text-sm hover:border-accent disabled:opacity-40';
const field='block w-full min-w-0 border border-border bg-surfaceAlt p-3 mt-2';
const steps=['Original','Open Forge','Review your version','Save your version'].map(title=>({title,description:''}));
type Props={original:Publication;draft:RemixDraft;onDrafts:()=>void;onNewWorkflow:(workflow:'finished-audio'|'video')=>Promise<void>};
export function ForgeStudio({original,draft,onDrafts,onNewWorkflow}:Props){
 const client=useQueryClient(),current=useRef(draft),alive=useRef(true),controller=useRef<AbortController|null>(null),operation=useRef(false);
 const [journey,setJourney]=useJourney(`forge:${draft.ownerId}:${draft.id}`,{step:draft.render?2:0,method:'forge'});
 const [result,setResult]=useState(draft.render),[opened,setOpened]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const [title,setTitle]=useState(draft.title),[description,setDescription]=useState(draft.description),[dirty,setDirty]=useState(false),[version,setVersion]=useState<'original'|'version'>('version');
 const media=useRef<HTMLAudioElement|null>(null);
 const permitLeave=useLeaveGuard(dirty||busy?'Leave your unsaved changes? Save your private version before leaving.':null);
 useNotificationLock(busy);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();media.current?.pause();};},[]);
 const maxStep=result?3:1,step=Math.min(journey.step,maxStep);
 const offers=useQuery({queryKey:['forge-offers',draft.ownerId,draft.attribution.projectId],queryFn:()=>apiRequest<CollaborationOffer[]>(`/api/projects/${draft.attribution.projectId}/offers`),enabled:step===3&&!!result&&!!draft.attribution.projectId,refetchOnWindowFocus:true});
 const canPropose=offers.data?.some(offer=>offer.available&&offer.ownerId!==draft.ownerId&&(!offer.workId||offer.workId===original.workId));
 function go(next:number){if(busy)return;pauseJourneyMedia();setJourney({step:Math.min(next,maxStep)});}
 function cache(value:RemixDraft){current.current=value;client.setQueryData(['remix-draft',draft.ownerId,draft.id],value);void client.invalidateQueries({queryKey:['remix-drafts']});}
 async function receive(){
  if(operation.current)return;operation.current=true;setBusy(true);setError('');pauseJourneyMedia();const abort=new AbortController();controller.current=abort;
  try{
   const value=await presentationAction<RemixDraft>('contribution',{purpose:'finished-audio',sourceId:original.id,draftId:draft.id,revision:current.current.revision},abort.signal);
   if(!alive.current||abort.signal.aborted)return;cache(value);setResult(value.render);setVersion('version');setJourney({step:2});
  }catch(e){if(alive.current&&!abort.signal.aborted)setError((e as Error).message);}
  finally{operation.current=false;if(alive.current){setBusy(false);}}
 }
 async function save(exit=false){
  if(operation.current||!title.trim())return;operation.current=true;setBusy(true);setError('');pauseJourneyMedia();const abort=new AbortController();controller.current=abort;
  try{
   const value=await apiRequest<RemixDraft>(`/api/remix-drafts/${draft.id}`,{method:'PATCH',signal:abort.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:current.current.revision,title,description})});
   if(!alive.current||abort.signal.aborted)return;cache(value);setDirty(false);setSaved(true);
   if(exit){permitLeave();onDrafts();}
  }catch(e){if(alive.current&&!abort.signal.aborted)setError((e as Error).message);}
  finally{operation.current=false;if(alive.current)setBusy(false);}
 }
 async function chooseVideo(){if(operation.current)return;if(dirty&&!window.confirm('Leave your unsaved changes and start a separate video remix?'))return;operation.current=true;setBusy(true);setError('');pauseJourneyMedia();try{await onNewWorkflow('video');}catch(e){if(alive.current)setError((e as Error).message);}finally{operation.current=false;if(alive.current)setBusy(false);}}
 return <section className="forge-studio mx-auto w-full max-w-6xl p-4 sm:p-8 pb-24 space-y-6">
  <header><h1 className="text-3xl font-bold">Remix studio</h1></header>
  <Journey label="Remix with Forge" showStepLabel={false} steps={steps} step={step} maxStep={maxStep} locked={busy} onStep={go} context={<JourneyContext cover={original.coverUrl} title={original.title} artist={original.artistName}><Link className="inline-flex min-h-11 items-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline" href={`/discovery?post=post-${original.id}`}>Open original</Link></JourneyContext>}
   footer={<>{step>0&&<JourneyBack disabled={busy} onClick={()=>go(step-1)}/>}<button className={button} disabled={busy||!title.trim()} onClick={()=>void save(true)}>Save &amp; exit</button>{step===1?<JourneyNext disabled={busy||!opened} onClick={()=>result?go(2):void receive()}>Review your version</JourneyNext>:step<3?<JourneyNext disabled={busy} onClick={()=>go(step+1)}/>:<button className="guided-next" disabled={busy||!result||!title.trim()} onClick={()=>void save()}>Save remix draft</button>}</>}>
   {step===0&&<div className="space-y-6"><div className="guided-route-options" role="group" aria-label="Remix method"><button aria-pressed="true" type="button"><strong>Remix with Forge</strong></button><button disabled={busy} type="button" aria-pressed="false" onClick={()=>void chooseVideo()}><strong>Create a video remix</strong></button></div><AntiqAudioPlayer ref={media} src={original.media.url} label="Full original" downloadName={original.media.name} disabled={busy} errorMessage="The original could not load. Try again." /></div>}
   {step===1&&<section className="forge-demo-card space-y-5"><h3>{original.title}</h3><p>{original.artistName}</p>{!opened?<button className="guided-next" disabled={busy} onClick={()=>setOpened(true)}>Open Forge</button>:<div className="forge-demo-path" aria-label="Forge workspace"><span>Nebula</span><span aria-hidden="true">→</span><strong>Forge</strong><span aria-hidden="true">→</span><strong>DAW</strong><span aria-hidden="true">→</span><span>Nebula</span></div>}</section>}
   {step===2&&result&&<section className="space-y-5" aria-label="Compare versions"><div className="flex flex-wrap gap-3" role="group" aria-label="Compare versions">{(['original','version'] as const).map(key=><button key={key} className={`${button} ${version===key?'text-accent border-accent':''}`} aria-pressed={version===key} onClick={()=>{media.current?.pause();setVersion(key);}}>{key==='original'?'Original':'Your version'}</button>)}</div><AntiqAudioPlayer key={version} ref={media} src={version==='original'?original.media.url:result.url} label={version==='original'?'Full original':'Finished version'} downloadName={version==='original'?original.media.name:result.name} disabled={busy} errorMessage="This version could not load. Try again." /></section>}
   {step===3&&<div className="space-y-5"><label className="block">Remix title<input className={field} disabled={busy} maxLength={160} value={title} onChange={e=>{setTitle(e.target.value);setDirty(true);setSaved(false);}}/></label><label className="block">Description<textarea className={field} disabled={busy} rows={3} maxLength={2000} value={description} onChange={e=>{setDescription(e.target.value);setDirty(true);setSaved(false);}}/></label>{saved&&<p role="status" className="text-accent">Remix draft saved</p>}{!dirty&&result&&canPropose&&<Link className={`${button} inline-flex`} href="/studio/remix/proposal">Propose to original project</Link>}</div>}
   {step===3&&offers.error&&<p role="alert">Opportunities could not load. <button className={button} onClick={()=>void offers.refetch()}>Retry opportunities</button></p>}
   {busy&&<div className="space-y-3"><p role="status">{step===1?'Opening your version…':'Saving…'}</p><button className={button} onClick={()=>controller.current?.abort()}>Cancel operation</button></div>}
   {error&&<div className="space-y-3"><p role="alert">{error}</p>{error.includes('another tab')&&<button className={button} onClick={()=>{if(window.confirm('Discard local edits and reopen the saved draft?')){permitLeave();window.location.reload();}}}>Reopen saved draft</button>}</div>}
  </Journey>
 </section>;
}
/** Historical audio mixes are recoverable, never converted or rendered automatically. */
export function LegacyAudioDraft({original,draft,onDrafts,onNewWorkflow}:Props){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function start(){if(busy)return;setBusy(true);try{await onNewWorkflow('finished-audio');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="max-w-3xl mx-auto p-6 space-y-6"><h1 className="text-3xl">{draft.title}</h1><p>Original: {original.title} · {original.artistName}</p>{draft.description&&<p>{draft.description}</p>}{[{label:'Saved version',file:draft.render},{label:'Saved contribution',file:draft.contribution}].map(({label,file})=>file&&<section key={label} className="space-y-3"><h2>{label}</h2><audio controls className="w-full" src={file.url} aria-label={label} onPlay={e=>{document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(m=>{if(m!==e.currentTarget)m.pause();});}}/><a className="underline inline-flex min-h-11 items-center" download={file.name} href={file.url}>Download {label.toLowerCase()}</a></section>)}<p>Your saved files remain in this draft. Forge starts a separate version.</p><button type="button" className={button} onClick={onDrafts}>Browse drafts</button><button className="guided-next" disabled={busy} onClick={()=>void start()}>Remix with Forge</button>{draft.render&&draft.attribution.projectId&&<Link className={`${button} inline-flex`} href="/studio/remix/proposal">Propose to original project</Link>}{error&&<p role="alert">{error}</p>}</section>;
}
