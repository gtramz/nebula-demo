import { SectionSkeleton } from '@/components/loading-states';
import { useLayoutEffect, useRef, useState } from 'react';
import { ExternalLink, RotateCw, Smartphone } from 'lucide-react';
import { isPresentation } from './index';
import './mobile-preview.css';

const sizes = [
  { label: 'Compact · 375 × 667', width: 375, height: 667 },
  { label: 'Standard · 390 × 844', width: 390, height: 844 },
  { label: 'Large · 430 × 932', width: 430, height: 932 },
];
function previewPath() {
  const input = new URLSearchParams(location.search).get('path') ?? '/discovery';
  try {
    const url = new URL(input, location.origin);
    if (url.origin !== location.origin || !input.startsWith('/') || input.startsWith('//') || /^\/(api|media|presentation)(\/|$)/.test(url.pathname)) return '/discovery';
    return url.pathname + url.search + url.hash;
  } catch { return '/discovery'; }
}

/** Real iframe viewport: existing media queries run unchanged; no forced mobile classes. */
export function MobilePreview() {
  const [src] = useState(previewPath), [size, setSize] = useState(1), [rotated, setRotated] = useState(false);
  const [scale, setScale] = useState(1), [loaded, setLoaded] = useState(false);
  const area = useRef<HTMLDivElement>(null), frame = useRef<HTMLIFrameElement>(null);
  const width = rotated ? sizes[size].height : sizes[size].width, height = rotated ? sizes[size].width : sizes[size].height;
  const available = isPresentation() && window.self === window.top;
  useLayoutEffect(() => {
    if (!area.current) return;
    const resize = () => { const r = area.current!.getBoundingClientRect(); setScale(Math.max(.1, Math.min(1, (r.width - 24) / width, (r.height - 24) / height))); };
    const observer = new ResizeObserver(resize); observer.observe(area.current); resize(); return () => observer.disconnect();
  }, [width, height, available]);
  if (!available) return <main className="p-8"><h1 className="text-2xl">Preview unavailable</h1><a className="inline-flex min-h-11 items-center underline" href="/discovery">Open Discovery</a></main>;
  const openDesktop = () => {
    const child = frame.current?.contentWindow;
    child?.document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(media => media.pause());
    window.open(child?.location.href ?? src, '_blank', 'noopener,noreferrer');
  };
  return <main className="mobile-preview-shell">
    <header className="mobile-preview-toolbar">
      <div><h1><Smartphone size={20} aria-hidden />Mobile view</h1></div>
      <div className="mobile-preview-options">
        <label>Screen size<select value={size} onChange={e => setSize(Number(e.target.value))}>{sizes.map((item, index) => <option key={item.width} value={index}>{item.label}</option>)}</select></label>
        <button onClick={() => setRotated(value => !value)} aria-label="Rotate preview"><RotateCw size={17} aria-hidden />Rotate</button>
        <button onClick={openDesktop}><ExternalLink size={17} aria-hidden />Open desktop</button>
      </div>
    </header>
    <div className="mobile-preview-area" ref={area}>
      <div className="mobile-preview-device" style={{ width: width * scale, height: height * scale }}>
        <iframe ref={frame} title="Nebula mobile preview" src={src} width={width} height={height} style={{ width, height, transform: `scale(${scale})` }} onLoad={() => setLoaded(true)} allow="autoplay; camera; microphone; fullscreen" allowFullScreen />
        {!loaded && <div className="absolute inset-0 pointer-events-none"><SectionSkeleton variant="media" label="Loading preview" className="h-full w-full"/></div>}
      </div>
    </div>
    <footer className="mobile-preview-status" role="status">{loaded ? `${width} × ${height} CSS px · ${Math.round(scale * 100)}% view` : ''}<span>Responsive preview · device gestures and safe areas depend on the actual phone.</span></footer>
  </main>;
}
