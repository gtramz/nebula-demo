import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Disc3 } from 'lucide-react';
import type { DemoPost } from './demo-posts';

/** Artwork is presentation-only: it never manufactures a project destination. */
export function DiscoveryArtwork({ post, compact = false, useProjectCover = true, eager = false, retryable = false, onSourceChange }: {
  post: DemoPost;
  compact?: boolean;
  useProjectCover?: boolean;
  eager?: boolean;
  retryable?: boolean;
  onSourceChange?: (src: string | null | undefined) => void;
}) {
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set());
  const src = [post.coverUrl, useProjectCover ? post.projectCoverUrl : undefined]
    .find((url): url is string => !!url && !failed.has(url));
  // Wait for the displayed image before sampling it; loading is distinct from failure.
  useEffect(() => { onSourceChange?.(src ? loaded.has(src) ? src : undefined : null); }, [src, loaded, onSourceChange]);

  return src
    ? <span className="discovery-artwork" data-loading={!loaded.has(src)} aria-busy={!loaded.has(src)}>
      {!loaded.has(src) && <span className="discovery-artwork-skeleton" aria-hidden="true"/>}
      <img key={src} src={src} loading={eager ? "eager" : "lazy"} decoding="async" alt={`${post.title} cover artwork`}
        onLoad={() => setLoaded(previous => new Set(previous).add(src))}
        onError={() => setFailed(previous => new Set(previous).add(src))} />
      </span>
    : <div className="discovery-cover-fallback" aria-label="No cover artwork">
      <Disc3 strokeWidth={.6} aria-hidden="true" />
      {!compact && <><span>{post.initials}</span><small>NEBULA / AUDIO</small></>}
      {retryable && failed.size > 0 && <button type="button" className="discovery-artwork-retry" onClick={() => setFailed(new Set())}>Retry artwork</button>}
    </div>;
}

export function DiscoveryProjectArtwork({ post, onNavigate }: { post: DemoPost; onNavigate?: () => void }) {
  if (!post.project || !Number.isInteger(post.projectId) || !post.projectId || post.projectId < 1) return null;
  return <Link className="discovery-project-artwork" href={`/project/${post.projectId}${post.workId ? `?song=${post.workId}` : ''}`}
    aria-label={`View project: ${post.project.title}`} onClick={onNavigate}>
    <DiscoveryArtwork post={post} compact />
  </Link>;
}
