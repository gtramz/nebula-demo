import { useEffect, useState } from 'react';
import { warmImageAssets } from '@/lib/preload-assets';

const revealed = new Set<string>();
/** Initial reveal only. Refreshes retain content; failed assets cannot block a route. */
export function useInitialAssets(key: string, sources: Array<string | null | undefined>, enabled: boolean) {
  const [ready, setReady] = useState('');
  const signature = sources.filter(Boolean).slice(0, 6).join('|');
  useEffect(() => {
    if (!enabled || revealed.has(key)) return;
    let alive = true, timer = 0;
    const fonts = Promise.race([document.fonts.ready, new Promise(resolve => { timer = window.setTimeout(resolve, 2500); })]);
    void Promise.all([fonts, warmImageAssets(signature.split('|'), { priority: 'high', maxWaitMs: 2500 })]).then(() => {
      clearTimeout(timer);
      if (!alive) return;
      if (revealed.size >= 64) revealed.delete(revealed.values().next().value!);
      revealed.add(key); setReady(key);
    });
    return () => { alive = false; clearTimeout(timer); };
  }, [key, signature, enabled]);
  return !enabled || ready === key || revealed.has(key);
}
