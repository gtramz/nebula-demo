import { MorphAdvanceButton, type MorphAdvanceHandle } from '@/components/blob-face';
import { AntiqAudioPlayer } from '@/components/antiq-audio-player';
import { CreationFrame, useCreationSteps } from '@/components/guided/creation';
import { JourneyBack, JourneyNext, JourneyContext, pauseJourneyMedia } from '@/components/guided/journey';
import { SongSelector } from '@/features/songs';
import { useLeaveGuard } from '@/components/shell/navigation-guard';

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearch } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, isServerMode, useListProjects, type CollaborationOffer, type Publication, type PublicationInput, type UploadedMedia } from '@nebula/local';
import { useAuth } from '@/context/AuthContext';
import { ContentWidth } from '@/components/shell/app-shell';
import { savePublication, uploadMedia, usePublication, usePublications } from '@/features/discovery/publication-api';
import { PageSkeleton, SectionSkeleton } from '@/components/loading-states';

const button = 'border border-border px-5 py-3 text-xs hover:border-ink disabled:opacity-40';
const field = 'w-full border border-border bg-surfaceAlt p-3 text-sm';

function ArtistGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!isServerMode()) return <ContentWidth className="py-12 space-y-4"><h1 className="text-3xl">Publishing unavailable</h1><p>Please try again later.</p></ContentWidth>;
  if (user?.role !== 'artist') return <ContentWidth className="py-12 space-y-4"><h1 className="text-3xl">An artist space</h1><p>Log in with an artist account to publish and manage your work.</p><Link href="/login">Log in</Link></ContentWidth>;
  return <>{children}</>;
}

export function Publications() { return <ArtistGate><PublicationList /></ArtistGate>; }
function PublicationList() {
  const search = useSearch();
  const [view,setView] = useState(new URLSearchParams(search).get("view") === "drafts" ? "draft" : "all");
  useEffect(() => setView(new URLSearchParams(search).get("view") === "drafts" ? "draft" : "all"), [search]);
  const { user } = useAuth();
  const query = usePublications(true);
  const client = useQueryClient();
  const change = useMutation({ mutationFn: (post: Publication) => savePublication({ ...post, status: post.status === 'published' ? 'withdrawn' : 'published' }, post),
    onSuccess: () => { void client.invalidateQueries({ queryKey: ['publications'] }); void client.invalidateQueries({ queryKey: ['publication'] }); } });
  const proposalDrafts=useQuery({queryKey:['proposal-drafts',user?.artistId],queryFn:()=>apiRequest<{drafts:{offer:CollaborationOffer;updatedAt:string}[]}>('/api/collaborations'),refetchOnWindowFocus:true});
  const uploads = useQuery({ queryKey: ['unused-uploads', user?.artistId], queryFn: () => apiRequest<UploadedMedia[]>('/api/uploads') });
  const remove = useMutation({ mutationFn: (id: string) => apiRequest(`/api/uploads/${id}`, { method: 'DELETE' }), onSuccess: () => { void uploads.refetch(); } });
  const posts = query.data?.pages.flatMap(page => page.items) ?? [];
  return <ContentWidth className="py-10 space-y-8">
    <header className="flex items-center justify-between gap-4"><div><p className="voice text-xs text-muted">artist studio</p><h1 className="text-3xl font-bold mt-2">Your publications</h1></div><Link href="/publish" className="bg-cream text-bg px-5 py-3 text-xs">New publication</Link></header>
    {!!proposalDrafts.data?.drafts.length&&<section aria-label="Private proposal drafts" className="space-y-3"><h2 className="text-xl font-semibold">Private proposal drafts</h2>{proposalDrafts.data.drafts.map(({offer})=><Link key={offer.id} href={`/messages/offer/${offer.id}`} className="block border border-border rounded-xl p-4 hover:border-accent"><strong>{offer.projectTitle} · {offer.need}</strong><p className="text-sm text-muted">{offer.workTitle??'Project-wide'} · {offer.ownerName} · {offer.available?'Continue proposal →':'Opportunity closed · view saved work'}</p></Link>)}</section>}
    {proposalDrafts.error&&<p role="alert">Private proposal drafts could not load. <button className="underline" onClick={()=>void proposalDrafts.refetch()}>Retry</button></p>}
    <Link href="/collaborations" className="inline-block underline text-sm">Collaborations & messages</Link>
    <Link href="/studio/remix" className={button}>Private remix drafts</Link>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Publication status">{[["all","All"],["draft","Drafts"],["published","Published"],["withdrawn","Withdrawn"]].map(([value,label])=><button key={value} className={`${button} ${view===value?"bg-cream text-bg":""}`} aria-pressed={view===value} onClick={()=>setView(value)}>{label}</button>)}</div>
    {!!posts.length && !posts.some(post=>view==="all"||post.status===view) && <p className="text-muted">No {view} publications here yet.</p>}
    {query.isLoading && <SectionSkeleton variant="cards" label="Loading your publications" rows={2}/>}
    {query.error && <p role="alert">{query.error.message} <button onClick={() => query.refetch()}>Retry</button></p>}
    {!query.isLoading && !query.error && !posts.length && <div className="border border-border p-10"><h2 className="text-xl mb-3">Your first idea starts here.</h2><p className="text-muted">Upload a video or audio track. Keep it as a draft until you are ready.</p></div>}
    {change.error && <p role="alert" className="text-danger">{change.error.message}</p>}
    <div className="grid md:grid-cols-2 gap-6">{posts.filter(post=>view==="all"||post.status===view).map(post => <article key={post.id} className="border border-border p-6 space-y-4" aria-label={`${post.title} publication`}>
      {post.coverUrl && <img src={post.coverUrl} alt="" className="w-full h-40 object-cover" />}
      <p className="voice text-xs text-muted">{post.status} · {post.media.kind}</p><h2 className="text-xl font-bold break-words">{post.title}</h2>
      <p className="text-sm text-muted line-clamp-3 break-words">{post.description}</p>
      {post.remix && <p className="text-sm text-accent">Remix of {post.remix.title} · {post.remix.artistName}</p>}
      <p className="text-xs">{post.allowRemix ? 'Remixes allowed' : 'Remixes not allowed'}{post.project ? ` · ${post.project.title}` : ''}</p>
      <div className="flex flex-wrap gap-3"><Link href={`/publish/${post.id}`} className={button}>Edit publication</Link><button className={button} disabled={change.isPending || (!!post.remix && post.status !== 'published')} onClick={() => change.mutate(post)}>{post.status === 'published' ? 'Withdraw' : 'Publish'}</button>{post.status === 'published' && <Link href={`/discovery?post=post-${post.id}`} className={button}>View in Discovery</Link>}{post.remix?.projectId && <Link className={button} href={`/remix/${post.id}/proposal`}>Propose to original project</Link>}</div>
    </article>)}</div>
    {query.hasNextPage && <button className={button} disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>Load more publications</button>}
    {!!uploads.data?.length && <details className="border-t border-border pt-6"><summary>Unused uploads ({uploads.data.length})</summary><p className="text-muted text-sm my-3">These files are not used in saved publications.</p>{uploads.data.map(file => <div key={file.id} className="flex justify-between items-center gap-4 py-3 border-b border-border"><span className="text-xs">{file.name ?? file.kind} · {(file.size / 1024 / 1024).toFixed(1)} MB</span><button className={button} disabled={remove.isPending} onClick={() => remove.mutate(file.id)}>Remove unused file</button></div>)}</details>}
    {remove.error && <p role="alert">{remove.error.message}</p>}
  </ContentWidth>;
}

export function PublicationEditor() {
  const { id } = useParams<{ id?: string }>();
  const query = usePublication(id ? Number(id) : undefined);
  const { user } = useAuth();
  return <ArtistGate>{id && query.isLoading ? <PageSkeleton variant="form" label="Loading publication" rows={6}/> : query.error && !query.data ? <ContentWidth className="py-10"><p role="alert">{query.error.message}</p><button onClick={() => void query.refetch()}>Retry publication</button></ContentWidth> : id && query.data?.artistId !== user?.artistId ? <ContentWidth className="py-10">Publication not found.</ContentWidth> : <PublicationForm key={`${user?.artistId}:${id ?? 'new'}`} existing={query.data} />}</ArtistGate>;
}

function PublicationForm({ existing }: { existing?: Publication }) {
  const { user } = useAuth();
  const flow = useCreationSteps();
  const [, navigate] = useLocation();
  const projects = useListProjects();
  const client = useQueryClient();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [allowRemix, setAllowRemix] = useState(existing?.allowRemix ?? false);
  const [workId,setWorkId]=useState<number|null>(existing?.workId??null);
  const [songNotice,setSongNotice]=useState('');
  const [projectId, setProjectId] = useState(String(existing?.projectId ?? ''));
  const [media, setMedia] = useState<UploadedMedia | null>(existing?.media ?? null);
  const [cover, setCover] = useState<{ id: string; url: string } | null>(existing?.coverId ? { id: existing.coverId, url: existing.coverUrl! } : null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [playable, setPlayable] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const advance = useRef<MorphAdvanceHandle>(null), writing = useRef(false);
  const operations = useRef(new Map<string, string>());
  const abort = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; abort.current?.abort(); pauseJourneyMedia(); }; }, []);
  const save = useMutation({ mutationFn: (status: PublicationInput['status']) => {
    if (!media) throw new Error('Upload audio or video first.');
    if (!title.trim()) throw new Error('Add a title.');
    const input = { title, description, mediaId: media.id, coverId: cover?.id ?? null, allowRemix, projectId: projectId ? Number(projectId) : null, workId, status };
    const signature = JSON.stringify([existing?.id, existing?.revision, input]);
    const operationId = operations.current.get(signature) ?? crypto.randomUUID();
    operations.current.set(signature, operationId);
    return savePublication(input, existing, operationId);
  }, onSuccess: async () => {
    setDirty(false);
    await client.invalidateQueries({ queryKey: ['publications'] }); await client.invalidateQueries({ queryKey: ['publication'] }); await client.invalidateQueries({ queryKey: ['unused-uploads', user?.artistId] });
  } });
  async function selectFile(file: File | undefined, isCover: boolean) {
    if (!file) return;
    setError('');
    const kind = isCover ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : null;
    if (!kind) { setError('Choose an MP4/WebM video or MP3/WAV/OGG audio file.'); return; }
    if (file.size > (isCover ? 5 : 100) * 1024 * 1024) { setError(`${isCover ? 'Cover' : 'Media'} exceeds the ${isCover ? 5 : 100} MB limit.`); return; }
    const controller = new AbortController(); abort.current = controller; setProgress(0);
    try {
      const uploaded = await uploadMedia(file, kind, value => { if (alive.current) setProgress(value); }, controller.signal);
      if (!alive.current) return;
      if (isCover) setCover(uploaded); else { setMedia(uploaded); setPlayable(false); }
      setDirty(true); void client.invalidateQueries({ queryKey: ['unused-uploads', user?.artistId] });
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'Upload failed.'); }
    finally { if (alive.current) setProgress(null); abort.current = null; }
  }
  const busy = progress !== null || save.isPending || advancing;
  const allowDeparture = useLeaveGuard(dirty || busy ? 'Leave without saving these changes? Completed uploads remain in your unused uploads; unfinished uploads will be cancelled.' : null);
  async function saveVersion(status: PublicationInput['status']) {
    if (writing.current || progress !== null || save.isPending || !flow.validate()) return false;
    if (status === 'published' && (!playable || (!!existing?.remix && existing.status !== 'published'))) return false;
    writing.current = true;
    try { await save.mutateAsync(status); return alive.current; }
    finally { writing.current = false; }
  }
  function complete() { if (alive.current) { allowDeparture(); navigate('/studio'); } }
  function validateStep() { return flow.step === 0 ? !!media && playable : flow.validate(flow.step); }
  const selectedProject = projects.data?.find(project => String(project.id) === projectId);
  return <ContentWidth className="py-4 md:py-8 max-w-6xl space-y-4 md:space-y-6">
    <header><h1 className="text-2xl md:text-3xl font-bold">{existing ? 'Edit publication' : 'Share your sound'}</h1></header>
    <form ref={flow.form} noValidate onSubmit={event => { event.preventDefault(); if (!busy) advance.current?.run(); }} onChange={() => setDirty(true)}>
      <CreationFrame label="Publication" steps={['Media', 'Details', 'Project', 'Review']} flow={flow} locked={busy}
        context={<JourneyContext cover={cover?.url} title={title || 'New publication'} artist={media?.kind === 'video' ? 'Video' : media?.kind === 'audio' ? 'Audio' : 'Audio / Video'} />}
        footer={<>
          {flow.step > 0 ? <JourneyBack disabled={busy} onClick={() => flow.go(flow.step - 1)} /> : <button type="button" className="guided-back" disabled={save.isPending} onClick={() => { if (!dirty || window.confirm('Leave without saving these changes?')) { allowDeparture(); abort.current?.abort(); navigate('/studio'); } }}>Cancel</button>}
          <button type="button" className="creation-save" disabled={busy || !media || !title.trim()} onClick={() => { void saveVersion(existing?.status === 'published' ? 'published' : 'draft').then(saved => { if (saved) complete(); }).catch(() => {}); }}>{save.isPending ? 'Saving…' : 'Save & exit'}</button>
          <MorphAdvanceButton ref={advance} buttonType="submit" onBeforeAdvance={validateStep} onPendingChange={setAdvancing} disabled={progress !== null || save.isPending || (flow.step === 0 && (!media || !playable)) || (flow.step === 3 && (!media || !playable || !title.trim() || (!!existing?.remix && existing.status !== 'published')))} onAttempt={() => flow.step === 3 ? saveVersion('published') : undefined} onError={cause => setError((cause as Error).message)} onAdvance={() => flow.step === 3 ? complete() : flow.go(flow.step + 1)} buttonClassName="guided-next" faceSize={72}>{flow.step < 3 ? 'Continue' : existing?.status === 'published' ? 'Save changes' : 'Publish'}</MorphAdvanceButton>
        </>}>
      <fieldset disabled={busy} className="space-y-6 disabled:opacity-60">
      <section data-creation-step="0" hidden={flow.step !== 0} className="space-y-6">
        {existing?.remix ? <p className="text-sm text-accent">Remix of {existing.remix.title} · {existing.remix.artistName}. The mix and its credit are fixed; start a new remix to change its media.</p> : <label className="block space-y-2"><span>Audio or video</span><input aria-label="Audio or video" type="file" accept="video/mp4,video/webm,audio/mpeg,audio/wav,audio/x-wav,audio/ogg" className={field} onChange={event => { void selectFile(event.target.files?.[0], false); event.target.value = ''; }} /><span className="block text-xs text-muted">MP4, WebM, MP3, WAV or OGG · up to 100 MB</span></label>}
      </section>
      <div hidden={flow.step !== 0 && flow.step !== 3}>
        {media && <div className="creation-preview">{media.kind === 'video' ? <video key={media.id} src={media.url} controls playsInline preload="metadata" className="max-h-80 w-full" onLoadedData={() => setPlayable(true)} onError={() => { setPlayable(false); setError('This video cannot be played. Export it as MP4 with H.264/AAC or WebM and try again.'); }} /> : <AntiqAudioPlayer key={media.id} src={media.url} label="Publication preview" disabled={busy || (flow.step !== 0 && flow.step !== 3)} onPlayable={setPlayable} onMediaError={() => setError('This audio cannot be played. Try another MP3, WAV or OGG file.')} />}</div>}
      </div>
      <section data-creation-step="1" hidden={flow.step !== 1} className="space-y-6">
        <label className="block space-y-2"><span>Title</span><input className={field} value={title} onChange={event => setTitle(event.target.value)} maxLength={160} required /></label>
        <label className="block space-y-2"><span>Description</span><textarea aria-label="Description" className={field} value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} rows={4} /></label>
        <label className="block space-y-2"><span>Cover image (optional)</span><input type="file" className={field} accept="image/png,image/jpeg,image/webp" onChange={event => { void selectFile(event.target.files?.[0], true); event.target.value = ''; }} /><span className="block text-xs text-muted">PNG, JPEG or WebP · up to 5 MB</span></label>
        {cover && <div className="flex gap-4 items-center"><img src={cover.url} alt="Publication cover preview" className="h-32 w-32 object-cover" /><button type="button" className={button} onClick={() => { setCover(null); setDirty(true); }}>Remove cover</button></div>}
      </section>
      <section data-creation-step="2" hidden={flow.step !== 2} className="space-y-6">
        <label className="block space-y-2"><span>Link a project (optional)</span><select className={field} value={projectId} onChange={event => {setProjectId(event.target.value);if(workId){setWorkId(null);setSongNotice('Song selection cleared because the project changed. Choose a song from the new project.');}}}><option value="">Independent publication</option>{projects.data?.filter(project => project.artistId === user?.artistId).map(project => <option key={project.id} value={project.id}>{project.title}{project.status === 'draft' ? ' (draft — publish project first)' : ''}</option>)}</select></label>
        {projectId && <SongSelector projectId={Number(projectId)} value={workId} onChange={id=>{setWorkId(id);setSongNotice('');}}/>}{songNotice&&<p role="status">{songNotice}</p>}
        {projects.error && <p role="alert">Could not load your projects. <button type="button" onClick={() => projects.refetch()}>Retry</button></p>}
        <div className="border border-border p-5 space-y-3"><label className="flex gap-3 items-center"><input type="checkbox" disabled={!!existing?.remix} checked={allowRemix} onChange={event => setAllowRemix(event.target.checked)} />Allow other artists to remix this publication</label><p className="text-xs text-muted">Remix permission does not include royalties or collaboration approval.</p></div>
      </section>
      <section data-creation-step="3" hidden={flow.step !== 3} className="space-y-5">
        <div className="creation-summary"><h3 className="text-xl font-semibold">{title}</h3>{description && <p className="text-sm text-muted whitespace-pre-wrap">{description}</p>}<dl><dt>Project</dt><dd>{selectedProject?.title || 'Independent publication'}</dd><dt>Remix</dt><dd>{allowRemix ? 'Allowed' : 'Not allowed'}</dd><dt>Visibility</dt><dd>Public when published</dd></dl></div>
      </section>
      </fieldset>
      {progress !== null && <div role="status" className="space-y-3"><p>Uploading… {progress}%</p><progress className="w-full" value={progress} max={100} /><button type="button" className={button} onClick={() => abort.current?.abort()}>Cancel upload</button></div>}
      {(error || save.error) && <p role="alert" className="text-danger">{error || save.error?.message}</p>}
      </CreationFrame>
    </form>
  </ContentWidth>;
}
