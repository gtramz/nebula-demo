import { Journey, JourneyContext, JourneyBack, JourneyNext, useJourney, pauseJourneyMedia } from '@/components/guided/journey';
import { ContributionRecorder } from '@/features/collaborations/contribution-recorder';
import { AdaptiveVideo } from './adaptive-video';
import { useLeaveGuard } from '@/components/shell/navigation-guard';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { useNotificationLock } from '@/features/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { defaultVideoComposition, type Publication, type RemixInput, type UploadedMedia, type RemixDraft } from '@nebula/local';
import { VideoFraming } from './video-framing';
import { uploadMedia } from '@/features/discovery/publication-api';
import { saveDraft, prepareRender } from './draft-api';
import { AudioComparison } from './audio-comparison';
import { FragmentSelector } from './fragment-selector';
import { initialFragment, type Fragment } from './fragment';
import { decodeAudio, renderMix, editableAudio } from './audio';
import { inspectMedia, renderVideo } from './video';
import { usePresentation, presentationAction } from '@/features/presentation';

const button = 'border border-border px-5 py-3 text-sm hover:border-accent disabled:opacity-40';
const field = 'block w-full min-w-0 border border-border bg-surfaceAlt p-3 text-sm mt-2';
type Contribution = { url: string; kind: 'audio' | 'video'; duration: number; name: string; audio?: AudioBuffer; blob?: Blob; mediaId?: string };
export function Studio({ original, draft, onDrafts }: { original: Publication; draft: RemixDraft; onDrafts: () => void }) {
  const presentation = usePresentation();
  const saving=useRef(false);
  const [journey,setJourney]=useJourney(`remix:${draft.ownerId}:${draft.id}`,{step:0,method:'video'});
  const prepared = presentation.data?.pairs.find(pair => pair.sourceId === original.id && pair.contributionKind === 'video');
  const client = useQueryClient(), sourceKind = original.media.kind as 'audio' | 'video';
  const [settings, setSettings] = useState<RemixInput>(draft.settings);
  const [length, setLength] = useState(0), [own, setOwn] = useState<Contribution | null>(draft.contribution ? { url: draft.contribution.url, kind: draft.contribution.kind as 'audio'|'video', duration: draft.contribution.duration, name: draft.contribution.name ?? 'Saved contribution', mediaId: draft.contribution.id } : null), [title, setTitle] = useState(draft.title), [description, setDescription] = useState(draft.description);
  const [busy, setBusy] = useState(false), [recording, setRecording] = useState(false), [dirty, setDirty] = useState(false), [error, setError] = useState(''), [progress, setProgress] = useState('');
  useNotificationLock(busy || !!recording);
  const [mix, setMix] = useState<Blob | null>(null), [preview, setPreview] = useState(draft.render?.url ?? ''), [playable, setPlayable] = useState(false), [saved, setSaved] = useState(false);
  const base = useRef<HTMLMediaElement | null>(null), player = useRef<HTMLMediaElement | null>(null), canvas = useRef<HTMLCanvasElement | null>(null);
  const alive = useRef(true), controller = useRef<AbortController | null>(null), uploaded = useRef<UploadedMedia | null>(draft.render), savedDraft = useRef(draft), contributionUpload = useRef<UploadedMedia | null>(draft.contribution);
  useEffect(() => {
    if (draft.contribution?.kind !== 'audio') return;
    const abort = new AbortController(); setBusy(true); setProgress('Restoring your contribution…');
    void fetch(draft.contribution.url, { signal: abort.signal }).then(response => { if (!response.ok) throw new Error('Saved contribution unavailable. Reopen your draft to retry.'); return response.blob(); }).then(blob => decodeAudio(blob,120,true)).then(audio => { if (!abort.signal.aborted) setOwn(value => value ? { ...value, audio } : value); }).catch(cause => { if (!abort.signal.aborted) setError(cause.message); }).finally(() => { if (!abort.signal.aborted) { setBusy(false); setProgress(''); } });
    return () => abort.abort();
  }, [draft.id]);
  function release() { base.current?.pause(); }
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); release(); }; }, []);
  useEffect(() => {
    const abort = new AbortController();
    void inspectMedia(original.media.url, sourceKind, 600, abort.signal).then(duration => { if (!abort.signal.aborted) { setLength(duration); if (draft.revision === 1) setSettings(value => ({ ...value, endSeconds: initialFragment(Math.floor(duration * 1000) / 1000).end })); } }).catch(cause => { if (!abort.signal.aborted) setError(cause.message); });
    return () => abort.abort();
  }, [original.media.url, sourceKind]);
  useEffect(() => () => { if (own) URL.revokeObjectURL(own.url); }, [own]);
  useEffect(() => { if (!mix) return; const url = URL.createObjectURL(mix); setPreview(url); return () => URL.revokeObjectURL(url); }, [mix]);
  const allowDeparture = useLeaveGuard(dirty || busy || recording ? 'Leave this unsaved remix? Save a private draft to keep your tracks and settings.' : null);
  const duration = settings.endSeconds - settings.startSeconds;
  const valid = length > 0 && duration >= .1 - 1e-9 && duration <= 60 + 1e-9 && settings.startSeconds >= 0 && settings.endSeconds <= length + .001 && settings.voiceOffset >= 0 && settings.voiceOffset < duration;
  function invalidate() { player.current?.pause(); base.current?.pause(); setMix(null); setPreview(''); setPlayable(false); setSaved(false); uploaded.current = null; setDirty(true); setError(''); }
  function change(key: keyof RemixInput, value: number) { invalidate(); setSettings(current => ({ ...current, [key]: value })); }
  function changeFragment(range: Fragment) {
    invalidate();
    setSettings(current => ({ ...current, startSeconds: range.start, endSeconds: range.end, voiceOffset: 0 }));
    if (base.current) base.current.currentTime = range.start;
  }
  // Source monitoring follows the same gain used for recording and export.
  useEffect(() => { if (base.current) base.current.volume = settings.baseGain; }, [settings.baseGain]);
  const audioAllowed = sourceKind === 'audio' && original.media.size <= 25 * 1024 * 1024;
  const outputKind = own?.kind === 'audio' ? 'audio' : 'video';
  const decodedBase = useRef<AudioBuffer | null>(null);
  async function add(blob: Blob, kind: 'audio' | 'video', name: string, knownDuration?: number, operation?: AbortController) {
    if (operation?.signal.aborted) return false;
    release(); invalidate(); contributionUpload.current = null; setOwn(null); setBusy(true); setProgress('Reading your contribution…');
    const url = URL.createObjectURL(blob), abort = operation ?? new AbortController(); controller.current = abort;
    try {
      if (kind === 'audio' && !audioAllowed) throw new Error(sourceKind === 'video' ? 'A video original requires your own video.' : 'This original exceeds the 25 MB audio mixing limit. Add a video instead.');
      if (blob.size > (kind === 'audio' ? 25 : 100) * 1024 * 1024) throw new Error(`Choose ${kind} up to ${kind === 'audio' ? 25 : 100} MB.`);
      const track = kind === 'audio' ? await editableAudio(await decodeAudio(blob, 120, knownDuration !== undefined)) : null;
      const audio = track?.audio;
      const duration = audio?.duration ?? await inspectMedia(url, kind, 120, abort.signal, knownDuration);
      if (alive.current && !abort.signal.aborted && controller.current === abort) { setOwn({ url, kind, duration, name, audio, blob: track?.blob ?? blob }); if (kind === 'video') setSettings(current => ({ ...current, composition: current.composition ?? defaultVideoComposition(sourceKind) })); return true; }
      URL.revokeObjectURL(url); return false;
    } catch (cause) { URL.revokeObjectURL(url); if (alive.current && !abort.signal.aborted && controller.current === abort) setError((cause as Error).message); return false; }
    finally { if (!operation && alive.current && controller.current === abort) { setBusy(false); setProgress(''); } }
  }
  async function build() {
    if (!own || !canvas.current || !valid) return; invalidate(); setBusy(true); setProgress(own.kind === 'audio' ? 'Preparing audio…' : 'Rendering video… 0%');
    const abort = new AbortController(); controller.current = abort;
    try {
      await prepareRender(draft.id, savedDraft.current.revision, abort.signal);
      if (!alive.current || abort.signal.aborted || controller.current !== abort) return;
      let result: Blob;
      if (own.kind === 'audio') {
        if (!audioAllowed || !own.audio) throw new Error('Choose an allowed contribution.');
        if (!decodedBase.current) {
          const response = await fetch(original.media.url, { signal: abort.signal });
          if (!response.ok) throw new Error('The original audio is no longer available.');
          decodedBase.current = await decodeAudio(await response.blob(), 600, true);
        }
        if (abort.signal.aborted) return;
        result = await renderMix(decodedBase.current, own.audio, settings);
      } else result = await renderVideo({ source: original.media.url, sourceKind, contribution: own.url, contributionKind: own.kind, settings, canvas: canvas.current, signal: abort.signal, progress: value => { if (alive.current && !abort.signal.aborted && controller.current === abort) setProgress(`Rendering video… ${value}%`); } });
      if (alive.current && !abort.signal.aborted && controller.current === abort) setMix(result);
    }
    catch (cause) { if (alive.current && controller.current === abort) setError((cause as Error).message); }
    finally { if (alive.current && controller.current === abort) { setBusy(false); setProgress(''); } }
  }
  async function save(exit=false) {
    if (!valid || !title.trim() || busy || recording || saving.current) return; saving.current=true; setBusy(true); setError(''); player.current?.pause(); base.current?.pause(); const abort = new AbortController(); controller.current = abort;
    try {
      if (own && !contributionUpload.current) {
        if (!own.blob) throw new Error('Reopen the saved draft to restore your contribution.');
        const contribution = await uploadMedia(new File([own.blob], own.kind === 'audio' ? `${own.name.replace(/\.[^.]+$/, '')}.wav` : own.name, { type: own.blob.type }), own.kind, value => { if (alive.current && controller.current === abort) setProgress(`Saving contribution… ${value}%`); }, abort.signal, draft.id);
        if (!alive.current || abort.signal.aborted || controller.current !== abort) return;
        contributionUpload.current = contribution;
      }
      if (mix && playable && !uploaded.current) {
        const rendered = await uploadMedia(new File([mix], outputKind === 'audio' ? 'remix.wav' : mix.type.includes('mp4') ? 'remix.mp4' : 'remix.webm', { type: mix.type }), outputKind, value => { if (alive.current && controller.current === abort) setProgress(`Saving preview… ${value}%`); }, abort.signal, draft.id);
        if (!alive.current || abort.signal.aborted || controller.current !== abort) return;
        uploaded.current = rendered;
      }
      if (!alive.current || abort.signal.aborted || controller.current !== abort) return;
      const result = await saveDraft(draft.id, { revision: savedDraft.current.revision, title, description, settings,
        contributionId: contributionUpload.current?.id ?? null, contributionDuration: own?.duration ?? null,
        renderId: uploaded.current?.id ?? null }, abort.signal);
      if (!alive.current || abort.signal.aborted || controller.current !== abort) return;
      savedDraft.current = result; setSaved(true); setDirty(false); client.setQueryData(['remix-draft', draft.ownerId, draft.id], result);
      await client.invalidateQueries({ queryKey: ['remix-drafts'] });
      if(exit&&alive.current){allowDeparture();onDrafts();}
      // The workspace owns its edit state. Do not refetch/remount it while editing.
    } catch (cause) { if (alive.current && controller.current === abort) setError((cause as Error).message); }
    finally { saving.current=false; if (alive.current && controller.current === abort) { setBusy(false); setProgress(''); } }
  }
  const baseProps = { onLoadedMetadata: () => { if (base.current) base.current.currentTime = settings.startSeconds; }, controls: false, preload: 'metadata', className: 'w-full max-h-72 object-contain bg-black rounded-xl', src: original.media.url, onPlay: () => { player.current?.pause(); if (base.current && (base.current.currentTime < settings.startSeconds || base.current.currentTime >= settings.endSeconds)) base.current.currentTime = settings.startSeconds; }, onTimeUpdate: () => { if (base.current && base.current.currentTime >= settings.endSeconds) base.current.pause(); } };
  const locked=busy||!!recording;
  const maxStep=!valid?0:preview&&playable?3:own?2:1;
  const step=Math.min(journey.step,maxStep);
  function go(next:number){if(locked)return;pauseJourneyMedia();setJourney({step:Math.min(next,maxStep)});}
  const steps=[
    {title:'Choose the fragment',description:''},
    {title:'Your contribution',description:''},
    {title:'Framing & mix',description:''},
    {title:'Review & save',description:''},
  ];
  return <section className="mx-auto w-full max-w-6xl p-4 sm:p-8 pb-24 space-y-6">
    <header><h1 className="text-3xl font-bold">Remix studio</h1></header>
    <Journey label="Remix" showStepLabel={false} steps={steps} step={step} maxStep={maxStep} locked={locked} onStep={go} context={<JourneyContext cover={original.coverUrl} title={original.title} artist={original.artistName}><p>Original stays credited</p><p>{duration.toFixed(1)}s fragment</p><Link className="inline-flex min-h-11 items-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline" href={`/discovery?post=post-${original.id}`}>Open original</Link></JourneyContext>} footer={<>{step>0&&<JourneyBack disabled={locked} onClick={()=>go(step-1)}/>}<button type="button" className={button} disabled={locked||!valid||!title.trim()||(!!mix&&!playable)} onClick={()=>void save(true)}>Save &amp; exit</button>{step<3?<JourneyNext disabled={locked||!valid||step===1&&!own||step===2&&(!preview||!playable)} onClick={()=>go(step+1)}>Continue</JourneyNext>:<button type="button" className="guided-next" disabled={locked||!valid||!title.trim()||!preview||!playable} onClick={()=>void save()}>Save remix draft</button>}</>}>
    <fieldset disabled={busy} className="space-y-6 disabled:opacity-60">
      <section hidden={step!==0} className="space-y-4">
        <h3 className="font-semibold">Choose the base fragment</h3>
        {sourceKind === 'video' ? <video {...baseProps} playsInline ref={element => { base.current = element; }} aria-label="Original fragment" /> : <audio {...baseProps} className="hidden" ref={element => { base.current = element; }} aria-label="Original fragment" />}
        <FragmentSelector postId={original.id} mediaId={original.media.id} length={length} range={{start:settings.startSeconds,end:settings.endSeconds}} mediaRef={base} disabled={busy || !!recording} onChange={changeFragment} />
        {length > 0 && <p className="text-xs text-muted">Original duration: {length.toFixed(2)} seconds. Selected: {duration.toFixed(2)} seconds.</p>}
      </section>
      <section hidden={step!==1} className="space-y-4">
        {prepared && <button className={button} disabled={locked} onClick={async()=>{
          setBusy(true);setError('');release();player.current?.pause();const abort=new AbortController();controller.current=abort;
          try { const media=await presentationAction<UploadedMedia>('contribution',{sourceId:original.id,draftId:draft.id},abort.signal); const response=await fetch(media.url,{signal:abort.signal});if(!response.ok)throw new Error('Could not load this take. Try again.'); const blob=await response.blob();if(!alive.current||abort.signal.aborted)return;const added=await add(blob,media.kind as 'audio'|'video',media.name??prepared.title,undefined,abort);if(!added||!alive.current||abort.signal.aborted)return;contributionUpload.current=media; setSettings(current=>({...current,startSeconds:prepared.startSeconds??0,endSeconds:Math.min(length,prepared.endSeconds??length),baseGain:prepared.baseGain??.76,voiceGain:prepared.contributionGain??.42,voiceOffset:0})); }
          catch(e){if(alive.current&&!abort.signal.aborted&&controller.current===abort)setError((e as Error).message);}finally{if(alive.current&&controller.current===abort){setBusy(false);setProgress('');}}
        }}>Use prepared take · {prepared.title}</button>}
        <label className="block">Upload video<input className={field} type="file" disabled={locked} accept="video/mp4,video/webm" onChange={e => {
          const file=e.target.files?.[0];e.target.value='';if(!file)return;
          if(!file.type.startsWith('video/')&&!/\.(mp4|webm)$/i.test(file.name)){setError('Choose a video contribution.');return;}
          void add(file,'video',file.name);
        }}/></label>
        <p className="text-xs text-muted">Video: up to 120 seconds and 100 MB.</p>
        <ContributionRecorder disabled={busy} allowedKinds={['video']} referenceUrl={original.media.url} referenceKind={sourceKind} startSeconds={settings.startSeconds} endSeconds={settings.endSeconds} monitorGain={settings.baseGain} onPendingChange={setRecording} onTake={(file,kind,duration)=>add(file,kind,file.name,duration).then(Boolean)}/>
        {own && <p role="status" className="text-sm text-accent break-words">Your contribution is ready · {own.name} · {own.duration.toFixed(2)} seconds</p>}
      </section>
      <section hidden={step!==2} className="guided-stage">
        <div className="grid grid-cols-2 gap-4"><label>Base volume <span className="text-muted">{Math.round(settings.baseGain * 100)}%</span><input aria-label="Base volume" className={field} type="range" disabled={locked} min="0.05" max="1" step="0.05" value={settings.baseGain} onChange={e => change('baseGain', Number(e.target.value))} /></label><label>Your contribution volume <span className="text-muted">{Math.round(settings.voiceGain * 100)}%</span><input aria-label="Your contribution volume" className={field} type="range" disabled={locked} min="0.05" max="1" step="0.05" value={settings.voiceGain} onChange={e => change('voiceGain', Number(e.target.value))} /></label></div>
      <p className="text-xs text-muted">Rebuild preview after changing levels.</p><button disabled={locked} className={button} onClick={() => { invalidate(); setSettings(current => ({ ...current, baseGain: .65, voiceGain: .8 })); }}>Reset volumes</button>
      {own?.kind === 'video' && <VideoFraming source={original.media.url} sourceKind={sourceKind} contribution={own.url} startSeconds={settings.startSeconds} value={settings.composition} disabled={busy || !!recording} onChange={composition => { invalidate(); setSettings(current => ({ ...current, composition })); }} />}
      </section>
      <section hidden={step<2} aria-label="Remix preview" className="space-y-4"><h3 className="font-semibold">Preview your mix</h3>{own?.kind === 'video' && <p className="text-sm text-muted">Keep this tab visible while rendering.</p>}<button hidden={step!==2} type="button" className={button} disabled={locked || !valid || !own} onClick={() => void build()}>Build preview</button>
        {preview && (outputKind === 'video' ? <AdaptiveVideo composition={settings.composition} aria-label="Remix preview" ref={element => { player.current = element; }} src={preview} controls playsInline preload="auto" className="mx-auto w-full max-h-[70dvh] object-contain bg-black rounded-xl" onPlay={() => base.current?.pause()} onLoadedData={() => setPlayable(true)} onError={() => { setPlayable(false); setError('Preview could not be played. Rebuild your mix.'); }} /> : <audio ref={element => { player.current = element; }} src={preview} controls preload="auto" className="w-full" onPlay={() => base.current?.pause()} onLoadedData={() => setPlayable(true)} onError={() => { setPlayable(false); setError('Preview could not be played. Rebuild your mix.'); }} />)}
      </section>
      <div hidden={step!==3} className="guided-stage">
      {preview && own && <AudioComparison key={preview} duration={settings.endSeconds-settings.startSeconds} tracks={[{label:"Original",url:original.media.url,kind:sourceKind,offset:settings.startSeconds},...(settings.voiceOffset===0?[{label:"Contribution",url:own.url,kind:own.kind}]:[]),{label:"Your version",url:preview,kind:own.kind,composition:settings.composition}]} />}
      <label className="block">Remix title<input className={field} value={title} maxLength={160} onChange={e => { setTitle(e.target.value); setDirty(true); setSaved(false); }} /></label><label className="block">Description<textarea aria-label="Description" className={field} rows={3} maxLength={2000} value={description} onChange={e => { setDescription(e.target.value); setDirty(true); setSaved(false); }} /></label>
      </div>
    </fieldset>
    <canvas ref={canvas} className="hidden" aria-hidden="true" />
    {busy && <div className="space-y-3"><p role="status">{progress || 'Saving remix…'}</p>{!progress.includes('permission') && <button className={button} onClick={() => controller.current?.abort()}>Cancel operation</button>}</div>}
    {error && <p role="alert" className="text-danger">{error}</p>}
    {saved && <div role="status" className="space-y-3"><p className="text-accent">Remix draft saved</p>{savedDraft.current.render && savedDraft.current.attribution.projectId && <Link className={`${button} inline-block`} href="/studio/remix/proposal">Propose to original project</Link>}</div>}
    {!dirty && !saved && draft.render && draft.attribution.projectId && <Link className={`${button} inline-block`} href="/studio/remix/proposal">Propose to original project</Link>}
    {error.includes('another tab') && <button className={button} onClick={() => { if (window.confirm('Discard these local edits and reopen the latest saved draft?')) { setDirty(false); setTimeout(() => window.location.reload(), 0); } }}>Reopen saved draft</button>}
    </Journey>
  </section>;
}
