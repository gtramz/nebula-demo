import { ShareSurface, ShareOverlay } from '@/components/ui/share-surface';
import { RefreshNotice } from '@/components/loading-states';
import { useInitialAssets } from '@/hooks/use-initial-assets';
import { useProjectProductCopy, useProjectPresentationCatalog } from '@/features/presentation/catalog';
import { ProjectMusic } from '@/features/project/music';
import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetProject, getGetProjectQueryKey, useCreateInvestment, useToggleProjectSupport, type PublicVisibility } from "@nebula/local";
import { useQueryClient } from "@tanstack/react-query";
import { ContentWidth } from "@/components/shell/app-shell";
import { DetailLoading } from '@/components/shell/detail-loading';
import { formatMoney } from "@/lib/utils";
import { Loader2, Heart, Disc3 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PublicVisibilityFields } from "@/components/public-visibility";
import * as Dialog from "@radix-ui/react-dialog";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const catalog = useProjectPresentationCatalog(projectId);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const { data: detail, isLoading, error, refetch } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const copy = useProjectProductCopy(detail?.project);
  const createInvestment = useCreateInvestment();
  const toggleSupport = useToggleProjectSupport();

  const [visibilityDraft, setVisibilityDraft] = useState<PublicVisibility | null>(null);
  const [backerLimit, setBackerLimit] = useState(10);
  const [fundAmount, setFundAmount] = useState<number>(500);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);

  const assetsReady = useInitialAssets(`project:${projectId}:${user?.artistId ?? user?.investorId ?? 'guest'}`, [detail?.project.coverUrl, detail?.artist.picture], !!detail);
  if (isLoading || !assetsReady) return <DetailLoading label="Loading project…"/>;
  if (error && !detail) return <ContentWidth className="py-12 space-y-4"><p role="alert">{error.message}</p><button className="inline-flex min-h-11 items-center underline" onClick={() => void refetch()}>Retry project</button></ContentWidth>;
  if (!detail) return <div className="flex-1 p-8 text-center text-muted voice">PROJECT NOT FOUND</div>;

  const { project, artist, backers, supporters, viewerHasSupported } = detail;
  const percent = project.goalAmount > 0 ? Math.min(100, Math.round((project.raisedAmount / project.goalAmount) * 100)) : 0;

  const visibility = visibilityDraft ?? detail.viewerVisibility ?? { showName: false, showAmount: false };
  const isArtist = user?.role === 'artist';

  const handleFund = (e: React.FormEvent) => {
    e.preventDefault();
    createInvestment.mutate({ data: { projectId, amount: fundAmount, publicVisibility: visibility } }, {
      onSuccess: (investment) => {
        setIsFundModalOpen(false);
        setLocation(`/receipt/${investment.id}`);
      }
    });
  };

  const handleSupport = () => {
    if (!isAuthenticated) return setLocation("/login");
    toggleSupport.mutate({ id: projectId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      }
    });
  };

  const release = catalog?.releases.find(r => r.projectId === projectId);
  const hasFunding = project.goalAmount > 0;

  return (
    <div data-page-scroll className="flex-1 overflow-y-auto">
      <ContentWidth className="py-6 md:py-10 space-y-8 pb-20"><RefreshNotice error={error} retry={refetch}/>
        <header className="grid sm:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr] gap-6 md:gap-8 items-end">
          <ProjectArtwork key={`${project.id}:${project.coverUrl}`} src={project.coverUrl} title={project.title} />
          <div className="min-w-0 space-y-4">
            <p className="voice text-xs text-accent">{release ? `${release.type} / ${release.dateKind === 'upload' ? 'YouTube ' : ''}${release.year}` : `${project.category} / ${project.status}`}</p>
            <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight break-words">{project.title}</h1>
            <Link href={`/artist/${artist.id}`} className="inline-flex min-h-11 items-center gap-3 hover:text-accent">
              {artist.picture && <img src={artist.picture} alt="" className="h-10 w-10 rounded-full object-cover" />}<span className="font-semibold text-lg">{artist.name}</span>
            </Link>
            {copy.pitch && <p className="text-muted leading-relaxed break-words">{copy.pitch}</p>}
          </div>
        </header>
        <div className={hasFunding ? "grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12" : "grid grid-cols-1 gap-8"}>
          <div className={hasFunding ? "lg:col-span-2 min-w-0 space-y-8" : "min-w-0 space-y-8"}>
            <ProjectMusic project={project}/>
            {copy.story && <details className="border-t border-border pt-4"><summary className="min-h-11 flex items-center cursor-pointer text-sm font-semibold">About this project</summary><div className="pt-3 text-sm text-muted whitespace-pre-wrap break-words">{copy.story}</div></details>}
            {user?.role === 'artist' && user.artistId !== project.artistId && <Link className="inline-flex min-h-11 items-center underline text-sm" href={`/messages/new/${project.artistId}?project=${project.id}`}>Message artist about this project</Link>}

            {(backers.length > 0 || supporters.length > 0) && (
              <section aria-label="Project community" className="space-y-6 pt-8 border-t border-white/10">
                <h2 className="voice text-[10px] text-muted">COMMUNITY</h2>
                <div className="flex flex-wrap gap-4">
                  {supporters.map((s, i) => (
                    <Link key={i} href={`/artist/${s.artistId}`}>
                      <div className="w-10 h-10 rounded-full border border-accent overflow-hidden" title={s.name}>
                        {s.picture ? <img src={s.picture} alt={s.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-accent/20 flex items-center justify-center text-xs text-accent font-bold">{s.name.charAt(0)}</div>}
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="space-y-3">
                  {backers.slice(0, backerLimit).map((b) => (
                    <div key={b.publicId} className="flex justify-between items-center gap-4 py-3 border-b border-white/5 last:border-0">
                      <span className="text-ink font-medium">{b.name ?? "Anonymous supporter"}</span>
                      <span className="text-cream font-bold">{b.amount === null ? "Amount private" : formatMoney(b.amount)}</span>
                    </div>
                  ))}
                </div>
                {backers.length > backerLimit && <button onClick={() => setBackerLimit(backerLimit + 10)} className="text-sm underline text-muted">Show more supporters</button>}
              </section>
            )}
          </div>

          {hasFunding && <aside aria-label="Project funding" className="space-y-6">
             <div className="p-6 rounded-2xl border border-border bg-surface space-y-8 lg:sticky lg:top-6">
              <div className="space-y-4">
                <div className="flex flex-wrap justify-between items-end gap-3">
                  <span className="font-display font-semibold text-2xl text-cream leading-none">{formatMoney(project.raisedAmount)}</span>
                  <span className="text-muted voice text-xs pb-1">{percent}% RAISED</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-1000 ease-out" style={{ width: `${percent}%` }} />
                </div>
                <div className="flex justify-between text-[10px] voice text-muted">
                  <span>GOAL {formatMoney(project.goalAmount)}</span>
                  <span>{project.backersCount} BACKERS</span>
                </div>
              </div>

              {project.status === 'funding' ? (
                isArtist ? (
                  <button onClick={handleSupport} className={`w-full py-4 rounded-full font-bold tracking-wide voice text-xs flex items-center justify-center gap-2 transition cursor-pointer ${viewerHasSupported ? 'glass-band-strong text-accent border-accent/20' : 'bg-surfaceAlt text-ink hover:bg-white/10'}`}>
                    <Heart className={`w-4 h-4 ${viewerHasSupported ? 'fill-accent' : ''}`} />
                    {viewerHasSupported ? 'SUPPORTED' : 'SUPPORT SYMBOLICALLY'}
                  </button>
                ) : (
                  <Dialog.Root open={isFundModalOpen} onOpenChange={(open) => { if (createInvestment.isPending) return; setIsFundModalOpen(open); setVisibilityDraft(null); }}>
                    <Dialog.Trigger asChild>
                      <button className="w-full py-4 bg-cream text-bg rounded-full font-bold tracking-wide voice text-xs hover:bg-white transition shadow-lg cursor-pointer">
                        BACK THIS PROJECT
                      </button>
                    </Dialog.Trigger>

                    <Dialog.Portal>
                         <ShareOverlay />
                       <ShareSurface aria-label="Back this project" onEscapeKeyDown={e=>{if(createInvestment.isPending)e.preventDefault();}} onPointerDownOutside={e=>{if(createInvestment.isPending)e.preventDefault();}}>
                        <Dialog.Close className="app-modal-close" aria-label="Close funding" disabled={createInvestment.isPending}>×</Dialog.Close>
                        <header className="app-modal-heading">
                        <Dialog.Title className="text-2xl font-display font-bold text-ink mb-3 text-center text-veil">Select Amount</Dialog.Title>
                        <Dialog.Description className="mb-6 text-center text-sm text-muted">Choose your contribution and how it appears on this project.</Dialog.Description>

                        </header><div className="app-modal-body">
                        {!isAuthenticated ? (
                          <div className="text-center space-y-6">
                            <p className="text-muted">You need an investor account to back projects.</p>
                            <Link href="/login" className="block w-full py-4 bg-cream text-bg rounded-full font-bold tracking-wide voice text-xs">
                              Sign In
                            </Link>
                          </div>
                        ) : (
                          <form onSubmit={handleFund} className="space-y-8">
                            <div className="grid grid-cols-2 gap-3">
                              {[250, 500, 1000, 2500].map(amt => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setFundAmount(amt)}
                                  className={`py-4 rounded-2xl font-bold transition cursor-pointer ${fundAmount === amt ? 'glass-band-strong text-accent border-accent/30' : 'bg-surfaceAlt text-muted hover:text-ink'}`}
                                >
                                  {formatMoney(amt)}
                                </button>
                              ))}
                            </div>

                            <div className="space-y-2">
                              <label htmlFor="pledge-amount" className="voice text-[10px] text-muted">CUSTOM AMOUNT ({project.currency})</label>
                              <input
                                id="pledge-amount"
                                type="number"
                                min="100"
                                max="10000000"
                                step="0.01"
                                required
                                value={fundAmount}
                                onChange={(e) => setFundAmount(Number(e.target.value))}
                                className="w-full bg-surfaceAlt border border-white/5 rounded-2xl px-6 py-4 text-ink font-display text-xl focus:outline-none focus:border-accent transition"
                              />
                            </div>

                            <PublicVisibilityFields value={visibility} onChange={setVisibilityDraft} disabled={createInvestment.isPending} />
                            <Dialog.Close disabled={createInvestment.isPending} className="text-sm underline text-muted">Cancel</Dialog.Close>
                            <button
                              type="submit"
                              disabled={createInvestment.isPending}
                              className="w-full py-4 bg-cream text-bg rounded-full font-bold tracking-wide voice text-xs flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-white transition cursor-pointer"
                            >
                              {createInvestment.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                              CONFIRM {formatMoney(fundAmount)}
                            </button>
                            {createInvestment.error && <p role="alert" className="text-sm text-danger">{createInvestment.error.message}</p>}
                          </form>
                        )}
                        </div>
                      </ShareSurface>
                    </Dialog.Portal>
                  </Dialog.Root>
                )
              ) : (
                <div className="w-full py-4 bg-surfaceAlt text-muted text-center rounded-full font-bold tracking-wide voice text-xs border border-white/5">
                  {project.status.toUpperCase()}
                </div>
              )}
              {toggleSupport.error && <p role="alert" className="text-sm text-danger">{toggleSupport.error.message}</p>}
            </div>

            {project.useOfFunds && project.useOfFunds.length > 0 && (
             <div className="p-6 border border-border space-y-6">
                <h2 className="voice text-[10px] text-muted">USE OF FUNDS</h2>
                <div className="space-y-3">
                  {project.useOfFunds.map((uof, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-ink">
                        <span>{uof.label}</span>
                        <span className="text-muted">{uof.percentage}%</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-accent/60 rounded-full" style={{ width: `${uof.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>}
        </div>
      </ContentWidth>
    </div>
  );
}

function ProjectArtwork({ src, title }: { src?: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  return <div className="aspect-square w-full max-w-64 sm:max-w-none rounded-2xl overflow-hidden bg-surfaceAlt grid place-items-center shadow-xl">{src && !failed ? <img src={src} alt={`${title} artwork`} onError={() => setFailed(true)} className="w-full h-full object-cover" /> : <Disc3 className="h-16 w-16 text-muted" aria-hidden />}</div>;
}
