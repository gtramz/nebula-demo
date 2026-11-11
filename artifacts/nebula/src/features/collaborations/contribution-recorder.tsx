import { useEffect, useRef, useState } from 'react';
import { controlStyles } from '@/components/antiq/workspace';
import { decodeAudio, editableAudio } from '@/features/remix/audio';
import { recordingType } from '@/features/remix/video';

const { button, primary } = controlStyles;
type Take = { file: File; url: string; kind: 'audio' | 'video'; duration: number };
/** Local capture only. Upload/share happens after the artist explicitly keeps the take. */
export function ContributionRecorder({ disabled, allowedKinds = ['audio','video'], referenceUrl, referenceKind = 'audio', startSeconds = 0, endSeconds = 120, monitor = true, monitorGain = .76, onTake, onPendingChange }: {
  disabled: boolean; allowedKinds?: ('audio'|'video')[]; referenceUrl?: string; referenceKind?: 'audio' | 'video'; startSeconds?: number; endSeconds?: number; monitor?: boolean; monitorGain?: number;
  onTake: (file: File, kind: 'audio' | 'video', duration: number) => Promise<boolean>; onPendingChange: (pending: boolean) => void;
}) {
  const [kind, setKind] = useState<'audio' | 'video' | null>(null), [requesting, setRequesting] = useState(false), [processing, setProcessing] = useState(false), [take, setTake] = useState<Take | null>(null), [error, setError] = useState('');
  const camera = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null), recorder = useRef<MediaRecorder | null>(null), reference = useRef<HTMLMediaElement | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null), alive = useRef(true), generation = useRef(0), takeUrl = useRef<string | null>(null), cancelled = useRef(false), requestedKind = useRef<'audio'|'video'>('audio'), locked = useRef(false), pending = useRef(onPendingChange);
  pending.current = onPendingChange;
  function release() { if (timer.current) clearTimeout(timer.current); timer.current = null; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; reference.current?.pause(); reference.current?.removeAttribute('src'); reference.current?.load(); reference.current = null; if(camera.current)camera.current.srcObject=null; }
  function forget() { if(takeUrl.current)URL.revokeObjectURL(takeUrl.current);takeUrl.current=null;setTake(null); }
  function cancel() { locked.current=false;cancelled.current = true; generation.current++; if(recorder.current?.state==='recording')recorder.current.stop();release();setRequesting(false);setKind(null);setProcessing(false);locked.current=false;pending.current(false); }
  useEffect(() => { alive.current = true; const hidden=()=>{if(document.hidden&&recorder.current?.state==='recording')recorder.current.stop();};document.addEventListener('visibilitychange',hidden);return()=>{alive.current=false;generation.current++;cancelled.current=true;if(recorder.current?.state==='recording')recorder.current.stop();release();if(takeUrl.current)URL.revokeObjectURL(takeUrl.current);pending.current(false);document.removeEventListener('visibilitychange',hidden);}; }, []);
  async function record(next: 'audio'|'video') {
    if(!allowedKinds.includes(next)||disabled||locked.current||requesting||kind||processing)return;locked.current=true;
    const token=++generation.current;requestedKind.current=next;cancelled.current=false;setError('');setRequesting(true);pending.current(true);forget();
    try {
      if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Recording is unavailable in this browser. Upload a file instead.');
      const mimeType=next==='video'?recordingType():['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(m=>MediaRecorder.isTypeSupported(m));
      const capture=await navigator.mediaDevices.getUserMedia({audio:true,video:next==='video'?{facingMode:'user',width:{ideal:1280},height:{ideal:720}}:false});
      if(!alive.current||token!==generation.current){capture.getTracks().forEach(t=>t.stop());return;}
      stream.current=capture;
      document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(m=>m.pause());
      if(camera.current&&next==='video'){camera.current.srcObject=capture;await camera.current.play();}
      if(referenceUrl&&monitor){const media=document.createElement(referenceKind);media.src=referenceUrl;media.preload='auto';media.volume=Math.min(1,Math.max(0,monitorGain));media.currentTime=startSeconds;reference.current=media;await media.play();}
      if(!alive.current||token!==generation.current){capture.getTracks().forEach(t=>t.stop());return;}
      const rec=new MediaRecorder(capture,{...(mimeType?{mimeType}:{}),videoBitsPerSecond:2_500_000});recorder.current=rec;
      const chunks:BlobPart[]=[];let bytes=0,failed=false;const started=performance.now();
      rec.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);bytes+=e.data.size;if(bytes>(next==='video'?100:25)*1024*1024){failed=true;if(rec.state==='recording')rec.stop();}}};
      rec.onerror=()=>{failed=true;if(rec.state==='recording')rec.stop();capture.getTracks().forEach(t=>t.stop());if(token!==generation.current)return;release();if(alive.current){setError('Recording failed. Upload a file or try again.');setKind(null);locked.current=false;pending.current(false);}};
      rec.onstop=()=>{capture.getTracks().forEach(t=>t.stop());if(!alive.current||cancelled.current||token!==generation.current)return;release();setKind(null);setProcessing(true);void(async()=>{
        try {if(failed)throw new Error('Recording exceeded its size limit. Try a shorter take.');const duration=Math.min(120,(performance.now()-started)/1000);if(duration<.15)throw new Error('Record a little longer before stopping.');let blob=new Blob(chunks,{type:rec.mimeType});if(next==='audio')blob=(await editableAudio(await decodeAudio(blob,120,true))).blob;
          if(!alive.current||token!==generation.current)return;const ext=next==='audio'?'wav':blob.type.includes('mp4')?'mp4':'webm';const file=new File([blob],`Your ${next} take.${ext}`,{type:blob.type});const url=URL.createObjectURL(file);takeUrl.current=url;setTake({file,url,kind:next,duration});
        }catch(e){if(alive.current&&token===generation.current)setError((e as Error).message);}finally{if(alive.current&&token===generation.current){setProcessing(false);locked.current=false;pending.current(false);}}
      })();};
      rec.start(250);setRequesting(false);setKind(next);timer.current=setTimeout(()=>{if(rec.state==='recording')rec.stop();},Math.min(120,Math.max(.1,endSeconds-startSeconds))*1000);
    } catch(e){if(token!==generation.current)return;release();if(alive.current&&token===generation.current){setRequesting(false);setKind(null);locked.current=false;pending.current(false);setError((e as Error).name==='NotAllowedError'?'Camera or microphone access was not granted. You can upload a file instead.':(e as Error).message);}}
  }
  return <div className="space-y-3" aria-label="Record your contribution">
    <div className="flex flex-wrap gap-2">{allowedKinds.includes('audio')&&<button type="button" className={button} disabled={disabled||requesting||!!kind||processing} onClick={()=>void record('audio')}>Record audio</button>}{allowedKinds.includes('video')&&<button type="button" className={button} disabled={disabled||requesting||!!kind||processing} onClick={()=>void record('video')}>Record video</button>}</div>
    <video ref={camera} muted playsInline className={kind==='video'||(requesting&&requestedKind.current==='video')?'mx-auto max-h-[45dvh] w-full rounded-lg bg-black object-contain':'hidden'} aria-label="Recording camera preview"/>
    {requesting&&<div className="flex flex-wrap gap-3 items-center"><p role="status">Waiting for camera or microphone…</p><button type="button" className={button} onClick={cancel}>Cancel recording</button></div>}
    {kind&&<div className="space-y-3"><p role="status" className="text-accent">Recording your {kind==='video'?'camera':'microphone'}…</p><div className="flex flex-wrap gap-2"><button type="button" className={primary} onClick={()=>recorder.current?.stop()}>Stop recording</button><button type="button" className={button} onClick={cancel}>Discard recording</button></div></div>}
    {processing&&<p role="status">Preparing your recording…</p>}
    {take&&<div className="rounded-xl border border-border p-3 space-y-3"><p className="text-sm">Review your take</p><p className="text-xs text-muted">Choose Use recording to add this take to your proposal.</p>{take.kind==='video'?<video src={take.url} playsInline controls className="w-full max-h-[45dvh] object-contain bg-black" aria-label="Recorded contribution"/>:<audio src={take.url} controls className="w-full" aria-label="Recorded contribution"/>}<div className="flex flex-wrap gap-2"><button type="button" className={primary} disabled={disabled} onClick={async()=>{if(await onTake(take.file,take.kind,take.duration))forget();}}>Use recording</button><button type="button" className={button} disabled={disabled} onClick={()=>void record(take.kind)}>Record again</button><button type="button" className={button} disabled={disabled} onClick={forget}>Discard take</button></div></div>}
    {!kind&&!take&&!requesting&&<p className="text-xs text-muted">Use headphones to keep the reference out of your microphone. Record up to {Math.round(Math.min(120,Math.max(.1,endSeconds-startSeconds)))} seconds.</p>}
    {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
  </div>;
}
