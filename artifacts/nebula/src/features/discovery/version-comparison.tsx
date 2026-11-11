import type { Publication } from '@nebula/local';
import { Link } from 'wouter';
import { usePublication } from './publication-api';
import { AudioComparison } from '@/features/remix/audio-comparison';

/** Resolve the public original through the normal permission-aware publication query. */
export function PublicationComparison({ id }: { id: number }) {
  const result = usePublication(id);
  const original = usePublication(result.data?.remix?.available ? result.data.remix.sourceId : undefined);
  if (result.isLoading || original.isLoading) return <p role="status">Loading versions…</p>;
  if (result.error || original.error) return <div role="alert"><p>The comparison could not load.</p><button className="underline min-h-11" onClick={() => { void result.refetch(); void original.refetch(); }}>Try again</button></div>;
  const version = result.data, source = original.data, credit = version?.remix;
  if (!version || !source || !credit?.available) return <p>The original is no longer available for comparison.</p>;
  return <div className="space-y-4">
    <p>{source.artistName} · original<br/>{version.artistName} · contribution</p>
    <PublicationVersionTracks version={version} source={source} />
    <div className="flex flex-wrap gap-4"><Link className="underline min-h-11 flex items-center" href={`/discovery?post=post-${source.id}`}>Open original</Link>{source.project && <Link className="underline min-h-11 flex items-center" href={`/project/${source.project.id}${source.workId?`?song=${source.workId}`:''}`}>View project · {source.project.title}</Link>}</div>
  </div>;
}

export function PublicationVersionTracks({ version, source }: { version: Publication; source: Publication }) {
  const credit = version.remix;
  if (!credit?.available) return null;
  return <AudioComparison expanded duration={credit.endSeconds-credit.startSeconds} tracks={[
      {label:'Original',url:source.media.url,kind:source.media.kind as 'audio'|'video',offset:credit.startSeconds},
      {label:'Your version',url:version.media.url,kind:version.media.kind as 'audio'|'video',composition:credit.composition},
    ]}/>;
}
