import { AdaptiveVideo } from './adaptive-video';
import type { VideoComposition } from '@nebula/local';
import { useEffect, useRef, useState } from 'react';

export type ComparisonTrack = { label: string; url: string; offset?: number; kind?: 'audio' | 'video'; composition?: VideoComposition };
/** One media element keeps A/B switching exclusive and at the same musical position. */
export function AudioComparison({ tracks, duration, expanded = false }: { tracks: ComparisonTrack[]; duration: number; expanded?: boolean }) {
  const [open, setOpen] = useState(expanded);
  if (expanded) return <section aria-label="Compare versions" className="rounded-xl border border-border bg-surface p-4"><Comparison tracks={tracks} duration={duration} /></section>;
  return <details open={open} className="rounded-xl border border-border bg-surface p-4" onToggle={e => setOpen(e.currentTarget.open)}><summary className="cursor-pointer min-h-11 flex items-center font-semibold">Compare versions</summary>{open && <Comparison tracks={tracks} duration={duration} />}</details>;
}
function Comparison({ tracks, duration }: { tracks: ComparisonTrack[]; duration: number }) {
  const [index, setIndex] = useState(0), [position, setPosition] = useState(0), [peaks, setPeaks] = useState<number[]>([]), [error, setError] = useState('');
  const audio = useRef<HTMLMediaElement>(null), resume = useRef(false), seek = useRef(0);
  const track = tracks[index] ?? tracks[0], offset = track.offset ?? 0;
  useEffect(() => { if(index >= tracks.length) { setIndex(0); resume.current=false; } }, [tracks.length, index]);
  const Media = track.kind === 'video' ? AdaptiveVideo : 'audio';
  useEffect(() => {
    const abort = new AbortController(); const context = new AudioContext(); setPeaks([]); setError('');
    void fetch(track.url, { signal: abort.signal }).then(r => { if (!r.ok) throw new Error('This version could not load.'); return r.arrayBuffer(); }).then(b => context.decodeAudioData(b)).then(buffer => {
      if (abort.signal.aborted) return;
      const data = buffer.getChannelData(0), start = Math.max(0, Math.floor(offset * buffer.sampleRate)), count = Math.floor(duration * buffer.sampleRate);
      setPeaks(Array.from({length: 160}, (_, i) => { let peak = 0; const lo = start + Math.floor(i * count / 160), hi = start + Math.floor((i + 1) * count / 160); for(let j=lo;j<hi&&j<data.length;j++) peak=Math.max(peak,Math.abs(data[j])); return peak; }));
    }).catch(e => { if (!abort.signal.aborted) setError(e.message); }).finally(() => { if(context.state !== 'closed') void context.close(); });
    return () => { abort.abort(); };
  }, [track.url, offset, duration]);
  function choose(next: number) { if(next===index)return; resume.current=!!audio.current&&!audio.current.paused; seek.current=Math.max(0,Math.min(duration,(audio.current?.currentTime??offset)-offset)); setPosition(seek.current); audio.current?.pause(); setIndex(next); }
  const label = (seconds: number) => `${Math.floor(seconds/60)}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Compare versions">{tracks.map((t,i)=><button key={t.label} type="button" aria-pressed={i===index} onClick={()=>choose(i)} className={`rounded-lg border px-4 py-3 text-sm ${i===index?'border-accent text-accent bg-accent/10':'border-border hover:border-ink'}`}>{t.label}</button>)}</div>
    <Media {...(track.kind === 'video' ? {composition:track.composition} : {})} key={track.url} ref={element => { audio.current = element; }} controls playsInline preload="metadata" className={track.kind === 'video' ? 'w-full max-h-[34dvh] sm:max-h-[42dvh] object-contain bg-black' : 'w-full'} src={track.url} aria-label={`Compare ${track.label}`} onLoadedMetadata={()=>{if(audio.current){audio.current.currentTime=Math.min(seek.current+offset,audio.current.duration);if(resume.current)void audio.current.play().catch(()=>setError('Press play to continue.'));resume.current=false;}}} onTimeUpdate={()=>{if(audio.current){const time=Math.max(0,audio.current.currentTime-offset);setPosition(Math.min(duration,time));if(time>=duration)audio.current.pause();}}} onPlay={()=>{if(audio.current&&position>=duration){audio.current.currentTime=offset;setPosition(0);}}} onError={()=>setError('This version could not load. Try reopening the comparison.')} />
    <div className={`relative ${track.kind === 'video' ? 'h-12' : 'h-20'} rounded-lg bg-surfaceAlt overflow-hidden`}><svg viewBox="0 0 640 80" preserveAspectRatio="none" aria-hidden="true" className="w-full h-full text-accent">{peaks.map((p,i)=><rect key={i} x={i*4} y={40-Math.max(1,p*36)} width="2" height={Math.max(2,p*72)} fill="currentColor"/>)}</svg><div className="absolute top-0 bottom-0 w-px bg-cream" style={{left:`${duration?position/duration*100:0}%`}}/></div>
    <label className="block text-xs text-muted">Comparison position · {label(position)} / {label(duration)}<input className="w-full mt-2 accent-accent min-h-11" type="range" min="0" max={duration} step="0.05" value={position} onChange={e=>{const time=Number(e.target.value);seek.current=time;setPosition(time);if(audio.current)audio.current.currentTime=time+offset;}} /></label>

    {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
  </div>;
}
