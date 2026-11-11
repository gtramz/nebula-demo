import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useId, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { defaultVideoComposition, type VideoComposition } from '@nebula/local';
import { controlStyles } from '@/components/antiq/workspace';
import { clampPosition, drawFrame, videoRegions, VIDEO_WIDTH, VIDEO_HEIGHT, type FrameRegion } from './video-geometry';

export type VideoFramingProps = {
  source: string;
  sourceKind: 'audio' | 'video';
  contribution: string;
  value?: VideoComposition;
  onChange: (value: VideoComposition) => void;
  startSeconds?: number;
  disabled?: boolean;
};

/** Silent frame preview. The export and this canvas share the exact crop geometry. */
export function VideoFraming({ source, sourceKind, contribution, value, onChange, startSeconds = 0, disabled = false }: VideoFramingProps) {
  const canvas = useRef<HTMLCanvasElement>(null), videos = useRef<Partial<Record<'source' | 'contribution', HTMLVideoElement>>>({});
  const [loaded, setLoaded] = useState(0), [error, setError] = useState('');
  const descriptionId = useId();
  const drag = useRef<{ id: number; x: number; y: number; start: VideoComposition; region: FrameRegion; overflowX: number; overflowY: number } | null>(null);
  const horizontal = !useIsMobile() && sourceKind === 'video' && !!value;
  const displayWidth = horizontal ? 1440 : VIDEO_WIDTH, displayHeight = horizontal ? 640 : VIDEO_HEIGHT;
  const regions = videoRegions(sourceKind, value).map(region => horizontal ? {...region,x:region.track === 'source' ? 0 : 720,y:0} : region);

  useEffect(() => {
    let alive = true;
    setError(''); videos.current = {};
    const items: ['source' | 'contribution', string][] = sourceKind === 'video' ? [['source', source], ['contribution', contribution]] : [['contribution', contribution]];
    const refresh = () => { if (alive) setLoaded(n => n + 1); };
    const resources = items.map(([key, url]) => {
      const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.preload = 'auto';
      videos.current[key] = video;
      video.onloadeddata = () => {
        const time = key === 'source' ? startSeconds : 0;
        if (time > 0 && Number.isFinite(video.duration)) video.currentTime = Math.min(time, Math.max(0, video.duration - .01));
        refresh();
      };
      video.onseeked = refresh;
      video.onerror = () => { if (alive) setError('Framing preview could not load. Try uploading the video again.'); };
      video.src = url; video.load(); return video;
    });
    return () => { alive = false; drag.current = null; resources.forEach(video => { video.pause(); video.onloadeddata = null; video.onseeked = null; video.onerror = null; video.removeAttribute('src'); video.load(); }); videos.current = {}; };
  }, [source, sourceKind, contribution]);

  useEffect(() => {
    const video = videos.current.source;
    if (video && video.readyState >= 1 && Number.isFinite(video.duration)) { const next = Math.min(startSeconds, Math.max(0, video.duration - .01)); if (Math.abs(video.currentTime - next) > .01) video.currentTime = next; }
  }, [startSeconds, loaded]);

  useEffect(() => {
    const painter = canvas.current?.getContext('2d'); if (!painter) return;
    painter.fillStyle = '#080808'; painter.fillRect(0, 0, displayWidth, displayHeight);
    for (const region of regions) {
      const video = videos.current[region.track]; if (video) drawFrame(painter, video, region, value?.[region.track]);
    }
  }, [sourceKind, value, loaded, horizontal]);

  const commit = (next: VideoComposition) => {
    if (!disabled && JSON.stringify(next) !== JSON.stringify(value)) onChange(next);
  };
  const update = (region: FrameRegion, x: number, y: number, initial = value ?? defaultVideoComposition(sourceKind)) => {
    if (disabled) return;
    commit({ ...initial, [region.track]: { x: clampPosition(x), y: clampPosition(y) } });
  };
  function begin(event: PointerEvent<HTMLButtonElement>, region: FrameRegion) {
    if (disabled || !value || event.button !== 0) return;
    const video = videos.current[region.track]; if (!video?.videoWidth || !video.videoHeight) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const scale = Math.max(bounds.width / video.videoWidth, bounds.height / video.videoHeight);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, start: value, region, overflowX: Math.max(0, video.videoWidth * scale - bounds.width), overflowY: Math.max(0, video.videoHeight * scale - bounds.height) };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current; if (!current || current.id !== event.pointerId || disabled) return;
    const position = current.start[current.region.track];
    update(current.region, position.x - (current.overflowX > .01 ? (event.clientX - current.x) / current.overflowX : 0), position.y - (current.overflowY > .01 ? (event.clientY - current.y) / current.overflowY : 0), current.start);
  }
  function key(event: KeyboardEvent<HTMLButtonElement>, region: FrameRegion) {
    if (disabled || !value) return;
    const position = value[region.track], step = event.shiftKey ? .1 : .02;
    if (event.key === 'Home') { event.preventDefault(); update(region, .5, .5); }
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault(); update(region, position.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), position.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0));
    }
  }
  return <section aria-label="Video framing" className="space-y-3 rounded-xl border border-border bg-surface p-4">
    <div className="flex flex-wrap justify-between items-center gap-3"><div><h3 className="font-semibold">Frame your video</h3><p className="text-xs text-muted">9:16 · {sourceKind === 'video' ? horizontal ? 'Original left · Your contribution right · Download: vertical 9:16' : 'Original above · Your contribution below' : 'Your contribution fills the screen'}</p></div>
      <button type="button" disabled={disabled} className={controlStyles.button} onClick={() => commit(defaultVideoComposition(sourceKind))}>{value ? 'Reset framing' : 'Update framing'}</button></div>
    {!value && <p className="text-sm text-muted">This saved draft keeps its previous layout. Choose updated framing to use the full vertical canvas.</p>}
    <div className="relative mx-auto w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: horizontal ? '9 / 4' : '9 / 16', maxWidth: horizontal ? '100%' : 'min(100%, calc(75dvh * 9 / 16))' }}>
      <canvas ref={canvas} width={displayWidth} height={displayHeight} className="block h-full w-full" aria-label="Video framing preview" />
      {value && regions.map(region => <button key={region.track} type="button" disabled={disabled} aria-label={`Adjust ${region.track === 'source' ? 'original' : 'contribution'} framing`} aria-describedby={descriptionId}
        className="absolute cursor-grab active:cursor-grabbing border border-transparent hover:border-accent/60 focus-visible:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:cursor-default"
        style={{ left: `${region.x / displayWidth * 100}%`, width: `${region.width / displayWidth * 100}%`, top: `${region.y / displayHeight * 100}%`, height: `${region.height / displayHeight * 100}%`, touchAction: 'none' }}
        onPointerDown={event => begin(event, region)} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={event => key(event, region)} />)}
    </div>
    <p id={descriptionId} className="text-xs text-muted">Drag each image to frame it. Use arrow keys for fine adjustments, Shift for larger moves, or Home to center. The exported video uses this framing.</p>
    {!error && regions.some(region => !videos.current[region.track] || videos.current[region.track]!.readyState < 2) && <p role="status" className="text-xs text-muted">Loading video frames…</p>}
    {value && <p className="sr-only" aria-live="polite">{sourceKind === 'video' ? `Original framing ${Math.round(value.source.x * 100)} percent horizontal, ${Math.round(value.source.y * 100)} percent vertical. ` : ''}Contribution framing {Math.round(value.contribution.x * 100)} percent horizontal, {Math.round(value.contribution.y * 100)} percent vertical.</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </section>;
}
