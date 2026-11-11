import { SectionSkeleton } from '@/components/loading-states';
import { useEffect, type ReactNode } from 'react';
import type { Project, PresentationRecording } from '@nebula/local';
import { AudioPreview } from '@/components/audio-preview';
import { useSongs } from '@/features/songs';
import { usePublication } from '@/features/discovery/publication-api';
import { SilentDemoPlayer, usePresentationCatalog, usePresentationRemixExample } from '@/features/presentation/catalog';
import { isPresentation, usePresentation } from '@/features/presentation';

/** Presentation fallback: use verified work links, never titles or another artist's media. */
export function HomeProjectRecording({ project, children, hoverPreview=false, onReady }: { project: Project; children: ReactNode; hoverPreview?: boolean; onReady?:()=>void }) {
  const presentation = usePresentation();
  const catalog = usePresentationCatalog(project.artistId);
  const example = usePresentationRemixExample();
  const candidates = example ? [example.original, example.remix].filter(recording => recording.artistIds.includes(project.artistId)) : [];
  const songs = useSongs(candidates.length ? project.id : null);
  const recording = candidates.find(item => item.projectId === project.id || songs.data?.songs.some(song => song.id === item.workId));
  const release = catalog?.releases.find(item => item.projectId === project.id);
  const track = release?.tracks[0];
  const waiting = isPresentation() && presentation.isPending || candidates.length > 0 && !recording && songs.isPending;
  useEffect(()=>{if(!waiting&&!recording)onReady?.();},[waiting,recording,onReady]);
  if (waiting) return <SectionSkeleton variant="waveform" label="Preparing recording"/>;
  if (recording) return <LinkedRecording recording={recording} fallback={children} hoverPreview={hoverPreview} onReady={onReady}/>;
  if (track && release) return <SilentDemoPlayer compact track={track} coverUrl={release.coverUrl}/>;
  return <>{children}</>;
}
function LinkedRecording({ recording, fallback, hoverPreview, onReady }: { recording: PresentationRecording; fallback: ReactNode; hoverPreview: boolean; onReady?:()=>void }) {
  const query = usePublication(recording.postId);
  const post = query.data;
  const playable = post?.status === 'published' && post.media.kind === 'audio' && post.workId === recording.workId && recording.artistIds.includes(post.artistId);
  useEffect(()=>{if(!query.isPending&&!playable)onReady?.();},[query.isPending,playable,onReady]);
  if (post && playable) {
    return <AudioPreview key={post.media.id} title={post.title} src={post.media.url} waveformUrl={`/api/publications/${post.id}/waveform?listen=1`} hoverPreview={hoverPreview} onReady={onReady}/>;
  }
  if (query.isPending) return <SectionSkeleton variant="waveform" label="Loading recording"/>;
  return <>{fallback}</>;
}
