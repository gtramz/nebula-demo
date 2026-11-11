import { useEffect, useState } from 'react';

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };
const connection = () => (navigator as Navigator & { connection?: Connection }).connection;
const canPrepare = () => !document.hidden && !connection()?.saveData && !['slow-2g', '2g'].includes(connection()?.effectiveType ?? '');

/** Give the current media priority, then warm one successor using its real player.
 * preload remains a browser hint; never fetch whole blobs or start hidden playback. */
export function useNextMediaPreparation(key: string | undefined, ready: boolean, blocked: boolean) {
  const [eligible, setEligible] = useState(canPrepare);
  const [preparedKey, setPreparedKey] = useState<string>();
  useEffect(() => {
    const network = connection(), update = () => setEligible(canPrepare());
    document.addEventListener('visibilitychange', update);
    network?.addEventListener('change', update);
    return () => { document.removeEventListener('visibilitychange', update); network?.removeEventListener('change', update); };
  }, []);
  useEffect(() => {
    setPreparedKey(undefined);
    if (!key || !ready || blocked || !eligible) return;
    const timer = window.setTimeout(() => setPreparedKey(key), 250);
    return () => clearTimeout(timer);
  }, [key, ready, blocked, eligible]);
  return eligible && ready && !blocked && preparedKey === key;
}

/** UI-only playback memory survives card eviction; it never stores files or credentials. */
export type FeedPlaybackState = { volume?: number; time: number; muted: boolean; duration: number };
