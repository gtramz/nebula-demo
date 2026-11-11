import { SectionSkeleton } from '@/components/loading-states';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link, useSearch } from 'wouter';
import { ArrowUpRight, Disc3, Pause, Play } from 'lucide-react';
import type { PresentationCatalog, PresentationRelease, PresentationTrack, PresentationRecording, PresentationRemixExample, Project } from '@nebula/local';
import { useViewState } from '@/components/shell/return-context';
import { useSongs, RelatedPublications } from '@/features/songs';
import { usePresentation } from './index';
import { projectProductCopy } from './product-copy';
import { usePublication } from '@/features/discovery/publication-api';
import { AudioPreview } from '@/components/audio-preview';
import { AudioComparison } from '@/features/remix/audio-comparison';

const time = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
export function usePresentationCatalog(artistId?: number) {
  const { data } = usePresentation();
  if (artistId === undefined) return data?.catalog ?? null;
  return data?.catalogs?.find(catalog => catalog.artistId === artistId) ?? (data?.catalog?.artistId === artistId ? data.catalog : null);
}

export function useProjectPresentationCatalog(projectId: number) {
  const { data } = usePresentation();
  return (data?.catalogs ?? (data?.catalog ? [data.catalog] : [])).find(catalog => catalog.releases.some(release => release.projectId === projectId)) ?? null;
}

export function useProjectProductCopy(project: { id: number; artistId: number; pitch?: string | null; story?: string | null } | undefined) {
  const { data } = usePresentation();
  return project ? projectProductCopy(project, data?.catalogs ?? (data?.catalog ? [data.catalog] : []), data?.featuredRemix) : { pitch: undefined, story: undefined };
}

export function usePresentationRemixExample() { return usePresentation().data?.featuredRemix ?? null; }

export function RecordingCard({ recording, title = recording.title, coverUrl = `/media/${recording.coverId}` }: {recording:PresentationRecording; title?:string; coverUrl?:string|null}) {
  return <Link href={`/project/${recording.projectId}`} className="group block min-w-0 space-y-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"><div className="aspect-square rounded-xl overflow-hidden bg-surfaceAlt relative">{coverUrl && <img src={coverUrl} alt={`${title} artwork`} loading="lazy" className="h-full w-full object-cover"/>}<span className="absolute bottom-3 right-3 rounded-full w-11 h-11 bg-bg/80 grid place-items-center"><Play size={18} aria-hidden/></span></div><div><h3 className="font-semibold break-words">{title}</h3><p className="text-sm text-muted mt-1">Single · {time(recording.durationSeconds)}</p></div></Link>;
}

function RecordingArtists({ recording }: {recording:PresentationRecording}) {
  const accounts = usePresentation().data?.accounts ?? [];
  return <div className="flex flex-wrap items-center gap-x-2 text-sm">{recording.artistIds.map((id,index) => <span key={id} className="inline-flex items-center gap-2">{index>0&&<span className="text-muted">&</span>}<Link href={`/artist/${id}`} className="min-h-11 inline-flex items-center underline underline-offset-4">{accounts.find(a=>a.id===id)?.name ?? 'Artist'}</Link></span>)}</div>;
}

/** The presentation metadata identifies the example; the normal publication query supplies authorized media. */
export function FeaturedRecording({ example, recording, showKicker = true }: {example:PresentationRemixExample; recording:PresentationRecording; showKicker?:boolean}) {
  const query = usePublication(recording.postId), isRemix = recording.postId === example.remix.postId;
  if (query.isPending) return <SectionSkeleton variant="player" label="Loading featured recording"/>;
  if (query.isError) return <div role="alert" className="space-y-2"><p>This recording is unavailable.</p><button className="underline min-h-11" onClick={()=>void query.refetch()}>Retry recording</button></div>;
  const post=query.data; if(!post || post.status!=='published') return null;
  return <section aria-label={`Featured recording: ${post.title}`} className="rounded-2xl border border-accent/30 bg-surface p-5 sm:p-6 space-y-5">
    {showKicker && <p className="voice text-xs text-accent">{isRemix?'FEATURED REMIX':'ORIGINAL / COLLABORATION'}</p>}
    <div className="flex items-center gap-4 sm:gap-6">{post.coverUrl&&<Link href={`/project/${recording.projectId}`} aria-label={`View project: ${post.title}`} className="shrink-0"><img src={post.coverUrl} alt="" className="h-24 w-24 sm:h-32 sm:w-32 rounded-xl object-cover"/></Link>}<div className="min-w-0"><h2 className="text-2xl font-semibold break-words"><Link href={`/project/${recording.projectId}`}>{post.title}</Link></h2><RecordingArtists recording={recording}/><p className="text-xs text-muted">{time(recording.durationSeconds)} · {isRemix?'Remix':'Original track'}</p></div></div>
    <AudioPreview src={post.media.url} title={post.title} waveformUrl={`/api/publications/${post.id}/waveform?listen=1`}/>
    <div className="border-t border-border pt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm"><Link className="min-h-11 inline-flex items-center underline" href={`/project/${isRemix?example.original.projectId:example.remix.projectId}`}>{isRemix?'Original: luna · gramz & SANNFERNNA':'Listen to luna - chilz remix'}</Link><Link className="min-h-11 inline-flex items-center text-muted underline" href={`/discovery?post=post-${post.id}`}>Open in Discovery</Link></div>
  </section>;
}

/** Recording-specific content plugs into the same project shell as every other project. */
export function RecordingDetails({recording, example}:{recording:PresentationRecording;example:PresentationRemixExample}) {
  const original=usePublication(example.original.postId),remix=usePublication(example.remix.postId);
  return <div className="space-y-6">
    <FeaturedRecording example={example} recording={recording}/>
    <div className="grid sm:grid-cols-2 gap-5"><section aria-label="Recording credits" className="rounded-2xl border border-border p-5 space-y-2"><h2 className="text-xl font-semibold">Credits</h2><p className="text-sm text-muted">Original</p><RecordingArtists recording={example.original}/><p className="text-sm text-muted pt-2">Remix</p><RecordingArtists recording={example.remix}/></section>
      {original.data?.status==='published'&&remix.data?.status==='published'&&<AudioComparison duration={Math.min(example.original.durationSeconds,example.remix.durationSeconds)} tracks={[{label:'Original · gramz & SANNFERNNA',url:original.data.media.url,kind:'audio'},{label:'CHILZ remix',url:remix.data.media.url,kind:'audio'}]}/>}
    </div>
  </div>;
}

/** A visual transport, deliberately without a media URL, decoded waveform or silent audio file. */
export function SilentDemoPlayer({ track, coverUrl, compact = false }: { track: PresentationTrack; coverUrl: string; compact?: boolean }) {
  const id = useId(), [playing, setPlaying] = useState(false), [position, setPosition] = useState(0);
  useEffect(() => { setPlaying(false); setPosition(0); }, [track.sourceId, track.spotifyId, track.workId]);
  useEffect(() => {
    const stop = () => setPlaying(false);
    const another = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) stop(); };
    document.addEventListener('play', stop, true);
    document.addEventListener('nebula:silent-preview', another);
    document.addEventListener('visibilitychange', stop);
    return () => { document.removeEventListener('play', stop, true); document.removeEventListener('nebula:silent-preview', another); document.removeEventListener('visibilitychange', stop); };
  }, [id]);
  useEffect(() => {
    if (!playing) return;
    const began = performance.now(), initial = position;
    const timer = window.setInterval(() => {
      const next = Math.min(track.durationSeconds, initial + (performance.now() - began) / 1000);
      setPosition(next); if (next >= track.durationSeconds) setPlaying(false);
    }, 100);
    return () => clearInterval(timer);
    // A manual seek pauses transport, preventing stale timer origins.
  }, [playing, track.durationSeconds]);
  function toggle() {
    if (!playing) {
      document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(media => media.pause());
      document.dispatchEvent(new CustomEvent('nebula:silent-preview', { detail: id }));
      if (position >= track.durationSeconds) setPosition(0);
    }
    setPlaying(value => !value);
  }
  if (compact) return <section aria-label={`Track player: ${track.title}`} className="audio-preview">
    <p className="audio-preview-title">{track.title}</p>
    <div className="audio-preview-row"><button type="button" className="audio-preview-play" aria-label={`${playing ? 'Pause' : 'Play'}: ${track.title}`} onClick={toggle}>{playing ? <Pause size={18}/> : <Play size={18}/>}</button>
      <div className="audio-preview-wave">
        {/* Catalog-only visual transport, not decoded audio peaks. Real recordings use AudioPreview. */}
        <svg viewBox="0 0 400 44" preserveAspectRatio="none" aria-hidden="true">{Array.from({length:160},(_,i)=>{const height=5+Math.abs(Math.sin(i*1.73)*Math.cos(i*.29))*32;return <rect key={i} x={i*2.5} y={(44-height)/2} width="1.3" height={height} fill={i/160<position/track.durationSeconds?'currentColor':'#555'}/>;})}</svg>
        <input aria-label={`Track position for ${track.title}`} type="range" min={0} max={track.durationSeconds} step={.1} value={position} onChange={e=>{setPlaying(false);setPosition(Number(e.target.value));}}/>
      </div>
    </div><div className="audio-preview-time"><span>{time(position)}</span><span>{time(track.durationSeconds)}</span></div>
  </section>;
  return <section aria-label={`Track player: ${track.title}`} className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4">
    <div className="flex gap-4 items-center"><img src={coverUrl} alt="" className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover shrink-0"/><div className="min-w-0 flex-1"><p className="font-semibold text-lg truncate">{track.title}</p><p className="text-sm text-muted truncate">{track.artists}</p></div><button aria-label={`${playing ? 'Pause' : 'Play'}: ${track.title}`} onClick={toggle} className="h-12 w-12 shrink-0 rounded-full bg-accent text-bg flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">{playing ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}</button></div>
    <label className="block"><span className="sr-only">Track position for {track.title}</span><input type="range" min={0} max={track.durationSeconds} step={0.1} value={position} onChange={e => { setPlaying(false); setPosition(Number(e.target.value)); }} className="w-full min-h-11 accent-accent"/></label>
    <div className="flex justify-between text-xs text-muted tabular-nums"><span>{time(position)}</span><span>{time(track.durationSeconds)}</span></div>
  </section>;
}

export function ReleaseCard({ release, title = release.title, coverUrl = release.coverUrl }: { release: PresentationRelease; title?: string; coverUrl?: string | null }) {
  return <Link href={`/project/${release.projectId}`} className="group block min-w-0 space-y-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
    <div className="aspect-square rounded-xl overflow-hidden bg-surfaceAlt relative">{coverUrl ? <img src={coverUrl} alt={`${title} artwork`} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"/> : <Disc3 className="absolute inset-0 m-auto h-12 w-12 text-muted"/>}<span className="absolute bottom-3 right-3 rounded-full w-11 h-11 bg-bg/80 grid place-items-center"><ArrowUpRight size={20} aria-hidden/></span></div>
    <div><h3 className="font-semibold leading-snug break-words">{title}</h3><p className="text-sm text-muted mt-1">{release.dateKind === 'upload' ? 'YouTube · ' : ''}{release.year} · {release.formatLabel ?? release.type}</p></div>
  </Link>;
}

export function ArtistDiscography({ catalog, projects, limit }: { catalog: PresentationCatalog; projects: Project[]; limit?: number }) {
  const releases = catalog.releases.flatMap(release => { const project = projects.find(p => p.id === release.projectId); return project ? [{...release, title:project.title, coverUrl:project.coverUrl ?? release.coverUrl}] : []; });
  return <section className="space-y-6" aria-label="Discography"><div className="flex justify-between items-end gap-4"><div><p className="voice text-[10px] text-accent mb-2">RELEASES / {catalog.artistName}</p><h2 className="text-2xl font-semibold">Discography</h2></div><span className="text-sm text-muted">{releases.length} releases</span></div>
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7 sm:gap-x-6">{releases.slice(0, limit).map(release => <ReleaseCard key={release.projectId} release={release}/>)}</div>
    <p className="text-xs text-muted"><a href={catalog.source} target="_blank" rel="noreferrer" className="underline inline-flex min-h-11 items-center">{catalog.releases.some(release => release.sourcePlatform === 'youtube') ? 'Spotify profile' : 'Listen on Spotify'} <ArrowUpRight size={12}/></a></p>
  </section>;
}

/** Catalog metadata enriches canonical songs; it never replaces offers or project permissions. */
export function CatalogSongs({ project, release, renderOffers }: { project: Project; release: PresentationRelease; renderOffers: (id: number) => ReactNode }) {
  const query = useSongs(project.id), search = useSearch();
  const [selected, setSelected] = useViewState<number | undefined>(`catalog-song:${project.id}:${search}`, () => Number(new URLSearchParams(search).get('song')) || undefined);
  const songs = query.data?.songs ?? [];
  const current = songs.find(song => song.id === selected) ?? songs[0];
  const metadata = release.tracks.find(track => track.workId === current?.id);
  const track = current && metadata ? {...metadata, title: current.title, artists: current.description || metadata.artists} : null;
  return <div className="space-y-6">
    {query.isPending && <SectionSkeleton variant="list" label="Loading release tracklist" rows={3}/>}{query.isError && <p role="alert">Could not load this release. <button className="underline min-h-11" onClick={() => void query.refetch()}>Retry songs</button></p>}
    <section aria-label="Release songs" className="space-y-4 min-w-0"><h2 className="text-2xl font-semibold">Tracklist</h2><ol className="divide-y divide-border">{songs.map((song,index) => {
      const reference = release.tracks.find(item => item.workId === song.id);
      return <li key={song.id}><button onClick={() => setSelected(song.id)} aria-pressed={current?.id === song.id} className={`min-h-16 w-full px-3 py-4 rounded-lg text-left flex gap-4 items-center ${current?.id === song.id ? 'bg-surfaceAlt text-accent' : 'hover:bg-surface'}`}><span className="w-5 text-sm text-muted tabular-nums shrink-0">{index + 1}</span><span className="flex-1 min-w-0"><strong className="block truncate">{song.title}</strong><span className="block text-sm text-muted truncate">{reference?.explicit ? 'E · ' : ''}{song.description || reference?.artists}</span></span>{reference && <span className="text-sm text-muted tabular-nums">{time(reference.durationSeconds)}</span>}</button></li>;
    })}</ol>{query.data && !songs.length && <p className="text-sm text-muted">No structured songs added yet.</p>}</section>
    {track && <SilentDemoPlayer key={track.workId} track={track} coverUrl={project.coverUrl ?? release.coverUrl}/>}

    <a href={release.source} target="_blank" rel="noreferrer" className="min-h-11 inline-flex items-center gap-2 text-sm underline">{release.sourcePlatform === 'youtube' ? 'Open official audio on YouTube' : 'Open release on Spotify'} <ArrowUpRight size={15}/></a>
    {current && <section id={`song-${current.id}`} aria-label={`Song: ${current.title}`} className="rounded-2xl border border-border p-5 space-y-4"><h3 className="text-xl font-semibold">{current.title}</h3><p className="text-sm text-accent">Selected song</p>{renderOffers(current.id)}{project.status !== 'draft' && <RelatedPublications projectId={project.id} workId={current.id}/>}</section>}
  </div>;
}
