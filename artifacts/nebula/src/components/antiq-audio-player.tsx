import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Download, LoaderCircle, MoreHorizontal, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { SpringFace } from '@/components/blob-face';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { seededAvatarParams } from '@/lib/avatar';
import { useNotificationsOpen } from '@/features/notifications';
import { Skeleton } from '@/components/ui/skeleton';
import './antiq-audio-player.css';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
type Props = { src: string; label: string; onPlayable?: (ready: boolean) => void; onMediaError?: () => void; downloadName?: string; disabled?: boolean; errorMessage?: string };

function PlayerVolume({ label, volume, muted, disabled, onMute, onVolume }: { label: string; volume: number; muted: boolean; disabled: boolean; onMute: () => void; onVolume: (value: number) => void }) {
  const group = useRef<HTMLDivElement>(null), id = useId();
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false), [dragging, setDragging] = useState(false), [touchOpen, setTouchOpen] = useState(false);
  const open = !disabled && (hovered || focused || dragging || touchOpen);
  useEffect(() => {
    if (!touchOpen && !focused) return;
    const dismiss = (event: PointerEvent) => { if (event.target instanceof Node && !group.current?.contains(event.target)) { setTouchOpen(false); setFocused(false); } };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [touchOpen, focused]);
  return <div ref={group} className="antiq-audio-volume" data-open={open}
    onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(true); }} onPointerLeave={() => setHovered(false)}
    onPointerDownCapture={() => setFocused(false)} onFocus={event => setFocused(event.target.matches(':focus-visible'))}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setFocused(false); setTouchOpen(false); } }} onKeyDown={() => setFocused(true)}>
    <button type="button" className="antiq-audio-icon" aria-label={`${muted ? 'Unmute' : 'Mute'} ${label}`} aria-pressed={muted} aria-controls={id} disabled={disabled} onClick={onMute}
      onPointerDown={event => { if (event.pointerType === 'touch') { setTouchOpen(true); event.currentTarget.focus({ preventScroll: true }); } }}>
      {muted || volume === 0 ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
    </button>
    <div id={id} className="antiq-audio-volume-tray" aria-hidden={!open}>
      <input type="range" min="0" max="1" step="0.05" value={volume} aria-label={`Volume ${label}`} aria-valuetext={`${Math.round(volume * 100)}%`} disabled={disabled}
        onPointerDown={event => { setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)} onLostPointerCapture={() => setDragging(false)}
        onChange={event => onVolume(Number(event.target.value))} />
    </div>
  </div>;
}

/** One real audio element; the transport and canonical face follow its playback events. */
export const AntiqAudioPlayer = forwardRef<HTMLAudioElement, Props>(function AntiqAudioPlayer({ src, label, downloadName, onPlayable, onMediaError, disabled = false, errorMessage = 'This audio could not load. Try again.' }, forwardedRef) {
  const callbacks = useRef({ onPlayable, onMediaError }); callbacks.current = { onPlayable, onMediaError };
  const media = useRef<HTMLAudioElement | null>(null), playButton = useRef<HTMLButtonElement>(null), mounted = useRef(true), attempt = useRef(0), wanted = useRef(false);
  const notificationsOpen = useNotificationsOpen(), reduced = useReducedMotion(), blocked = disabled || notificationsOpen;
  const blockedRef = useRef(blocked); blockedRef.current = blocked;
  const face = useMemo(() => seededAvatarParams(`audio:${src}`), [src]);
  const [playing, setPlaying] = useState(false), [pending, setPending] = useState(false), [loading, setLoading] = useState(true), [buffering, setBuffering] = useState(false);
  const [position, setPosition] = useState(0), [duration, setDuration] = useState(0), [volume, setVolume] = useState(1), [muted, setMuted] = useState(false), [rate, setRate] = useState(1);
  const [error, setError] = useState(''), [failed, setFailed] = useState(false), [optionsOpen, setOptionsOpen] = useState(false);
  const assign = useCallback((element: HTMLAudioElement | null) => {
    media.current = element;
    if (typeof forwardedRef === 'function') forwardedRef(element); else if (forwardedRef) forwardedRef.current = element;
  }, [forwardedRef]);
  function pause() {
    ++attempt.current; wanted.current = false; media.current?.pause();
    if (mounted.current) { setPlaying(false); setPending(false); setBuffering(false); }
  }
  useEffect(() => {
    mounted.current = true;
    const element = media.current;
    const hide = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', hide);
    return () => { mounted.current = false; ++attempt.current; wanted.current = false; element?.pause(); document.removeEventListener('visibilitychange', hide); };
  }, []);
  useEffect(() => {
    pause(); callbacks.current.onPlayable?.(false); setLoading(true); setPosition(0); setDuration(Number.isFinite(media.current?.duration) ? media.current!.duration : 0); setError(''); setFailed(false); setOptionsOpen(false);
  }, [src]);
  useEffect(() => { if (blocked) { pause(); setOptionsOpen(false); } }, [blocked]);
  useEffect(() => {
    if (!playing || reduced) return;
    let frame = 0;
    const tick = () => { if (media.current && !media.current.paused) setPosition(media.current.currentTime); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduced]);
  async function start() {
    const element = media.current;
    if (!element || blockedRef.current || document.hidden) return;
    const ticket = ++attempt.current; wanted.current = true; setError(''); setPending(true);
    if (element.ended) element.currentTime = 0;
    try {
      await element.play();
      if (!mounted.current || !wanted.current || blockedRef.current || document.hidden) { element.pause(); return; }
      if (ticket === attempt.current) setPending(false);
    } catch (cause) {
      if (!mounted.current || ticket !== attempt.current || !wanted.current) return;
      wanted.current = false; setPlaying(false); setPending(false); setBuffering(false); setLoading(false);
      if ((cause as DOMException).name !== 'AbortError') setError('Playback could not start. Try again.');
    }
  }
  function retry() { pause(); setFailed(false); setError(''); media.current?.load(); void start(); playButton.current?.focus({ preventScroll: true }); }
  function toggle() { if (failed) retry(); else if (pending || (media.current && !media.current.paused)) pause(); else void start(); }
  function readDuration() { const value = media.current?.duration; if (value !== undefined && Number.isFinite(value) && value > 0) setDuration(value); }
  const sounding = playing && !pending && !buffering, progress = duration ? Math.min(1, position / duration) : 0;
  const status = pending || loading ? 'Loading audio…' : buffering ? 'Buffering…' : '';
  return <section className="antiq-audio-player" role="region" aria-label={`${label} player`} aria-busy={!!status} data-playing={sounding}>
    <div className="antiq-audio-transport">
      <button ref={playButton} type="button" className="antiq-audio-play" aria-label={`${playing || pending ? 'Pause' : 'Play'} ${label}`} aria-pressed={playing || pending} disabled={blocked} onClick={toggle}>
        <AnimatePresence mode="wait" initial={false}>
          {sounding ? <SpringFace key="playing" params={face} size={44} /> : <motion.span key={pending || buffering ? 'loading' : 'paused'} className="antiq-audio-play-glyph" initial={reduced ? false : { opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }} exit={reduced ? { opacity: 0 } : { opacity: 0, scale: .6 }} transition={{ duration: reduced ? 0 : .14 }}>
            {pending || buffering ? <LoaderCircle size={18} className="antiq-audio-loading" aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          </motion.span>}
        </AnimatePresence>
        {sounding && <span className="antiq-audio-pause-mark" aria-hidden="true"><Pause size={10} /></span>}
      </button>
      <div className="antiq-audio-timeline">
        <span className="antiq-audio-clock antiq-audio-elapsed" aria-hidden="true">{clock(position)}</span>
        <div className="antiq-audio-seek-shell"><input className="antiq-audio-seek" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(position, duration || 1)} aria-label={`Seek ${label}`} aria-valuetext={`${clock(position)} of ${clock(duration)}`} disabled={blocked || failed || !duration}
          style={{ '--audio-progress': `${progress * 100}%` } as CSSProperties} onChange={event => { const value = Number(event.target.value); if (media.current && duration) { media.current.currentTime = value; setPosition(value); } }} />
          {loading&&!duration&&<Skeleton aria-hidden="true" className="antiq-audio-seek-skeleton"/>}</div>
        <span className="antiq-audio-clock antiq-audio-duration" aria-hidden="true">{duration ? clock(duration) : '—:—'}</span>
      </div>
      <div className="antiq-audio-actions">
        <PlayerVolume label={label} volume={volume} muted={muted} disabled={blocked} onMute={() => { if (media.current) media.current.muted = !media.current.muted; }} onVolume={value => { if (media.current) { media.current.volume = value; media.current.muted = false; } }} />
        <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
          <PopoverTrigger asChild><button type="button" className="antiq-audio-icon" aria-label={`Audio options ${label}`} disabled={blocked}><MoreHorizontal size={18} aria-hidden="true" /></button></PopoverTrigger>
          <PopoverContent className="antiq-audio-options" align="end" side="top" sideOffset={8} collisionPadding={12} aria-label={`Audio options ${label}`}>
            <label>Playback speed<select aria-label={`Playback speed ${label}`} value={rate} onChange={event => { if (media.current) media.current.playbackRate = Number(event.target.value); }}>{[.5, .75, 1, 1.25, 1.5, 1.75, 2].map(value => <option key={value} value={value}>{value}×</option>)}</select></label>
            <a href={src} download={downloadName || true} aria-label={`Download ${label}`}><Download size={16} aria-hidden="true" />Download audio</a>
          </PopoverContent>
        </Popover>
      </div>
    </div>
    <div className="antiq-audio-status" data-visible={!!error}>{error ? <div role="alert"><span>{error}</span><button type="button" disabled={blocked} onClick={retry} aria-label={`Retry ${label}`}>Try again</button></div> : <span role="status" className="sr-only">{status || (sounding ? `Playing ${label}` : '')}</span>}</div>
    <audio ref={assign} className="antiq-audio-source" src={src} preload="auto" aria-label={label} data-playback-allowed={!blocked}
      onLoadStart={() => { callbacks.current.onPlayable?.(false); setLoading(true); setDuration(0); setPosition(0); }} onLoadedMetadata={readDuration} onDurationChange={readDuration}
      onPlay={event => { const element = event.currentTarget; if (blockedRef.current || document.hidden || element.paused) { element.pause(); return; } document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(other => { if (other !== element && !other.paused) other.pause(); }); setPlaying(true); }}
      onPlaying={event => { if (blockedRef.current || document.hidden || event.currentTarget.paused) { event.currentTarget.pause(); return; } setPlaying(true); setPending(false); setBuffering(false); setLoading(false); }}
      onPause={event => { if (mounted.current && event.currentTarget.paused) { ++attempt.current; wanted.current = false; setPlaying(false); setPending(false); setBuffering(false); } }} onEnded={event => { if (event.currentTarget.ended) pause(); }}
      onWaiting={event => { if (!event.currentTarget.paused) setBuffering(true); }} onCanPlay={event => { if (event.currentTarget !== media.current || event.currentTarget.readyState < 3) return; callbacks.current.onPlayable?.(true); setLoading(false); setBuffering(false); }}
      onTimeUpdate={event => setPosition(event.currentTarget.currentTime)} onVolumeChange={event => { setVolume(event.currentTarget.volume); setMuted(event.currentTarget.muted); }} onRateChange={event => setRate(event.currentTarget.playbackRate)}
      onError={() => { if (mounted.current) { callbacks.current.onPlayable?.(false); callbacks.current.onMediaError?.(); ++attempt.current; wanted.current = false; setPlaying(false); setPending(false); setLoading(false); setBuffering(false); setFailed(true); setError(errorMessage); } }} />
  </section>;
});
