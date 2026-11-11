const images = new Map<string, Promise<void>>();

/** Decode a few local, imminent images without blocking navigation on failed assets. */
export async function warmImageAssets(sources: Array<string | null | undefined>, { priority = 'low', maxWaitMs = 0 }: { priority?: 'high' | 'low' | 'auto'; maxWaitMs?: number } = {}) {
  if (typeof window === 'undefined' || document.hidden) return;
  const urls = [...new Set(sources.filter((source): source is string => !!source))].flatMap(source => {
    try { const url = new URL(source, location.href); return url.origin === location.origin && /^https?:$/.test(url.protocol) ? [url.href] : []; }
    catch { return []; }
  }).slice(0, 6);
  const pending = urls.map(url => {
    const cached = images.get(url);
    if (cached) return cached;
    const loaded = new Promise<void>(resolve => {
      const image = new Image();
      let finished = false;
      const finish = (failed = false) => {
        if (finished) return;
        finished = true; clearTimeout(timeout); image.onload = null; image.onerror = null;
        if (failed) images.delete(url);
        resolve();
      };
      const timeout = window.setTimeout(() => finish(true), 2500);
      image.decoding = 'async'; image.fetchPriority = priority;
      image.onload = () => { void image.decode().catch(() => {}).then(() => finish()); };
      image.onerror = () => finish(true);
      image.src = url;
    });
    if (images.size >= 64) images.delete(images.keys().next().value!);
    images.set(url, loaded);
    return loaded;
  });
  if (maxWaitMs <= 0 || !pending.length) return;
  let timeout = 0;
  await Promise.race([Promise.all(pending), new Promise<void>(resolve => { timeout = window.setTimeout(resolve, maxWaitMs); })]);
  clearTimeout(timeout);
}
