import { ReleaseCard, RecordingCard, usePresentationRemixExample, usePresentationCatalog } from '@/features/presentation/catalog';
import {Link} from 'wouter';
import {type Project} from '@nebula/local';
import {ArrowUpRight,Music2} from 'lucide-react';
import {formatMoney} from '@/lib/utils';
export function ProjectCard({project}:{project:Project}){
 const catalog=usePresentationCatalog(project.artistId),example=usePresentationRemixExample();
 const recording=example&&[example.original,example.remix].find(item=>item.projectId===project.id);
 if(recording)return <RecordingCard recording={recording} title={project.title} coverUrl={project.coverUrl}/>;
 const release=catalog?.releases.find(r=>r.projectId===project.id);
 if(release)return <ReleaseCard release={release} title={project.title} coverUrl={project.coverUrl}/>;
 const percent=project.goalAmount>0?Math.min(100,Math.round(project.raisedAmount/project.goalAmount*100)):0;
 return <Link href={`/project/${project.id}`} className="group block h-full rounded-2xl border border-border bg-surface p-5 hover:border-white/30 transition-colors">
  <div className="flex gap-4 items-center pr-8"><div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-surfaceAlt grid place-items-center">{project.coverUrl?<img src={project.coverUrl} alt="" className="w-full h-full object-cover"/>:<Music2 className="text-muted"/>}</div><div className="min-w-0"><p className="text-xs text-muted capitalize mb-1">{project.category} · {project.status}</p><h3 className="text-xl font-semibold line-clamp-2">{project.title}</h3><p className="text-sm text-muted mt-1">{project.artistName}</p></div></div>
  {project.pitch&&<p className="text-sm text-muted line-clamp-2 mt-4">{project.pitch}</p>}
  <div className="border-t border-border mt-5 pt-4 space-y-3">{project.goalAmount > 0 && <><div className="flex justify-between gap-3 text-xs text-muted"><span>{formatMoney(project.raisedAmount)} of {formatMoney(project.goalAmount)}</span><span>{percent}%</span></div><div className="h-px bg-white/15"><div className="h-full bg-accent/60" style={{width:`${percent}%`}}/></div></>}<div className="flex items-center justify-between gap-3 text-xs">{project.goalAmount > 0 && <span className="text-muted">{project.backersCount} supporters</span>}<span className="inline-flex items-center gap-2 min-h-8">View project<ArrowUpRight size={14}/></span></div></div>
 </Link>;
}
