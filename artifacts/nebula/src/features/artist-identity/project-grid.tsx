import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight, Disc3 } from 'lucide-react';
import type { Project } from '@nebula/local';
import { formatMoney } from '@/lib/utils';
import { usePresentationCatalog } from '@/features/presentation/catalog';

/** Public-profile presentation only; Home and Investor cards keep their existing layout. */
export function ArtistProjectGrid({ projects, opportunityIds = [] }: { projects: Project[]; opportunityIds?: number[] }) {
  return <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7 sm:gap-x-6">{projects.map(project => <ArtistProjectCard key={project.id} project={project} opportunity={opportunityIds.includes(project.id)} />)}</div>;
}
function ArtistProjectCard({ project, opportunity }: { project: Project; opportunity: boolean }) {
  const catalog = usePresentationCatalog(project.artistId);
  const release = catalog?.releases.find(item => item.projectId === project.id);
  const [failed, setFailed] = useState(false);
  return <Link href={`/project/${project.id}`} className="group block min-w-0 space-y-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
    <div className="aspect-square rounded-xl overflow-hidden bg-surfaceAlt relative">
      {project.coverUrl && !failed ? <img src={project.coverUrl} alt={`${project.title} artwork`} onError={() => setFailed(true)} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" /> : <Disc3 className="absolute inset-0 m-auto h-12 w-12 text-muted" aria-hidden />}
      <span className="absolute bottom-3 right-3 rounded-full w-11 h-11 bg-bg/80 grid place-items-center"><ArrowUpRight size={20} aria-hidden /></span>
    </div>
    <div className="space-y-2"><h3 className="font-semibold leading-snug break-words">{project.title}</h3>
      <p className="text-sm text-muted capitalize">{release ? `${release.dateKind === 'upload' ? 'YouTube · ' : ''}${release.year} · ${release.type}` : `${project.category} · ${project.status}`}</p>
      {opportunity && <span className="inline-block text-xs text-accent">Open opportunities</span>}
      {project.goalAmount > 0 && <p className="text-xs text-muted">{formatMoney(project.raisedAmount)} of {formatMoney(project.goalAmount)} · {project.backersCount} supporters</p>}
    </div>
  </Link>;
}
