import { forwardRef, useCallback, useEffect, useRef, useState, type VideoHTMLAttributes } from 'react';
import type { VideoComposition } from '@nebula/local';
import { useIsMobile } from '@/hooks/use-mobile';
import './adaptive-video.css';

export const isSplitVideo = (composition?: VideoComposition | null) => composition?.version === 1 && composition.layout === 'vertical-split';
const time = (value: number) => `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, '0')}`;
type Props = VideoHTMLAttributes<HTMLVideoElement> & { composition?: VideoComposition | null };

/** One decoder/audio clock. Desktop rearranges the exact two exported regions, never stretches them. */
export const AdaptiveVideo = forwardRef<HTMLVideoElement, Props>(function AdaptiveVideo({ composition, ...props }, ref) {
  if (!isSplitVideo(composition)) return <video {...props} ref={ref} />;
  return <SplitVideo {...props} mediaRef={ref} />;
});
function SplitVideo({ mediaRef, controls, className, style, ...props }: VideoHTMLAttributes<HTMLVideoElement> & { mediaRef: React.ForwardedRef<HTMLVideoElement> }) {
  const video = useRef<HTMLVideoElement | null>(null), canvas = useRef<HTMLCanvasElement>(null), root = useRef<HTMLDivElement>(null);
  const mobile = useIsMobile(), [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false), [position, setPosition] = useState(0), [duration, setDuration] = useState(0), [volume, setVolume] = useState(1), [muted, setMuted] = useState(false), [notice, setNotice] = useState('');
  const [full, setFull] = useState(false);
  useEffect(() => { const update = () => setFull(document.fullscreenElement === root.current); document.addEventListener('fullscreenchange', update); return () => document.removeEventListener('fullscreenchange', update); }, []);
  const horizontal = !mobile && !failed;
  const title = props['aria-label'] ?? 'remix';
  const assign = useCallback((element: HTMLVideoElement | null) => { video.current = element; if (typeof mediaRef === 'function') mediaRef(element); else if (mediaRef) mediaRef.current = element; }, [mediaRef]);
  useEffect(() => {
    setFailed(false); setNotice(''); setPosition(0); setDuration(0);
  }, [props.src]);
  useEffect(() => {
    const media = video.current, surface = canvas.current;
    if (!horizontal || !media || !surface) return;
    let frame = 0, stopped = false;
    const paint = () => {
      if (stopped || media.readyState < 2) return;
      try {
        const ctx = surface.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
        const w = media.videoWidth, h = media.videoHeight;
        if (!w || !h) return;
        // Only declared 9:16 split outputs are accepted; a mismatched file falls back intact.
        if (Math.abs(w / h - 9 / 16) > .01) throw new Error('Unexpected split dimensions');
        ctx.drawImage(media, 0, 0, w, h / 2, 0, 0, 720, 640);
        ctx.drawImage(media, 0, h / 2, w, h / 2, 720, 0, 720, 640);
      } catch { stopped = true; setFailed(true); }
    };
    const tick = () => { paint(); if (!stopped && !media.paused && !media.ended) frame = requestAnimationFrame(tick); };
    const start = () => { cancelAnimationFrame(frame); tick(); };
    for (const event of ['loadeddata', 'seeked', 'pause', 'resize']) media.addEventListener(event, paint);
    media.addEventListener('play', start); start();
    return () => { stopped = true; cancelAnimationFrame(frame); for (const event of ['loadeddata', 'seeked', 'pause', 'resize']) media.removeEventListener(event, paint); media.removeEventListener('play', start); };
  }, [horizontal, props.src, attempt]);
  useEffect(() => { const element = video.current; return () => element?.pause(); }, []);
  async function toggle() { const media = video.current; if (!media) return; if (!media.paused) media.pause(); else try { await media.play(); setNotice(''); } catch { setNotice('Press play to try again.'); } }
  async function fullscreen() { try { if (document.fullscreenElement === root.current) await document.exitFullscreen(); else await root.current?.requestFullscreen(); } catch { setNotice('Fullscreen is unavailable in this browser.'); } }
  return <div ref={root} className={`adaptive-video ${horizontal ? 'is-horizontal' : 'is-vertical'} ${controls ? 'with-controls' : 'external-controls'}`} data-layout={horizontal ? 'side-by-side' : 'stacked'}>
    <div className="adaptive-video-picture">
      <video {...props} ref={assign} controls={false} playsInline className={horizontal ? 'adaptive-video-source' : 'adaptive-video-visible'}
        onPlay={e => { if (e.currentTarget.dataset.playbackAllowed !== undefined && (e.currentTarget.dataset.playbackAllowed === 'false' || document.hidden)) { e.currentTarget.pause(); return; } document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(other => { if (other !== e.currentTarget) other.pause(); }); setPlaying(true); props.onPlay?.(e); }}
        onPause={e => { setPlaying(false); props.onPause?.(e); }}
        onTimeUpdate={e => { setPosition(e.currentTarget.currentTime); props.onTimeUpdate?.(e); }}
        onDurationChange={e => { setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0); props.onDurationChange?.(e); }}
        onVolumeChange={e => { setVolume(e.currentTarget.volume); setMuted(e.currentTarget.muted); props.onVolumeChange?.(e); }} />
      {horizontal && <canvas ref={canvas} width={1440} height={640} aria-label="Split remix: original left, contribution right" role="img" />}
    </div>
    {(controls || full) && <div className="adaptive-video-controls">
      <button type="button" aria-label={`${playing ? 'Pause' : 'Play'} ${title}`} onClick={() => void toggle()}>{playing ? 'Pause' : 'Play'}</button>
      <input aria-label={`Seek ${title}`} type="range" min={0} max={duration || 1} step="0.05" value={Math.min(position, duration || 1)} disabled={!duration} onChange={e => { if (video.current) video.current.currentTime = Number(e.target.value); setPosition(Number(e.target.value)); }} />
      <span className="tabular-nums text-xs">{time(position)} / {time(duration)}</span>
      <button type="button" aria-label={`${muted ? 'Unmute' : 'Mute'} ${title}`} onClick={() => { if (video.current) video.current.muted = !video.current.muted; }}>{muted ? 'Unmute' : 'Mute'}</button>
      <input className="adaptive-volume" aria-label={`Volume ${title}`} type="range" min="0" max="1" step=".05" value={muted ? 0 : volume} onChange={e => { if (video.current) { video.current.volume = Number(e.target.value); video.current.muted = Number(e.target.value) === 0; } }} />
      <button type="button" onClick={() => void fullscreen()} aria-label={`Fullscreen ${title}`}>Fullscreen</button>
    </div>}
    {!controls && !full && <button type="button" className="adaptive-fullscreen" onClick={() => void fullscreen()} aria-label={`Fullscreen ${title}`}>⛶</button>}
    {(failed || notice) && <p role="status" className="text-xs p-2">{failed ? <>Horizontal view unavailable. Showing the complete vertical video. <button type="button" className="min-h-11 underline" onClick={() => { setFailed(false); setAttempt(n => n + 1); }}>Retry horizontal view</button></> : notice}</p>}
  </div>;
}
