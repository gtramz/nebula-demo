import { Skeleton } from '@/components/ui/skeleton';
import './loading-states.css';

export function RefreshNotice({ error, retry }: { error: unknown; retry: () => unknown }) {
  if (!error) return null;
  return <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-muted"><span>Could not refresh. Showing the last available content.</span><button type="button" className="min-h-11 underline" onClick={() => void retry()}>Retry update</button></div>;
}

type SectionVariant = 'saved' | 'received' | 'list' | 'cards' | 'player' | 'profile' | 'form' | 'comments' | 'conversation' | 'tabs' | 'waveform' | 'media';
type PageVariant = 'feed' | 'cards' | 'profile' | 'account' | 'project' | 'list' | 'form' | 'receipt' | 'landing';
type LoadingProps<T> = { variant?: T; label?: string; rows?: number; className?: string };
const waveHeights = [20,36,58,42,72,50,90,64,40,76,100,66,38,82,54,30,62,44,24,48,70,36,56,22];
const repeat = (count: number) => Array.from({ length: Math.max(1, Math.min(count, 8)) }, (_, index) => index);

function Lines() { return <div className="loading-lines"><Skeleton className="loading-line loading-line-wide"/><Skeleton className="loading-line"/><Skeleton className="loading-line loading-line-short"/></div>; }
function ListRows({ rows, comments = false }: { rows: number; comments?: boolean }) {
  return <div className="loading-list">{repeat(rows).map(index => <div className={`loading-list-row${comments ? ' loading-comment-row' : ''}`} key={index}><Skeleton className="loading-avatar"/><Lines/>{!comments && <Skeleton className="loading-row-end"/>}</div>)}</div>;
}
function Cards({ rows }: { rows: number }) {
  return <div className="loading-cards">{repeat(rows).map(index => <div className="loading-card" key={index}><Skeleton className="loading-card-cover"/><div className="loading-card-body"><Lines/><div className="loading-card-footer"><Skeleton className="loading-avatar"/><Skeleton className="loading-line loading-line-short"/></div></div></div>)}</div>;
}
function ProfileHeader({ account = false }: { account?: boolean }) {
  return <div className={`loading-profile-header${account ? ' loading-account-header' : ''}`}><Skeleton className="loading-profile-avatar"/><div className="loading-profile-copy"><Skeleton className="loading-heading"/><Skeleton className="loading-line loading-line-short"/><Lines/><div className="loading-inline"><Skeleton className="loading-count"/><Skeleton className="loading-count"/></div><div className="loading-inline"><Skeleton className="loading-action"/><Skeleton className="loading-action"/></div></div></div>;
}
function Player() {
  return <div className="loading-player"><div className="loading-player-heading"><Skeleton className="loading-player-cover"/><Lines/></div><div className="loading-wave">{waveHeights.map((height, index) => <Skeleton key={index} style={{ height: `${height}%` }}/>)}</div><div className="loading-player-controls"><Skeleton className="loading-play"/><Skeleton className="loading-line loading-line-short"/><Skeleton className="loading-player-time"/></div></div>;
}
function Form({ rows }: { rows: number }) {
  return <div className="loading-form">{repeat(rows).map(index => <div className="loading-field" key={index}><Skeleton className="loading-field-label"/><Skeleton className="loading-field-input"/></div>)}<Skeleton className="loading-form-story"/><Skeleton className="loading-action"/></div>;
}
function Tabs() { return <div className="loading-tabs">{repeat(5).map(index => <Skeleton className="loading-tab" key={index}/>)}</div>; }
function SectionContent({ variant, rows }: { variant: SectionVariant; rows: number }) {
  if (variant === 'saved') return <div className="space-y-4">{repeat(rows).map(index => <div key={index} className="rounded-xl border border-border p-4 space-y-4"><ListRows rows={1}/><Skeleton className="h-14 w-full"/><Skeleton className="h-11 w-full"/></div>)}</div>;
  if (variant === 'received') return <div className="space-y-4"><Skeleton className="h-24 w-full"/><ListRows rows={rows}/></div>;
  if (variant === 'cards') return <Cards rows={rows}/>;
  if (variant === 'player') return <Player/>;
  if (variant === 'waveform') return <div className="loading-wave loading-wave-compact">{waveHeights.map((height, index) => <Skeleton key={index} style={{ height: `${height}%` }}/>)}</div>;
  if (variant === 'media') return <Skeleton className="loading-media"/>;
  if (variant === 'profile') return <ProfileHeader/>;
  if (variant === 'form') return <Form rows={rows}/>;
  if (variant === 'tabs') return <Tabs/>;
  if (variant === 'conversation') return <div className="loading-conversation"><ListRows rows={1}/>{repeat(rows).map(index => <Skeleton className="loading-message" key={index}/>)}</div>;
  return <ListRows rows={rows} comments={variant === 'comments'}/>;
}

/** Keeps the surrounding heading/actions in place while only their data loads. */
export function SectionSkeleton({ variant = 'list', label = 'Loading content', rows = 3, className = '' }: LoadingProps<SectionVariant>) {
  return <div className={`nebula-loading loading-section ${className}`} aria-busy="true" data-loading-variant={variant}>{label && <span className="sr-only" role="status">{label}</span>}<div aria-hidden="true"><SectionContent variant={variant} rows={rows}/></div></div>;
}

/** Route-sized placeholders mirror the destination rather than showing a spinner. */
export function PageSkeleton({ variant = 'cards', label = 'Loading page', rows = 3, className = '' }: LoadingProps<PageVariant>) {
  let content;
  if (variant === 'feed') content = <div className="loading-feed"><div className="loading-feed-stage"><Skeleton className="loading-feed-art"/><div className="loading-feed-caption"><Skeleton className="loading-heading"/><Lines/><Skeleton className="loading-feed-timeline"/></div></div><div className="loading-feed-rail">{repeat(6).map(index => <Skeleton className="loading-feed-action" key={index}/>)}</div></div>;
  else if (variant === 'profile') content = <><ProfileHeader/><Tabs/><Player/><Cards rows={rows}/></>;
  else if (variant === 'account') content = <><Skeleton className="loading-heading"/><ProfileHeader account/><Skeleton className="loading-heading"/><Cards rows={2}/></>;
  else if (variant === 'landing') content = <div className="loading-landing"><Skeleton className="loading-landing-logo"/><Skeleton className="loading-heading"/><Lines/><Skeleton className="loading-action"/><Skeleton className="loading-action"/></div>;
  else if (variant === 'project') content = <><div className="loading-project-header"><Skeleton className="loading-project-cover"/><div className="loading-project-copy"><Skeleton className="loading-field-label"/><Skeleton className="loading-heading"/><ListRows rows={1}/><Lines/></div></div><Player/><ListRows rows={rows}/></>;
  else if (variant === 'receipt') content = <div className="loading-receipt"><Skeleton className="loading-receipt-mark"/><Skeleton className="loading-heading"/><Lines/><ListRows rows={3}/></div>;
  else content = <><div className="loading-page-heading"><Skeleton className="loading-heading"/><Skeleton className="loading-line loading-line-short"/></div>{variant === 'form' ? <Form rows={Math.max(rows, 4)}/> : variant === 'list' ? <ListRows rows={rows}/> : <><Skeleton className="loading-toolbar"/><Cards rows={rows}/></>}</>;
  return <div className={`nebula-loading loading-page loading-page-${variant} ${className}`} aria-busy="true" data-loading-variant={variant}>{label && <span className="sr-only" role="status">{label}</span>}<div className="loading-page-content" aria-hidden="true">{content}</div></div>;
}
