import { DesktopComments, type ReplyTarget } from './desktop-comments';
import { Bookmark } from 'lucide-react';
import { AudioPreview } from '@/components/audio-preview';
import { useState } from 'react';
import { Link } from 'wouter';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, isServerMode, type Publication } from '@nebula/local';
import { useAuth } from '@/context/AuthContext';
import { SectionSkeleton } from '@/components/loading-states';

export async function refreshSocial(client: ReturnType<typeof useQueryClient>) {
  await Promise.all(['discovery-feed', 'publication', 'saved', 'comments', 'opportunity-projects'].map(key => client.invalidateQueries({ queryKey: [key] })));
}

export function LiveComments({postId,drafts,replyDrafts,rich=false}:{postId:number;drafts?:Map<number,string>;replyDrafts?:Map<number,ReplyTarget>;rich?:boolean}) {
 return rich ? <DesktopComments postId={postId} drafts={drafts} replyDrafts={replyDrafts}/> : <PlainComments postId={postId} drafts={drafts}/>;
}
function PlainComments({ postId, drafts }: { postId: number; drafts?: Map<number,string> }) {
  const { user } = useAuth(), client = useQueryClient();
  const [text, updateText] = useState(() => drafts?.get(postId) ?? ''), [error, setError] = useState(''), [pending, setPending] = useState(false);
  const query = useInfiniteQuery({ queryKey: ['comments', postId, user?.artistId ?? user?.investorId ?? null], initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => apiRequest<{ items: { id: number; author: string; text: string; canDelete: boolean }[]; nextCursor: number | null }>(`/api/publications/${postId}/comments${pageParam ? `?before=${pageParam}` : ''}`),
    getNextPageParam: page => page.nextCursor ?? undefined, refetchInterval: 15_000,
  });
  async function mutate(path: string, method: string, body?: object) {
    setPending(true); setError('');
    try { await apiRequest(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); if (method === 'POST') setText(''); await refreshSocial(client); }
    catch (error) { setError((error as Error).message); } finally { setPending(false); }
  }
  function setText(value:string) { updateText(value); if(drafts) { if(value) drafts.set(postId,value); else drafts.delete(postId); } }
  const items = query.data?.pages.flatMap(page => page.items) ?? [];
  return <>
    {(error || query.error) && <p role="alert">{error || query.error?.message}</p>}
    {query.isLoading && <SectionSkeleton variant="comments" label="Loading comments" rows={3}/>}
    {query.error && <button onClick={() => void query.refetch()}>Try again</button>}
    <div className="discovery-comments" aria-label="Comments">{items.map(item => <article key={item.id}><strong>{item.author}</strong><p className="whitespace-pre-wrap break-words">{item.text}</p>{item.canDelete && <button className="text-xs underline mt-2" aria-label={`Delete comment by ${item.author}`} disabled={pending} onClick={() => void mutate(`/api/publications/${postId}/comments/${item.id}`, 'DELETE')}>Delete comment</button>}</article>)}
      {!query.isLoading && !query.error && !items.length && <p>No comments yet. Start the conversation.</p>}
    </div>
    {query.hasNextPage && <button disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>Older comments</button>}
    {user ? <form className="discovery-comment-form" onSubmit={event => { event.preventDefault(); if (!pending && text.trim()) void mutate(`/api/publications/${postId}/comments`, 'POST', { text: text.trim() }); }}>
      <label htmlFor="live-comment">Add a comment</label><textarea id="live-comment" rows={3} maxLength={500} disabled={!!drafts && pending} value={text} onChange={event => setText(event.target.value)} />
      <button className="discovery-primary" disabled={pending || !text.trim()}>{pending ? 'Saving…' : 'Post comment'}</button><p className="discovery-note">Comments are public. You and the publication owner can remove your comment.</p>
    </form> : <div className="discovery-auth-prompt"><p>Log in to leave a comment.</p><Link href="/login">log in</Link><Link href="/register">sign up</Link></div>}
  </>;
}

export function SavedPublications() {
  const { user } = useAuth(), client = useQueryClient();
  const [error, setError] = useState(''), [pending, setPending] = useState<number | null>(null);
  const query = useInfiniteQuery({ queryKey: ['saved', user?.artistId ?? user?.investorId ?? null], initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => apiRequest<{ items: Publication[]; nextCursor: number | null }>(`/api/saved${pageParam ? `?before=${pageParam}` : ''}`),
    getNextPageParam: page => page.nextCursor ?? undefined, enabled: !!user && isServerMode(), refetchOnWindowFocus: true, refetchInterval: 15_000,
  });
  if (!user) return <div className="p-8"><p>Log in to see your private collection.</p><Link href="/login">log in</Link></div>;
  if (!isServerMode()) return <div className="p-8">Saved publications are unavailable. Please try again later.</div>;
  const items = query.data?.pages.flatMap(page => page.items) ?? [];
  return <section className="w-full max-w-3xl mx-auto p-6 space-y-6"><h1 className="text-3xl font-bold">Saved publications</h1>
    {(error || query.error) && <p role="alert">{error || query.error?.message}</p>}{query.error && <button onClick={() => void query.refetch()}>Try again</button>}
    {query.isLoading ? <SectionSkeleton variant="player" label="Loading saved publications"/> : !items.length && !query.error ? <p>No saved publications yet.</p> : items.map(post => <article key={post.id} className="rounded-2xl border border-border bg-white/[0.025] p-5 space-y-4"><div className="flex items-center gap-4">{post.coverUrl && <img src={post.coverUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover"/>}<div className="min-w-0"><Link className="text-lg font-semibold leading-snug hover:underline" href={`/discovery?post=post-${post.id}`}>{post.title}</Link><p className="mt-1 text-sm text-muted">{post.artistName}</p></div></div>{post.media.kind === 'video' ? <video src={post.media.url} controls playsInline preload="metadata" className="w-full max-h-80 object-contain" /> : <AudioPreview src={post.media.url} title={post.title} waveformUrl={`/api/publications/${post.id}/waveform?listen=1`}/>}<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><Link className="inline-flex min-h-11 items-center text-sm font-medium hover:underline" href={`/discovery?post=post-${post.id}`}>Open original</Link><button className="min-h-11 min-w-11 flex items-center justify-center rounded-full text-accent hover:bg-surfaceAlt focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" aria-label={`Unsave ${post.title}`} title="Remove from saved" aria-pressed={true} disabled={pending !== null} onClick={async () => {
      setPending(post.id); setError(''); try { await apiRequest(`/api/publications/${post.id}/save`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: false }) }); await refreshSocial(client); } catch (error) { setError((error as Error).message); } finally { setPending(null); }
    }}><Bookmark aria-hidden size={24} fill="currentColor" /></button></div></article>)}
    {query.hasNextPage && <button disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>Load more</button>}
  </section>;
}
