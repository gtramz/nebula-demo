import { SectionSkeleton } from '@/components/loading-states';
import { useState } from 'react';
import { Link } from 'wouter';
import { ChevronDown, Music2 } from 'lucide-react';
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
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-surfaceAlt">{project?.coverUrl && failedCover !== project.coverUrl ? <img src={project.coverUrl} alt={`${first.projectTitle} cover`} loading="lazy" onError={() => setFailedCover(project.coverUrl!)} className="h-full w-full object-cover"/> : <Music2 className="m-5 text-muted" size={24} aria-hidden/>}</div>
        <div className="min-w-0 flex-1"><h3 className="text-base font-semibold break-words">{!first.projectArchived ? <Link href={`/project/${first.projectId}`} aria-label={`View project: ${first.projectTitle}`} className="hover:underline">{first.projectTitle}</Link> : first.projectTitle}</h3><p className="text-xs text-muted mt-1">{movements.length} contribution{movements.length === 1 ? '' : 's'}{filtered ? ' in this selection' : ''} · {first.projectArchived ? 'Removed project' : project?.category ?? 'Project'}</p></div>
        <div className="text-right"><p className="text-xs text-muted">{filtered ? 'In selection' : 'Received'}</p><p className="text-lg font-semibold text-accent tabular-nums">{formatMoney(total)}</p></div>
      </div>
      {project && project.goalAmount > 0 && <div className="space-y-2">
        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted"><span>{filtered ? `${formatMoney(project.raisedAmount)} total · ` : ''}Goal {formatMoney(project.goalAmount)}</span><span>{percent}% funded</span></div>
        <div role="progressbar" aria-label={`${first.projectTitle} funding`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 rounded-full overflow-hidden bg-white/10"><div className="h-full bg-accent rounded-full" style={{ width: `${percent}%` }} /></div>
      </div>}
      {isLoading && <SectionSkeleton variant="tabs" label="Loading project details"/>}
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
