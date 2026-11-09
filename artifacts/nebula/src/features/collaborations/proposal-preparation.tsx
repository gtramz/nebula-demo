import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, type CollaborationOffer, type Publication, type UploadedMedia } from '@nebula/local';
import { AudioComparison } from '@/features/remix/audio-comparison';
import { inspectMedia, renderVideo } from '@/features/remix/video';
import { decodeAudio, renderMix } from '@/features/remix/audio';
import { uploadMedia } from '@/features/discovery/publication-api';
import { usePresentation, presentationAction } from '@/features/presentation';
import { controlStyles } from '@/components/antiq/workspace';
import { Link } from 'wouter';
const {button,primary,field}=controlStyles;
export type Preparation = {contribution:UploadedMedia|null;baseGain:number;voiceGain:number;referenceId?:string|null};
export type ProposalDraft = {introduction:string;description:string;files:UploadedMedia[];preparation:Preparation|null};
export function ReferenceComparison({reference,proposal}:{reference:UploadedMedia;proposal?:UploadedMedia}) {
 const [duration,setDuration]=useState(0),[error,setError]=useState('');
 useEffect(()=>{setDuration(0);setError('');const audio=document.createElement(reference.kind==='video'?'video':'audio');audio.preload='metadata';audio.onloadedmetadata=()=>setDuration(audio.duration);audio.onerror=()=>setError('Reference could not load. Reopen the opportunity to try again.');audio.src=reference.url;return()=>{audio.onloadedmetadata=null;audio.onerror=null;audio.removeAttribute('src');audio.load();};},[reference.id]);
 return <>{duration>0&&Number.isFinite(duration)?<AudioComparison key={reference.id} expanded duration={duration} tracks={[{label:'Original',url:reference.url,kind:reference.kind as 'audio'|'video'},...(proposal?[{label:'Your proposal',url:proposal.url,kind:proposal.kind as 'audio'|'video'}]:[])]}/>:<p role={error?'alert':'status'} className="text-sm text-muted">{error||'Loading reference waveform…'}</p>}</>;
}
export function ProposalPreparation({offer,value,onChange,onResult,result,onBusy}:{offer:CollaborationOffer;value:Preparation;onChange:(p:Preparation)=>void;onResult:(file:UploadedMedia|null)=>void;result?:UploadedMedia;onBusy:(busy:boolean)=>void}) {
 const [mode,setMode]=useState<'musical'|'file'>('musical'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const presentation=usePresentation();
 const controller=useRef<AbortController|null>(null),canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const prepared=useQuery({queryKey:['prepared-reference',offer.referenceMediaId],enabled:!!presentation.data&&!!offer.referenceMediaId,queryFn:async()=>{
   for(const pair of presentation.data?.pairs??[]) {const post=await apiRequest<Publication>(`/api/publications/${pair.sourceId}`);if(post.media.id===offer.referenceMediaId)return pair;}return null;
 }});
 const replacement=offer.need==='Mix'||offer.need==='Master';
 async function task(run:(signal:AbortSignal)=>Promise<void>) {if(controller.current)return;const abort=new AbortController();controller.current=abort;document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(m=>m.pause());setBusy(true);onBusy(true);setError('');try{await run(abort.signal);}catch(e){if(!abort.signal.aborted)setError((e as Error).message);}finally{if(controller.current===abort)controller.current=null;setBusy(false);onBusy(false);}}
 function change(next:Preparation){onChange(next);onResult(null);}
 return <section className="space-y-4 border-t border-border pt-5" aria-label="Prepare musical proposal">
 <div className="space-y-2"><p className="text-xs text-accent">LISTEN · PREPARE · COMPARE</p><h3 className="text-xl font-semibold">Find your part in {offer.workTitle??offer.projectTitle}</h3><p className="text-sm">Original by <Link className="underline" href={`/artist/${offer.ownerId}`}>{offer.ownerName??'the project artist'}</Link></p></div>
 {offer.reference?<ReferenceComparison reference={offer.reference} proposal={result&&['audio','video'].includes(result.kind)?result:undefined}/>:<p className="text-sm text-muted">The artist has not attached a reference yet. You can send existing work using the file proposal below.</p>}
 <div className="flex flex-wrap gap-2"><button type="button" className={mode==='musical'?primary:button} onClick={()=>setMode('musical')}>Prepare contribution</button><button type="button" className={mode==='file'?primary:button} onClick={()=>setMode('file')}>Simple file proposal</button></div>
 {mode==='musical'&&offer.reference&&<fieldset disabled={busy} className="space-y-4 min-w-0">
 <p className="text-sm text-muted">{replacement?'Upload your complete mix or master. Compare the full recording against the original; no fragment or overdub is required.':'Add your contribution over the full reference. Set the levels, then render and listen to the actual result.'}</p>
 {!replacement&&prepared.data&&<button type="button" className={button} onClick={()=>void task(async()=>{const file=await presentationAction<UploadedMedia>('contribution',{sourceId:prepared.data!.sourceId});if(controller.current?.signal.aborted)return;change({...value,contribution:file,referenceId:offer.referenceMediaId});})}>Use prepared take</button>}
 {!replacement&&prepared.data&&<p className="text-sm text-muted">{prepared.data.title}</p>}
 <label className="block space-y-2">{replacement?'Your complete mix or master':'Your contribution audio or video'}<input type="file" accept="audio/*,video/*" className={field} onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void task(async(signal)=>{const kind=f.type.startsWith('video/')?'video':'audio';const file=await uploadMedia(f,kind,()=>{},signal);if(signal.aborted)return;change({...value,contribution:file,referenceId:offer.referenceMediaId});if(replacement)onResult(file);});}}/></label>
 {value.contribution&&<><p className="text-xs text-muted break-words">{value.contribution.name}</p>{value.contribution.kind==='video'?<video controls playsInline src={value.contribution.url} preload="metadata" className="w-full max-h-[50dvh] object-contain" aria-label="Contribution preview"/>:<audio controls src={value.contribution.url} preload="metadata" className="w-full" aria-label="Contribution preview"/>}{!replacement&&<>
 <label className="block text-sm">Original level · {Math.round(value.baseGain*100)}%<input type="range" className="w-full accent-accent min-h-11" min="0" max="1.5" step="0.01" value={value.baseGain} onChange={e=>change({...value,baseGain:Number(e.target.value)})}/></label>
 <label className="block text-sm">Contribution level · {Math.round(value.voiceGain*100)}%<input type="range" className="w-full accent-accent min-h-11" min="0" max="1.5" step="0.01" value={value.voiceGain} onChange={e=>change({...value,voiceGain:Number(e.target.value)})}/></label>
 <button type="button" className={primary} onClick={()=>void task(async(signal)=>{
 const reference=offer.reference!,take=value.contribution!,video=take.kind==='video';
 let mix:Blob;
 if(video){
   const duration=await inspectMedia(reference.url,reference.kind as 'audio'|'video',600,signal);
   if(duration>60)throw new Error('Video proposals support references up to 60 seconds. Use Remix to choose a fragment, or attach a finished video below.');
   await inspectMedia(take.url,'video',120,signal);
   mix=await renderVideo({source:reference.url,sourceKind:reference.kind as 'audio'|'video',contribution:take.url,contributionKind:'video',settings:{sourceId:0,sourceRevision:0,startSeconds:0,endSeconds:duration,baseGain:value.baseGain,voiceGain:value.voiceGain,voiceOffset:0},canvas:canvas.current!,signal,progress:()=>{}});
 }else{
   const read=async(url:string)=>{const r=await fetch(url,{signal});if(!r.ok)throw new Error('An audio file is unavailable.');return decodeAudio(await r.blob(),600);};
   const [base,voice]=await Promise.all([read(reference.url),read(take.url)]);
   if(signal.aborted)return;
   mix=await renderMix(base,voice,{sourceId:0,sourceRevision:0,startSeconds:0,endSeconds:base.duration,baseGain:value.baseGain,voiceGain:value.voiceGain,voiceOffset:0},600);
 }
 if(signal.aborted)return;
 const extension=video?(mix.type.includes('mp4')?'mp4':'webm'):'wav';
 const file=await uploadMedia(new File([mix],`${offer.workTitle??offer.projectTitle} — proposal.${extension}`,{type:mix.type}),video?'video':'audio',()=>{},signal);
 if(!signal.aborted)onResult(file);
 })}>Render proposal</button><p className="text-xs text-muted">Audio: up to 10 minutes and 25 MB per input. Video: references up to 60 seconds, contributions up to 120 seconds and 100 MB. Longer finished work can be attached below.</p>
 </>}</>}
 </fieldset>}
 {mode==='file'&&<p className="text-sm text-muted">Attach an existing recording, stems or document below. Audio files can be compared with the original. Nothing is published to Discovery.</p>}
 <canvas ref={canvas} className="hidden" aria-hidden="true"/>{busy&&<div><p role="status">Preparing your version… Keep this tab visible.</p><button type="button" className={button} onClick={()=>controller.current?.abort()}>Cancel preparation</button></div>}{error&&<p role="alert" className="text-sm text-danger">{error}</p>}
 </section>;
}
