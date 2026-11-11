import { useProjectProductCopy } from '@/features/presentation/catalog';
import { PublicationShare } from '@/features/discovery/share-panel';
import { useFollowSync } from '@/features/following';
import { DiscoveryArtistPreview } from '@/features/discovery/artist-preview';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ProjectOffers } from '@/features/collaborations';
import { apiRequest } from '@nebula/local';
import { useQueryClient } from '@tanstack/react-query';
import { LiveComments, refreshSocial } from '@/features/discovery/social';
import { Link, useLocation } from 'wouter';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, Bookmark, ChevronDown, ChevronUp, Disc3, GitBranch, MessageCircle, Send, Heart, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DEMO_POSTS, formatDemoUSD, type DemoPost, type DemoProject } from '@/features/discovery/demo-posts';
import '@/features/discovery/discovery.css';
import '@/features/discovery/desktop.css';
import { useNotificationsOpen } from '@/features/notifications';
import { useCoproducerOpen } from '@/features/coproducer';
import { useNextMediaPreparation, type FeedPlaybackState } from '@/features/discovery/feed-preparation';
import { DiscoveryMedia } from '@/features/discovery/media-player';
import { DiscoveryProjectArtwork } from '@/features/discovery/cover-artwork';
import { OriginalSoundArtwork, OriginalSoundPanel } from '@/features/discovery/original-sound';
import { isSplitVideo } from '@/features/remix/adaptive-video';
import { PublicationComparison } from '@/features/discovery/version-comparison';
import { usePresentation } from '@/features/presentation';
import { useIsMobile } from '@/hooks/use-mobile';
import { DISCOVERY_REFRESH } from '@/features/discovery/refresh-event';
import { useDiscoveryScroll } from '@/features/discovery/feed-scroll';

type Panel = { kind: 'project' | 'comments' | 'send' | 'login' | 'description' | 'compare' | 'original'; postId: string };
type PostActivity = { starred: boolean; saved: boolean; comments: { id: string; author: string; text: string }[] };
const initialActivity = (posts: DemoPost[]) => Object.fromEntries(posts.map(post => [post.id, { starred: false, saved: false, comments: [] }])) as Record<string, PostActivity>;

function Action({ label, icon, onClick, pressed, detail, disabled }: {
  label: string; icon: ReactNode; onClick: () => void; pressed?: boolean; detail: string | number; disabled?: boolean;
}) {
  return <button type="button" className="discovery-action" aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
    {icon}<span>{detail}</span>
  </button>;
}

function DiscoveryPostInfo({ children }: { children: ReactNode }) {
  return <div className="discovery-post-info">{children}</div>;
}
function DiscoveryActionRail({ title, children, artwork }: { title: string; children: ReactNode; artwork?: ReactNode }) {
  return <div className="discovery-action-rail"><div className="discovery-actions" aria-label={`Actions for ${title}`}>{children}</div>{artwork}</div>;
}

function ProjectPanel({ project, live = false, projectId, ownerId, workId }: { workId?: number; project: DemoProject; live?: boolean; projectId?: number; ownerId?: number }) {
  const copy = useProjectProductCopy(projectId && ownerId ? { id: projectId, artistId: ownerId, story: project.description } : undefined);
  return <div className="discovery-project-info">
    <div><p className="discovery-eyebrow">{project.stage}</p><h3>{project.title}</h3><p className="discovery-byline">by {project.artist}</p></div>
    <p>{copy.story ?? project.description}</p>
    <section aria-label="Project funding" className="discovery-funding">
      <div><strong>{formatDemoUSD(project.raised)}</strong><span>of {formatDemoUSD(project.goal)}</span></div>
      <progress value={project.raised} max={project.goal} aria-label="Funding progress" />
      <p className="discovery-eyebrow">use of funds</p>
      {project.useOfFunds.map(item => <div key={item.label}><span>{item.label}</span><span>{item.percent}%</span></div>)}
    </section>
    {live && projectId && <Link className="discovery-primary" href={`/project/${projectId}${workId ? `?song=${workId}` : ''}`}>Open full project</Link>}
    {live && projectId && <ProjectOffers projectId={projectId} ownerId={ownerId} compact />}
    {!live && <section aria-label="Collaboration offers">
      <p className="discovery-eyebrow">open calls · {project.offers.length}</p><h3>Make it together.</h3>
      {project.offers.map(offer => <article key={offer.id} className="discovery-offer">
        <h4>{offer.need}</h4>
        <p className="discovery-compensation">{offer.compensation.kind === 'split' ? `${offer.compensation.percent}% royalty split offered` : `${formatDemoUSD(offer.compensation.amount)} fixed fee`}</p>
        <p>{offer.deliverable}</p>
        <div className="discovery-offer-actions"><button disabled>Contact artist</button><button disabled>Submit work</button></div>
      </article>)}
      <p className="discovery-note">Remix permission does not include collaboration approval or royalties.</p>
    </section>}
  </div>;
}

export default function Discovery({ posts = DEMO_POSTS, live = false, onLoadMore, loadingMore = false, fetching = false, loadError, onRetry, onRefresh, introPending = false, onInitialReady }: { introPending?: boolean; onInitialReady?:()=>void; posts?: DemoPost[]; live?: boolean; onLoadMore?: () => void; loadingMore?: boolean; fetching?: boolean; loadError?: string; onRetry?: () => void; onRefresh?: () => Promise<string | undefined> }) {
  const { user } = useAuth();
  useFollowSync();
  const viewerIdentity = user ? `${user.role}:${user.artistId ?? user.investorId}` : 'guest';
  const commentDrafts = useMemo(() => new Map<number,string>(), [viewerIdentity]);
  const replyDrafts = useMemo(() => new Map<number,{id:number;author:string}>(), [viewerIdentity]);
  const isMobile = useIsMobile(), presentation = usePresentation();
  const [viewport,setViewport]=useState(()=>({height:window.visualViewport?.height??window.innerHeight,keyboard:false}));
  useEffect(()=>{let frame=0;const update=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const height=window.visualViewport?.height??window.innerHeight,keyboard=height<window.innerHeight*.8;setViewport(current=>current.height===height&&current.keyboard===keyboard?current:{height,keyboard});});};window.visualViewport?.addEventListener('resize',update);window.addEventListener('resize',update);return()=>{cancelAnimationFrame(frame);window.visualViewport?.removeEventListener('resize',update);window.removeEventListener('resize',update);};},[]);
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const [interactionError, setInteractionError] = useState('');
  const busy = useRef(false);
  const feed = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const opener = useRef<HTMLElement | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>(() => {
    const id = new URLSearchParams(window.location.search).get('post');
    return posts.find(post => post.id === id)?.id ?? posts[0]?.id;
  });
  const activeIndex = Math.max(0, posts.findIndex(post => post.id === activeId));
  const playbackMemory = useMemo(() => new Map<string, FeedPlaybackState>(), [user?.role, user?.artistId, user?.investorId]);
  const postOrder = posts.map(post => post.id).join(',');
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const [activity, setActivity] = useState(() => initialActivity(posts));
  const [panel, setPanel] = useState<Panel | null>(null);
  const [readyMedia, setReadyMedia] = useState<string>();
  const activeMediaKey = posts[activeIndex] ? `${posts[activeIndex].id}:${posts[activeIndex].media.src}` : undefined;
  const notificationsOpen = useNotificationsOpen(), coproducerOpen = useCoproducerOpen();
  const [modalLocked, setModalLocked] = useState(() => document.body.hasAttribute('data-scroll-locked') || document.body.style.overflow === 'hidden');
  useEffect(() => {
    const update = () => setModalLocked(document.body.hasAttribute('data-scroll-locked') || document.body.style.overflow === 'hidden');
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-scroll-locked', 'style'] });
    update(); return () => observer.disconnect();
  }, []);
  const workspaceOverlayOpen = notificationsOpen || coproducerOpen || modalLocked;
  const blocksPreparation = !!panel && (panel.kind !== 'comments' || isMobile || !live);
  const prepareNext = useNextMediaPreparation(activeMediaKey, readyMedia === activeMediaKey, blocksPreparation || workspaceOverlayOpen);
  const [comment, setComment] = useState('');
  const [sharePending, setSharePending] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [refreshing, setRefreshing] = useState(false), [refreshError, setRefreshError] = useState(''), [pull, setPull] = useState(0);
  const refreshingRef = useRef(false), mounted = useRef(true);
  const scroll = useDiscoveryScroll({ feed, cards, activeIndex, activeIndexRef, count: posts.length, order: postOrder,
    blocked: introPending || refreshing || workspaceOverlayOpen || !!panel && (panel.kind !== 'comments' || isMobile),
    onSelect: index => { if (posts[index]) setActiveId(posts[index].id); } });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function refreshFeed() {
    if (refreshingRef.current || panel || workspaceOverlayOpen) return;
    refreshingRef.current = true; setRefreshing(true); setRefreshError('');
    feed.current?.querySelectorAll<HTMLMediaElement>('audio,video').forEach(media => media.pause());
    if (posts[0]) setActiveId(posts[0].id);
    activeIndexRef.current = 0;
    feed.current?.scrollTo({ top: 0, behavior: 'instant' });
    try {
      const first = onRefresh ? await onRefresh() : posts[0]?.id;
      if (!mounted.current) return;
      if (first) setActiveId(first);
      activeIndexRef.current = 0;
      feed.current?.scrollTo({ top: 0, behavior: 'instant' });
      setAnnouncement('Feed refreshed.');
    } catch (error) { if (mounted.current && (error as Error).name !== 'AbortError') setRefreshError((error as Error).message || 'Unable to refresh.'); }
    finally { refreshingRef.current = false; if (mounted.current) setRefreshing(false); }
  }
  const refreshAction = useRef(refreshFeed); refreshAction.current = refreshFeed;
  useEffect(() => { const refresh = () => { void refreshAction.current(); }; window.addEventListener(DISCOVERY_REFRESH, refresh); return () => window.removeEventListener(DISCOVERY_REFRESH, refresh); }, []);
  useEffect(() => {
    const container = feed.current;
    if (!container || !isMobile || panel || workspaceOverlayOpen || refreshing) return;
    let origin: { x: number; y: number } | null = null, distance = 0, suppressClickUntil = 0, frame = 0, listening = false;
    const stopMove = () => { if (listening) container.removeEventListener('touchmove', move); listening = false; };
    const clearPull = () => { cancelAnimationFrame(frame); frame = 0; if (distance > 10) setPull(0); distance = 0; };
    const start = (event: TouchEvent) => {
      stopMove(); clearPull(); suppressClickUntil = 0;
      const control = (event.target as Element).closest('a,input,textarea,select,button:not(.discovery-video-tap)');
      if (event.touches.length !== 1 || container.scrollTop > 1 || control) { origin = null; return; }
      origin = { x: event.touches[0].clientX, y: event.touches[0].clientY }; distance = 0;
      // Ordinary feed swipes have no persistent non-passive touchmove listener.
      // Only a possible top-edge pull needs to cancel the browser's overscroll.
      container.addEventListener('touchmove', move, { passive: false }); listening = true;
    };
    const move = (event: TouchEvent) => {
      if (!origin) return;
      if (event.touches.length !== 1) { origin = null; stopMove(); clearPull(); return; }
      const dx = event.touches[0].clientX - origin.x, dy = event.touches[0].clientY - origin.y;
      if (dy < 0 || Math.abs(dx) > Math.max(15, dy)) { origin = null; stopMove(); clearPull(); return; }
      if (dy > 10) {
        if (event.cancelable) event.preventDefault();
        suppressClickUntil = performance.now() + 500; distance = Math.min(110, dy);
        if (!frame) frame = requestAnimationFrame(() => { frame = 0; setPull(distance); });
      }
    };
    const end = () => { const ready = origin && distance >= 80; origin = null; stopMove(); clearPull(); if (ready) void refreshAction.current(); };
    const cancel = () => { origin = null; stopMove(); clearPull(); };
    const click = (event: MouseEvent) => { if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); } suppressClickUntil = 0; };
    container.addEventListener('touchstart', start, { passive: true });
    container.addEventListener('touchend', end); container.addEventListener('touchcancel', cancel); container.addEventListener('click', click, true);
    return () => { cancelAnimationFrame(frame); stopMove(); container.removeEventListener('touchstart', start); container.removeEventListener('touchend', end); container.removeEventListener('touchcancel', cancel); container.removeEventListener('click', click, true); };
  }, [isMobile, panel, workspaceOverlayOpen, refreshing]);
  const panelPost = panel?.kind === 'comments' && !isMobile ? posts[activeIndex] : posts.find(post => post.id === panel?.postId);
  const requestedTail = useRef<string | undefined>(undefined);
  const tail = posts.at(-1)?.id;
  // The existing feed snapshot/cursor owns paging. One request per loaded tail;
  // a failed request requires an explicit retry, rather than an effect loop.
  useEffect(() => {
    if (!live || blocksPreparation || refreshing || !onLoadMore || fetching || loadError || activeIndex < posts.length - 2 || requestedTail.current === tail) return;
    requestedTail.current = tail;
    onLoadMore();
  }, [live, blocksPreparation, refreshing, onLoadMore, fetching, loadError, activeIndex, posts.length, tail]);
  useEffect(() => { setActivity(initialActivity(posts)); setComment(''); }, [user?.artistId, user?.investorId, user?.role]);

  function showPanel(kind: Panel['kind'], post: DemoPost) {
    opener.current = document.activeElement as HTMLElement;
    setComment(''); setPanel({ kind, postId: post.id });
  }
  function closeComments() {
    setPanel(null);
    // Mobile hides the action rail while comments are open. Restore focus only
    // after React has made that rail visible again.
    requestAnimationFrame(() => {
      if (!mounted.current) return;
      if (opener.current?.isConnected && !opener.current.closest('[inert]')) opener.current.focus({ preventScroll: true });
      else {
        const currentComments = cards.current[activeIndexRef.current]?.querySelector<HTMLButtonElement>('button[aria-label="Comments"]');
        (currentComments ?? feed.current)?.focus({ preventScroll: true });
      }
    });
  }
  function requireAccount(post: DemoPost, action: () => void) {
    if (!user) showPanel('login', post); else action();
  }
  function toggle(post: DemoPost, key: 'starred' | 'saved') {
    requireAccount(post, () => {
      if (!live) { setActivity(current => ({ ...current, [post.id]: { ...current[post.id], [key]: !current[post.id][key] } })); return; }
      if (busy.current) return;
      busy.current = true; setPending(post.id); setInteractionError('');
      void (async () => {
        try {
          await apiRequest(`/api/publications/${post.id.slice(5)}/${key === 'starred' ? 'star' : 'save'}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !post.social?.[key] }) });
          await refreshSocial(client); setAnnouncement(key === 'starred' ? 'Like updated.' : 'Saved collection updated.');
        } catch (error) { setInteractionError((error as Error).message); }
        finally { busy.current = false; setPending(null); }
      })();
    });
  }
  function moveTo(index: number) {
    scroll.moveTo(index);
  }
  function sharedLink(post: DemoPost) { return `${window.location.origin}${import.meta.env.BASE_URL}discovery?post=${encodeURIComponent(post.id)}${live ? '' : '&demo=1'}`; }
  const panelTitle = panel?.kind === 'original' ? 'Original sound' : panel?.kind === 'compare' ? 'Compare versions' : panel?.kind === 'description' ? 'About this publication' : panel?.kind === 'project' ? 'The project' : panel?.kind === 'comments' ? 'Conversation' : panel?.kind === 'send' ? 'Share' : 'Join the conversation';

  return <section className="discovery" aria-label="Discovery" data-keyboard={viewport.keyboard} style={isMobile&&panel?.kind==='comments'?{maxHeight:`${Math.max(220,viewport.height-64)}px`}:undefined}>
    <header className="discovery-heading">
      <div><h1>discovery<span aria-hidden="true">✦</span></h1><p>new sounds. shared possibilities.</p></div>

    </header>
    <div className="discovery-layout" data-comments={live && panel?.kind === 'comments'}>
      {(refreshing || pull > 10 || refreshError) && <div className="discovery-refresh-state" role="status">{refreshError ? <><span>{refreshError}</span><button onClick={() => void refreshFeed()}>Retry refresh</button></> : refreshing ? 'Refreshing…' : pull >= 80 ? 'Release to refresh' : 'Pull to refresh'}</div>}
      <div ref={feed} className="discovery-feed" role="region" aria-label="Discovery feed" tabIndex={0} onKeyDown={scroll.onKeyDown}>
        {posts.map((post, index) => {
          // Lightweight snap slots retain native scroll geometry, including large jumps.
          // Only five cards and the current/next real media elements are mounted.
          if (Math.abs(index - activeIndex) > 2) return <div key={post.id} ref={element => { cards.current[index] = element; }} className="discovery-snap-slot" data-index={index} aria-hidden="true" inert />;
          const mediaKey = `${post.id}:${post.media.src}`;
          let playbackState = playbackMemory.get(mediaKey);
          if (!playbackState) { playbackState = { time: 0, muted: false, duration: post.media.durationSeconds }; playbackMemory.set(mediaKey, playbackState); }
          const current = (live ? post.social : activity[post.id]) ?? { starred: false, saved: false, comments: [] };
          const remixReason = user?.role === 'investor' ? 'Remix is for artists' : post.original ? 'Remixes of remixes are unavailable' : !post.remixAllowed ? 'Remix not permitted by author' : !live ? 'Remix unavailable' : '';
          const remixDisabled = !!remixReason;
          const mobileSplit = isMobile && live && post.media.kind === 'video' && isSplitVideo(post.composition) && !!post.original;
          const completed = presentation.data?.pairs.find(p=>`post-${p.sourceId}`===post.id && p.resultId);
          return <article ref={element => { cards.current[index] = element; }} key={post.id} data-index={index} data-active={index === activeIndex} aria-label={`${post.title} by ${post.author}`} className={`discovery-post discovery-tone-${post.tone}`} inert={index !== activeIndex}>

            <DiscoveryMedia desktopControls={!isMobile} key={post.media.src} post={post} active={index === activeIndex} nearby={index === activeIndex || index === activeIndex + 1} blocked={introPending || workspaceOverlayOpen || blocksPreparation || refreshing} prepare={index === activeIndex || (prepareNext && index === activeIndex + 1)} playbackState={playbackState} onReady={() => { if (index === activeIndexRef.current) { setReadyMedia(mediaKey); onInitialReady?.(); } }} waveformAccess={live} info={
              <DiscoveryPostInfo>
                <h2 title={post.title}>{post.title}</h2>
                <button className="discovery-caption" onClick={() => showPanel('description', post)} aria-label={`Read description of ${post.title}`}>{post.description}</button>
                {!mobileSplit && post.original && (live ? post.original.available ? <Link className="discovery-attribution" href={`/discovery?post=${post.original.postId}`}><GitBranch size={13} />Remix of {post.original.title} · {post.original.author}<ArrowUpRight size={13} /></Link> : <p className="discovery-attribution">Remix of {post.original.title} · {post.original.author} · original unavailable</p> : <button className="discovery-attribution" onClick={() => { moveTo(posts.findIndex(item => item.id === post.original?.postId)); feed.current?.focus({ preventScroll: true }); }}><GitBranch size={13} />Remix of {post.original.title} · {post.original.author}<ArrowUpRight size={13} /></button>)}
                {completed && <Link className="discovery-attribution min-h-11" href={`/discovery?post=post-${completed.resultId}`}>Hear the collaboration <ArrowUpRight size={13}/></Link>}
                {!mobileSplit && live && post.original?.available && <button className="discovery-attribution min-h-11" onClick={() => showPanel('compare', post)}>Compare versions <ArrowUpRight size={13}/></button>}
                {post.project && <button className="discovery-project-link" onClick={() => showPanel('project', post)}><span>{post.project.offers.length > 0 && <small>seeking collaborators</small>}<strong>{post.project.title}</strong></span><span>view project</span></button>}
              </DiscoveryPostInfo>
            } />
              <DiscoveryActionRail title={post.title} artwork={mobileSplit ? <OriginalSoundArtwork post={post} nearby={Math.abs(index - activeIndex) <= 1} onOpen={() => showPanel('original', post)} /> : live && post.media.kind === 'video' && <DiscoveryProjectArtwork post={post} onNavigate={() => feed.current?.querySelectorAll<HTMLMediaElement>('video,audio').forEach(media => media.pause())} />}>
                <DiscoveryArtistPreview key={`${viewerIdentity}:${post.id}`} post={post} live={live} active={index === activeIndex} />
                <Action label="Like" disabled={pending === post.id} pressed={current.starred} icon={<Heart size={21} fill={current.starred ? 'currentColor' : 'none'} />} detail={live ? post.stars : post.stars + Number(current.starred)} onClick={() => toggle(post, 'starred')} />
                <Action label="Comments" icon={<MessageCircle size={21} />} detail={live ? post.social?.comments ?? 0 : post.comments.length + (activity[post.id]?.comments.length ?? 0)} onClick={() => showPanel('comments', post)} />
                <Action label="Save" disabled={pending === post.id} pressed={current.saved} icon={<Bookmark size={21} fill={current.saved ? 'currentColor' : 'none'} />} detail={current.saved ? 'saved' : 'save'} onClick={() => toggle(post, 'saved')} />
                <Action label="Share" icon={<Send size={21} />} detail="share" onClick={() => showPanel('send', post)} />
                {!mobileSplit && <Action label={remixReason || 'Remix'} icon={<Disc3 size={21} />} detail={remixDisabled ? user?.role === 'investor' ? 'artists only' : !live ? 'unavailable' : 'no remix' : 'remix'} disabled={remixDisabled} onClick={() => requireAccount(post, () => { feed.current?.querySelectorAll<HTMLMediaElement>('video, audio').forEach(media => media.pause()); navigate('/studio/remix', { state: { sourceId: Number(post.id.slice(5)), start: true } }); })} />}
              </DiscoveryActionRail>
          </article>;
        })}
      </div>
      {live && panel?.kind === 'comments' && panelPost && <aside className="discovery-comments-panel" aria-label="Publication comments" onKeyDown={e => { if(e.key === 'Escape') { closeComments(); } }}>
        <header><div><h2>{isMobile ? 'Conversation' : <>Comments <span className="text-muted">{panelPost.social?.comments ?? 0}</span></>}</h2><p>{panelPost.title} · {panelPost.author}</p></div><button aria-label="Close comments" onClick={() => { closeComments(); }}><X size={20}/></button></header>
        <LiveComments key={`${viewerIdentity}:${panelPost.id}`} postId={Number(panelPost.id.slice(5))} drafts={isMobile ? undefined : commentDrafts} replyDrafts={replyDrafts} rich={!isMobile}/>
      </aside>}
      <nav className="discovery-pagination" aria-label="Feed controls">
        <button aria-label="Previous post" disabled={activeIndex === 0} onClick={() => moveTo(activeIndex - 1)}><ChevronUp size={20} /></button>
        <span className="sr-only" aria-live="polite">Publication {activeIndex + 1} of {posts.length}</span>
        <button aria-label="Next post" disabled={activeIndex === posts.length - 1} onClick={() => moveTo(activeIndex + 1)}><ChevronDown size={20} /></button>
      </nav>
      {live && (loadError || activeIndex === posts.length - 1 && (loadingMore || onLoadMore)) && <div className="discovery-feed-state" data-error={!!loadError} aria-live="polite">
        {loadError ? <><span role="alert">{loadError}</span><button onClick={onRetry} disabled={fetching}>Retry loading</button></> : loadingMore ? <span>Loading more…</span> : onLoadMore ? <button onClick={onLoadMore} disabled={fetching}>Load more</button> : null}
      </div>}
    </div>
    <span className="sr-only" role="status">{announcement}</span>{interactionError && <p role="alert" className="discovery-interaction-error px-4 py-2 text-sm">{interactionError}</p>}
    <Dialog.Root open={!!panel && !(live && panel.kind === 'comments')} onOpenChange={open => { if (!open && !sharePending) setPanel(null); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="discovery-panel-overlay" />
        <Dialog.Content className={`discovery-panel${panel?.kind === 'send' ? ' discovery-share-modal' : ''}`} onEscapeKeyDown={e=>{if(sharePending)e.preventDefault();}} onPointerDownOutside={e=>{if(sharePending)e.preventDefault();}} onCloseAutoFocus={event => { event.preventDefault(); if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); else feed.current?.focus({ preventScroll: true }); }}>
          <div className="discovery-panel-heading"><p className="discovery-eyebrow">discovery</p><Dialog.Title>{panelTitle}</Dialog.Title><Dialog.Description>{panelPost?.title} · {panelPost?.author}</Dialog.Description></div>
          <Dialog.Close disabled={sharePending} className="discovery-panel-close" aria-label="Close panel"><X size={20} /></Dialog.Close>
          {panelPost && panel?.kind === 'original' && <OriginalSoundPanel key={panelPost.id} post={panelPost} />}
          {panelPost && panel?.kind === 'compare' && <PublicationComparison id={Number(panelPost.id.slice(5))}/>}
          {panelPost && panel?.kind === 'description' && <p className="whitespace-pre-wrap break-words">{panelPost.description}</p>}
          {panelPost && panel?.kind === 'project' && panelPost.project && <ProjectPanel project={panelPost.project} live={live} projectId={panelPost.projectId} workId={panelPost.workId} ownerId={panelPost.artistId} />}
          {panelPost && panel?.kind === 'comments' && live && <LiveComments key={panelPost.id} postId={Number(panelPost.id.slice(5))} />}
          {panelPost && panel?.kind === 'comments' && !live && <>
            <div className="discovery-comments" aria-label="Comments">
              {[...panelPost.comments, ...activity[panelPost.id].comments].map(item => <article key={item.id}><strong>{item.author}</strong><p>{item.text}</p></article>)}
              {!panelPost.comments.length && !activity[panelPost.id].comments.length && <p>No comments yet. Start the conversation.</p>}
            </div>
            {user ? <form className="discovery-comment-form" onSubmit={event => {
              event.preventDefault(); const text = comment.trim(); if (!text) return;
              setActivity(current => ({ ...current, [panelPost.id]: { ...current[panelPost.id], comments: [...current[panelPost.id].comments, { id: crypto.randomUUID(), author: user.name, text }] } }));
              setComment(''); setAnnouncement('Comment added.');
            }}><label htmlFor="discovery-comment">Add a comment</label><textarea id="discovery-comment" value={comment} maxLength={500} rows={3} placeholder="What do you hear in this?" onChange={event => setComment(event.target.value)} /><button className="discovery-primary" disabled={!comment.trim()}>Post comment</button><p className="discovery-note">Comments clear on reload.</p></form>
              : <div className="discovery-auth-prompt"><p>Log in to leave a comment.</p><Link href="/login">log in</Link><Link href="/register">sign up</Link></div>}
          </>}
          {panelPost && panel?.kind === 'send' && <PublicationShare key={`${viewerIdentity}:${panelPost.id}`} postId={Number(panelPost.id.slice(5))} title={panelPost.title} url={sharedLink(panelPost)} live={live} onBusy={setSharePending}/>}
          {panel?.kind === 'login' && <div className="discovery-auth-prompt"><p>Artists and investors can like, comment, save and share. Artists can also remix when the author allows it.</p><Link href="/login">log in</Link><Link href="/register">sign up</Link></div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </section>;
}
