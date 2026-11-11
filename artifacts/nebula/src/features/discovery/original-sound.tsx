import { useState } from 'react';
import { Link } from 'wouter';
import { Disc3 } from 'lucide-react';
import type { Publication } from '@nebula/local';
import type { DemoPost } from './demo-posts';
import { usePublication } from './publication-api';
import { PublicationVersionTracks } from './version-comparison';

function OriginalArtwork({ source }: { source?: Publication }) {
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const src = [source?.coverUrl, source?.project?.coverUrl].find((url): url is string => !!url && !failed.has(url));
  return src ? <img src={src} alt="" onError={() => setFailed(previous => new Set(previous).add(src))} /> : <Disc3 aria-hidden="true" size={24} />;
}

export function OriginalSoundArtwork({ post, nearby, onOpen }: { post: DemoPost; nearby: boolean; onOpen: () => void }) {
  const original = usePublication(nearby && post.original?.available ? Number(post.original.postId.slice(5)) : undefined);
  const source = !original.error && original.data?.status === 'published' ? original.data : undefined;
  return <button type="button" className="discovery-project-artwork discovery-original-artwork" aria-label={`Original sound: ${post.original?.title ?? post.title}`} onClick={onOpen}>
    <OriginalArtwork source={source} />
  </button>;
}

/** Current permission-aware records provide links; historical attribution never grants access. */
export function OriginalSoundPanel({ post }: { post: DemoPost }) {
  const result = usePublication(Number(post.id.slice(5)));
  const original = usePublication(result.data?.remix?.available && !result.error ? result.data.remix.sourceId : undefined);
  const [compare, setCompare] = useState(false);
  const version = result.data, credit = version?.remix;
  const source = !original.error && original.data?.status === 'published' ? original.data : undefined;
  const pending = result.isFetching || original.isFetching;
  const failed = result.error || original.error;
  const unavailable = [result.error, original.error].some(error => [401,403,404].includes((error as Error & {status?:number} | null)?.status ?? 0)) || (!pending && !failed && (!credit?.available || !source || version?.status !== 'published'));
  const available = !pending && !failed && !!credit?.available && !!source && version?.status === 'published';
  return <div className="discovery-original-panel space-y-4">
    <div><p className="discovery-eyebrow">Original</p><h3>{post.original?.title}</h3><p>{post.original?.author}</p></div>
    <p>Remix by {post.author}</p>
    <p className="text-muted">Remixes of remixes are unavailable.</p>
    {pending ? <p role="status">Loading original…</p> : unavailable ? <p role="status">The original is no longer available.</p> : failed ? <div role="alert"><p>The original could not load.</p><button className="underline min-h-11" onClick={() => { void result.refetch(); if (credit?.available && !result.error) void original.refetch(); }}>Try again</button></div> : null}
    {available && source && version && <>
      <div className="flex flex-wrap gap-4">
        <Link className="underline min-h-11 flex items-center" href={`/discovery?post=post-${source.id}`}>Open original</Link>
        {source.project && <Link className="underline min-h-11 flex items-center" href={`/project/${source.project.id}${source.workId ? `?song=${source.workId}` : ''}`}>View project · {source.project.title}</Link>}
      </div>
      <button type="button" className="discovery-primary" aria-expanded={compare} onClick={() => setCompare(value => !value)}>{compare ? 'Close comparison' : 'Compare versions'}</button>
      {compare && <PublicationVersionTracks version={version} source={source} />}
    </>}
  </div>;
}
