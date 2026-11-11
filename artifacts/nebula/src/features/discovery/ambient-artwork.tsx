import { useEffect, useState, type CSSProperties } from 'react';
import type { DemoPost } from './demo-posts';

type Palette = [string, string];
const fallback: Palette = ['#172027', '#161420'];
const cache = new Map<string, Promise<Palette | null>>();
function palette(url: string, variant: 'subtle' | 'audio') {
  const cacheKey = `${variant}:${url}`;
  const existing = cache.get(cacheKey);
  if (existing) return existing;
  const work = new Promise<Palette | null>(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let done = false;
    const finish = (value: Palette | null) => { if (done) return; done = true; clearTimeout(timer); img.onload = img.onerror = null; if (!value) cache.delete(cacheKey); resolve(value); };
    const timer = setTimeout(() => finish(null), 2500);
    img.onerror = () => finish(null);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return finish(null);
        context.drawImage(img, 0, 0, 32, 32);
        const pixels = context.getImageData(0, 0, 32, 32).data;
        if (variant === 'audio') {
          const bins = new Map<string, { rgb: number[]; weight: number; count: number }>();
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] < 128) continue;
            const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]], high = Math.max(...rgb), low = Math.min(...rgb);
            if (high < 28) continue;
            const key = rgb.map(n => Math.floor(n / 40)).join(',');
            const bin = bins.get(key) ?? { rgb: [0, 0, 0], weight: 0, count: 0 };
            rgb.forEach((n, channel) => { bin.rgb[channel] += n; });
            bin.count++; bin.weight += .25 + (high - low) / Math.max(high, 1); bins.set(key, bin);
          }
          const colors = [...bins.values()].sort((a, b) => b.weight - a.weight).map(bin => bin.rgb.map(n => n / bin.count));
          if (colors.length) {
            const first = colors.find(color => (Math.max(...color) - Math.min(...color)) / Math.max(1, ...color) >= .24) ?? colors[0];
            const second = colors.find(color => color.reduce((sum, n, i) => sum + Math.abs(n - first[i]), 0) > 100) ?? colors[1] ?? first;
            return finish([first, second].map(color => `rgb(${color.map(n => Math.round(n * .65 + 14)).join(' ')})`) as Palette);
          }
        }
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
  cache.set(cacheKey, work);
  if (cache.size > 64) cache.delete(cache.keys().next().value!);
  return work;
}

/** Decorative only: no hit targets, media ownership, measurements or animation loop. */
export function AmbientArtwork({ post, enabled = true, variant = 'subtle', source }: { post: DemoPost; enabled?: boolean; variant?: 'subtle' | 'audio'; source?: string | null }) {
  const key = `${variant}|${source === undefined ? `${post.coverUrl ?? ''}|${post.projectCoverUrl ?? ''}` : source ?? ''}`;
  const [result, setResult] = useState<{ key: string; colors: Palette }>();
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      for (const url of source === undefined ? [post.coverUrl, post.projectCoverUrl] : [source]) {
        if (!url) continue;
        const colors = await palette(url, variant);
        if (cancelled) return;
        if (colors) { setResult({ key, colors }); return; }
      }
      if (!cancelled) setResult({ key, colors: fallback });
    })();
    return () => { cancelled = true; };
  }, [key, enabled, post.coverUrl, post.projectCoverUrl, source, variant]);
  const colors = result?.key === key ? result.colors : fallback;
  return <span className={`discovery-ambient${variant === 'audio' ? ' discovery-audio-ambient' : ''}`} aria-hidden="true" style={{ '--ambient-a': colors[0], '--ambient-b': colors[1] } as CSSProperties}/>;
}
