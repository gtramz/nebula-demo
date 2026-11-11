import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, defaultVideoComposition, type CollaborationOffer, type Publication, type UploadedMedia, type VideoComposition, type Waveform } from '@nebula/local';
import { AudioComparison } from '@/features/remix/audio-comparison';
import { FragmentSelector } from '@/features/remix/fragment-selector';
import { inspectMedia, renderVideo } from '@/features/remix/video';
import { VideoFraming } from '@/features/remix/video-framing';
import { decodeAudio, renderMix } from '@/features/remix/audio';
import { uploadMedia } from '@/features/discovery/publication-api';
import { usePresentation, presentationAction } from '@/features/presentation';
import { useNotificationLock } from '@/features/notifications';
import { controlStyles } from '@/components/antiq/workspace';
import { ContributionRecorder } from './contribution-recorder';
import { Link } from 'wouter';
const { button, primary, field } = controlStyles;
export type Preparation = { contribution: UploadedMedia | null; resultId?: string | null; baseGain: number; voiceGain: number; referenceId?: string | null; fragment?: {startSeconds:number;endSeconds:number}; composition?: VideoComposition };
export type ProposalDraft = { introduction: string; description: string; files: UploadedMedia[]; preparation: Preparation | null; remixDraftId?: string; publicationId?: number };

export function ReferenceComparison({reference,proposal,fragment,composition}:{reference:UploadedMedia;proposal?:UploadedMedia;fragment?:Preparation['fragment'];composition?:VideoComposition}) {
  const [duration,setDuration]=useState(0),[error,setError]=useState('');
  useEffect(()=>{const abort=new AbortController();setDuration(0);setError('');void inspectMedia(reference.url,reference.kind as 'audio'|'video',600,abort.signal).then(setDuration).catch(e=>{if(!abort.signal.aborted)setError((e as Error).message);});return()=>abort.abort();},[reference.id,reference.url]);
  const start=fragment?.startSeconds??0,end=Math.min(fragment?.endSeconds??duration,duration);
  return duration>0&&end>start?<AudioComparison key={`${reference.id}-${start}-${end}`} expanded duration={end-start} tracks={[{label:'Original',url:reference.url,kind:reference.kind as 'audio'|'video',offset:start},...(proposal?[{label:'Your proposal',url:proposal.url,kind:proposal.kind as 'audio'|'video',composition}]:[])]}/>:<p role={error?'alert':'status'} className="text-sm text-muted">{error||'Loading reference…'}</p>;
}

export async function referenceWaveform(reference:UploadedMedia,signal:AbortSignal):Promise<Waveform> {
  const response=await fetch(reference.url,{signal});if(!response.ok)throw new Error('Reference is unavailable.');
  const buffer=await decodeAudio(await response.blob(),600);if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  const pointsPerSecond=20,count=Math.ceil(buffer.duration*pointsPerSecond),channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
  const peaks=Array.from({length:count},(_,i)=>{let peak=0;const lo=Math.floor(i*buffer.sampleRate/pointsPerSecond),hi=Math.min(buffer.length,Math.ceil((i+1)*buffer.sampleRate/pointsPerSecond));for(const data of channels)for(let j=lo;j<hi;j++)peak=Math.max(peak,Math.abs(data[j]));return peak;});
  return {version:1,mediaId:reference.id,duration:buffer.duration,hasAudio:true,pointsPerSecond,peaks};
}

export function ProposalPreparation({offer,value,onChange,onResult,result,onBusy,stage=0,method,onMethod}:{offer:CollaborationOffer;value:Preparation;onChange:(p:Preparation)=>void;onResult:(file:UploadedMedia|null)=>void;result?:UploadedMedia;onBusy:(busy:boolean)=>void;stage?:number;method?:string;onMethod?:(mode:string)=>void}) {
  const [localMode,setLocalMode]=useState<'musical'|'file'>('musical');
  const mode=method??localMode, setMode=(mode:'musical'|'file')=>{setLocalMode(mode);onMethod?.(mode);};
  const [busy,setBusy]=useState(false),[recording,setRecording]=useState(false),[error,setError]=useState(''),[progress,setProgress]=useState(''),[length,setLength]=useState(0);
  const presentation=usePresentation(),controller=useRef<AbortController|null>(null),canvas=useRef<HTMLCanvasElement>(null),referencePlayer=useRef<HTMLMediaElement|null>(null),alive=useRef(true);
  const active=busy||recording,replacement=offer.need==='Mix'||offer.need==='Master',reference=offer.reference;
  useNotificationLock(active);
  useEffect(()=>{onBusy(active);},[active,onBusy]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();referencePlayer.current?.pause();onBusy(false);};},[]);
  useEffect(()=>{setLength(0);if(!reference)return;const abort=new AbortController();void inspectMedia(reference.url,reference.kind as 'audio'|'video',600,abort.signal).then(value=>{if(!abort.signal.aborted)setLength(value);}).catch(()=>{});return()=>abort.abort();},[reference?.id,reference?.url]);
  useEffect(()=>{if(length&&value.contribution?.kind==='video'&&value.composition&&!value.fragment)onChange({...value,fragment:{startSeconds:0,endSeconds:Math.min(60,length)}});},[length,value.contribution?.id,value.composition,value.fragment,onChange]);
  const prepared=useQuery({queryKey:['prepared-reference',offer.referenceMediaId],enabled:!!presentation.data&&!!offer.referenceMediaId,queryFn:async({signal})=>{
    for(const pair of presentation.data?.pairs??[]){const post=await apiRequest<Publication>(`/api/publications/${pair.sourceId}`,{signal});if(post.media.id===offer.referenceMediaId)return pair;}return null;
  }});
  async function task(run:(signal:AbortSignal)=>Promise<void>):Promise<boolean> {
    if(controller.current||recording)return false;
    const abort=new AbortController();controller.current=abort;document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(m=>m.pause());setBusy(true);setError('');
    try{await run(abort.signal);return !abort.signal.aborted&&alive.current;}catch(e){if(!abort.signal.aborted&&alive.current)setError((e as Error).message);return false;}finally{if(controller.current===abort)controller.current=null;if(alive.current){setBusy(false);setProgress('');}}
  }
  function change(next:Preparation){referencePlayer.current?.pause();onChange(next);onResult(null);}
  function withTake(file:UploadedMedia):Preparation {
    const next={...value,contribution:file,referenceId:offer.referenceMediaId};
    if(reference&&!replacement&&file.kind==='video'){
      next.composition=value.composition??defaultVideoComposition(reference?.kind==='video'?'video':'audio');
      const start=value.fragment?.startSeconds??0,end=value.fragment?.endSeconds??length;
      if(length)next.fragment={startSeconds:start,endSeconds:Math.min(end||length,start+60,length)};
    }else delete next.composition;
    return next;
  }
  async function keepTake(file:File,kind:'audio'|'video',knownDuration?:number) {
    return task(async(signal)=>{
      if(file.size>(kind==='video'||replacement?100:25)*1024*1024)throw new Error(`Choose ${kind} up to ${kind==='video'||replacement?100:25} MB.`);
      const local=URL.createObjectURL(file);
      try{await inspectMedia(local,kind,replacement?600:120,signal,knownDuration);}finally{URL.revokeObjectURL(local);}
      const uploaded=await uploadMedia(file,kind,p=>{if(alive.current)setProgress(`Uploading your take… ${p}%`);},signal);
      if(!signal.aborted&&alive.current){change(withTake(uploaded));if(replacement||!reference)onResult(uploaded);}
    });
  }
  async function render() {
    await task(async(signal)=>{
      if(!reference||!value.contribution)throw new Error('Add a contribution first.');
      const take=value.contribution,video=take.kind==='video',duration=await inspectMedia(reference.url,reference.kind as 'audio'|'video',600,signal);
      const start=value.fragment?.startSeconds??0,end=value.fragment?.endSeconds??(video?Math.min(60,duration):duration);
      if(start<0||end>duration+.01||end-start<.1)throw new Error('Choose a fragment inside the reference.');
      if(video&&end-start>60+.01)throw new Error('Choose a fragment up to 60 seconds for your video, or attach a finished file.');
      const settings={sourceId:0,sourceRevision:0,startSeconds:start,endSeconds:end,baseGain:value.baseGain,voiceGain:value.voiceGain,voiceOffset:0,...(video?{composition:value.composition??defaultVideoComposition(reference.kind as 'audio'|'video')}:{})};
      let mix:Blob;
      if(video){await inspectMedia(take.url,'video',120,signal);mix=await renderVideo({source:reference.url,sourceKind:reference.kind as 'audio'|'video',contribution:take.url,contributionKind:'video',settings,canvas:canvas.current!,signal,progress:p=>{if(alive.current)setProgress(`Rendering your proposal… ${p}%`);}});}
      else {const read=async(url:string)=>{const response=await fetch(url,{signal});if(!response.ok)throw new Error('An audio file is unavailable.');return decodeAudio(await response.blob(),600);};const [base,voice]=await Promise.all([read(reference.url),read(take.url)]);if(signal.aborted)return;setProgress('Mixing your contribution…');mix=await renderMix(base,voice,settings,600);}
      if(signal.aborted)return;
      const extension=video?(mix.type.includes('mp4')?'mp4':'webm'):'wav';
      const file=await uploadMedia(new File([mix],`${offer.workTitle??offer.projectTitle} — proposal.${extension}`,{type:mix.type}),video?'video':'audio',p=>{if(alive.current)setProgress(`Saving your preview… ${p}%`);},signal);
      if(!signal.aborted&&alive.current)onResult(file);
    });
  }
  return <section className="space-y-6 border-t border-border pt-5" aria-label="Prepare musical proposal">
    <section hidden={stage!==0&&!(stage===2&&!!result)} className="space-y-4" aria-label="Reference"><div className="flex flex-wrap justify-between gap-3 items-start"><div className="min-w-0"><p className="text-xs uppercase tracking-widest text-accent">Reference</p><h3 className="text-xl font-semibold break-words mt-2">{offer.workTitle??offer.projectTitle}</h3><p className="text-sm text-muted mt-1">by <Link className="underline text-ink" href={`/artist/${offer.ownerId}`}>{offer.ownerName??'the project artist'}</Link></p></div>{reference&&<a className={button} href={`${reference.url}${reference.url.includes('?')?'&':'?'}download=1`} download>Download reference</a>}</div>
      {reference?<ReferenceComparison composition={value.composition} reference={reference} proposal={result&&['audio','video'].includes(result.kind)?result:undefined} fragment={!replacement&&result&&['audio','video'].includes(result.kind)?value.fragment:undefined}/>:<p className="text-sm text-muted">No reference is attached yet. You can send an existing recording or work file below.</p>}
    </section>
    <section hidden={stage!==1&&stage!==2} className="space-y-4" aria-label="Your contribution">
      <div hidden={stage!==1} className="flex flex-wrap gap-2" role="group" aria-label="Proposal method"><button type="button" disabled={active} aria-pressed={mode==='musical'} className={mode==='musical'?primary:button} onClick={()=>setMode('musical')}>Prepare contribution</button><button type="button" disabled={active} aria-pressed={mode==='file'} className={mode==='file'?primary:button} onClick={()=>setMode('file')}>Simple file proposal</button></div>
      {mode==='musical'&&<div className="space-y-4 min-w-0">
        <p className="text-sm text-muted">{replacement?'Upload your complete mix or master, then compare it with the reference.':'Record, upload or use a prepared take. Listen to your mix before you send it.'}</p>
        {stage===2&&reference&&!replacement&&length>0&&(value.fragment||value.contribution?.kind==='video')&&<div className="space-y-3 rounded-xl border border-border p-3"><h4 className="font-semibold">Choose your part</h4><p className="text-xs text-muted">Your contribution starts at the beginning of this selected fragment.</p>
          {reference.kind==='video'?<video ref={el=>{referencePlayer.current=el;}} src={reference.url} playsInline preload="metadata" className="w-full max-h-60 object-contain bg-black" aria-label="Reference fragment"/>:<audio ref={el=>{referencePlayer.current=el;}} src={reference.url} preload="metadata" className="hidden"/>}
          <FragmentSelector mediaId={reference.id} length={length} range={{start:value.fragment?.startSeconds??0,end:value.fragment?.endSeconds??Math.min(60,length)}} mediaRef={referencePlayer} disabled={active} onChange={range=>change({...value,fragment:{startSeconds:range.start,endSeconds:range.end}})} waveformLoader={signal=>referenceWaveform(reference,signal)}/>
          {value.contribution?.kind!=='video'&&<button type="button" className={button} disabled={active} onClick={()=>{const next={...value};delete next.fragment;change(next);}}>Use full reference</button>}
        </div>}
        {stage===2&&reference&&!replacement&&!value.fragment&&value.contribution?.kind!=='video'&&length>60&&<button type="button" className={button} disabled={active} onClick={()=>change({...value,fragment:{startSeconds:0,endSeconds:60}})}>Choose a fragment</button>}
        <div hidden={stage!==1}><ContributionRecorder disabled={busy} referenceUrl={reference?.url} referenceKind={reference?.kind as 'audio'|'video'} startSeconds={value.fragment?.startSeconds??0} endSeconds={value.fragment?.endSeconds??(length||120)} monitor={!replacement&&!!reference} monitorGain={value.baseGain} onTake={keepTake} onPendingChange={setRecording}/></div>
        <fieldset disabled={active} className="space-y-4 min-w-0">
          <label hidden={stage!==1} className="block space-y-2"><span className="text-sm font-medium">{replacement?'Upload your complete mix or master':'Upload file'}</span><input type="file" accept="audio/*,video/*" className={field} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void keepTake(file,file.type.startsWith('video/')?'video':'audio');}}/></label>
          {stage===1&&!replacement&&prepared.data&&<div><button type="button" className={button} onClick={()=>void task(async(signal)=>{const file=await presentationAction<UploadedMedia>('contribution',{sourceId:prepared.data!.sourceId},signal);if(!signal.aborted&&alive.current)change(withTake(file));})}>Use prepared take</button><p className="mt-2 text-xs text-muted">{prepared.data.title}</p></div>}
          {value.contribution&&<div className="space-y-4 rounded-xl border border-border p-3"><div className="flex justify-between items-start gap-3"><p className="text-sm font-medium break-words">{value.contribution.name??'Your contribution'}</p><button type="button" className="min-h-11 min-w-11 text-sm underline shrink-0" onClick={()=>{const next={...value,contribution:null};delete next.composition;change(next);}}>Remove take</button></div>{value.contribution.kind==='video'?<video controls playsInline src={value.contribution.url} preload="metadata" className="w-full max-h-[45dvh] object-contain bg-black" aria-label="Contribution preview"/>:<audio controls src={value.contribution.url} preload="metadata" className="w-full" aria-label="Contribution preview"/>}
            {stage===2&&reference&&!replacement&&<>{value.contribution.kind==='video'&&<VideoFraming source={reference.url} sourceKind={reference.kind as 'audio'|'video'} contribution={value.contribution.url} value={value.composition??defaultVideoComposition(reference.kind as 'audio'|'video')} onChange={composition=>change({...value,composition})} startSeconds={value.fragment?.startSeconds??0} disabled={active}/>}
              <div className="grid sm:grid-cols-2 gap-4"><label className="block text-sm">Original level · {Math.round(value.baseGain*100)}%<input type="range" className="w-full accent-accent min-h-11" min="0" max="1.5" step="0.01" value={value.baseGain} onChange={e=>change({...value,baseGain:Number(e.target.value)})}/></label><label className="block text-sm">Contribution level · {Math.round(value.voiceGain*100)}%<input type="range" className="w-full accent-accent min-h-11" min="0" max="1.5" step="0.01" value={value.voiceGain} onChange={e=>change({...value,voiceGain:Number(e.target.value)})}/></label></div>
              <button type="button" className={primary} onClick={()=>void render()}>Render proposal</button>{result&&<p role="status" className="text-sm text-accent">Preview ready. Compare your version with the original above.</p>}
            </>}
          </div>}
        </fieldset>
        <details hidden={stage!==1} className="text-xs text-muted"><summary className="min-h-11 flex items-center cursor-pointer">File and recording limits</summary><p>Audio mixing: up to 10 minutes and 25 MB per input. Video: choose up to 60 seconds of reference, with a contribution up to 120 seconds and 100 MB. Attach longer finished work below.</p></details>
      </div>}
      {mode==='file'&&<p className="text-sm text-muted">Attach an existing recording, stems or document below. Only submitted work is shared with the artist.</p>}
    </section>
    <canvas ref={canvas} className="hidden" aria-hidden="true"/>
    {busy&&<div className="rounded-xl border border-border p-4 space-y-3"><p role="status">{progress||'Preparing your version…'} Keep this tab visible.</p><button type="button" className={button} onClick={()=>controller.current?.abort()}>Cancel preparation</button></div>}
    {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
  </section>;
}
