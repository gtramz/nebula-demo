import { usePresentation } from '@/features/presentation';
import { offerProductDeliverable } from '@/features/presentation/product-copy';
import { Journey, JourneyContext, JourneyBack, JourneyNext, useJourney, pauseJourneyMedia } from '@/components/guided/journey';
import { useGetProject } from '@nebula/local';
import { AdaptiveVideo } from '@/features/remix/adaptive-video';
import type { VideoComposition } from '@nebula/local';
import { songProjectHref } from '@nebula/local';
import { SongSelector } from '@/features/songs';
import { useLeaveGuard } from '@/components/shell/navigation-guard';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams, useSearch } from 'wouter';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, isServerMode, type CollaborationOffer, type OfferInput, type Compensation, type Collaboration, type CollaborationDetail, type UploadedMedia } from '@nebula/local';
import { useAuth } from '@/context/AuthContext';
import { uploadMedia } from '@/features/discovery/publication-api';
import { useRemixDraft } from '@/features/remix/draft-api';
import { usePublication } from '@/features/discovery/publication-api';
import { formatMoney } from '@/lib/utils';
import { controlStyles, Panel, ReturnLink, StateBadge } from '@/components/antiq/workspace';
import { useWorkspaceDraft } from './drafts';
import { ArtistMessagesAccess, Transcript, ViewedActivity, useMessageOperation, refreshMessages } from '@/features/messages/shared';

import { OpportunityFields } from './opportunity-fields';
import { ProposalPreparation, type Preparation, type ProposalDraft, ReferenceComparison } from './proposal-preparation';
const { field, button, primary } = controlStyles;
const statusText = (value: string) => value.replaceAll('_', ' ');
const identity = (user: ReturnType<typeof useAuth>['user']) => user ? `${user.role}:${user.artistId ?? user.investorId}` : 'guest';
async function write<T>(path: string, method: string, data: object): Promise<T> { return apiRequest<T>(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
async function refresh(client: ReturnType<typeof useQueryClient>) { await Promise.all(['offers','collaborations','collaboration','publication','discovery-feed','opportunity-projects','messages','notification-summary'].map(key => client.invalidateQueries({ queryKey: [key] }))); }
function ErrorMessage({ error }: { error: unknown }) { return error ? <p role="alert" className="text-sm text-danger">{error instanceof Error ? error.message : String(error)}</p> : null; }
export function CompensationText({ value }: { value: Compensation }) { return <>{value.kind === 'split' ? `${value.percent}% royalty split offered` : `${formatMoney(value.amount)} fixed fee`}</>; }
function Terms({ offer }: { offer: CollaborationOffer }) {
  const {data}=usePresentation();
  const deliverable=offerProductDeliverable(offer,data?.catalogs ?? (data?.catalog ? [data.catalog] : []));
  return <div className="space-y-3 text-sm"><p className="text-muted">{offer.workId ? `For: ${offer.workTitle ?? "Song unavailable"}` : "Project-wide"}</p><p className="text-accent"><CompensationText value={offer.compensation} /></p><p className="whitespace-pre-wrap break-words"><strong>Deliverable: </strong>{deliverable}</p>{offer.requirements && <p className="whitespace-pre-wrap break-words"><strong>Requirements & terms: </strong>{offer.requirements}</p>}<p className="text-muted">{offer.deadline ? `Apply by ${offer.deadline} (UTC)` : 'No application deadline'}</p></div>;
}

function nextStep(item: CollaborationDetail, owner: boolean) {
  if (item.requestPolicy === 1 && item.admission !== 'accepted') return item.admission === 'pending' ? 'Review the proposal and files here. Messages open after acceptance; requested revisions stay in this thread.' : 'This request is closed. Its proposal, files and history remain available; messages are disabled.';
  if (item.status === 'completed') return 'Work completed. Your files, agreed terms and private conversation remain available.';
  if (item.status === 'withdrawn' || item.status === 'rejected') return 'This application is closed. You can still message each other and review the submitted files.';
  if (item.status === 'discussion') return owner ? 'Discuss the brief with the artist while they prepare a proposal.' : item.currentOffer.available ? 'Ask a question or send your proposal with work files and reviewed terms.' : 'This offer is not accepting proposals. You can still discuss it with the project owner.';
  if (item.status === 'submitted') return owner ? item.currentOffer.available ? 'Review the submitted work, then accept it, request changes or decline the proposal.' : 'This offer is unavailable. You can request changes, decline or discuss the next step.' : 'Your proposal is with the project owner. You can keep discussing the work while they review it.';
  if (item.status === 'changes_requested') return owner ? 'Your feedback was sent. Wait for the artist’s revised proposal or continue the conversation.' : 'Read the requested changes in the conversation, then send a revised proposal.';
  if (item.status === 'accepted') return owner ? 'The proposal is accepted. Wait for the artist’s delivery.' : 'Your proposal is accepted. Upload your final files and send your delivery under the agreed terms.';
  return owner ? 'Review the delivery, then request changes or mark the collaboration completed.' : 'Your delivery is ready for review. The project owner can complete it or request changes.';
}

export function useProjectOffers(projectId: number) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['offers', projectId, identity(user)], queryFn: () => apiRequest<CollaborationOffer[]>(`/api/projects/${projectId}/offers`), enabled: isServerMode(), refetchInterval: 15_000, refetchOnWindowFocus: true });
}
function ProjectOfferSummary({ offer }: { offer: CollaborationOffer }) {
  const { data } = usePresentation();
  return <div className="space-y-3 text-sm"><p className="text-accent"><CompensationText value={offer.compensation}/></p><p className="whitespace-pre-wrap break-words">{offerProductDeliverable(offer,data?.catalogs ?? (data?.catalog ? [data.catalog] : []))}</p><details><summary className="min-h-11 flex items-center cursor-pointer underline text-muted">Full terms</summary><Terms offer={offer}/></details></div>;
}

export function ProjectOffers({ projectId, ownerId, compact = false, proposalPublicationId, proposalDraftId, scopeWorkId, projectLayout = false }: { projectLayout?: boolean; scopeWorkId?: number | null; projectId: number; ownerId?: number; compact?: boolean; proposalPublicationId?: number; proposalDraftId?: string }) {
  const { user } = useAuth(), client = useQueryClient(), [, navigate] = useLocation();
  const [editing, setEditing] = useState<CollaborationOffer | 'new' | null>(null), [error, setError] = useState(''), [pending, setPending] = useState(false);
  const query = useProjectOffers(projectId);
  if (!isServerMode()) return null;
  const mine = user?.artistId === ownerId;
  async function openConversation(offer: CollaborationOffer) {
    navigate(`/messages/offer/${offer.id}${proposalDraftId ? `?draft=${encodeURIComponent(proposalDraftId)}` : proposalPublicationId ? `?publication=${proposalPublicationId}` : ''}`);
  }
  const scoped = query.data?.filter(offer => scopeWorkId === undefined || (offer.workId ?? null) === scopeWorkId) ?? [];
  if (projectLayout && !mine && !query.isPending && !query.error && !scoped.length) return null;
  return <section aria-label="Collaboration offers" className="space-y-5 border-t border-border pt-6">
    <div className="flex flex-wrap justify-between gap-3">{projectLayout ? <h3 className="text-lg font-semibold">{scopeWorkId === null ? "Project opportunities" : "Opportunities"}</h3> : <div><p className="voice text-xs text-accent">COLLABORATIONS</p><h2 className="text-2xl font-bold">Make it together.</h2></div>}{mine && !compact && <button className={button} onClick={() => setEditing('new')}>Add opportunity</button>}</div>
    {!projectLayout && <p className="text-sm text-muted">Set the deliverable and terms for each opportunity.</p>}
    {mine && compact && <Link href={`/project/${projectId}`} className="underline text-sm">Manage collaboration offers</Link>}
    <ErrorMessage error={error || query.error} />{query.error && <button className={button} onClick={() => void query.refetch()}>Retry offers</button>}
    {query.isLoading && <p role="status">Loading offers…</p>}
    {editing && <OfferEditor key={editing === 'new' ? 'new' : `${editing.id}-${editing.revision}`} projectId={projectId} initialWorkId={scopeWorkId} existing={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    {!projectLayout && !query.isLoading && !query.error && !query.data?.filter(offer=>scopeWorkId===undefined||(offer.workId??null)===scopeWorkId).length && <p className="text-sm text-muted">{mine ? 'Create an offer to invite another artist into this project.' : scopeWorkId === null ? 'No project-wide offers. Explore individual songs for more opportunities.' : 'No open collaboration offers.'}</p>}
    {query.data?.filter(offer => scopeWorkId === undefined || (offer.workId??null)===scopeWorkId).map(offer => <article key={offer.id} aria-label={`${offer.need} offer`} className="min-w-0 rounded-surface border border-border bg-surface p-5 sm:p-6 space-y-4">
      <div className="flex justify-between gap-3"><h3 className="text-xl font-semibold">{offer.need}</h3><span className="text-xs text-muted">{offer.available ? 'open call' : offer.status === 'closed' ? 'closed' : 'not accepting applications'}</span></div>
      {projectLayout ? <ProjectOfferSummary offer={offer}/> : <Terms offer={offer} />}
      {mine ? !compact && <div className="flex flex-wrap gap-2"><button className={button} onClick={() => setEditing(offer)}>Edit offer</button>{offer.status === 'open' && <button className={button} disabled={pending || editing !== null} onClick={async () => { setPending(true); setError(''); try { await write(`/api/offers/${offer.id}`, 'PATCH', { revision: offer.revision, action: 'close' }); await refresh(client); } catch (error) { setError((error as Error).message); } finally { setPending(false); } }}>Close offer</button>}<Link href="/collaborations" className={button}>Review proposals</Link></div>
        : user?.role === 'artist' ? <div className="flex flex-wrap gap-2"><button className={button} disabled={pending || !offer.available} onClick={() => void openConversation(offer)}>Contact artist</button><button className={primary} disabled={pending || !offer.available} onClick={() => void openConversation(offer)}>Submit proposal</button></div>
        : user ? <p className="text-sm text-muted">An artist account is required to apply.</p> : <div className="flex gap-4 text-sm underline"><Link href="/login">Log in to collaborate</Link><Link href="/register">Create artist account</Link></div>}
    </article>)}
  </section>;
}

function OfferEditor({ projectId, existing, onClose, initialWorkId }: { initialWorkId?: number | null; projectId: number; existing?: CollaborationOffer; onClose: () => void }) {
  const client = useQueryClient();
  const [value, setValue, discard] = useWorkspaceDraft<OfferInput>(`offer-${projectId}-${existing?.id ?? `new-${initialWorkId??'general'}`}`, existing ?? { workId:initialWorkId??null, need: 'Verse', deliverable: '', requirements: '', deadline: null, status: 'open', compensation: { kind: 'split', percent: 10 } });
  const [pending, setPending] = useState(false), [error, setError] = useState('');
  const saving = useRef(false);
  const savedRevision = (value as Partial<CollaborationOffer>).revision;
  const staleEdit = !!existing && savedRevision !== undefined && savedRevision !== existing.revision;
  return <form aria-label="Offer editor" className="min-w-0 rounded-surface border border-border bg-surface p-5 sm:p-6 space-y-4" onSubmit={async event => {
    event.preventDefault(); if (saving.current || staleEdit) return; saving.current = true; setPending(true); setError('');
    try { await write(existing ? `/api/offers/${existing.id}` : `/api/projects/${projectId}/offers`, existing ? 'PATCH' : 'POST', { ...value, revision: existing?.revision }); await refresh(client); discard(); onClose(); } catch (error) { setError((error as Error).message); } finally { saving.current = false; setPending(false); }
  }}>
    <fieldset disabled={pending} className="min-w-0 space-y-4"><h3 className="text-lg font-bold">{existing ? 'Edit collaboration offer' : 'Find collaborators'}</h3>
    {staleEdit && <Panel aria-label="Updated offer"><p className="text-sm">This offer changed while your edit was saved. Compare the current terms before keeping your edits.</p><Terms offer={existing!} /><div className="flex flex-wrap gap-3"><button type="button" className={button} onClick={() => setValue({ ...value, revision: existing!.revision } as CollaborationOffer)}>Keep my edits with this version</button><button type="button" className={button} onClick={() => setValue(existing!)}>Use current offer</button></div></Panel>}
    <SongSelector projectId={projectId} value={value.workId} onChange={workId=>setValue({...value,workId,referenceMediaId:null})}/><OpportunityFields value={value} onChange={setValue} projectId={projectId} onBusy={setPending} />
    <p className="text-sm text-muted">Payments and royalty arrangements are handled between artists.</p>
    <ErrorMessage error={error} /><div className="flex flex-wrap gap-3"><button className={primary} disabled={pending || staleEdit}>{pending ? 'Saving…' : 'Save offer'}</button><button type="button" className={button} disabled={pending} onClick={onClose}>Cancel</button></div></fieldset>
  </form>;
}

function ArtistAccess({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!isServerMode()) return <p className="p-8">Collaborations are unavailable. Please try again later.</p>;
  if (!user) return <div className="p-8 space-y-4"><p>Log in as an artist to view your collaborations.</p><Link className="underline" href="/login">Log in</Link></div>;
  if (user.role !== 'artist') return <p className="p-8">Collaborations are available to artist accounts.</p>;
  return <>{children}</>;
}
export function CollaborationsPage() { return <ArtistAccess><CollaborationList /></ArtistAccess>; }
function CollaborationList() {
  const { user } = useAuth(); const [tab, setTab] = useWorkspaceDraft<'received' | 'sent'>('list-view', 'received');
  const [scroll, setScroll] = useWorkspaceDraft('list-scroll-position', { window: 0, body: 0, shell: 0 }); const restored = useRef(false);
  const query = useInfiniteQuery({ queryKey: ['collaborations', identity(user)], initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => apiRequest<{ items: Collaboration[]; nextCursor: number | null }>(`/api/collaborations${pageParam ? `?before=${pageParam}` : ''}`), getNextPageParam: page => page.nextCursor ?? undefined, refetchInterval: 10_000, refetchOnWindowFocus: true });
  useEffect(() => { if (query.data && !restored.current) { restored.current = true; requestAnimationFrame(() => { window.scrollTo(0, scroll.window); document.body.scrollTop = scroll.body; const shell = document.querySelector('.shell-page'); if (shell) shell.scrollTop = scroll.shell; }); } }, [query.data, scroll]);
  const items = query.data?.pages.flatMap(page => page.items).filter(item => tab === 'received' ? item.ownerId === user?.artistId : item.applicantId === user?.artistId) ?? [];
  return <section className="w-full max-w-5xl mx-auto px-4 py-6 sm:p-8 space-y-6"><ReturnLink href="/profile">Back to profile</ReturnLink><h1 className="text-3xl font-bold">Collaborations</h1><p className="text-muted">Your proposals, private conversations and work in progress.</p>
    <div className="flex flex-wrap gap-3" aria-label="Collaboration views"><button className={tab === 'received' ? primary : button} aria-pressed={tab === 'received'} onClick={() => setTab('received')}>Received</button><button className={tab === 'sent' ? primary : button} aria-pressed={tab === 'sent'} onClick={() => setTab('sent')}>Sent</button></div>
    <ErrorMessage error={query.error} />{query.error && <button className={button} onClick={() => void query.refetch()}>Try again</button>}
    {query.isLoading ? <p role="status">Loading collaborations…</p> : !items.length && !query.error ? <Panel><h2 className="font-semibold">{tab === 'received' ? 'No proposals received yet' : 'No proposals sent yet'}</h2><p className="text-sm text-muted">{tab === 'received' ? 'Create an offer on a project to invite another artist.' : 'Find a project with an open offer to start a conversation.'}{query.hasNextPage ? ' Load more to see earlier conversations.' : ''}</p><Link className={button} href={tab === 'received' ? '/profile' : '/explore'}>{tab === 'received' ? 'Your projects' : 'Find a project'}</Link></Panel> : items.map(item => <Link key={item.id} href={`/collaborations/${item.id}`} onClick={() => setScroll({ window: window.scrollY, body: document.body.scrollTop, shell: document.querySelector('.shell-page')?.scrollTop ?? 0 })} className="block min-w-0 rounded-surface border border-border bg-surface p-5 sm:p-6 space-y-3 transition-colors hover:border-accent/50"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold text-xl break-words min-w-0">{item.projectTitle}{item.terms.workId ? ` → ${item.terms.workTitle ?? "Song"}` : ""} · {item.terms.need}</h2><StateBadge>{statusText(item.status)}</StateBadge></div><p className="text-sm text-muted">with {tab === 'received' ? item.applicantName : item.ownerName}</p><p className="text-sm"><CompensationText value={item.terms.compensation} /></p></Link>)}
    {query.hasNextPage && <button className={button} disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>Load more</button>}
  </section>;
}

export function CollaborationPage() { const { id } = useParams<{ id: string }>(); const { user } = useAuth(); return <ArtistAccess><Workspace key={`${user?.artistId}:${id}`} /></ArtistAccess>; }
function Workspace() {
  const operation = useMessageOperation("collaboration-work");
  const { id } = useParams<{ id: string }>(), { user } = useAuth(), client = useQueryClient();
  const [error, setError] = useState(''), [pending, setPending] = useState(false);
  const [message, setMessage] = useWorkspaceDraft(`thread-${id}-message`, '');
  const [decline, setDecline] = useWorkspaceDraft(`thread-${id}-decline`, '');
  const [feedback, setFeedback] = useWorkspaceDraft(`thread-${id}-feedback`, '');
  const [, setListView] = useWorkspaceDraft<'received' | 'sent'>('list-view', 'received');
  const writing = useRef(false);
  const query = useQuery({ queryKey: ['collaboration', Number(id), identity(user)], queryFn: ({signal}) => apiRequest<CollaborationDetail>(`/api/collaborations/${id}`, {signal}), refetchInterval: 10_000, refetchOnWindowFocus: true });
  const [older, setOlder] = useState<CollaborationDetail['messages']>([]), [cursor, setCursor] = useState<number | null | undefined>(undefined);
  const [loadingOlder, setLoadingOlder] = useState(false);
  useEffect(() => { setOlder([]); setCursor(undefined); setError(''); }, [id, user?.artistId]);
  async function action(action: string, extra = {}) {
    if (!query.data || writing.current) return;
    const consequence = action === 'reject' ? 'Decline this proposal? This closes the application. Submitted files and the conversation remain available to both artists.' : action === 'withdraw' ? 'Withdraw this proposal? You will not be able to submit more work to this application. The conversation and submitted files remain available.' : null;
    if (consequence && !window.confirm(consequence)) return;
    writing.current = true; setPending(true); setError('');
    try { await operation(`/api/collaborations/${id}`, 'PATCH', { action, revision: query.data.revision, ...(action === 'accept' ? {submissionId:query.data.submissions.find(s=>s.kind==='proposal')?.id,offerRevision:query.data.currentOffer.revision}:{}), ...(action === 'reject' ? {response:decline}:{}), ...extra }); setDecline(''); setFeedback(''); await refresh(client); }
    catch (error) { setError((error as Error).message); if ((error as { status?: number }).status === 409) await query.refetch(); } finally { writing.current = false; setPending(false); }
  }
  if (query.isLoading) return <p className="p-8" role="status">Loading collaboration…</p>;
  if (!query.data || [401,403,404].includes((query.error as { status?: number } | null)?.status ?? 0)) return <div className="p-8 space-y-4"><ReturnLink contextual={false} href="/messages">All messages</ReturnLink><ErrorMessage error={query.error ?? 'Collaboration not found.'} /><button className={button} onClick={() => void query.refetch()}>Try again</button></div>;
  const item = query.data, owner = user?.artistId === item.ownerId;
  const staleProposal = item.requestPolicy === 1 && item.terms.revision !== item.currentOffer.revision;
  const messages = [...new Map([...older, ...item.messages].map(m => [m.id, m])).values()].sort((a,b) => a.id-b.id);
  return <section className="w-full max-w-6xl mx-auto px-4 py-6 sm:p-8 space-y-6"><ReturnLink contextual={false} href="/messages" onClick={() => setListView(owner ? 'received' : 'sent')}>All messages</ReturnLink>
    <header className="space-y-3"><div className="flex flex-wrap items-center gap-3"><StateBadge>{statusText(item.status)}</StateBadge><p className="voice text-xs text-muted">{owner ? 'Project owner' : 'Collaborating artist'}</p></div><h1 className="text-2xl sm:text-3xl font-semibold break-words">{item.projectTitle}{item.terms.workId ? ` → ${item.terms.workTitle ?? "Song"}` : ""} · {item.terms.need}</h1><p>with <Link className="underline" href={`/artist/${owner ? item.applicantId : item.ownerId}`}>{owner ? item.applicantName : item.ownerName}</Link></p></header>
    <Panel aria-label="Next step"><h2 className="text-sm font-semibold">Next step</h2><p className="text-sm text-muted">{nextStep(item, owner)}</p><Link className={button} href={songProjectHref(item.currentOffer.projectId,item.terms.workId)}>View project</Link></Panel>
    <ErrorMessage error={error} />
    {query.error && <Panel><ErrorMessage error={query.error} /><p className="text-sm text-muted">Showing the last loaded conversation. Your unfinished work is kept.</p><button className={button} onClick={() => void query.refetch()}>Retry collaboration</button></Panel>}
    <div className="grid xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 items-start"><div className="min-w-0 space-y-6">
      <Panel><h2 className="text-xl font-bold">{item.status === 'discussion' ? 'Offer at first contact' : 'Terms of this proposal'}</h2><Terms offer={item.terms} /><p className="text-xs text-muted">Offer version {item.terms.revision}</p></Panel>
      {owner && <Panel aria-label="Review work" className="[&>button]:mr-2"><h2 className="text-xl font-bold">Review work</h2>
        {item.status === 'submitted' && <><p className="text-sm">Proposal #{item.submissions.find(s=>s.kind==='proposal')?.id} · terms version {item.terms.revision}</p>{staleProposal && <p role="status" className="text-sm text-accent">The offer terms changed. Request a revised proposal before accepting.</p>}<p className="text-sm text-muted">Accepting selects this artist, closes the offer and declines its other pending proposals. Review the saved terms above.</p><button className={primary} disabled={pending || !item.currentOffer.available || staleProposal} onClick={() => void action('accept')}>Accept proposal</button></>}
        {['discussion','submitted','changes_requested'].includes(item.status) && <><label className="block space-y-2">Decline response (optional)<textarea className={field} value={decline} onChange={e=>setDecline(e.target.value)} maxLength={4000} disabled={pending}/></label><button className={button} disabled={pending} onClick={() => void action('reject')}>Decline proposal</button></>}
        {['submitted','delivered'].includes(item.status) && <><label className="block space-y-2">Revision feedback<textarea disabled={pending} className={field} rows={3} maxLength={4000} value={feedback} onChange={e => setFeedback(e.target.value)} /></label><button className={button} disabled={pending || !feedback.trim()} onClick={() => void action('request_changes', { feedback })}>Request changes</button></>}
        {item.status === 'delivered' && <button className={primary} disabled={pending} onClick={() => void action('complete')}>Mark completed</button>}
        {['accepted','completed','withdrawn','rejected'].includes(item.status) && <p className="text-sm text-muted">{item.status === 'accepted' ? 'Waiting for the artist’s delivery.' : `This collaboration is ${statusText(item.status)}.`}</p>}
      </Panel>}
      {!owner && ['discussion','changes_requested','accepted'].includes(item.status) && <SubmissionForm key={`${item.id}-${item.status === 'accepted' ? 'delivery' : 'proposal'}`} item={item} onDone={() => refresh(client)} />}
      {!owner && ['discussion','submitted','changes_requested'].includes(item.status) && <button className={button} disabled={pending} onClick={() => void action('withdraw')}>Withdraw proposal</button>}
      <section className="space-y-4"><h2 className="text-xl font-bold">Submitted work</h2>{!item.submissions.length && <p className="text-sm text-muted">No work submitted yet. You can discuss the brief first.</p>}{item.submissions.map(submission => <article key={submission.id} className="min-w-0 rounded-surface border border-border bg-surface p-4 space-y-3"><p className="text-accent text-sm">{submission.kind} · {new Date(submission.createdAt).toLocaleString()}</p><p className="whitespace-pre-wrap break-words text-sm">{submission.text}</p>{submission.remix && <p className="text-sm text-accent">{submission.remix.title} · Remix of {submission.remix.originalTitle} by {submission.remix.originalArtist}</p>}{submission.terms?.reference && <ReferenceComparison reference={submission.terms.reference} proposal={['audio','video'].includes(submission.media.kind)?submission.media:undefined} fragment={submission.preparation?.fragment} composition={submission.preparation?.composition ?? submission.remix?.composition} />} {submission.terms && <details><summary className="min-h-11 flex items-center text-sm underline cursor-pointer">Terms saved with this submission</summary><div className="mt-3"><Terms offer={submission.terms} /></div></details>}{(submission.files ?? [submission.media]).map(file => <WorkFile key={file.id} file={file} composition={file.id === submission.media.id ? submission.preparation?.composition ?? submission.remix?.composition : undefined} />)}</article>)}</section>
    </div>
    <Transcript messages={messages.map(m=>({...m,kind:m.kind??"message"}))} artistId={user!.artistId!}>
      {(cursor === undefined ? item.nextMessageCursor : cursor) && <button className={button} disabled={loadingOlder} onClick={async () => { setLoadingOlder(true); try { const page = await apiRequest<CollaborationDetail>(`/api/collaborations/${id}?before=${cursor ?? item.nextMessageCursor}`); setOlder(current => [...page.messages,...current]); setCursor(page.nextMessageCursor); } catch (error) { setError((error as Error).message); } finally { setLoadingOlder(false); } }}>Earlier messages</button>}
      {(item.requestPolicy !== 1 || item.admission === "accepted") ? <form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (writing.current || !message.trim()) return; writing.current = true; setPending(true); setError(''); try { await operation(`/api/collaborations/${id}/messages`, 'POST', { text: message }); setMessage(''); await refresh(client); } catch (error) { setError((error as Error).message); } finally { writing.current = false; setPending(false); } }}><label className="block space-y-2">Message<textarea disabled={pending} className={field} rows={3} maxLength={4000} value={message} onChange={e => setMessage(e.target.value)} /></label><button className={primary} disabled={pending || !message.trim()}>Send message</button></form>
      : <p role="status" className="text-sm text-muted">{item.admission === "pending" ? "Waiting for acceptance. Messages are not enabled." : "This request is closed. Messages are disabled."}</p>}
      <ViewedActivity kind="collaboration" id={item.id} throughId={item.lastActivityId} unread={item.unreadCount}/>
    </Transcript></div>
  </section>;
}

type SubmissionContext = Pick<CollaborationDetail,'id'|'currentOffer'|'status'|'revision'>;
function SubmissionForm({ item, onDone, compose = false, savedDraft }: { item: SubmissionContext; onDone: (result?: Collaboration) => Promise<void>; compose?: boolean; savedDraft?:ProposalDraft|null }) {
  const operation = useMessageOperation(`proposal-${compose ? 'offer' : 'thread'}-${item.id}`);
  const [introduction,setIntroduction] = useWorkspaceDraft(`offer-${item.id}-intro`, savedDraft?.introduction??'');
  const { user } = useAuth();
  const [,navigate]=useLocation();
  const projectContext=useGetProject(item.currentOffer.projectId,{query:{enabled:compose}});
  const [journey,setJourney]=useJourney(`collaboration:${user?.artistId}:${item.id}`,{step:0,method:'musical'});
  const search = useSearch();
  const selectedId = Number(new URLSearchParams(search).get('publication')??savedDraft?.publicationId);
  const savedRemix = usePublication(Number.isSafeInteger(selectedId) && selectedId > 0 ? selectedId : undefined);
  const privateRemix = useRemixDraft(new URLSearchParams(search).get('draft')??savedDraft?.remixDraftId??null);
  const privateValue = privateRemix.data && privateRemix.data.ownerId === user?.artistId && privateRemix.data.attribution.projectId === item.currentOffer.projectId && privateRemix.data.render ? { id: privateRemix.data.id, title: privateRemix.data.title, remix: {...privateRemix.data.attribution, composition:privateRemix.data.settings.composition}, media: privateRemix.data.render } : null;
  const usableRemix = privateValue ?? (savedRemix.data?.artistId === user?.artistId && savedRemix.data?.remix?.projectId === item.currentOffer.projectId ? savedRemix.data : null);
  const delivery = item.status === 'accepted';
  const draftKey = `${compose ? 'offer' : 'thread'}-${item.id}-${delivery ? 'delivery' : 'proposal'}`;
  const [publicationId, setPublicationId] = useWorkspaceDraft<number | null>(`${draftKey}-publication`, savedDraft?.publicationId??null), [remixDraftId, setRemixDraftId] = useWorkspaceDraft<string | null>(`${draftKey}-remix`, savedDraft?.remixDraftId??null);
  const [files, setFiles] = useWorkspaceDraft<UploadedMedia[]>(`${draftKey}-files`, savedDraft?.files??[]), [description, setDescription] = useWorkspaceDraft(`${draftKey}-text`, savedDraft?.description??''), [ack, setAck] = useState(false);
  const [interrupted, setInterrupted] = useWorkspaceDraft(`${draftKey}-interrupted`, false);
  const [preparation,setPreparation]=useState<Preparation>(savedDraft?.preparation??{contribution:null,baseGain:.76,voiceGain:.42,referenceId:item.currentOffer.referenceMediaId});
  const [preparing,setPreparing]=useState(false),[saveNotice,setSaveNotice]=useState('');
  const preparedResultId=useRef<string|null>(savedDraft?.preparation?.contribution?(savedDraft.preparation.resultId===undefined?savedDraft.files[0]?.id??null:savedDraft.preparation.resultId):null);
  const submitting = useRef(false), sent = useRef(false), mounted = useRef(true);
  const [error, setError] = useState(''), [pending, setPending] = useState(false), [uploading, setUploading] = useState(false), [progress, setProgress] = useState(0), [ready, setReady] = useState<Record<string, boolean>>({});
  const fingerprint=JSON.stringify({introduction,description,files,preparation});
  const savedFingerprint=useRef(fingerprint);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};}, []);
  const allowRedirect = useLeaveGuard(sent.current ? null : uploading || pending || preparing ? 'Work is still being sent. Stay to finish, or leave and check its status before trying again. Completed uploads and your text are kept in this tab.' : compose && fingerprint!==savedFingerprint.current ? 'Save your private draft before leaving, or discard these unsaved changes?' : null);
  useEffect(() => { setAck(false); }, [item.currentOffer.revision]);
  const locked=pending||uploading||preparing;
  const hasInput=!!preparation.contribution||files.length>0||!!usableRemix;
  const needsRender=journey.method!=='file'&&!!preparation.contribution&&!!item.currentOffer.reference&&!['Mix','Master'].includes(item.currentOffer.need);
  const reviewReady=files.length>0&&(!needsRender||files.some(file=>file.id===preparedResultId.current&&['audio','video'].includes(file.kind)))&&files.every(file=>!['audio','video'].includes(file.kind)||ready[file.id]);
  const maxStep=!hasInput?1:reviewReady?3:2;
  const step=Math.min(journey.step,maxStep);
  function go(next:number){if(locked)return;pauseJourneyMedia();setJourney({step:Math.min(next,maxStep)});}
  async function persistDraft(exit=false){
    if(submitting.current||locked)return;submitting.current=true;setPending(true);setError('');
    try{await write(`/api/offers/${item.id}/conversations`,'PATCH',{introduction,description,files,publicationId,remixDraftId,preparation:usableRemix?null:{...preparation,resultId:preparedResultId.current}});if(!mounted.current)return;savedFingerprint.current=fingerprint;setSaveNotice('Private draft saved. No request has been sent.');if(exit){allowRedirect();navigate('/messages');}}
    catch(e){if(mounted.current)setError((e as Error).message);}finally{submitting.current=false;if(mounted.current)setPending(false);}
  }
  const submitButton=<button type="submit" className={primary} disabled={locked || !files.length || files.some(file => ['audio','video'].includes(file.kind) && !ready[file.id]) || !description.trim() || (compose && !introduction.trim()) || (!delivery && (!ack || !item.currentOffer.available))}>{pending ? 'Submitting…' : delivery ? 'Send delivery' : compose ? 'Send request' : 'Send proposal'}</button>;
  const footer=<>{step>0&&<JourneyBack disabled={locked} onClick={()=>go(step-1)}/>}<button type="button" className={button} disabled={locked} onClick={()=>void persistDraft(true)}>Save &amp; exit</button>{step<3?<JourneyNext disabled={locked||step===1&&!hasInput||step===2&&!reviewReady} onClick={()=>go(step+1)}/>:submitButton}</>;
  const Wrapper=compose?Journey:PlainSubmission;
  return <form aria-label={delivery ? 'Delivery form' : 'Proposal form'} className={compose?"min-w-0":"min-w-0 rounded-surface border border-border bg-surface p-5 sm:p-6 space-y-4"} onSubmit={async e => { e.preventDefault(); if ((compose&&step!==3)||!files.length || submitting.current || uploading || preparing) return; submitting.current = true; setPending(true); setError(''); try { const result = await operation<Collaboration>(compose ? `/api/offers/${item.id}/conversations` : `/api/collaborations/${item.id}`, compose ? 'POST' : 'PATCH', { ...(compose ? {introduction} : {}), action: delivery ? 'deliver' : 'submit', revision: item.revision, offerRevision: item.currentOffer.revision, acceptTerms: ack, text: description, mediaId: files[0].id, mediaIds: files.map(file => file.id), publicationId, remixDraftId, ...(compose&&!usableRemix&&preparation.contribution?{preparation}: {}) }); sent.current=true; setFiles([]); setDescription(''); setPublicationId(null); setRemixDraftId(null); setInterrupted(false); setIntroduction(''); setPending(false); allowRedirect(); await onDone(result); } catch (error) { setError((error as Error).message); if ((error as { status?: number }).status === 409) { setAck(false); await onDone(); } } finally { submitting.current = false; setPending(false); } }}>
    <Wrapper label="Collaboration" steps={[
      {title:'The opportunity',description:''},
      {title:'Your contribution',description:''},
      {title:'Preview your work',description:''},
      {title:'Review & send',description:''},
    ]} step={step} maxStep={maxStep} locked={locked} onStep={go} context={<JourneyContext cover={projectContext.data?.project.coverUrl} title={item.currentOffer.workTitle??item.currentOffer.projectTitle} artist={item.currentOffer.ownerName??'Project artist'}><p>{item.currentOffer.need} · <CompensationText value={item.currentOffer.compensation}/></p><Link href={songProjectHref(item.currentOffer.projectId,item.currentOffer.workId)}>View project</Link></JourneyContext>} footer={footer}>
    <h2 hidden={compose} className="text-xl font-semibold">{delivery ? 'Deliver your work' : 'Submit your proposal'}</h2><p hidden={compose} className="text-xs text-muted">Save a private draft to continue later. Only sending shares your work with the artist.</p>{interrupted && !uploading && <p role="status" className="text-sm text-muted">The last upload did not finish. Completed files are kept below; select any missing files again.</p>}
    {!delivery && <div hidden={compose&&step!==0&&step!==3}>{compose&&step===3?<details className="rounded-xl border border-border p-4"><summary className="min-h-11 cursor-pointer flex items-center gap-3 text-sm">Review terms · <CompensationText value={item.currentOffer.compensation}/></summary><Terms offer={item.currentOffer}/></details>:<Terms offer={item.currentOffer} />}{!item.currentOffer.available && <p role="status">This offer is no longer accepting proposals.</p>}</div>}
    {compose && !usableRemix && <ProposalPreparation stage={step} method={journey.method==='file'?'file':'musical'} onMethod={method=>{pauseJourneyMedia();setJourney({method});}} offer={item.currentOffer} value={preparation} onChange={value=>{setPreparation(value);setSaveNotice('');}} result={files.find(file=>file.id===preparedResultId.current)} onBusy={setPreparing} onResult={file=>{const previous=preparedResultId.current;preparedResultId.current=file?.id??null;setFiles(current=>{const kept=current.filter(item=>item.id!==previous&&item.id!==file?.id);return file?[file,...kept]:kept;});setSaveNotice('');setAck(false);}}/>}
    <div hidden={compose&&step!==3} className="guided-stage">
    {compose && <label className="block space-y-2">Introduction<textarea aria-label="Introduction" className={field} required maxLength={4000} rows={3} value={introduction} disabled={pending} onChange={e=>setIntroduction(e.target.value)}/></label>}
    <label className="block space-y-2">{delivery ? 'Delivery notes' : 'Your proposal'}<textarea aria-label={delivery ? 'Delivery notes' : 'Your proposal'} disabled={pending} className={field} rows={4} required maxLength={4000} value={description} onChange={e => setDescription(e.target.value)} /></label>
    </div>
    <div hidden={compose&&!(step===1&&(journey.method==='file'||!!usableRemix)||step===3)} className="guided-stage">
    {usableRemix && <div className="min-w-0 rounded-surface border border-border bg-surface p-4 space-y-3"><p>Saved remix: {usableRemix.title}</p><p className="text-sm text-muted">Remix of {usableRemix.remix!.title} · {usableRemix.remix!.artistName}</p><button type="button" className={button} disabled={pending || uploading || (publicationId ?? remixDraftId) === usableRemix.id} onClick={() => { const attached = [usableRemix.media, ...files.filter(file => file.id !== usableRemix.media.id)]; if (attached.length > 10 || attached.reduce((sum, file) => sum + file.size, 0) > 250 * 1024 * 1024) { setError('Remove a file before adding the remix: up to 10 files / 250 MB.'); return; } setFiles(attached); setPublicationId(typeof usableRemix.id === 'number' ? usableRemix.id : null); setRemixDraftId(typeof usableRemix.id === 'string' ? usableRemix.id : null); setError(''); }}>Use saved remix</button>{(publicationId || remixDraftId) && <p className="text-sm text-accent">Remix selected. Review the terms and send your proposal.</p>}</div>}
    {(savedRemix.error || privateRemix.error) && <ErrorMessage error={savedRemix.error || privateRemix.error} />}
    <label className="block space-y-2">Work files (audio, video, PDF or ZIP)<input className={`${field} min-w-0`} type="file" multiple accept="audio/*,video/*,.pdf,.zip" disabled={pending || uploading || preparing} onChange={async e => {
      const selected = Array.from(e.target.files ?? []); e.target.value = ''; if (!selected.length) return; setError('');
      if (files.length + selected.length > 10) { setError('Attach up to 10 files. Remove a file before adding more.'); return; }
      if (selected.some(file => file.size > (/\.pdf$/i.test(file.name) ? 20 : 100) * 1024 * 1024)) { setError('Each file can be up to 100 MB; PDFs up to 20 MB.'); return; }
      if ([...files, ...selected].reduce((sum, file) => sum + file.size, 0) > 250 * 1024 * 1024) { setError('A submission can contain up to 250 MB.'); return; }
      setUploading(true); setInterrupted(true); setProgress(0); const abort = new AbortController(); controller.current = abort;
      try {
        for (let index = 0; index < selected.length; index++) {
          const file = selected[index], kind = /\.pdf$/i.test(file.name) ? 'document' : /\.zip$/i.test(file.name) ? 'archive' : file.type.startsWith('video/') ? 'video' : 'audio';
          const uploaded = await uploadMedia(file, kind, value => setProgress(Math.round((index * 100 + value) / selected.length)), abort.signal);
          if (abort.signal.aborted) break;
          setFiles(current => [...current, uploaded]);
        }
        if (!abort.signal.aborted) setInterrupted(false);
      } catch (error) { setError((error as Error).message); } finally { setUploading(false); }
    }} /></label>
    <p className="text-xs text-muted">Up to 10 files / 250 MB per submission. Audio, video and ZIP: 100 MB each. PDF: 20 MB. ZIP archives are downloaded without extraction.</p>
    {uploading && <div><p role="status">Uploading {progress}%</p><button type="button" className={button} onClick={() => controller.current?.abort()}>Cancel upload</button></div>}
    </div>
    <div hidden={compose&&step<2} className="guided-stage">
    {files.map((file, index) => <div key={file.id} className="border border-border p-3 space-y-2"><details open={!compose||step===2} className="min-w-0"><summary hidden={!compose||step===2} className="min-h-11 flex items-center cursor-pointer text-sm break-words">Review attachment · {file.name??file.kind}</summary><WorkFile file={file} composition={file.id === usableRemix?.media.id ? usableRemix.remix?.composition : file.id === preparedResultId.current ? preparation.composition : undefined} onReady={value => setReady(current => current[file.id] === value ? current : { ...current, [file.id]: value })} /></details><button type="button" className="inline-flex min-h-11 items-center text-sm underline" disabled={pending || uploading || preparing} aria-label={`Remove ${file.name ?? file.kind}`} onClick={() => { setFiles(current => current.filter(item => item.id !== file.id)); if(preparedResultId.current===file.id)preparedResultId.current=null; if (index === 0) { setPublicationId(null); setRemixDraftId(null); } }}>Remove file</button></div>)}
    </div>
    <div hidden={compose&&step!==3} className="guided-stage">
    {!delivery && <label className="flex min-h-11 gap-3 items-start py-2 text-sm"><input className="mt-1 h-5 w-5 shrink-0 accent-accent" disabled={pending || uploading || preparing} type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />I reviewed the current deliverable, compensation and terms.</label>}
    <p className="text-xs text-muted">Only submitted work is shared with the artist.</p>
    </div>
    <ErrorMessage error={error}/>
    {compose&&<><p role="status" className="text-sm text-accent">{saveNotice}</p>{step===3&&<button type="button" className={button} disabled={locked} onClick={()=>void persistDraft()}>Save private draft</button>}</>}
    {!compose&&submitButton}
    </Wrapper>
  </form>;
}

function PlainSubmission({children}:{children:ReactNode;[key:string]:unknown}) {return <>{children}</>;}

function WorkFile({ file, onReady, composition }: { file: UploadedMedia; composition?:VideoComposition; onReady?: (ready: boolean) => void }) {
  const [failed, setFailed] = useState(false);
  const events = { onLoadedData: () => { setFailed(false); onReady?.(true); }, onError: () => { setFailed(true); onReady?.(false); } };
  return <div className="space-y-2 min-w-0"><p className="text-sm break-words">{file.name ?? `${file.kind} file`} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>
    {file.kind === 'video' ? <AdaptiveVideo composition={composition} aria-label={file.name ?? "Submitted video"} src={file.url} controls playsInline preload={onReady ? 'auto' : 'metadata'} className="max-h-80 w-full" {...events} /> : file.kind === 'audio' ? <audio src={file.url} controls preload={onReady ? 'auto' : 'metadata'} className="w-full" {...events} /> : null}
    {failed && <p role="alert" className="text-danger text-sm">This file cannot be played. Use MP3/WAV or MP4/WebM, or attach unsupported stems in a ZIP.</p>}
    <a className="inline-flex min-h-11 items-center underline text-sm break-words" href={`${file.url}?download=1`} download={file.name}>Download {file.name ?? 'file'}</a>
  </div>;
}

export function CollaborationRequestPage() {
 const {user}=useAuth(),{id}=useParams<{id:string}>();
 return <ArtistMessagesAccess><RequestComposer key={`${user?.artistId}:${id}`} id={id}/></ArtistMessagesAccess>;
}
function RequestComposer({id}:{id:string}) {
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const {user}=useAuth(),client=useQueryClient(),[,navigate]=useLocation(),search=useSearch();
 const query=useQuery({queryKey:['offer-composition',user?.artistId,id],queryFn:({signal})=>apiRequest<{offer:CollaborationOffer;existing:Collaboration|null;draft:ProposalDraft|null}>(`/api/offers/${id}/conversations`,{signal}),refetchOnWindowFocus:true});
 useEffect(()=>{if(query.data?.existing)navigate(`/messages/collaboration/${query.data.existing.id}${search?`?${search}`:''}`,{replace:true});},[query.data?.existing?.id,navigate,search]);
 return <section className="mx-auto w-full max-w-6xl p-4 sm:p-8 space-y-6"><ReturnLink contextual={false} href="/messages">All messages</ReturnLink><h1 className="text-3xl font-bold">Collaboration request</h1><ErrorMessage error={query.error}/>{query.error&&<button className={button} onClick={()=>void query.refetch()}>Retry offer</button>}{query.isLoading&&<p role="status">Loading opportunity…</p>}{query.data&&!query.data.existing&&<><SubmissionForm compose savedDraft={query.data.draft} item={{id:Number(id),currentOffer:query.data.offer,status:'discussion',revision:1}} onDone={async result=>{await refreshMessages(client);if(!alive.current)return;if(result)navigate(`/messages/collaboration/${result.id}`);else await query.refetch();}}/></>}</section>;
}
