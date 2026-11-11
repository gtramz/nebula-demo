import { SectionSkeleton } from '@/components/loading-states';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Tabs from '@radix-ui/react-tabs';
import { Link, useSearch } from 'wouter';
import { ChevronDown, Disc3, ArrowUpRight } from 'lucide-react';
import { apiRequest, isServerMode, type Project, type Publication, type Song, type CollaborationOffer, type PresentationTrack } from '@nebula/local';
import { useAuth } from '@/context/AuthContext';
import { useViewState, useIsReturnNavigation } from '@/components/shell/return-context';
import { AudioPreview } from '@/components/audio-preview';
import { useSongs } from '@/features/songs';
import { ProjectOffers, useProjectOffers } from '@/features/collaborations';
import { referenceWaveform } from '@/features/collaborations/proposal-preparation';
import { usePublication } from '@/features/discovery/publication-api';
import { SilentDemoPlayer, usePresentationCatalog, usePresentationRemixExample } from '@/features/presentation/catalog';
import { AdaptiveVideo } from '@/features/remix/adaptive-video';
import { AudioComparison } from '@/features/remix/audio-comparison';

function stopPlayback() {
  document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(media => media.pause());
  document.dispatchEvent(new CustomEvent('nebula:silent-preview', { detail: 'project-navigation' }));
}
const tabClass = 'min-h-11 px-5 py-3 text-sm font-semibold rounded-full text-muted data-[state=active]:bg-surfaceAlt data-[state=active]:text-accent focus-visible:outline focus-visible:outline-accent';
const clock = (value: number) => `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, '0')}`;

export function ProjectMusic({ project }: { project: Project }) {
  const { user } = useAuth();
  const identity = user ? `${user.role}:${user.artistId ?? user.investorId}` : 'guest';
  return <ProjectMusicContent key={`${project.id}:${identity}`} project={project} identity={identity}/>;
}
function ProjectMusicContent({ project, identity }: { project: Project; identity: string }) {
  const songs = useSongs(project.id), offers = useProjectOffers(project.id);
  const catalog = usePresentationCatalog(project.artistId), example = usePresentationRemixExample();
  const returning = useIsReturnNavigation();
  const search = useSearch(), explicitSong = Number(new URLSearchParams(search).get('song')) || null;
  const [tab, setTab] = useViewState<string>(`project-music-tab:${identity}:${project.id}`, 'music');
  const [selected, setSelected] = useViewState<number | null | undefined>(`project-music-song:${identity}:${project.id}`, explicitSong ?? undefined);
  const community = useQuery({ queryKey: ['project-community', project.id, identity], queryFn: ({ signal }) => apiRequest<{publications: Publication[]}>(`/api/projects/${project.id}/community`, { signal }), enabled: isServerMode(), refetchOnWindowFocus: true });
  const records = example ? [example.original, example.remix] : [];
  const linked = records.find(record => record.artistIds.includes(project.artistId) && (record.projectId === project.id || songs.data?.songs.some(song => song.id === record.workId && song.ownerId === project.artistId)));
  const linkedPost = usePublication(linked?.postId);
  const originals = community.data?.publications ?? [];
  const posts = [...new Map([...originals, ...(linkedPost.data?.status === 'published' && linkedPost.data.workId === linked?.workId ? [linkedPost.data] : [])].map(post => [post.id, post])).values()];
  // A remix may itself be this project's canonical song (e.g. LUNA - CHILZ remix).
  const ownSong = (post: Publication) => post.artistId === project.artistId && songs.data?.songs.some(song => song.id === post.workId);
  const versions = posts.filter(post => post.remix && !ownSong(post));
  const recordings = posts.filter(post => !post.remix || ownSong(post));
  const recordingsForSong = (id: number) => recordings.filter(post => post.workId === id && post.artistId === project.artistId).sort((a,b) => Number(b.media.kind === 'audio') - Number(a.media.kind === 'audio'));
  const unassigned = recordings.filter(post => !songs.data?.songs.some(song => song.id === post.workId));
  const songOffers = (id: number) => (offers.data ?? []).filter(offer => offer.workId === id);
  const firstOpen = songs.data?.songs.find(song => songOffers(song.id).some(offer => offer.available))?.id;
  const active = selected === undefined ? firstOpen ?? songs.data?.songs[0]?.id ?? null : selected;
  useEffect(() => {
    if (selected === undefined && songs.data && (offers.isSuccess || offers.isError)) setSelected(firstOpen ?? songs.data.songs[0]?.id ?? null);
  }, [selected, songs.data, offers.isSuccess, offers.isError, firstOpen]);
  const previousSongLink = useRef(explicitSong);
  useEffect(() => {
    if (explicitSong && !returning) { setSelected(explicitSong); setTab('music'); }
  }, []);
  useEffect(() => {
    if (!explicitSong || previousSongLink.current === explicitSong) return;
    previousSongLink.current = explicitSong;
    stopPlayback(); setTab('music'); setSelected(explicitSong);
  }, [explicitSong]);
  function chooseSong(id: number) { stopPlayback(); setSelected(active === id ? null : id); }
  const allTracks = catalog?.releases.flatMap(release => release.tracks) ?? [];
  // Media already used as an offer's exact reference is not rendered a second time below.
  const representedMedia = new Set(songs.data?.songs.flatMap(song => {
    const post = recordingsForSong(song.id)[0];
    const reference = songOffers(song.id).find(offer => offer.available && offer.reference)?.reference;
    return post ? [post.media.id] : reference ? [reference.id] : [];
  }));
  return <Tabs.Root value={tab} onValueChange={value => { stopPlayback(); setTab(value); }} className="min-w-0 space-y-5">
    <Tabs.List aria-label="Project content" className="flex gap-2 border-b border-border pb-3">
      <Tabs.Trigger value="music" className={tabClass}>Music</Tabs.Trigger><Tabs.Trigger value="versions" className={tabClass}>Versions{versions.length > 0 && <span className="ml-2 text-muted"> {versions.length}</span>}</Tabs.Trigger>
    </Tabs.List>
    <Tabs.Content value="music" className="space-y-6 min-w-0 focus-visible:outline focus-visible:outline-accent">
      {songs.isPending && <SectionSkeleton variant="list" label="Loading project songs" rows={3}/>}
      {songs.error && <LoadError label="Songs" retry={() => void songs.refetch()}/>}
      {offers.error && <LoadError label="Opportunities" retry={() => void offers.refetch()}/>}
      {community.error && <LoadError label="Recordings" retry={() => void community.refetch()}/>}
      {linkedPost.error && <LoadError label="Recording" retry={() => void linkedPost.refetch()}/>}
      {explicitSong && songs.data && !songs.data.songs.some(song => song.id === explicitSong) && <p role="status" className="text-sm text-muted">This song is unavailable.</p>}
      <section aria-label="Project songs" className="space-y-3">
        {songs.data?.songs.map((song, index) => {
          const track = allTracks.find(track => track.workId === song.id);
          const related = recordingsForSong(song.id);
          const songOfferList = songOffers(song.id);
          const reference = songOfferList.find(offer => offer.available && ['audio','video'].includes(offer.reference?.kind ?? ''))?.reference;
          const open = songOfferList.filter(offer => offer.available).length;
          return <div key={song.id} id={`song-${song.id}`} role="group" aria-label={`Song: ${song.title}`} className={`rounded-2xl border bg-surface p-4 sm:p-5 space-y-3 scroll-mt-4 ${active === song.id ? 'border-accent/40' : 'border-border'}`}>
            <button type="button" aria-expanded={active === song.id} aria-controls={`song-details-${song.id}`} onClick={() => chooseSong(song.id)} className="w-full min-h-11 flex gap-3 items-center text-left rounded-lg focus-visible:outline focus-visible:outline-accent">
              <span className="text-xs text-muted tabular-nums w-5 shrink-0">{String(index + 1).padStart(2,'0')}</span><span className="min-w-0 flex-1"><strong className="block break-words">{song.title}</strong>{open > 0 && <span className="text-xs text-accent">{open} open {open === 1 ? 'opportunity' : 'opportunities'}</span>}</span>{track && <span className="text-xs text-muted tabular-nums">{clock(track.durationSeconds)}</span>}<ChevronDown size={18} className={`shrink-0 ${active === song.id ? 'rotate-180' : ''}`} aria-hidden="true"/>
            </button>
            <SongRecording song={song} post={related[0]} reference={reference} track={track} coverUrl={project.coverUrl ?? ''}/>
            {active === song.id && <div id={`song-details-${song.id}`} className="space-y-4">
              {!!song.description && !track && <details><summary className="min-h-11 flex items-center cursor-pointer text-xs text-muted">About this song</summary><p className="text-sm whitespace-pre-wrap break-words">{song.description}</p></details>}
              {related[0] && <Link className="min-h-11 inline-flex items-center underline text-sm" href={`/discovery?post=post-${related[0].id}`}>Open in Discovery</Link>}
              {related[0]?.remix && <RemixCredits post={related[0]}/>}
              {related.length > 1 && <PublicationList posts={related.slice(1)} representedMedia={representedMedia} label="More recordings"/>}
              <ProjectOffers projectLayout projectId={project.id} ownerId={project.artistId} scopeWorkId={song.id}/>
            </div>}
          </div>;
        })}
      </section>
      {!songs.isPending && !community.isPending && !songs.error && !songs.data?.songs.length && !recordings.length && <p className="text-sm text-muted">No music added yet.</p>}
      <ProjectOffers projectLayout projectId={project.id} ownerId={project.artistId} scopeWorkId={null}/>
      <PublicationList posts={unassigned} representedMedia={representedMedia} label="Recordings"/>
      {catalog?.releases.find(release => release.projectId === project.id) && <a href={catalog.releases.find(release => release.projectId === project.id)!.source} target="_blank" rel="noreferrer" className="inline-flex items-center min-h-11 text-sm underline">Open release<ArrowUpRight size={14} className="ml-2"/></a>}
    </Tabs.Content>
    <Tabs.Content value="versions" className="min-w-0 space-y-4 focus-visible:outline focus-visible:outline-accent">
      {community.isPending ? <SectionSkeleton variant="cards" label="Loading song versions" rows={2}/> : community.error ? <LoadError label="Versions" retry={() => void community.refetch()}/> : versions.length ? <PublicationList posts={versions} sources={posts} label="Versions"/> : <p className="py-8 text-sm text-muted">No versions shared yet.</p>}
    </Tabs.Content>
  </Tabs.Root>;
}
function LoadError({label,retry}:{label:string;retry:()=>void}) { return <p role="alert" className="text-sm text-muted">{label} could not load. <button className="underline min-h-11" onClick={retry}>Retry</button></p>; }
function SongRecording({song,post,reference,track,coverUrl}:{song:Song;post?:Publication;reference?:CollaborationOffer['reference'];track?:PresentationTrack;coverUrl:string}) {
  if (post) return <section aria-label={`Featured recording: ${post.title}`}><PostPlayer post={post}/></section>;
  if (reference?.kind === 'audio') return <AudioPreview key={reference.id} title={song.title} src={reference.url} waveformLoader={signal => referenceWaveform(reference,signal)}/>;
  if (reference?.kind === 'video') return <AdaptiveVideo aria-label={song.title} src={reference.url} controls playsInline preload="metadata" className="w-full max-h-64"/>;
  if (track) return <SilentDemoPlayer compact track={{...track,title:song.title}} coverUrl={coverUrl}/>;
  return null;
}
function PostPlayer({post}:{post:Publication}) {
  return post.media.kind === 'audio' ? <AudioPreview key={post.media.id} title={post.title} src={post.media.url} waveformUrl={`/api/publications/${post.id}/waveform?listen=1`}/> : <AdaptiveVideo aria-label={post.title} composition={post.remix?.composition} src={post.media.url} controls playsInline preload="metadata" poster={post.coverUrl ?? undefined} className="w-full max-h-[55dvh]"/>;
}
function PublicationList({posts,sources=[],label,representedMedia}:{posts:Publication[];sources?:Publication[];label:string;representedMedia?:Set<string>}) {
  const [expanded,setExpanded] = useViewState<number|null>(`project-recordings:${label}:${posts.map(p=>p.id).join(',')}`,null);
  if (!posts.length) return null;
  return <section aria-label={label} className="space-y-3">{label !== 'Versions' && <h3 className="font-semibold text-lg">{label}</h3>}{posts.map(post => {
    const source = sources.find(item => item.id === post.remix?.sourceId);
    return <article key={post.id} aria-label={post.title} className="rounded-2xl border border-border bg-surface p-4 sm:p-5 min-w-0">
      <button type="button" aria-expanded={expanded === post.id} aria-controls={`recording-${post.id}`} onClick={() => {stopPlayback();setExpanded(expanded===post.id?null:post.id);}} className="w-full min-h-11 flex items-center gap-3 text-left rounded-lg focus-visible:outline focus-visible:outline-accent">
        <span className="h-14 w-14 rounded-lg bg-surfaceAlt overflow-hidden grid place-items-center shrink-0">{post.coverUrl?<img src={post.coverUrl} alt="" className="h-full w-full object-cover"/>:<Disc3 aria-hidden="true"/>}</span><span className="min-w-0 flex-1"><strong className="block break-words">{post.title}</strong><span className="text-xs text-muted">{post.artistName}</span>{post.remix && <span className="block text-xs text-muted mt-1 break-words">Original: {post.remix.title} · {post.remix.artistName}</span>}</span><ChevronDown size={18} className={`shrink-0 ${expanded===post.id?'rotate-180':''}`} aria-hidden="true"/>
      </button>
      {expanded===post.id && <div id={`recording-${post.id}`} className="space-y-4 pt-4">
        <>{!representedMedia?.has(post.media.id) && <PostPlayer post={post}/>}</>
        {post.remix?.available && source && <AudioComparison duration={post.remix.endSeconds-post.remix.startSeconds} tracks={[{label:'Original',url:source.media.url,kind:source.media.kind as 'audio'|'video',offset:post.remix.startSeconds},{label:post.title,url:post.media.url,kind:post.media.kind as 'audio'|'video',composition:post.remix.composition}]}/>}
        <div className="flex flex-wrap gap-x-5 text-sm"><Link className="min-h-11 inline-flex items-center underline" href={`/discovery?post=post-${post.id}`}>Open in Discovery</Link>{post.remix?.available && <Link className="min-h-11 inline-flex items-center underline" href={`/discovery?post=post-${post.remix.sourceId}`}>Open original</Link>}</div>
      </div>}
    </article>;
  })}</section>;
}

function RemixCredits({ post }: { post: Publication }) {
  const source = usePublication(post.remix?.available ? post.remix.sourceId : undefined);
  if (!post.remix) return null;
  return <section aria-label="Recording credits" className="space-y-3 text-sm">
    <p className="text-muted">Original: {post.remix.title} · {post.remix.artistName}</p>
    <p>Remix by <Link className="underline" href={`/artist/${post.artistId}`}>{post.artistName}</Link></p>
    {source.data?.status === 'published' && post.remix.available && <><Link className="min-h-11 inline-flex items-center underline" href={`/discovery?post=post-${source.data.id}`}>Open original</Link><AudioComparison duration={post.remix.endSeconds-post.remix.startSeconds} tracks={[{label:'Original',url:source.data.media.url,kind:source.data.media.kind as 'audio'|'video',offset:post.remix.startSeconds},{label:post.title,url:post.media.url,kind:post.media.kind as 'audio'|'video',composition:post.remix.composition}]}/></>}
    {source.error && <LoadError label="Original" retry={() => void source.refetch()}/>}
    {!post.remix.available && <p className="text-muted">Original unavailable.</p>}
  </section>;
}
