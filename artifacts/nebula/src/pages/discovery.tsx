import { ShareSurface, ShareOverlay } from '@/components/ui/share-surface';
import { useProjectProductCopy } from '@/features/presentation/catalog';
import { PublicationShare } from '@/features/discovery/share-panel';
import { useFollowSync } from '@/features/following';
import { DiscoveryArtistPreview } from '@/features/discovery/artist-preview';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiRequest } from '@nebula/local';
import { useQueryClient } from '@tanstack/react-query';
import { LiveComments, refreshSocial } from '@/features/discovery/social';
import { Link, useLocation } from 'wouter';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, Bookmark, ChevronDown, ChevronUp, Disc3, GitBranch, MessageCircle, Send, X } from 'lucide-react';
import { DiscoveryLike } from '@/features/discovery/like-action';
import { useAuth } from '@/context/AuthContext';
import { DEMO_POSTS, type DemoPost, type DemoProject } from '@/features/discovery/demo-posts';
import '@/features/discovery/discovery.css';
import '@/features/discovery/desktop.css';
import '@/features/discovery/audio-card.css';
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

function DiscoveryPostInfo({ children, audio = false }: { children: ReactNode; audio?: boolean }) {
  return <div className={`discovery-post-info${audio ? ' discovery-audio-copy' : ''}`}>{children}</div>;
}
function DiscoveryActionRail({ title, children, artwork }: { title: string; children: ReactNode; artwork?: ReactNode }) {
  return <div className="discovery-action-rail"><div className="discovery-actions" aria-label={`Actions for ${title}`}>{children}</div>{artwork}</div>;
}

function ProjectPanel({ project, coverUrl, live = false, projectId, ownerId, workId }: { workId?: number; project: DemoProject; coverUrl?: string | null; live?: boolean; projectId?: number; ownerId?: number }) {
  const copy = useProjectProductCopy(projectId && ownerId ? { id: projectId, artistId: ownerId, story: project.description } : undefined);
  const [failedCover, setFailedCover] = useState<string>();
  const story = copy.story ?? project.description;
  return <>
    <div className="discovery-project-summary">
      <div className="discovery-project-identity">
        <div className="discovery-project-cover">
          {coverUrl && failedCover !== coverUrl ? <img src={coverUrl} alt={`${project.title} project artwork`} onError={() => setFailedCover(coverUrl)} /> : <span role="img" aria-label="No project artwork"><Disc3 aria-hidden="true" size={32}/></span>}
        </div>
        <div><p className="discovery-project-stage">{project.stage}</p><h3>{project.title}</h3><p className="discovery-project-artist">{project.artist}</p></div>
      </div>
      {story && <p className="discovery-project-description">{story}</p>}
      {project.offers.length > 0 && <section className="discovery-project-opportunities" aria-label="Available opportunities">
        <p><span aria-hidden="true"/>Seeking collaborators <strong>{project.offers.length}</strong></p>
        <ul>{project.offers.slice(0, 3).map(offer => <li key={offer.id}>{offer.need}</li>)}</ul>
        {project.offers.length > 3 && <p className="discovery-project-more">+{project.offers.length - 3} more opportunities</p>}
      </section>}
    </div>
    {live && projectId && <div className="discovery-project-footer"><Link href={`/project/${projectId}${workId ? `?song=${workId}` : ''}`}>View full project <ArrowUpRight size={18} aria-hidden="true"/></Link></div>}
  </>;
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
  const workspaceOverlayOpen = notificationsOpen || coproducerOpen || (modalLocked && panel?.kind !== 'comments');
  const blocksPreparation = !!panel && (panel.kind !== 'comments' || isMobile || !live);
  const prepareNext = useNextMediaPreparation(activeMediaKey, readyMedia === activeMediaKey, blocksPreparation || workspaceOverlayOpen);
  const [comment, setComment] = useState('');
  const [sharePending, setSharePending] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [refreshing, setRefreshing] = useState(false), [refreshError, setRefreshError] = useState(''), [pull, setPull] = useState(0);
  const refreshingRef = useRef(false), mounted = useRef(true);
  const scroll = useDiscoveryScroll({ feed, cards, activeIndex, activeIndexRef, count: posts.length, order: postOrder,
    blocked: introPending || refreshing || workspaceOverlayOpen || !!panel,
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
  const panelPost = posts.find(post => post.id === panel?.postId);
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

  function requireAccount(post: DemoPost, action: () => void) {
    if (!user) showPanel('login', post); else action();
  }
  async function toggle(post: DemoPost, key: 'starred' | 'saved', animation?: { enabled: boolean; begin: () => void; confirm: () => void }): Promise<boolean> {
    if (!user) { showPanel('login', post); return false; }
    if (busy.current) return false;
    animation?.begin();
    if (!live) { setActivity(current => ({ ...current, [post.id]: { ...current[post.id], [key]: animation?.enabled ?? !current[post.id][key] } })); animation?.confirm(); return true; }
    busy.current = true; setPending(post.id); setInteractionError('');
    try {
      await apiRequest(`/api/publications/${post.id.slice(5)}/${key === 'starred' ? 'star' : 'save'}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: animation?.enabled ?? !post.social?.[key] }) });
      animation?.confirm();
      await refreshSocial(client);
      if (mounted.current) setAnnouncement(key === 'starred' ? 'Like updated.' : 'Saved collection updated.');
      return true;
    } catch (error) { if (mounted.current) setInteractionError((error as Error).message); return false; }
    finally { busy.current = false; if (mounted.current) setPending(null); }
  }
  function moveTo(index: number) {
    scroll.moveTo(index);
  }
  function sharedLink(post: DemoPost) { return `${window.location.origin}${import.meta.env.BASE_URL}discovery?post=${encodeURIComponent(post.id)}${live ? '' : '&demo=1'}`; }
  const panelTitle = panel?.kind === 'original' ? 'Original sound' : panel?.kind === 'compare' ? 'Compare versions' : panel?.kind === 'description' ? 'About this publication' : panel?.kind === 'project' ? 'The project' : panel?.kind === 'comments' ? 'Conversation' : panel?.kind === 'send' ? 'Share' : 'Join the conversation';

  return <section className="discovery" aria-label="Discovery" data-keyboard={viewport.keyboard}>
    <header className="discovery-heading">
      <div><h1>discovery<span aria-hidden="true">✦</span></h1><p>new sounds. shared possibilities.</p></div>

    </header>
    <div className="discovery-layout" data-comments={false}>
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
          const audioPost = post.media.kind === 'audio';
          const projectInfo = post.project && (audioPost ? <button className="discovery-audio-project" onClick={() => showPanel('project', post)} aria-label={`${post.project.title} · view project`}>
            <span>{post.project.offers.length > 0 ? <small>Seeking collaborators</small> : null}<strong>{post.project.title}</strong></span><span>View project <ArrowUpRight size={17}/></span>
          </button> : <button className="discovery-project-link" onClick={() => showPanel('project', post)}><span>{post.project.offers.length > 0 && <small>seeking collaborators</small>}<strong>{post.project.title}</strong></span><span>view project</span></button>);
          return <article ref={element => { cards.current[index] = element; }} key={post.id} data-index={index} data-active={index === activeIndex} aria-label={`${post.title} by ${post.author}`} className={`discovery-post discovery-tone-${post.tone}`} inert={index !== activeIndex}>

            <DiscoveryMedia desktopControls={!isMobile} key={post.media.src} post={post} active={index === activeIndex} nearby={index === activeIndex || index === activeIndex + 1} blocked={introPending || workspaceOverlayOpen || blocksPreparation || refreshing} prepare={index === activeIndex || (prepareNext && index === activeIndex + 1)} playbackState={playbackState} onReady={() => { if (index === activeIndexRef.current) { setReadyMedia(mediaKey); onInitialReady?.(); } }} waveformAccess={live} projectInfo={audioPost ? projectInfo : undefined} info={
              <DiscoveryPostInfo audio={audioPost}>
                <h2 title={post.title}>{post.title}</h2>
                {audioPost ? <div className="discovery-audio-byline">{post.artistId ? <Link href={`/artist/${post.artistId}`} title={post.author}>{post.author}</Link> : <span>{post.author}</span>}<button onClick={() => showPanel('description', post)} aria-label={`Read description of ${post.title}`}>Detalles</button></div> : <button className="discovery-caption" onClick={() => showPanel('description', post)} aria-label={`Read description of ${post.title}`}>{post.description}</button>}
                {!mobileSplit && post.original && (live ? post.original.available ? <Link className="discovery-attribution" href={`/discovery?post=${post.original.postId}`}><GitBranch size={13} />Remix of {post.original.title} · {post.original.author}<ArrowUpRight size={13} /></Link> : <p className="discovery-attribution">Remix of {post.original.title} · {post.original.author} · original unavailable</p> : <button className="discovery-attribution" onClick={() => { moveTo(posts.findIndex(item => item.id === post.original?.postId)); feed.current?.focus({ preventScroll: true }); }}><GitBranch size={13} />Remix of {post.original.title} · {post.original.author}<ArrowUpRight size={13} /></button>)}
                {completed && <Link className="discovery-attribution min-h-11" href={`/discovery?post=post-${completed.resultId}`}>Hear the collaboration <ArrowUpRight size={13}/></Link>}
                {!mobileSplit && live && post.original?.available && <button className="discovery-attribution min-h-11" onClick={() => showPanel('compare', post)}>Compare versions <ArrowUpRight size={13}/></button>}
                {!audioPost && projectInfo}
              </DiscoveryPostInfo>
            } />
              <DiscoveryActionRail title={post.title} artwork={mobileSplit ? <OriginalSoundArtwork post={post} nearby={Math.abs(index - activeIndex) <= 1} onOpen={() => showPanel('original', post)} /> : live && post.media.kind === 'video' && <DiscoveryProjectArtwork post={post} onNavigate={() => feed.current?.querySelectorAll<HTMLMediaElement>('video,audio').forEach(media => media.pause())} />}>
                <DiscoveryArtistPreview key={`${viewerIdentity}:${post.id}`} post={post} live={live} active={index === activeIndex} />
                <DiscoveryLike active={index === activeIndex} disabled={pending === post.id} pressed={current.starred} detail={live ? post.stars : post.stars + Number(current.starred)} onToggle={(enabled, begin, confirm) => toggle(post, 'starred', { enabled, begin, confirm })} />
                <Action label="Comments" icon={<MessageCircle size={21} />} detail={live ? post.social?.comments ?? 0 : post.comments.length + (activity[post.id]?.comments.length ?? 0)} onClick={() => showPanel('comments', post)} />
                <Action label="Save" disabled={pending === post.id} pressed={current.saved} icon={<Bookmark size={21} fill={current.saved ? 'currentColor' : 'none'} />} detail={current.saved ? 'saved' : 'save'} onClick={() => toggle(post, 'saved')} />
                <Action label="Share" icon={<Send size={21} />} detail="share" onClick={() => showPanel('send', post)} />
                {!mobileSplit && <Action label={remixReason || 'Remix'} icon={<Disc3 size={21} />} detail={remixDisabled ? user?.role === 'investor' ? 'artists only' : !live ? 'unavailable' : 'no remix' : 'remix'} disabled={remixDisabled} onClick={() => requireAccount(post, () => { feed.current?.querySelectorAll<HTMLMediaElement>('video, audio').forEach(media => media.pause()); navigate('/studio/remix', { state: { sourceId: Number(post.id.slice(5)), start: true } }); })} />}
              </DiscoveryActionRail>
          </article>;
        })}
      </div>
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
    <Dialog.Root open={!!panel} onOpenChange={open => { if (!open && !sharePending) setPanel(null); }}>
      <Dialog.Portal>
        <ShareOverlay className="discovery-panel-overlay" style={{zIndex:60}} />
        <ShareSurface styled={panel?.kind !== 'send' && panel?.kind !== 'project'} className={`discovery-panel${panel?.kind === 'comments' ? ' app-modal-comments-window' : ''}${panel?.kind === 'send' ? ' discovery-share-modal' : panel?.kind === 'project' ? ' discovery-project-modal' : ''}`} onEscapeKeyDown={e=>{if(sharePending)e.preventDefault();}} onPointerDownOutside={e=>{if(sharePending)e.preventDefault();}} onCloseAutoFocus={event => { event.preventDefault(); if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); else feed.current?.focus({ preventScroll: true }); }}>
          <div className={`discovery-panel-heading${panel?.kind !== 'send' && panel?.kind !== 'project' ? ' app-modal-heading' : ''}`}><p className="discovery-eyebrow">discovery</p><Dialog.Title>{panelTitle}</Dialog.Title><Dialog.Description>{panelPost?.title} · {panelPost?.author}</Dialog.Description></div>
          <Dialog.Close disabled={sharePending} className={`discovery-panel-close${panel?.kind !== 'send' && panel?.kind !== 'project' ? ' app-modal-close' : ''}`} aria-label="Close panel"><X size={20} /></Dialog.Close>
          <div className={panel?.kind === 'send' || panel?.kind === 'project' ? 'contents' : panel?.kind === 'comments' ? 'app-modal-body discovery-comments-panel app-modal-comments' : 'app-modal-body'}>
          {panelPost && panel?.kind === 'original' && <OriginalSoundPanel key={panelPost.id} post={panelPost} />}
          {panelPost && panel?.kind === 'compare' && <PublicationComparison id={Number(panelPost.id.slice(5))}/>}
          {panelPost && panel?.kind === 'description' && <><p className="whitespace-pre-wrap break-words">{panelPost.description}</p>{panelPost.media.kind === 'audio' && panelPost.original && <p className="mt-4">Remix of {panelPost.original.title} · {panelPost.original.author}{live && panelPost.original.available && <> · <Link href={`/discovery?post=${panelPost.original.postId}`}>Listen to the original</Link></>}</p>}</>}
          {panelPost && panel?.kind === 'project' && panelPost.project && <ProjectPanel key={panelPost.id} project={panelPost.project} coverUrl={panelPost.projectCoverUrl} live={live} projectId={panelPost.projectId} workId={panelPost.workId} ownerId={panelPost.artistId} />}
          {panelPost && panel?.kind === 'comments' && live && <LiveComments key={`${viewerIdentity}:${panelPost.id}`} postId={Number(panelPost.id.slice(5))} drafts={commentDrafts} replyDrafts={replyDrafts} rich={!isMobile} />}
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
          </div>
        </ShareSurface>
      </Dialog.Portal>
    </Dialog.Root>
  </section>;
}
