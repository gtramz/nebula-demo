import { useProjectProductCopy } from '@/features/presentation/catalog';
import { HomeProjectRecording } from './project-recording';
import { WinkFace } from '@/components/blob-face';
import { AudioPreview } from '@/components/audio-preview';
import { useFollowSync } from '@/features/following';
import { useRef, useState, useSyncExternalStore } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowUpRight, Music2, Bookmark } from 'lucide-react';
import { apiRequest, musicalGenreTaxonomy, isServerMode, getHomeRankingGeneration, subscribeHomeRanking, type OpportunityPage, type OpportunityProject } from '@nebula/local';
import { ContentWidth } from '@/components/shell/app-shell';
import { useViewState } from '@/components/shell/return-context';
import { controlStyles } from '@/components/antiq/workspace';
import { useAuth } from '@/context/AuthContext';
import { HomeSearchControl, useHomeSearch } from './search';
import { normalizeHomeSearch, homeFilterEntries, homeSearchParams, type HomeMode, type HomeFacetOptions } from '@nebula/local';
import { HomeFiltersPanel, HomeFilterChips } from './filters';
import { formatMoney, cn } from '@/lib/utils';


export function OpportunityProjectCard({ item }: { item: OpportunityProject }) {
  const { project, offers, preview } = item, client = useQueryClient(), {user}=useAuth();
  const [coverFailed,setCoverFailed]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');
  const funding=project.status==='funding';
  const copy=useProjectProductCopy(project);
  async function save() {
    if(!preview?.publicationId)return;
    setPending(true);setError('');
    try {await apiRequest(`/api/publications/${preview.publicationId}/save`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:!preview.saved})});await Promise.all(['opportunity-projects','saved','discovery-feed','publication'].map(key=>client.invalidateQueries({queryKey:[key]})));}
    catch(e){setError((e as Error).message);}finally{setPending(false);}
  }
  return <article aria-label={project.title} className="opportunity-card min-w-0 flex flex-col gap-4">
    <div className="opportunity-identity">
      <div className="opportunity-art">{project.coverUrl&&!coverFailed?<img src={project.coverUrl} onError={()=>setCoverFailed(true)} alt={`${project.title} artwork`} loading="lazy"/>:<Music2 size={28} className="text-muted"/>}</div>
      <div className="min-w-0 space-y-1"><h2 className="text-xl font-semibold tracking-tight line-clamp-2 break-words">{project.title}</h2><Link href={`/artist/${project.artistId}`} className="text-sm text-muted hover:text-ink inline-flex items-center min-h-8">{project.artistName}<ArrowUpRight size={13} className="ml-1"/></Link><p className="opportunity-meta"><span>{project.category}</span>{item.genres?.slice(0,2).map(g=><span key={g}>{musicalGenreTaxonomy.find(genre=>genre.id===g)?.label??g}</span>)}</p></div>
      {preview?.publicationId&&user&&<button type="button" disabled={pending} aria-label={`${preview.saved?'Unsave':'Save'} ${preview.title}`} aria-pressed={!!preview.saved} className="min-h-11 min-w-11 grid place-items-center text-muted aria-pressed:text-accent" onClick={()=>void save()}><Bookmark size={18} fill={preview.saved?'currentColor':'none'}/></button>}
    </div>
    {preview?<AudioPreview key={preview.media.id} title={preview.title} src={preview.media.url} waveformUrl={`/api/projects/${project.id}/preview/waveform`}/>:<HomeProjectRecording project={project}><div className="text-sm text-muted"><p className="line-clamp-2">{copy.pitch||copy.story}</p><Link href={`/artist/${project.artistId}`} className="inline-flex min-h-11 underline">About Artist</Link></div></HomeProjectRecording>}
    <div className="opportunity-offers"><ul>{offers.slice(0,2).map(offer=><li key={offer.id}><div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><strong>{offer.need}</strong><span>{offer.compensation.kind==='split'?`${offer.compensation.percent}% royalties`:`${offer.compensation.currency} ${offer.compensation.amount} fixed`}</span></div>{offer.workTitle&&<p className="text-xs text-muted mt-1">For {offer.workTitle}</p>}</li>)}</ul>{offers.length>2&&<Link className="inline-flex min-h-8 text-xs underline" href={`/project/${project.id}`}>+{offers.length-2} opportunities</Link>}{funding&&<p className="text-xs text-muted mt-2">Funding open · {formatMoney(project.raisedAmount)} of {formatMoney(project.goalAmount)}</p>}</div>
    {error&&<p role="alert" className="text-xs text-danger">{error}</p>}
    <footer className="mt-auto flex items-center gap-2 border-t border-border pt-3"><Link href={`/project/${project.id}`} className="inline-flex items-center justify-between min-h-11 flex-1 text-sm font-semibold">View project<ArrowUpRight size={16}/></Link></footer>
  </article>;
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
    queryFn: ({ signal, pageParam }) => {
      const params = homeSearchParams(model.settled, 'all', mode);
      if (pageParam !== null) params.set(typeof pageParam === 'number' ? 'before' : 'cursor', String(pageParam));
      return apiRequest<OpportunityPage>(`/api/opportunities/projects?${params}`, { signal });
    },
    getNextPageParam: page => page.nextPageCursor !== undefined ? page.nextPageCursor ?? undefined : page.nextCursor ?? undefined,
    refetchInterval: 15_000, refetchOnWindowFocus: true, retry: false,
  });
  if (query.data?.pages[0]?.facets) lastFacets.current = query.data.pages[0].facets;
  // Defensive stable identity across pages when availability changes during browsing.
  const items = model.ready ? [...new Map((query.data?.pages.flatMap(page => page.items) ?? []).map(item => [item.project.id, item])).values()] : [];
  const forYou = query.data?.pages[0]?.forYou;
  const forYouDescription = !model.ready || query.isPending ? 'Ordering opportunities…'
    : query.error ? 'For You could not refresh. Try again.'
    : forYou?.basis === 'preferences' ? 'Opportunities picked for your next move.'
    : forYou?.basis === 'profile' ? 'Projects that fit your sound and skills.'
    : forYou?.basis === 'mixed' ? 'Projects that fit your interests, sound and skills.'
    : forYou?.reason === 'no-matches' ? 'Explore a different direction.'
    : forYou?.reason === 'no-signals' && user?.role === 'artist' ? 'Find a sound you want to be part of.'
    : 'New possibilities from the community.';
  return <div data-page-scroll className="flex-1 overflow-y-auto">
    <ContentWidth className="py-6 sm:py-8 space-y-5">
      <header className="max-w-2xl space-y-2">
        <p className="voice text-xs text-muted">OPEN OPPORTUNITIES</p>
        <h1 aria-label="Find your next project." className="text-3xl sm:text-4xl font-display font-bold tracking-tight">Find your next project<WinkFace size={32}/></h1>

      </header>
      <div className="space-y-3 border-b border-border pb-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <HomeSearchControl model={model} mode={mode} />
          <HomeFiltersPanel filters={filters} facets={lastFacets.current} loading={query.isPending} failed={!!query.error} retry={() => void query.refetch()} onApply={model.applyFilters} />
        </div>
        <div className="flex flex-wrap gap-2 max-sm:[&>button]:px-3 max-sm:[&>button]:text-xs" role="group" aria-label="Discovery mode">
          <button className={cn(controlStyles.button, mode === 'for-you' && 'bg-cream text-bg hover:bg-cream hover:text-bg')} aria-pressed={mode === 'for-you'} onClick={() => setMode('for-you')}>For You</button>
          <button className={cn(controlStyles.button, mode === 'recent' && 'bg-cream text-bg hover:bg-cream hover:text-bg')} aria-pressed={mode === 'recent'} onClick={() => setMode('recent')}>Recently created</button>
          <button className={cn(controlStyles.button, mode === 'following' && 'bg-cream text-bg hover:bg-cream hover:text-bg')} disabled={!canFollow} aria-pressed={mode === 'following'} aria-describedby={!canFollow ? 'following-unavailable' : undefined} onClick={() => setMode('following')}>Following</button>
        </div>
        <p className="text-xs text-muted" data-testid="home-mode-description">{mode === 'following' ? 'Open opportunities from artists you follow.' : mode === 'for-you' ? forYouDescription : 'Fresh projects from the community.'}</p>
        {!canFollow && <p id="following-unavailable" className="text-xs text-muted">{user ? 'Following is available for Artist accounts.' : <>Sign in as an artist to browse Following. <Link href="/login" className="underline inline-flex min-h-11 items-center">Sign in</Link></>}</p>}
        <HomeFilterChips filters={filters} onChange={model.applyFilters} />
      </div>
      {model.ready && query.error && <div role="alert" className="space-y-3"><p className="text-sm">{query.error.message}</p><button className={controlStyles.button} disabled={query.isFetching} onClick={() => void query.refetch()}>Try again</button></div>}
      {!model.ready || query.isPending ? <p role="status" className="py-16 text-muted">{model.composing ? 'Finish typing to search.' : 'Loading opportunities…'}</p> : !items.length && !query.error ? <div className="py-16 space-y-4">
        <h2 className="text-xl font-semibold">{mode === 'following' && query.data?.pages[0]?.followedArtistCount === 0 ? 'Follow artists to discover their projects.' : mode === 'following' && query.data?.pages[0]?.eligibleCount === 0 ? 'No open opportunities from followed artists yet.' : query.data?.pages[0]?.eligibleCount === 0 || (!hasSearch && !filterCount) ? 'No open opportunities yet.' : 'No matching projects.'}</h2>
        <p className="text-sm text-muted">{hasSearch || filterCount ? 'Try another search or adjust your filters.' : 'Projects remain available through Search and artist profiles.'}</p>
        {hasSearch && <button className={controlStyles.button} onClick={model.clear}>Clear search</button>}

        <Link href="/search" className={controlStyles.button}>Search projects</Link>
      </div> : null}
      {model.ready && !!items.length && <p role="status" className="text-xs text-muted">{items.length} {items.length === 1 ? 'project' : 'projects'}{query.hasNextPage ? ' loaded' : ''}{hasSearch || filterCount ? ' matching your search and filters' : ''}.</p>}
      {!!items.length && <div className="opportunity-grid">{items.map(item => <OpportunityProjectCard key={item.project.id} item={item} />)}</div>}
      {model.ready && query.hasNextPage && <button className={controlStyles.button} disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Loading…' : 'Load more projects'}</button>}
    </ContentWidth>
  </div>;
}
