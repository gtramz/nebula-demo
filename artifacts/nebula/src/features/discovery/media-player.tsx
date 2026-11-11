import { AdaptiveVideo, isSplitVideo } from '@/features/remix/adaptive-video';
import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, type Waveform } from '@nebula/local';
import { Disc3, Maximize, Play, Volume2, VolumeX } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotificationsOpen } from '@/features/notifications';
import { AmbientArtwork } from './ambient-artwork';
import { DiscoveryArtwork } from './cover-artwork';
import type { FeedPlaybackState } from './feed-preparation';
import type { DemoPost } from './demo-posts';

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

export function VideoDiscoveryPlayer({ children }: { children: ReactNode }) {
  return <div className="discovery-video-stage">{children}</div>;
}
export function AudioDiscoveryCard({ post, info, controls, playback, playbackToggle, eager }: { post: DemoPost; eager?: boolean; info: ReactNode; controls: ReactNode; playback: ReactNode; playbackToggle?: ReactNode }) {
  return <>
    <div className="discovery-audio-stage">
      <AmbientArtwork post={post} enabled={eager}/><div className="discovery-cover"><DiscoveryArtwork post={post} eager={eager} retryable />{playback}{playbackToggle}</div>
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

function DesktopVolumeControl({ title, muted, volume, disabled, onToggleMute, onVolumeChange }: { title: string; muted: boolean; volume: number; disabled: boolean; onToggleMute: () => void; onVolumeChange: (volume: number) => void }) {
  const group = useRef<HTMLDivElement>(null), sliderId = useId();
  const [hovered, setHovered] = useState(false), [keyboardFocused, setKeyboardFocused] = useState(false);
  const [dragging, setDragging] = useState(false), [touchOpen, setTouchOpen] = useState(false);
  const open = !disabled && (hovered || keyboardFocused || dragging || touchOpen);
  useEffect(() => {
    if (!touchOpen && !keyboardFocused) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !group.current?.contains(event.target)) { setTouchOpen(false); setKeyboardFocused(false); }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [touchOpen, keyboardFocused]);
  useEffect(() => {
    if (disabled) { setHovered(false); setKeyboardFocused(false); setDragging(false); setTouchOpen(false); }
  }, [disabled]);
  return <div ref={group} className="discovery-desktop-volume" data-open={open}
    onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(true); }} onPointerLeave={() => setHovered(false)}
    onPointerDownCapture={() => setKeyboardFocused(false)}
    onFocus={event => setKeyboardFocused(event.target.matches(':focus-visible'))}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setKeyboardFocused(false); setTouchOpen(false); } }}
    onKeyDown={() => setKeyboardFocused(true)}>
    <button type="button" aria-label={`${muted ? 'Unmute' : 'Mute'} ${title}`} aria-pressed={muted} aria-controls={sliderId} disabled={disabled}
      onPointerDown={event => { if (event.pointerType === 'touch') { setTouchOpen(true); event.currentTarget.focus({ preventScroll: true }); } }}
      onClick={onToggleMute}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
    <div id={sliderId} className="discovery-desktop-volume-slider" aria-hidden={!open}>
      <input aria-label={`Volume ${title}`} aria-valuetext={`${Math.round(volume * 100)}%`} type="range" min="0" max="1" step="0.05" value={volume} disabled={disabled}
        onPointerDown={event => { setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)} onLostPointerCapture={() => setDragging(false)}
        onChange={event => onVolumeChange(Number(event.target.value))} />
    </div>
  </div>;
}

export const DiscoveryMedia = memo(function DiscoveryMedia({ post, active, nearby, blocked, desktopControls = false, prepare = false, playbackState, onReady, waveformAccess, info }: { post: DemoPost; desktopControls?: boolean; prepare?: boolean; playbackState?: FeedPlaybackState; onReady?: () => void; active: boolean; nearby: boolean; blocked: boolean; waveformAccess: boolean; info: ReactNode }) {
  const notificationsOpen = useNotificationsOpen(), isMobile = useIsMobile();
  blocked = blocked || notificationsOpen;
  const media = useRef<HTMLMediaElement | null>(null), mounted = useRef(true), wasActive = useRef(false), manuallyPaused = useRef(false);
  const allowed = useRef(false); allowed.current = active && !blocked;
  const [playing, setPlaying] = useState(false), [muted, setMuted] = useState(playbackState?.muted ?? false);
  const attempt = useRef(0), pendingPlay = useRef<number | null>(null), wantsPlayback = useRef(false);
  const [progress, setProgress] = useState(playbackState?.time ?? 0), [duration, setDuration] = useState(playbackState?.duration ?? post.media.durationSeconds);
  const [failed, setFailed] = useState(false), [ready, setReady] = useState(false), [buffering, setBuffering] = useState(false), [notice, setNotice] = useState(''), [playBlocked, setPlayBlocked] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const [volume,setVolume] = useState(playbackState?.volume ?? 1);
  const audio = post.media.kind === 'audio';
  const keyboardHint = useId();
  const waveform = useQuery({ queryKey: ['discovery-waveform', post.id, post.media.src],
    queryFn: ({ signal }) => apiRequest<Waveform>(`/api/publications/${post.id.slice(5)}/waveform?listen=1`, { signal }),
    enabled: active && audio && waveformAccess, retry: false, refetchOnWindowFocus: false, staleTime: 60_000, gcTime: 60_000 });
  const wave = waveformAccess ? waveform.data : undefined;
  useEffect(()=>{if(active&&ready&&(!audio||!waveformAccess||waveform.data||waveform.isError))onReady?.();},[active,ready,audio,waveformAccess,waveform.data,waveform.isError,onReady]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function startPlayback() {
    const element = media.current;
    if (!element || !allowed.current || document.hidden || pendingPlay.current !== null) return;
    const ticket = ++attempt.current; wantsPlayback.current = true; pendingPlay.current = ticket;
    const current = () => mounted.current && ticket === attempt.current && allowed.current && wantsPlayback.current && !document.hidden && media.current === element;
    try {
      try { await element.play(); }
      catch (error) {
        if (!current()) return;
        if ((error as DOMException).name !== 'NotAllowedError') throw error;
        // Autoplay may require silence. This is the same real player/clock;
        // the volume control can restore sound from an explicit gesture.
        element.muted = true; setMuted(true);
        if (playbackState) playbackState.muted = true;
        await element.play();
      }
      if (!allowed.current || !wantsPlayback.current || document.hidden || media.current !== element) element.pause();
      else if (current()) { setNotice(''); setPlayBlocked(false); }
    } catch (error) {
      if (!current() || (error as DOMException).name === 'AbortError') return;
      setBuffering(false); setPlayBlocked(true);
      setNotice((error as DOMException).name === 'NotAllowedError' ? 'Automatic playback is blocked.' : 'Playback unavailable.');
    } finally { if (pendingPlay.current === ticket) pendingPlay.current = null; }
  }
  useLayoutEffect(() => {
    allowed.current = active && !blocked;
    if (active && !wasActive.current) manuallyPaused.current = false;
    wasActive.current = active;
    const element = media.current; if (!element) return;
    if (element.readyState >= 2) setReady(true);
    if (!active || blocked) { ++attempt.current; pendingPlay.current = null; wantsPlayback.current = false; element.pause(); }
    else if (!document.hidden && !manuallyPaused.current) void startPlayback();
  }, [active, blocked, nearby]);
  useEffect(() => {
    const element = media.current;
    if (!nearby || !element) return;
    const visibility = () => {
      if (document.hidden) { ++attempt.current; pendingPlay.current = null; wantsPlayback.current = false; element.pause(); }
      else if (allowed.current && !manuallyPaused.current) void startPlayback();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => { ++attempt.current; pendingPlay.current = null; wantsPlayback.current = false; if (playbackState && element.readyState >= 1) playbackState.time = element.currentTime; element.pause(); element.removeAttribute('src'); element.load(); document.removeEventListener('visibilitychange', visibility); };
  }, [nearby]);
  function toggle() {
    const element = media.current; if (!element || !allowed.current) return;
    if (!element.paused) { ++attempt.current; pendingPlay.current = null; manuallyPaused.current = true; wantsPlayback.current = false; element.pause(); return; }
    manuallyPaused.current = false;
    void startPlayback();
  }
  function seek(value: number) { if (media.current && duration && allowed.current) { media.current.currentTime = value; setProgress(value); if (playbackState) playbackState.time = value; } }
  const mediaProps = {
    src: post.media.src, loop: true, preload: prepare ? 'auto' : 'metadata', muted,
    'data-playback-allowed': active && !blocked ? 'true' : 'false',
    onPlay: () => { if (!allowed.current || !wantsPlayback.current || document.hidden) media.current?.pause(); },
    onVolumeChange: () => { const element=media.current; if(element) { setVolume(element.volume); setMuted(element.muted); if(playbackState) { playbackState.volume=element.volume; playbackState.muted=element.muted; } } },
    onPause: () => { setPlaying(false); setBuffering(false); },
    onPlaying: () => { if (!allowed.current || !wantsPlayback.current || document.hidden) { media.current?.pause(); return; } setPlaying(true); setReady(true); setBuffering(false); setPlayBlocked(false); setNotice(''); },
    onWaiting: () => { if (allowed.current && wantsPlayback.current) { setPlaying(false); setBuffering(true); } },
    onLoadStart: () => { setReady(false); setFailed(false); },
    onLoadedData: () => setReady(true),
    onCanPlay: () => { setReady(true); setBuffering(false); if (allowed.current && wantsPlayback.current && media.current?.paused) void startPlayback(); },
    onLoadedMetadata: () => { const element = media.current; if (element) { element.volume = isMobile ? 1 : playbackState?.volume ?? 1; if (Number.isFinite(element.duration)) element.currentTime = Math.min(playbackState?.time ?? progress, element.duration); } },
    onTimeUpdate: () => { const element = media.current; if (!element || element.readyState < 1) return;
      setProgress(element.currentTime); if (playbackState) playbackState.time = element.currentTime; },
    onDurationChange: () => { const value = media.current?.duration ?? 0; if (Number.isFinite(value) && value > 0) { setDuration(value); if (playbackState) playbackState.duration = value; } },
    onError: () => { setFailed(true); setPlaying(false); setBuffering(false); },
  };
  const played = duration ? Math.min(1, progress / duration) : 0;
  const loadingWaveform = audio && waveformAccess && waveform.isFetching && !wave;
  const controls =
    <div className="discovery-media-controls">
      <div className={`discovery-seek ${wave ? 'has-waveform' : ''}`} style={{ '--played': `${played * 100}%` } as CSSProperties}>
        {wave && <WaveformProgress data={wave} progress={played} />}
        <input type="range" min={0} max={duration || 1} step={.1} value={Math.min(progress, duration || 1)} aria-label={`Seek ${post.title}`} aria-valuetext={`${time(progress)} of ${time(duration)}`} disabled={!duration || failed || !active || blocked} onChange={event => seek(Number(event.target.value))} />
      </div>

      {desktopControls && <div className="discovery-desktop-transport">
        <span>{time(progress)} / {time(duration)}</span>
        <DesktopVolumeControl title={post.title} muted={muted} volume={volume} disabled={!active || blocked || failed}
          onToggleMute={() => { if (media.current) { media.current.muted = !muted; if (muted && media.current.volume === 0) media.current.volume = 1; if (media.current.paused && !manuallyPaused.current) void startPlayback(); } }}
          onVolumeChange={value => { if (media.current) { media.current.volume = value; media.current.muted = false; if (media.current.paused && !manuallyPaused.current) void startPlayback(); } }} />
        <button aria-label="Full screen" disabled={!active} onClick={()=>{const request=document.fullscreenElement ? document.exitFullscreen() : surface.current?.requestFullscreen();void request?.catch(()=>setNotice('Full screen unavailable. Try again.'));}}><Maximize size={18}/></button>
      </div>}
      <div className="discovery-media-status" role="status">
        {failed || playBlocked ? <><span>{failed ? 'Media unavailable.' : notice}</span><button type="button" disabled={!active || blocked} onClick={() => { const reload = failed; ++attempt.current; pendingPlay.current = null; manuallyPaused.current = false; setFailed(false); setPlayBlocked(false); setNotice(''); if (reload) { setReady(false); media.current?.load(); } void startPlayback(); }}>Retry playback</button></> : buffering || loadingWaveform ? <><span className="discovery-media-skeleton discovery-status-skeleton" aria-hidden="true"/><span className="sr-only">{buffering ? 'Buffering media' : 'Loading waveform'}</span></> : notice || (audio && !wave ? waveformAccess && waveform.isError ? 'Waveform unavailable · audio timeline' : 'Audio timeline' : wave && !wave.hasAudio ? 'No audio track' : '')}
      </div>
    </div>;
  const loading = nearby && !failed && !playBlocked && (!ready || buffering);
  // Keep the hit area inside the media stage, separate from comments, metadata and transport controls.
  const playbackToggle = <button type="button" className="discovery-video-tap" aria-label={`${playing ? 'Pause' : 'Play'} ${post.title}`} disabled={!active || blocked || failed} onClick={toggle}>
    {manuallyPaused.current && <Play className="discovery-video-play-icon" size={64} fill="currentColor" aria-hidden="true" />}
  </button>;
  const playback = loading ? <div className={`discovery-media-loading ${ready ? 'is-buffering' : ''}`} role="status" aria-label={buffering ? 'Buffering media' : `Loading ${audio ? 'audio' : 'video'}`}><span className="discovery-media-skeleton" aria-hidden="true"/><span className="sr-only">{buffering ? 'Buffering media' : `Preparing ${audio ? 'audio' : 'video'}`}</span></div> : null;
  return <div ref={surface} className={`discovery-media ${audio ? 'is-audio' : 'is-video'} ${!audio && isSplitVideo(post.composition) ? 'is-split-video' : ''}`} role="group" aria-label={`${post.title} player`} aria-describedby={keyboardHint} tabIndex={active && !blocked ? 0 : -1} data-playing={playing} aria-busy={loading}
    onKeyDown={event => { if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey || event.repeat || ![' ', 'k', 'K'].includes(event.key)) return; event.preventDefault(); event.stopPropagation(); if (!failed) toggle(); }}>
    <span id={keyboardHint} className="sr-only">{playing ? 'Playing.' : 'Paused.'} Tap the video or cover, or focus the player and press Space or K to pause or resume. Use the volume control to enable sound.</span>
    {audio ? <><AudioDiscoveryCard post={post} eager={nearby && !blocked} info={info} controls={controls} playback={playback} playbackToggle={playbackToggle} />{nearby && <audio {...mediaProps} ref={element => { media.current = element; }} aria-label={`${post.title} audio`} />}</>
      : <><VideoDiscoveryPlayer><AmbientArtwork post={post} enabled={nearby}/>{nearby ? <AdaptiveVideo composition={post.composition} {...mediaProps} ref={element => { media.current = element; }} poster={post.coverUrl ?? undefined} playsInline className="discovery-video" aria-label={`${post.title} video`} /> : post.coverUrl ? <img src={post.coverUrl} alt="" loading="lazy" className="discovery-video" /> : <Disc3 aria-hidden="true" size={48} />}{playback}{playbackToggle}<button type="button" className="discovery-video-sound" disabled={!active || blocked || failed} aria-label={`${muted ? 'Unmute' : 'Mute'} ${post.title}`} aria-pressed={muted} onClick={() => { if(media.current) { media.current.volume=1; media.current.muted=!muted; } if (playbackState) playbackState.muted = !muted; setMuted(value=>!value); }}>{muted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button></VideoDiscoveryPlayer>{controls}{info}</>}
  </div>;
});
