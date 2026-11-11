import { AdaptiveVideo, isSplitVideo } from '@/features/remix/adaptive-video';
import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, type Waveform } from '@nebula/local';
import { Disc3, Play, Pause, Maximize, Volume2, VolumeX } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotificationsOpen } from '@/features/notifications';
import { DiscoveryArtwork } from './cover-artwork';
import type { FeedPlaybackState } from './feed-preparation';
import type { DemoPost } from './demo-posts';

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

export function VideoDiscoveryPlayer({ children }: { children: ReactNode }) {
  return <div className="discovery-video-stage">{children}</div>;
}
export function AudioDiscoveryCard({ post, info, controls, playback, eager }: { post: DemoPost; eager?: boolean; info: ReactNode; controls: ReactNode; playback: ReactNode }) {
  return <>
    <div className="discovery-audio-stage">
      <div className="discovery-cover"><DiscoveryArtwork post={post} eager={eager} />{playback}</div>
    </div>
    {info}
    {controls}
  </>;
}

export function WaveformProgress({ data, progress }: { data: Waveform; progress: number }) {
  const id = useId().replaceAll(':', '');
  // Reduce only for drawing; every visible column uses the peak in its source interval.
  const path = useMemo(() => {
    const count = Math.min(400, data.peaks.length);
    // Normalize the display to this track’s loudest peak; silence stays a flat line.
    const ceiling = data.peaks.reduce((max, peak) => Math.max(max, peak), 0) || 1;
    return Array.from({ length: count }, (_, i) => {
      const from = Math.floor(i * data.peaks.length / count), to = Math.floor((i + 1) * data.peaks.length / count);
      let peak = 0; for (let n = from; n < to; n++) peak = Math.max(peak, data.peaks[n]);
      const amplitude = Math.min(1, peak / ceiling) * 27, x = (i + .5) / count * 1000;
      return `M${x},${30 - amplitude}V${30 + amplitude}`;
    }).join(' ');
  }, [data]);
  return <svg className="discovery-waveform" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
    <defs><clipPath id={id}><rect width={progress * 1000} height="60" /></clipPath></defs>
    <g stroke="#555" strokeWidth="2"><path d="M0 30H1000" /><path d={path} /></g>
    <g stroke="currentColor" strokeWidth="2" clipPath={`url(#${id})`}><path d="M0 30H1000" /><path d={path} /></g>
  </svg>;
}

export const DiscoveryMedia = memo(function DiscoveryMedia({ post, active, nearby, blocked, desktopControls = false, prepare = false, playbackState, onReady, waveformAccess, info }: { post: DemoPost; desktopControls?: boolean; prepare?: boolean; playbackState?: FeedPlaybackState; onReady?: () => void; active: boolean; nearby: boolean; blocked: boolean; waveformAccess: boolean; info: ReactNode }) {
  const notificationsOpen = useNotificationsOpen(), isMobile = useIsMobile();
  blocked = blocked || notificationsOpen;
  const media = useRef<HTMLMediaElement | null>(null), wasActive = useRef(false);
  const allowed = useRef(false); allowed.current = active && !blocked;
  const [playing, setPlaying] = useState(false), [muted, setMuted] = useState(playbackState?.muted ?? false);
  const attempt = useRef(0), wantsPlayback = useRef(false);
  const [progress, setProgress] = useState(playbackState?.time ?? 0), [duration, setDuration] = useState(playbackState?.duration ?? post.media.durationSeconds);
  const [failed, setFailed] = useState(false), [buffering, setBuffering] = useState(false), [notice, setNotice] = useState('');
  const surface = useRef<HTMLDivElement>(null);
  const [volume,setVolume] = useState(playbackState?.volume ?? 1);
  const audio = post.media.kind === 'audio';
  const tapStart = useRef<{x:number;y:number}|null>(null);
  const waveform = useQuery({ queryKey: ['discovery-waveform', post.id, post.media.src],
    queryFn: ({ signal }) => apiRequest<Waveform>(`/api/publications/${post.id.slice(5)}/waveform?listen=1`, { signal }),
    enabled: active && audio && waveformAccess, retry: false, refetchOnWindowFocus: false, staleTime: 60_000, gcTime: 60_000 });
  const wave = waveformAccess ? waveform.data : undefined;
  useEffect(() => {
    // Mobile has no software-volume control: never carry a desktop mute into that layout.
    if (isMobile) { if (playbackState) playbackState.muted = false; setMuted(false); if (media.current) { media.current.muted = false; media.current.volume = 1; } }
  }, [isMobile]);
  async function startPlayback() {
    const element = media.current;
    if (!element || !allowed.current || document.hidden) return;
    const ticket = ++attempt.current; wantsPlayback.current = true;
    try {
      await element.play();
      if (!allowed.current || !wantsPlayback.current || document.hidden || media.current !== element) element.pause();
      else if (ticket === attempt.current) setNotice('');
    } catch (error) {
      if (ticket !== attempt.current || !allowed.current || document.hidden) return;
      if ((error as DOMException).name !== 'AbortError') setNotice('Tap to play with sound.');
    }
  }
  useLayoutEffect(() => {
    allowed.current = active && !blocked;
    const element = media.current; if (!element) return;
    if (active && element.readyState >= 3) onReady?.();
    if (!active || blocked) { ++attempt.current; wantsPlayback.current = false; element.pause(); }
    if (active && !wasActive.current && !blocked && !document.hidden && (audio || !matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      // Try audible playback for both formats. A browser denial requires an explicit tap;
      // do not silently switch to muted playback or retry from a stale publication.
      void startPlayback();
    }
    wasActive.current = active;
  }, [active, blocked, audio, nearby]);
  useEffect(() => {
    const element = media.current;
    if (!nearby || !element) return;
    const pause = () => { if (document.hidden) { ++attempt.current; wantsPlayback.current = false; element.pause(); } };
    document.addEventListener('visibilitychange', pause);
    return () => { ++attempt.current; wantsPlayback.current = false; if (playbackState && element.readyState >= 1) playbackState.time = element.currentTime; element.pause(); element.removeAttribute('src'); element.load(); document.removeEventListener('visibilitychange', pause); };
  }, [nearby]);
  function toggle() {
    const element = media.current; if (!element || !allowed.current) return;
    if (!element.paused) { ++attempt.current; wantsPlayback.current = false; element.pause(); return; }
    void startPlayback();
  }
  function seek(value: number) { if (media.current && duration && allowed.current) { media.current.currentTime = value; setProgress(value); if (playbackState) playbackState.time = value; } }
  const mediaProps = {
    src: post.media.src, loop: true, preload: prepare && !blocked ? 'auto' : 'metadata', muted,
    'data-playback-allowed': active && !blocked ? 'true' : 'false',
    onPlay: () => { if (!allowed.current || !wantsPlayback.current || document.hidden) media.current?.pause(); else setPlaying(true); },
    onVolumeChange: () => { const element=media.current; if(element) { setVolume(element.volume); setMuted(element.muted); if(playbackState) { playbackState.volume=element.volume; playbackState.muted=element.muted; } } },
    onPause: () => { setPlaying(false); setBuffering(false); }, onPlaying: () => { setBuffering(false); setNotice(''); },
    onWaiting: () => setBuffering(true), onCanPlay: () => { setBuffering(false); if (active) onReady?.(); },
    onLoadedMetadata: () => { const element = media.current; if (element) { element.volume = isMobile ? 1 : playbackState?.volume ?? 1; if (Number.isFinite(element.duration)) element.currentTime = Math.min(playbackState?.time ?? progress, element.duration); } },
    onTimeUpdate: () => { const element = media.current; if (!element || element.readyState < 1) return;
      setProgress(element.currentTime); if (playbackState) playbackState.time = element.currentTime; },
    onDurationChange: () => { const value = media.current?.duration ?? 0; if (Number.isFinite(value) && value > 0) { setDuration(value); if (playbackState) playbackState.duration = value; } },
    onError: () => { setFailed(true); setPlaying(false); setBuffering(false); },
  };
  const played = duration ? Math.min(1, progress / duration) : 0;
  const controls =
    <div className="discovery-media-controls">
      <div className={`discovery-seek ${wave ? 'has-waveform' : ''}`} style={{ '--played': `${played * 100}%` } as CSSProperties}>
        {wave && <WaveformProgress data={wave} progress={played} />}
        <input type="range" min={0} max={duration || 1} step={.1} value={Math.min(progress, duration || 1)} aria-label={`Seek ${post.title}`} aria-valuetext={`${time(progress)} of ${time(duration)}`} disabled={!duration || failed || !active || blocked} onChange={event => seek(Number(event.target.value))} />
      </div>

      {desktopControls && <div className="discovery-desktop-transport">
        <button aria-label={playing?'Pause':'Resume playback'} disabled={!active || blocked || failed} onClick={toggle}>{playing?<Pause size={18}/>:<Play size={18}/>}</button>
        <span>{time(progress)} / {time(duration)}</span>
        <div className="discovery-desktop-volume"><button aria-label={`${muted?'Unmute':'Mute'} ${post.title}`} aria-pressed={muted} disabled={!active || blocked || failed} onClick={()=>{if(media.current)media.current.muted=!muted;}}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>
        <input aria-label={`Volume ${post.title}`} type="range" min="0" max="1" step="0.05" value={volume} disabled={!active || blocked || failed} onChange={e=>{if(media.current){media.current.volume=Number(e.target.value);media.current.muted=false;}}}/></div>
        <button aria-label="Full screen" disabled={!active} onClick={()=>{const request=document.fullscreenElement ? document.exitFullscreen() : surface.current?.requestFullscreen();void request?.catch(()=>setNotice('Full screen unavailable. Try again.'));}}><Maximize size={18}/></button>
      </div>}
      <div className="discovery-media-status" role="status">
        {failed ? <><span>Media unavailable.</span><button onClick={() => { setFailed(false); setNotice(''); media.current?.load(); void startPlayback(); }}>Retry playback</button></> : buffering ? 'Buffering…' : notice || (audio && waveformAccess && waveform.isFetching ? 'Loading waveform…' : audio && !wave ? waveformAccess && waveform.isError ? 'Waveform unavailable · audio timeline' : 'Audio timeline' : wave && !wave.hasAudio ? 'No audio track' : '')}
      </div>
    </div>;
  const playback = <button type="button" className="discovery-video-tap" aria-label={`${playing ? 'Pause' : 'Play'} ${post.title}`} disabled={!active || blocked || failed}
        onPointerDown={e => { tapStart.current = {x:e.clientX,y:e.clientY}; }} onPointerCancel={() => { tapStart.current = null; }}
        onClick={e => { const start=tapStart.current; tapStart.current=null; if(e.detail!==0 && (!start || Math.hypot(e.clientX-start.x,e.clientY-start.y)>12)) return; void toggle(); }}>
        {!playing && <span className="discovery-video-play-icon"><Play size={30} aria-hidden="true" /></span>}
      </button>;
  return <div ref={surface} className={`discovery-media ${audio ? 'is-audio' : 'is-video'} ${!audio && isSplitVideo(post.composition) ? 'is-split-video' : ''}`}>
    {audio ? <><AudioDiscoveryCard post={post} eager={prepare && !blocked} info={info} controls={controls} playback={playback} />{nearby && <audio {...mediaProps} ref={element => { media.current = element; }} aria-label={`${post.title} audio`} />}</>
      : <><VideoDiscoveryPlayer>{nearby ? <AdaptiveVideo composition={post.composition} {...mediaProps} ref={element => { media.current = element; }} poster={post.coverUrl ?? undefined} playsInline className="discovery-video" aria-label={`${post.title} video`} /> : post.coverUrl ? <img src={post.coverUrl} alt="" loading="lazy" className="discovery-video" /> : <Disc3 aria-hidden="true" size={48} />}{playback}<button type="button" className="discovery-video-sound" disabled={!active || blocked || failed} aria-label={`${muted ? 'Unmute' : 'Mute'} ${post.title}`} aria-pressed={muted} onClick={() => { if(media.current) { media.current.volume=1; media.current.muted=!muted; } if (playbackState) playbackState.muted = !muted; setMuted(value=>!value); }}>{muted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button></VideoDiscoveryPlayer>{controls}{info}</>}
  </div>;
});
