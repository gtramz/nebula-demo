import { useEffect, useState, type CSSProperties } from 'react';
import type { DemoPost } from './demo-posts';

type Palette = [string, string];
const fallback: Palette = ['#172027', '#161420'];
const cache = new Map<string, Promise<Palette | null>>();
function palette(url: string) {
  const existing = cache.get(url);
  if (existing) return existing;
  const work = new Promise<Palette | null>(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let done = false;
    const finish = (value: Palette | null) => { if (done) return; done = true; clearTimeout(timer); img.onload = img.onerror = null; resolve(value); };
    const timer = setTimeout(() => finish(null), 2500);
    img.onerror = () => finish(null);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return finish(null);
        context.drawImage(img, 0, 0, 32, 32);
        const pixels = context.getImageData(0, 0, 32, 32).data;
        const halves = [[0, 0, 0, 0], [0, 0, 0, 0]];
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] < 128) continue;
          const bucket = halves[Math.floor(i / 4 / 32) < 16 ? 0 : 1];
          for (let channel = 0; channel < 3; channel++) bucket[channel] += pixels[i + channel];
          bucket[3]++;
        }
        finish(halves.map(bucket => {
          const average = bucket.slice(0, 3).map(n => n / Math.max(1, bucket[3]));
          const gray = average.reduce((a, b) => a + b, 0) / 3;
          return `rgb(${average.map(n => Math.round((n * .65 + gray * .35) * .32)).join(' ')})`;
        }) as Palette);
      } catch { finish(null); }
    };
    img.src = url;
  });
  cache.set(url, work);
  if (cache.size > 64) cache.delete(cache.keys().next().value!);
  return work;
}

/** Decorative only: no hit targets, media ownership, measurements or animation loop. */
export function AmbientArtwork({ post, enabled = true }: { post: DemoPost; enabled?: boolean }) {
  const key = `${post.coverUrl ?? ''}|${post.projectCoverUrl ?? ''}`;
  const [result, setResult] = useState<{ key: string; colors: Palette }>();
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      for (const url of [post.coverUrl, post.projectCoverUrl]) {
        if (!url) continue;
        const colors = await palette(url);
        if (cancelled) return;
        if (colors) { setResult({ key, colors }); return; }
      }
      if (!cancelled) setResult({ key, colors: fallback });
    })();
    return () => { cancelled = true; };
  }, [key, enabled, post.coverUrl, post.projectCoverUrl]);
  const colors = result?.key === key ? result.colors : fallback;
  return <span className="discovery-ambient" aria-hidden="true" style={{ '--ambient-a': colors[0], '--ambient-b': colors[1] } as CSSProperties}/>;
}
