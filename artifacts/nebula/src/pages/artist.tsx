import { RefreshNotice } from '@/components/loading-states';
import { useInitialAssets } from '@/hooks/use-initial-assets';
import { ArtistDiscography, FeaturedRecording, usePresentationRemixExample, usePresentationCatalog } from '@/features/presentation/catalog';
import { ProjectOffers } from '@/features/collaborations';
import { useParams, Link } from 'wouter';
import { musicalProject, usePublicArtist, type PublicArtistProfile } from '@nebula/local';
import { useAuth } from '@/context/AuthContext';
import { ContentWidth } from '@/components/shell/app-shell';
import { DetailLoading } from '@/components/shell/detail-loading';
import { useViewState } from '@/components/shell/return-context';
import { Panel, controlStyles } from '@/components/antiq/workspace';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArtistProfileHeader, ArtistPublications, ArtistProjects, ArtistAbout } from '@/features/artist-identity/public-profile';
import { ArtistProjectGrid } from '@/features/artist-identity/project-grid';

export default function ArtistProfile() {
  const { id } = useParams<{ id: string }>(), artistId = Number(id);
  const query = usePublicArtist(artistId), { user } = useAuth();
  const assetsReady = useInitialAssets(`artist:${artistId}:${user?.artistId ?? user?.investorId ?? 'guest'}`, [query.data?.artist.picture, ...query.data?.projects.slice(0,2).map(project=>project.coverUrl) ?? []], !!query.data);
  if (query.isLoading || !assetsReady) return <DetailLoading label="Loading artist…" artist/>;
  if (query.isError && !query.data) return <ContentWidth className="py-12 space-y-4"><p role="alert">{query.error.message}</p><button className={controlStyles.button} onClick={() => void query.refetch()}>Retry profile</button></ContentWidth>;
  if (!query.data) return <ContentWidth className="py-12 space-y-4"><h1 className="text-3xl font-bold">Artist not found</h1></ContentWidth>;
  return <><RefreshNotice error={query.error} retry={query.refetch}/><ArtistProfileContent key={`${artistId}:${user?.role ?? 'guest'}:${user?.artistId ?? user?.investorId ?? ''}`} detail={query.data} /></>;
}

function ArtistProfileContent({ detail }: { detail: PublicArtistProfile }) {
  const artistId = detail.artist.id, { user } = useAuth();
  const owner = user?.role === 'artist' && user.artistId === artistId;
  const catalog = usePresentationCatalog(artistId), example = usePresentationRemixExample();
  const recording = example && [example.remix, example.original].find(item => item.artistIds.includes(artistId));
  const [tab, setTab] = useViewState(`artist-tab:${artistId}`, 'overview');
  const opportunities = detail.projects.filter(project => detail.opportunityProjectIds.includes(project.id));
  const catalogIds = new Set(catalog?.releases.map(release => release.projectId));
  const musicalProjects = detail.projects.filter(project => musicalProject(project.category) && !catalogIds.has(project.id));
  const showSection = (value: string) => {
    setTab(value);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-artist-tab="${value}"]`)?.focus({ preventScroll: true }));
  };
  const featured = example && recording
    ? <FeaturedRecording example={example} recording={recording} showKicker={false} />
    : <ArtistPublications artistId={artistId} music owner={owner} featured />;
  return <div data-page-scroll className="flex-1 overflow-y-auto"><ContentWidth className="py-6 md:py-10 space-y-8 pb-16">
    <ArtistProfileHeader artist={detail.artist} projectCount={detail.projects.length} owner={owner} capabilities={!owner && (!user || user.role === 'artist') ? { message: { href: user ? `/messages/new/${artistId}` : '/login' } } : undefined} />
    <Tabs value={tab} onValueChange={setTab} className="space-y-8">
      <TabsList aria-label="Artist profile sections" className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-none border-y border-border bg-transparent p-2 text-muted">
        {([['overview','Overview'],['music','Music'],['posts','Discovery Posts'],['projects','Projects'],['collaborations','Collaborations'],['about','About']] as const).map(([value,label]) => <TabsTrigger key={value} value={value} data-artist-tab={value} className="min-h-11 min-w-0 whitespace-normal rounded-full px-4 py-2 data-[state=active]:bg-surfaceAlt data-[state=active]:text-accent focus-visible:ring-accent">{label}</TabsTrigger>)}
      </TabsList>
      <TabsContent value="overview" className="space-y-10">
        <div className="space-y-3">{featured}<button className={controlStyles.button} onClick={() => showSection('music')}>View all music</button></div>
        {catalog && <section className="space-y-4"><ArtistDiscography catalog={catalog} projects={detail.projects} limit={4} /><button className={controlStyles.button} onClick={() => showSection('music')}>View discography</button></section>}
        {!!musicalProjects.length && <section className="space-y-5" aria-label="Music projects"><div className="flex flex-wrap justify-between items-center gap-3"><h2 className="text-2xl font-semibold">Music projects</h2><button className={controlStyles.button} onClick={() => showSection('projects')}>View all projects</button></div><ArtistProjectGrid projects={musicalProjects.slice(0, 4)} opportunityIds={detail.opportunityProjectIds} /></section>}
        {!!opportunities.length && <section className="space-y-5" aria-label="Open opportunities"><div className="flex flex-wrap justify-between items-center gap-3"><h2 className="text-2xl font-semibold">Open opportunities</h2><button className={controlStyles.button} onClick={() => showSection('collaborations')}>View collaborations</button></div><ArtistProjectGrid projects={opportunities.slice(0, 4)} opportunityIds={detail.opportunityProjectIds} /></section>}
      </TabsContent>
      <TabsContent value="music" className="space-y-10">
        {example && recording && <FeaturedRecording example={example} recording={recording} showKicker={false} />}
        {catalog && <ArtistDiscography catalog={catalog} projects={detail.projects} />}
        <ArtistPublications artistId={artistId} music owner={owner} excludeId={recording?.postId} hideEmpty={!!recording || !!catalog} />
      </TabsContent>
      <TabsContent value="posts"><h2 className="text-2xl font-bold mb-5">Discovery Posts</h2><ArtistPublications artistId={artistId} owner={owner} /></TabsContent>
      <TabsContent value="projects"><ArtistProjects detail={detail} /></TabsContent>
      <TabsContent value="collaborations"><div className="space-y-6"><h2 className="text-2xl font-bold">Open opportunities</h2>{opportunities.map(project => <section key={project.id}><Link className="text-xl font-semibold underline" href={`/project/${project.id}`}>{project.title}</Link><ProjectOffers projectId={project.id} ownerId={artistId} compact /></section>)}{!opportunities.length && <p className="text-muted">No projects seeking collaborators yet.</p>}</div><Panel className="mt-8"><h2 className="text-2xl font-bold">Collaboration credits</h2><p>No public credits to display.</p>{owner && <Link className={controlStyles.button} href="/collaborations">Manage collaborations</Link>}</Panel></TabsContent>
      <TabsContent value="about"><ArtistAbout artist={detail.artist} /></TabsContent>
    </Tabs>
  </ContentWidth></div>;
}
