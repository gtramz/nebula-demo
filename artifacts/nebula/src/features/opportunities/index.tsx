import { useProjectProductCopy } from '@/features/presentation/catalog';
import { HomeProjectRecording } from './project-recording';
import { StaticFace, WinkFace } from '@/components/blob-face';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AudioPreview } from '@/components/audio-preview';
import { useFollowSync } from '@/features/following';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Music2, Bookmark } from 'lucide-react';
import { apiRequest, musicalGenreTaxonomy, isServerMode, getHomeRankingGeneration, subscribeHomeRanking, type OpportunityPage, type OpportunityProject } from '@nebula/local';
import { ContentWidth } from '@/components/shell/app-shell';
import { useViewState } from '@/components/shell/return-context';
import { controlStyles } from '@/components/antiq/workspace';
import { useAuth } from '@/context/AuthContext';
import { useHomeSearch } from './search';
import { normalizeHomeSearch, homeFilterEntries, homeSearchParams, type HomeMode, type HomeFacetOptions } from '@nebula/local';
import { HomeFilterChips } from './filters';
import { HomeToolbar } from './home-toolbar';
import { formatMoney } from '@/lib/utils';
import { warmImageAssets } from '@/lib/preload-assets';
import { Skeleton } from '@/components/ui/skeleton';
import '@/components/text-tabs.css';
import './cards.css';

function OpportunitySkeletons({ rows = 4, label = 'Loading projects' }: { rows?: number; label?: string }) {
  return <div className="opportunity-grid" aria-busy="true" data-loading-variant="opportunities"><span role="status" className="sr-only">{label}</span>{Array.from({ length: rows }, (_, index) => <div key={index} className="opportunity-card flex min-h-[248px] flex-col" aria-hidden="true">
    <div className="flex items-start gap-3"><Skeleton className="h-16 w-16 shrink-0 rounded-[7px]"/><div className="min-w-0 flex-1 space-y-3 pt-1"><Skeleton className="h-5 w-4/5"/><div className="flex items-center gap-2"><Skeleton className="h-6 w-6 rounded-full"/><Skeleton className="h-3 w-20"/></div></div></div>
    <div className="my-3 flex items-center gap-3"><Skeleton className="h-10 w-10 shrink-0 rounded-full"/><div className="flex-1 space-y-2"><Skeleton className="h-2 w-2/5"/><Skeleton className="h-5 w-full"/><div className="flex justify-between"><Skeleton className="h-2 w-7"/><Skeleton className="h-2 w-7"/></div></div></div>
    <div className="mt-auto flex items-center justify-between border-t border-white/[0.07] pt-4"><div className="space-y-2"><Skeleton className="h-2 w-6"/><Skeleton className="h-2 w-36"/></div><Skeleton className="h-3 w-20"/></div>
  </div>)}</div>;
}

export function OpportunityProjectCard({ item, priority = false }: { item: OpportunityProject; priority?: boolean }) {
  const { project, offers, preview } = item, client = useQueryClient(), {user}=useAuth();
  const [coverFailed,setCoverFailed]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState(''),[hoverPreview,setHoverPreview]=useState(false);
  const [loadedCover,setLoadedCover]=useState<string|null>(null);
  const [avatarReady,setAvatarReady]=useState(!project.artistPicture),[playerReady,setPlayerReady]=useState(false),[revealed,setRevealed]=useState(false);
  const markPlayerReady=useCallback(()=>setPlayerReady(true),[]);
  const coverReady=!project.coverUrl||coverFailed||loadedCover===project.coverUrl;
  useEffect(()=>{
    if(revealed||!coverReady||!avatarReady||!playerReady)return;
    let cancelled=false,frame=0;
    void document.fonts.ready.then(()=>{if(!cancelled)frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{if(!cancelled)setRevealed(true);});});});
    return()=>{cancelled=true;cancelAnimationFrame(frame);};
  },[revealed,coverReady,avatarReady,playerReady]);
  const funding=project.status==='funding';
  const copy=useProjectProductCopy(project);
  async function save() {
    if(!preview?.publicationId)return;
    setPending(true);setError('');
    try {await apiRequest(`/api/publications/${preview.publicationId}/save`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:!preview.saved})});await Promise.all(['opportunity-projects','saved','discovery-feed','publication'].map(key=>client.invalidateQueries({queryKey:[key]})));}
    catch(e){setError((e as Error).message);}finally{setPending(false);}
  }
  return <div className="opportunity-card-slot" data-ready={revealed} aria-busy={!revealed}><article aria-label={project.title} aria-hidden={!revealed} inert={!revealed} style={{visibility:revealed?'visible':'hidden'}} className="opportunity-card min-h-[248px] min-w-0 flex flex-col" onPointerEnter={event=>{if(revealed&&event.pointerType==='mouse'&&matchMedia('(hover: hover) and (pointer: fine)').matches)setHoverPreview(true);}} onPointerLeave={()=>setHoverPreview(false)} onPointerCancel={()=>setHoverPreview(false)}>
    <div className="opportunity-identity">
      <div className="opportunity-art" aria-busy={!!project.coverUrl&&!coverFailed&&loadedCover!==project.coverUrl}>{project.coverUrl&&!coverFailed?<>{loadedCover!==project.coverUrl&&<Skeleton aria-hidden="true" className="absolute inset-0 rounded-[inherit] bg-white/[0.08]"/>}<img src={project.coverUrl} onLoad={()=>setLoadedCover(project.coverUrl!)} onError={()=>setCoverFailed(true)} alt={`${project.title} artwork`} loading="eager" fetchPriority={priority?'high':'low'} decoding="async" style={{opacity:loadedCover===project.coverUrl?1:0}}/></>:<Music2 size={28} className="text-muted"/>}</div>
      <div className="opportunity-copy min-w-0"><h2 className="opportunity-title line-clamp-2 break-words">{project.title}</h2><Link href={`/artist/${project.artistId}`} className="opportunity-author inline-flex min-h-8 max-w-full items-center gap-2 text-sm text-muted hover:text-ink">
        <Avatar className="h-6 w-6 bg-surfaceAlt" aria-hidden="true"><AvatarImage src={project.artistPicture??undefined} onLoadingStatusChange={status=>{if(status==='loaded'||status==='error')setAvatarReady(true);}} alt="" className="object-cover"/><AvatarFallback className="bg-surfaceAlt"><StaticFace seed={project.artistId} size={24}/></AvatarFallback></Avatar>
        <span className="min-w-0 truncate">{project.artistName}</span>
      </Link>{!!item.genres?.length&&<p className="opportunity-meta opportunity-genres">{item.genres.slice(0,2).map(g=><span key={g}>{musicalGenreTaxonomy.find(genre=>genre.id===g)?.label??g}</span>)}</p>}</div>
      {preview?.publicationId&&user&&<button type="button" disabled={pending} aria-label={`${preview.saved?'Unsave':'Save'} ${preview.title}`} aria-pressed={!!preview.saved} className="opportunity-save min-h-11 min-w-11 grid place-items-center text-muted aria-pressed:text-accent" onClick={()=>void save()}><Bookmark size={18} fill={preview.saved?'currentColor':'none'}/></button>}
    </div>
    {preview?<AudioPreview key={preview.media.id} title={preview.title} src={preview.media.url} waveformUrl={`/api/projects/${project.id}/preview/waveform`} hoverPreview={hoverPreview} onReady={markPlayerReady}/>:<HomeProjectRecording project={project} hoverPreview={hoverPreview} onReady={markPlayerReady}><div className="text-sm text-muted"><p className="line-clamp-2">{copy.pitch||copy.story}</p><Link href={`/artist/${project.artistId}`} className="opportunity-artist-link inline-flex min-h-11 underline">About Artist</Link></div></HomeProjectRecording>}
    <div className="opportunity-offers"><ul>{offers.slice(0,2).map(offer=><li key={offer.id}><div className="opportunity-offer-line"><strong>{offer.need}</strong><span>{offer.compensation.kind==='split'?`${offer.compensation.percent}% royalties`:`${offer.compensation.currency} ${offer.compensation.amount} fixed`}</span></div>{offer.workTitle&&<p className="text-xs text-muted mt-1">For {offer.workTitle}</p>}</li>)}</ul>{offers.length>2&&<span className="inline-flex min-h-8 text-xs underline">+{offers.length-2} opportunities</span>}</div>
    {error&&<p role="alert" className="text-xs text-danger">{error}</p>}
    <footer className="opportunity-footer mt-auto"><div className="opportunity-footer-meta"><p className="opportunity-meta"><span>{project.category}</span></p>{funding&&<p className="opportunity-funding">{formatMoney(project.raisedAmount)} of {formatMoney(project.goalAmount)}</p>}</div><Link href={`/project/${project.id}`} className="opportunity-project-link inline-flex min-h-11 items-center text-sm font-semibold">View project</Link></footer>
  </article>{!revealed&&<OpportunitySkeletons rows={1} label={`Preparing ${project.title}`}/>}</div>;
}

export function OpportunityHome() {
  const { user } = useAuth();
  const identity = user ? `${user.role}:${user.artistId ?? user.investorId}` : 'guest';
  return <OpportunityHomeContent key={identity} identity={identity} />;
}
function OpportunityHomeContent({ identity }: { identity: string }) {
  const { user } = useAuth();
  const rankingGeneration = useSyncExternalStore(subscribeHomeRanking, () => getHomeRankingGeneration(user?.artistId));
  const canFollow = isServerMode() && user?.role === 'artist';
  useFollowSync();
  const model = useHomeSearch(identity);
  const filters = normalizeHomeSearch(model.search).filters;
  const filterCount = homeFilterEntries(filters).length;
  const hasSearch = !!model.search.q.trim();
  const [savedMode, setMode] = useViewState<HomeMode>('home-discovery-mode', 'for-you');
  const mode = savedMode === 'following' && !canFollow ? 'for-you' : savedMode;
  const lastFacets = useRef<HomeFacetOptions | undefined>(undefined);
  const query = useInfiniteQuery({
    queryKey: ['opportunity-projects', identity, mode, model.settled, mode === 'for-you' ? rankingGeneration : null], enabled: model.ready, initialPageParam: null as number | string | null,
    queryFn: async ({ signal, pageParam }) => {
      const params = homeSearchParams(model.settled, 'all', mode);
      if (pageParam !== null) params.set(typeof pageParam === 'number' ? 'before' : 'cursor', String(pageParam));
      const page = await apiRequest<OpportunityPage>(`/api/opportunities/projects?${params}`, { signal });
      await warmImageAssets(page.items.slice(0, 2).flatMap(item => [item.project.coverUrl, item.project.artistPicture]), { priority: 'high', maxWaitMs: pageParam === null ? 180 : 0 });
      return page;
    },
    getNextPageParam: page => page.nextPageCursor !== undefined ? page.nextPageCursor ?? undefined : page.nextCursor ?? undefined,
    refetchInterval: 15_000, refetchOnWindowFocus: true, retry: false,
  });
  if (query.data?.pages[0]?.facets) lastFacets.current = query.data.pages[0].facets;
  // Defensive stable identity across pages when availability changes during browsing.
  const items = model.ready ? [...new Map((query.data?.pages.flatMap(page => page.items) ?? []).map(item => [item.project.id, item])).values()] : [];
  return <div data-page-scroll className="flex-1 overflow-y-auto">
    <ContentWidth className="py-6 sm:py-8 space-y-5">
      <header className="max-w-2xl">
        <h1 aria-label="Find your next project." className="text-3xl sm:text-4xl font-display font-bold tracking-tight">Find your next <span className="inline-block whitespace-nowrap">project<WinkFace size={32}/></span></h1>
      </header>
      <div className="space-y-3 border-b border-border pb-4">
        <HomeToolbar model={model} mode={mode} onModeChange={setMode} canFollow={canFollow} filters={filters} facets={lastFacets.current} loading={query.isPending} failed={!!query.error} retry={() => void query.refetch()}/>
        {!canFollow && <p id="following-unavailable" className="text-xs text-muted">{user ? 'Following is available for Artist accounts.' : <>Sign in as an artist to browse Following. <Link href="/login" className="underline inline-flex min-h-11 items-center">Sign in</Link></>}</p>}
        <HomeFilterChips filters={filters} onChange={model.applyFilters} />
      </div>
      {model.ready && query.error && <div role="alert" className="space-y-3"><p className="text-sm">{query.error.message}</p><button className={controlStyles.button} disabled={query.isFetching} onClick={() => void query.refetch()}>Try again</button></div>}
      {!model.ready || query.isPending ? <OpportunitySkeletons/> : !items.length && !query.error ? <div className="py-16 space-y-4">
        <h2 className="text-xl font-semibold">{mode === 'following' && query.data?.pages[0]?.followedArtistCount === 0 ? 'Follow artists to discover their projects.' : mode === 'following' && query.data?.pages[0]?.eligibleCount === 0 ? 'No open opportunities from followed artists yet.' : query.data?.pages[0]?.eligibleCount === 0 || (!hasSearch && !filterCount) ? 'No open opportunities yet.' : 'No matching projects.'}</h2>
        <p className="text-sm text-muted">{hasSearch || filterCount ? 'Try another search or adjust your filters.' : 'Projects remain available through Search and artist profiles.'}</p>
        {hasSearch && <button className={controlStyles.button} onClick={model.clear}>Clear search</button>}

        <Link href="/search" className={controlStyles.button}>Search projects</Link>
      </div> : null}
      {!!items.length && <div className="opportunity-grid">{items.map((item,index) => <OpportunityProjectCard key={item.project.id} item={item} priority={index<2}/>)}</div>}
      {query.isFetchingNextPage&&<OpportunitySkeletons rows={2} label="Loading more projects"/>}
      {model.ready && query.hasNextPage && <button className={controlStyles.button} disabled={query.isFetching} aria-busy={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>Load more projects</button>}
    </ContentWidth>
  </div>;
}
