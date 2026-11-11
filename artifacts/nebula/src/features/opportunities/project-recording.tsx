import type { ReactNode } from 'react';
import type { Project, PresentationRecording } from '@nebula/local';
import { AudioPreview } from '@/components/audio-preview';
import { useSongs } from '@/features/songs';
import { usePublication } from '@/features/discovery/publication-api';
import { SilentDemoPlayer, usePresentationCatalog, usePresentationRemixExample } from '@/features/presentation/catalog';

/** Presentation fallback: use verified work links, never titles or another artist's media. */
export function HomeProjectRecording({ project, children }: { project: Project; children: ReactNode }) {
  const catalog = usePresentationCatalog(project.artistId);
  const example = usePresentationRemixExample();
  const candidates = example ? [example.original, example.remix].filter(recording => recording.artistIds.includes(project.artistId)) : [];
  const songs = useSongs(candidates.length ? project.id : null);
  const recording = candidates.find(item => item.projectId === project.id || songs.data?.songs.some(song => song.id === item.workId));
  const release = catalog?.releases.find(item => item.projectId === project.id);
  const track = release?.tracks[0];
  if (recording) return <LinkedRecording recording={recording} fallback={children}/>;
  if (track && release) return <SilentDemoPlayer compact track={track} coverUrl={release.coverUrl}/>;
  return <>{children}</>;
}
function LinkedRecording({ recording, fallback }: { recording: PresentationRecording; fallback: ReactNode }) {
  const query = usePublication(recording.postId);
  const post = query.data;
  if (post?.status === 'published' && post.media.kind === 'audio' && post.workId === recording.workId && recording.artistIds.includes(post.artistId)) {
    return <AudioPreview key={post.media.id} title={post.title} src={post.media.url} waveformUrl={`/api/publications/${post.id}/waveform?listen=1`}/>;
  }
  if (query.isPending) return <p role="status" className="text-sm text-muted">Loading recording…</p>;
  return <>{fallback}</>;
}
