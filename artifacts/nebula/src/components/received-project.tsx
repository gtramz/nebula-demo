import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight, ChevronDown, Music2 } from 'lucide-react';
import { sumMoney, useGetProject, type ReceivedInvestment } from '@nebula/local';
import { formatMoney } from '@/lib/utils';

/** Artwork enriches the private ledger; historical entries never depend on it. */
export function ReceivedProject({ movements, filtered }: { movements: ReceivedInvestment[]; filtered: boolean }) {
  const first = movements[0];
  const { data, isLoading, error, refetch } = useGetProject(first.projectId!, { query: { enabled: !!first.projectId && !first.projectArchived } });
  const project = data?.project;
  const [failedCover, setFailedCover] = useState<string>();
  const [limit, setLimit] = useState(10);
  const total = sumMoney(movements.map(entry => entry.amount));
  const percent = project && project.goalAmount > 0 ? Math.min(100, Math.round(project.raisedAmount / project.goalAmount * 100)) : 0;
  return <article aria-label={`${first.projectTitle} history`} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface">
    <div className="relative h-48 sm:h-56 overflow-hidden bg-surfaceAlt">
      {project?.coverUrl && failedCover !== project.coverUrl
        ? <img src={project.coverUrl} alt={`${first.projectTitle} cover`} loading="lazy" onError={() => setFailedCover(project.coverUrl!)} className="h-full w-full object-cover" />
        : <div className="h-full grid place-items-center bg-gradient-to-br from-accent/10 to-transparent"><Music2 size={44} className="text-muted" aria-hidden="true" /></div>}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
      <span className="absolute top-4 left-4 rounded-full border border-white/20 bg-black/70 px-3 py-1 text-xs text-white capitalize">{first.projectArchived ? 'Removed project' : project?.status === 'funding' ? 'Funding open' : project?.status ?? 'Current project'}</span>
      {!first.projectArchived && <Link href={`/project/${first.projectId}`} aria-label={`View project: ${first.projectTitle}`} className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-cream text-bg min-h-11 px-4 text-xs font-semibold focus-visible:outline focus-visible:outline-accent">View project<ArrowUpRight size={16} aria-hidden="true"/></Link>}
      {project && <p className="absolute bottom-5 left-5 text-white text-xs uppercase tracking-widest">{project.category}</p>}
    </div>
    <div className="p-5 sm:p-6 space-y-5">
      <div><h3 className="text-2xl font-semibold break-words">{first.projectTitle}</h3><p className="text-xs text-muted mt-2">{movements.length} contribution{movements.length === 1 ? '' : 's'}{filtered ? ' in this selection' : ''}</p></div>
      <div><p className="text-xs text-muted">{filtered ? 'Received in this selection' : 'Total received'}</p><p className="text-3xl font-semibold text-accent mt-1 break-words">{formatMoney(total)}</p></div>
      {project && project.goalAmount > 0 && <div className="space-y-2">
        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted"><span>{filtered ? `${formatMoney(project.raisedAmount)} total · ` : ''}Goal {formatMoney(project.goalAmount)}</span><span>{percent}% funded</span></div>
        <div role="progressbar" aria-label={`${first.projectTitle} funding`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 rounded-full overflow-hidden bg-white/10"><div className="h-full bg-accent rounded-full" style={{ width: `${percent}%` }} /></div>
      </div>}
      {isLoading && <p className="text-xs text-muted" role="status">Loading project…</p>}
      {error && <div className="text-xs text-muted">Project details unavailable. <button className="underline min-h-11" onClick={() => void refetch()}>Retry</button></div>}
      <details className="group border-t border-border">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 pt-3 text-sm font-medium [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-accent">View {movements.length} contribution{movements.length === 1 ? '' : 's'}<ChevronDown size={18} className="transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
        <div className="divide-y divide-border">{movements.slice(0, limit).map(entry => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
          <div className="min-w-0"><p className="font-medium break-words">{entry.investorName}</p><p className="text-xs text-muted mt-1"><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time></p><p className="text-xs text-muted mt-1">#{entry.id} · Recorded</p></div>
          <span className="font-semibold">{formatMoney(entry.amount)}</span>
        </div>)}</div>
        {movements.length > limit && <button className="min-h-11 text-sm underline" onClick={() => setLimit(limit + 10)}>Show more contributions</button>}
      </details>
    </div>
  </article>;
}
