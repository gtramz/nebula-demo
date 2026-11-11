import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, isServerMode, subscribeHomeRanking, getHomeRankingGeneration, type Publication, type PublicationInput, type UploadedMedia } from '@nebula/local';
import { useAuth } from '@/context/AuthContext';

export function usePublications(mine = false) {
  const { user } = useAuth();
  return useInfiniteQuery({ queryKey: ['publications', mine, user ? `${user.role}:${user.artistId ?? user.investorId}` : null],
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => apiRequest<{ items: Publication[]; nextCursor: number | null }>(`/api/publications?mine=${mine ? 1 : 0}${pageParam ? `&before=${pageParam}` : ''}`),
    getNextPageParam: page => page.nextCursor ?? undefined,
    enabled: isServerMode() && (!mine || user?.role === 'artist'),
    refetchOnWindowFocus: true, refetchInterval: mine ? false : 15_000,
  });
}
export function usePublication(id?: number, watch = false, refreshOnFocus = true) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['publication', id, user ? `${user.role}:${user.artistId ?? user.investorId}` : null], queryFn: () => apiRequest<Publication>(`/api/publications/${id}`), enabled: isServerMode() && !!id, refetchOnWindowFocus: refreshOnFocus, refetchInterval: watch ? 15_000 : false });
}
export async function savePublication(data: PublicationInput, existing?: Publication) {
  return apiRequest<Publication>(`/api/publications${existing ? `/${existing.id}` : ''}`, {
    method: existing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, ...(existing ? { revision: existing.revision } : {}) }),
  });
}
export function uploadMedia(file: File, kind: UploadedMedia['kind'], progress: (value: number) => void, signal: AbortSignal, remixDraftId?: string): Promise<UploadedMedia> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/uploads');
    if (remixDraftId) request.setRequestHeader('X-Remix-Draft', remixDraftId);
    request.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    request.setRequestHeader('X-Nebula-Request', '1'); request.setRequestHeader('X-Media-Kind', kind); request.setRequestHeader('Content-Type', 'application/octet-stream');
    const abort = () => request.abort();
    signal.addEventListener('abort', abort, { once: true });
    request.upload.onprogress = event => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
    request.onloadend = () => signal.removeEventListener('abort', abort);
    request.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'));
    request.onabort = () => reject(new Error('Upload cancelled.'));
    request.onload = () => {
      try { const data = JSON.parse(request.responseText); if (request.status >= 400) reject(new Error(data.error ?? 'Upload failed.')); else resolve(data); }
      catch { reject(new Error('The server returned an invalid response.')); }
    };
    if (signal.aborted) { reject(new Error('Upload cancelled.')); return; }
    request.send(file);
  });
}

export function useDiscoveryFeed() {
  const { user } = useAuth();
  const generation=useSyncExternalStore(subscribeHomeRanking,()=>getHomeRankingGeneration(user?.artistId));
  const identity = user ? `${user.role}:${user.artistId ?? user.investorId}:${generation}` : 'guest';
  const client = useQueryClient();
  const cached = client.getQueryData<{ pages: { snapshot: string }[] }>(['discovery-feed', identity]);
  const snapshot = useRef<{ identity: string; token?: string }>({ identity, token: cached?.pages[0]?.snapshot });
  const refreshRequest = useRef<AbortController | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => () => { refreshRequest.current?.abort(); refreshRequest.current = null; }, [identity]);
  useEffect(() => { setRefreshing(false); }, [identity]);
  if (snapshot.current.identity !== identity) snapshot.current = { identity };
  const query = useInfiniteQuery({ queryKey: ['discovery-feed', identity], initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const result = await apiRequest<{ items: Publication[]; snapshot: string; nextCursor: number | null }>(`/api/feed?offset=${pageParam}${snapshot.current.token ? `&snapshot=${snapshot.current.token}` : ''}`, { signal });
      if (!signal.aborted && snapshot.current.identity === identity) snapshot.current.token = result.snapshot;
      return result;
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
    enabled: !refreshing, refetchInterval: refreshing ? false : 15_000, refetchOnWindowFocus: !refreshing, gcTime: 5 * 60_000,
  });
  const refresh = useCallback(async () => {
    if (refreshRequest.current) return;
    const controller = new AbortController(); refreshRequest.current = controller; setRefreshing(true);
    try {
      await client.cancelQueries({ queryKey: ['discovery-feed', identity], exact: true });
      const page = await apiRequest<{ items: Publication[]; snapshot: string; nextCursor: number | null }>('/api/feed?offset=0', { signal: controller.signal });
      if (controller.signal.aborted || snapshot.current.identity !== identity) return;
      snapshot.current.token = page.snapshot;
      client.setQueryData(['discovery-feed', identity], { pages: [page], pageParams: [0] });
      return page.items[0]?.id;
    } finally {
      if (refreshRequest.current === controller) { refreshRequest.current = null; setRefreshing(false); }
    }
  }, [client, identity]);
  return { ...query, refresh, refreshing };
}
