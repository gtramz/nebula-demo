import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getLocalStore, getGetProjectQueryKey, getPublicArtistQueryKey, getViewerQueryKey, NAVIGATION_DETAIL_STALE_TIME, sessionIdentity } from '@nebula/local';
import { useAuth } from '@/context/AuthContext';
import { warmImageAssets } from '@/lib/preload-assets';

/** Warm only the intended detail, in the same account-scoped cache as its page. */
export function useRoutePrefetch() {
  const client = useQueryClient(), { user } = useAuth(), identity = sessionIdentity(user);
  useEffect(() => {
    const store = getLocalStore(), base = import.meta.env.BASE_URL.replace(/\/$/, '');
    let timer: ReturnType<typeof setTimeout> | undefined, hovered: HTMLAnchorElement | null = null;
    const cancel = () => { clearTimeout(timer); timer = undefined; hovered = null; };
    function anchor(target: EventTarget | null) { return target instanceof Element ? target.closest<HTMLAnchorElement>('a[href]') : null; }
    function warm(link: HTMLAnchorElement | null) {
      if (!link || document.hidden || link.hasAttribute('download') || link.target && link.target !== '_self') return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname || base && !url.pathname.startsWith(`${base}/`)) return;
      const match = /^\/(artist|project)\/([1-9]\d*)\/?$/.exec(url.pathname.slice(base.length));
      const viewer = store.getCurrentUser();
      if (!match || sessionIdentity(viewer) !== identity) return;
      const id = Number(match[2]); if (!Number.isSafeInteger(id)) return;
      const isArtist = match[1] === 'artist';
      void client.prefetchQuery({
        queryKey: getViewerQueryKey(isArtist ? getPublicArtistQueryKey(id) : getGetProjectQueryKey(id), viewer),
        queryFn: async () => {
          const result = await (isArtist ? store.getPublicArtist(id) : store.getProject(id));
          if (sessionIdentity(store.getCurrentUser()) !== identity) throw new Error('Session changed. Please try again.');
          if (result) void warmImageAssets([result.artist.picture, ...('project' in result ? [result.project.coverUrl] : result.projects.slice(0, 4).map(project => project.coverUrl))]);
          return result;
        },
        staleTime: NAVIGATION_DETAIL_STALE_TIME, retry: false, networkMode: 'always',
      });
    }
    const over = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const link = anchor(event.target); if (!link || link === hovered) return;
      cancel(); hovered = link; timer = setTimeout(() => { timer = undefined; warm(link); }, 100);
    };
    const out = (event: PointerEvent) => { if (hovered && (!(event.relatedTarget instanceof Node) || !hovered.contains(event.relatedTarget))) cancel(); };
    const focus = (event: FocusEvent) => { cancel(); warm(anchor(event.target)); };
    const press = (event: PointerEvent) => { if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) { cancel(); warm(anchor(event.target)); } };
    document.addEventListener('pointerover', over); document.addEventListener('pointerout', out);
    document.addEventListener('focusin', focus); document.addEventListener('pointerdown', press);
    return () => { cancel(); document.removeEventListener('pointerover', over); document.removeEventListener('pointerout', out); document.removeEventListener('focusin', focus); document.removeEventListener('pointerdown', press); };
  }, [client, identity]);
}
