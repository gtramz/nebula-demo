import { CreationFrame, useCreationSteps } from '@/components/guided/creation';
import { JourneyBack, JourneyNext, JourneyContext } from '@/components/guided/journey';
import { StaticFace } from '@/components/blob-face';
import { OpportunityFields, emptyOpportunity } from '@/features/collaborations/opportunity-fields';
import { ProjectOffers } from '@/features/collaborations';
import { apiRequest, type OfferInput, type Tracklist } from '@nebula/local';
import { SongFields, SongManager } from '@/features/songs';
import { musicalProject, type SongEntry, type ProjectUpdate } from '@nebula/local';
import { ArtistIdentityEditor, ArtistCompletionPrompt } from '@/features/artist-identity/editor';
import { useLeaveGuard } from '@/components/shell/navigation-guard';
import { useEffect, useRef, useState } from "react";
import { ImageUpload } from "@/components/image-upload";
import { useAuth } from "@/context/AuthContext";
import {
  useLogout,
  isServerMode,
  useAuthEvents,
  creativeRoleTaxonomy,
  musicalGenreTaxonomy,
  useListProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  type Project,
  type ProjectInput,
  ProjectInputStatus,
  ProjectInputCurrency,
} from "@nebula/local";
import { ContentWidth } from "@/components/shell/app-shell";
import { MoreMenu } from "@/components/shell/more-menu";
import { LogOut, Plus, Edit2 } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ProjectCard } from "@/components/project-card";

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const logout = useLogout();
  const profileSearch=useSearch();

  if (isLoading) return null;
  if (!isAuthenticated || !user) {
    return (
      <ContentWidth className="py-16 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-bold text-ink">your profile</h1>
          <div className="md:hidden"><MoreMenu /></div>
        </div>
        <p className="text-muted">choose a profile to try the artist or investor experience.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/login" className="bg-cream px-6 py-3 text-sm font-bold text-bg">log in</Link>
          <Link href="/register" className="border border-border px-6 py-3 text-sm text-ink">create profile</Link>
        </div>
      </ContentWidth>
    );
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/");
      },
    });
  };

  if(user.role==='artist' && new URLSearchParams(profileSearch).get('edit')==='1') return <div data-page-scroll className="flex-1 overflow-y-auto"><ContentWidth className="py-6 md:py-8 space-y-5"><h1 className="text-3xl font-bold">Edit profile</h1><ArtistIdentityEditor onClose={()=>setLocation('/profile')}/></ContentWidth></div>;
  if (user.role === 'artist' && new URLSearchParams(profileSearch).get('create') === 'project') return <div data-page-scroll className="flex-1 overflow-y-auto"><ContentWidth className="py-4 md:py-6"><ArtistDashboard /></ContentWidth></div>;
  return (
    <div data-page-scroll className="flex-1 overflow-y-auto">
      <ContentWidth className="py-6 md:py-8 space-y-6 px-4 lg:px-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-display font-bold text-ink text-veil">
            Profile
          </h1>
          <div className="flex items-center gap-2">
          {user.role==='artist'&&<button className="min-h-11 rounded-full bg-cream text-bg px-5 text-sm font-semibold" onClick={()=>setLocation('/profile?edit=1')}>Edit profile</button>}
          <button
            onClick={handleLogout}
            className="hidden min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-muted hover:text-danger transition voice text-xs cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:inline-flex"
          >
            <LogOut className="w-4 h-4" /> LOGOUT
          </button>
          <MoreMenu logout={{ onSelect: handleLogout, isPending: logout.isPending }} />
          </div>
        </div>

        <div className="flex items-center gap-5 p-5 sm:p-6 glass-band rounded-2xl text-left">
          <div className="w-20 h-20 rounded-full bg-surface border-4 border-bg overflow-hidden shadow-xl shrink-0">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <StaticFace seed={user.artistId ?? user.investorId ?? user.name} size={80} className="h-full w-full"/>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-ink">{user.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="voice text-[10px] text-bg bg-cream px-2 py-0.5 rounded-sm font-bold">
                {user.role.toUpperCase()}
              </span>
              {user.email && (
                <span className="text-muted text-sm break-all">{user.email}</span>
              )}
            </div>
          </div>
        </div>

        {isServerMode() && user.role==='investor' && <Link href="/saved" className="block border border-border rounded-xl p-4 hover:bg-surfaceAlt"><h2 className="text-xl font-bold">Saved publications</h2></Link>}
        {user.role === "artist" ? <ArtistDashboard /> : <InvestorDashboard />}
        <details className="border-t border-border pt-4"><summary className="cursor-pointer min-h-11 text-sm text-muted">Account activity</summary><AccountActivity /></details>
      </ContentWidth>
    </div>
  );
}

function AccountActivity() {
  const { data: events = [] } = useAuthEvents();
  const labels = { registered: 'Account created', login: 'Successful login', login_failed: 'Failed login', logout: 'Logged out', demo_cleared: 'Projects and pledges cleared' };
  return <section aria-label="Account activity" className="space-y-4 pb-16">
    <h2 className="text-xl font-bold">Account activity</h2>
    <p className="text-sm text-muted">Recent sign-ins and account activity.</p>
    {!events.length ? <p>No activity recorded yet.</p> : <ul className="space-y-3">{events.map((event, index) =>
      <li key={`${event.at}-${index}`} className="border-b border-border pb-3 text-sm flex flex-wrap justify-between gap-2">
        <span>{labels[event.type]}</span><time dateTime={event.at}>{new Date(event.at).toLocaleString()}</time>
      </li>)}</ul>}
  </section>;
}

function InvestorDashboard() {
  return (
    <div className="space-y-6 pb-24">
      <h2 className="voice text-[10px] text-muted ml-2">QUICK LINKS</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/pledges"
          className="p-6 glass-band rounded-3xl hover:bg-surface/50 hover:border-white/10 transition group"
        >
          <h3 className="font-bold text-lg text-cream group-hover:text-white transition">
            My Pledges
          </h3>
          <p className="text-sm text-muted mt-1">
            View your investment history and receipts.
          </p>
        </Link>
        <Link
          href="/explore"
          className="p-6 glass-band rounded-3xl hover:bg-surface/50 hover:border-white/10 transition group"
        >
          <h3 className="font-bold text-lg text-cream group-hover:text-white transition">
            Discover Projects
          </h3>
          <p className="text-sm text-muted mt-1">
            Find new independent artists to support.
          </p>
        </Link>
      </div>
    </div>
  );
}

function ArtistDashboard() {
  const search = useSearch();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [editingArtist, setEditingArtist] = useState(() => new URLSearchParams(window.location.search).get('edit') === '1');
  const queryClient = useQueryClient();
  const [editingProject, setEditingProject] = useState<Project | "new" | null>(
    () => new URLSearchParams(window.location.search).get('create') === 'project' ? 'new' : null,
  );

  useEffect(() => { if (new URLSearchParams(search).get("create") === "project") setEditingProject("new"); }, [search]);

  const { data: projects, isLoading } = useListProjects(
    {},
    {
      query: {
        queryKey: ["projects", "artist", user?.artistId],
        enabled: !!user?.artistId,
      },
    },
  );

  const myProjects =
    projects?.filter((p) => p.artistId === user?.artistId) || [];

  if (editingArtist) {
    return <ArtistIdentityEditor onClose={() => { setEditingArtist(false); if (window.location.search) navigate('/profile', { replace: true }); }} />;
  }

  if (editingProject) {
    return (
      <ProjectEditor
        key={`${user?.artistId}:${editingProject === 'new' ? 'new' : editingProject.id}`}
        project={editingProject === "new" ? null : editingProject}
        onClose={() => { setEditingProject(null); if (new URLSearchParams(window.location.search).has("create")) navigate("/profile", {replace:true}); }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <ArtistCompletionPrompt />
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-medium text-muted">Artist identity</h2><Link href={`/artist/${user!.artistId}`} className="inline-flex min-h-11 items-center text-accent underline">View public profile</Link>

        </div>

        {user?.artist && (
          <div className="p-5 glass-band rounded-2xl space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="col-span-2 md:col-span-4">
                <p className="voice text-[10px] text-muted mb-1.5">CREATIVE ROLES</p>
                <p className="text-ink font-medium">{user.artist.creativeRoles?.map(id => creativeRoleTaxonomy.find(role => role.id === id)?.label ?? id).join(', ') || '—'}</p>
              </div>
              <div>
                <p className="voice text-[10px] text-muted mb-1.5">MUSICAL GENRES</p>
                <p className="text-ink font-medium">
                  {user.artist.genreIds?.map(id => musicalGenreTaxonomy.find(genre => genre.id === id)?.label ?? id).join(', ') || "—"}
                </p>
              </div>
              <div>
                <p className="voice text-[10px] text-muted mb-1.5">BASED IN</p>
                <p className="text-ink font-medium">
                  {user.artist.basedIn || "—"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="voice text-[10px] text-muted mb-1.5">BIO</p>
                <p className="text-sm text-ink/80 line-clamp-3 leading-relaxed">
                  {user.artist.bio || "—"}
                </p>
              </div>
            </div>

          </div>
        )}
      </section>

      <div className="grid sm:grid-cols-2 gap-3">
      {isServerMode() && <Link href="/messages" className="block border border-border rounded-xl p-4 hover:bg-surfaceAlt"><h2 className="text-xl font-bold">Messages</h2><p className="text-sm text-muted mt-2">Requests, conversations and proposals in one place.</p></Link>}
      {isServerMode() && <Link href="/studio/remix" className="block border border-border rounded-xl p-4 hover:bg-surfaceAlt"><h2 className="text-xl font-bold">Private remix drafts</h2></Link>}
      {isServerMode() && <Link href="/saved" className="block border border-border rounded-xl p-4 hover:bg-surfaceAlt"><h2 className="text-xl font-bold">Saved publications</h2></Link>}
      {isServerMode() && <Link href="/collaborations" className="block border border-border rounded-xl p-4 hover:bg-surfaceAlt"><h2 className="text-xl font-bold">Collaborations</h2></Link>}
      {isServerMode() && <Link href="/studio" className="block border border-border rounded-xl p-4 hover:bg-surfaceAlt">
        <h2 className="text-xl font-bold">Your publications</h2>
      </Link>}
      <Link href="/received" className="block border border-border rounded-xl p-4 hover:bg-surfaceAlt">
        <h2 className="text-xl font-bold">Contributions received</h2>

      </Link>
      </div>
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="voice text-[10px] text-muted">YOUR PROJECTS</h2>
          <button
            onClick={() => navigate("/profile?create=project")}
            className="flex items-center gap-1.5 py-2 px-4 bg-cream text-bg rounded-full voice text-[10px] hover:bg-white transition font-bold cursor-pointer shadow-lg"
          >
            <Plus className="w-3.5 h-3.5" /> NEW PROJECT
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-64 glass-band rounded-[32px] animate-pulse"
              />
            ))}
          </div>
        ) : myProjects.length === 0 ? (
          <div className="p-12 glass-band rounded-[32px] text-center space-y-4 border-dashed border-white/5">
            <p className="text-muted voice">NO PROJECTS YET</p>
            <p className="text-sm text-muted">
              Start a release, share your direction and find collaborators.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myProjects.map((p) => (
              <div key={p.id} className="relative group">
                <ProjectCard project={p} />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setEditingProject(p);
                  }}
                  aria-label={`edit ${p.title}`}
                  className="absolute top-4 right-4 p-3 bg-surfaceAlt/80 backdrop-blur border border-white/10 rounded-full text-cream opacity-100 transition shadow-lg hover:text-accent hover:border-accent/30 z-20 cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProjectEditor({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  const flow = useCreationSteps();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const queryClient = useQueryClient();
  const isCatalog = !!project?.presentationCatalogId;

  const [formData, setFormData] = useState<ProjectInput>({
    title: project?.title || "",
    category: project?.category || "Album",
    goalAmount: project?.goalAmount ?? 10000,
    currency: ProjectInputCurrency.USD,
    pitch: project?.pitch || "",
    story: project?.story || "",
    status: (project?.status as ProjectInputStatus) || ProjectInputStatus.draft,
    useOfFunds: project?.useOfFunds || [
      { label: "Production", percentage: 100 },
    ],
    coverUrl: project?.coverUrl || "",
  });

  const [fundingEnabled, setFundingEnabled] = useState((project?.goalAmount ?? 0) > 0);
  const initialFunding = useRef(fundingEnabled);
  const fundsTotal = (formData.useOfFunds ?? []).reduce((total, fund) => total + fund.percentage, 0);
  const fundingLocked = (project?.raisedAmount ?? 0) > 0;
  function toggleFunding(enabled: boolean) {
    setFundingEnabled(enabled);
    setFormData(current => ({ ...current,
      status: !enabled && ['funding', 'funded'].includes(current.status ?? '') ? ProjectInputStatus.published : current.status,
      ...(enabled && !current.goalAmount ? { goalAmount: 10000 } : {}),
      ...(enabled && !current.useOfFunds?.length ? { useOfFunds: [{ label: 'Production', percentage: 100 }] } : {}),
    }));
    setOpportunityError('');
  }

  const [songs,setSongs]=useState<SongEntry[]>([]);
  // Existing Single projects remain readable/editable; new tracklists belong to Album/EP only.
  const hasTracklist = ['Album', 'EP'].includes(formData.category);
  const projectFormat = formData.category === 'Video' ? 'Music video' : formData.category;
  const projectSongs = hasTracklist ? songs : [];
  const [seeking,setSeeking]=useState(false),[offer,setOffer]=useState<OfferInput>(emptyOpportunity),[scope,setScope]=useState(''),[opportunityBusy,setOpportunityBusy]=useState(false),[opportunityError,setOpportunityError]=useState('');
  const created=useRef<{project:Project;offerId?:number}|null>(null);
  const [songEditing,setSongEditing]=useState({dirty:false,busy:false});
  const createOperation=useRef({key:'',id:''});
  const baseline=useRef(formData);
  const handleSubmit = async (e: React.SyntheticEvent, status?: ProjectInputStatus) => {
    e.preventDefault();
    if(opportunityBusy || createProject.isPending || updateProject.isPending)return;
    if(!project && !flow.validate())return;
    const fundingChanged = !project || initialFunding.current !== fundingEnabled
      || formData.goalAmount !== baseline.current.goalAmount
      || JSON.stringify(formData.useOfFunds) !== JSON.stringify(baseline.current.useOfFunds);
    if (fundingEnabled && (!(formData.goalAmount > 0) || (fundingChanged && (!formData.useOfFunds?.length || Math.abs(fundsTotal - 100) >= 0.01)))) {
      if (!project) flow.reveal(3);
      setOpportunityError(!(formData.goalAmount > 0) ? 'Enter a funding goal.' : 'Use of funds must add up to 100%.');
      return;
    }
    setOpportunityError('');
    const submittedData = {...formData, status: status ?? formData.status,
      ...(!fundingEnabled ? { goalAmount: 0, useOfFunds: [] } : {})};
    if(!project && seeking && isServerMode()) {
      if(!offer.referenceMediaId){flow.reveal(2);setOpportunityError('Choose a musical reference.');return;}
      if(scope!=='' && !projectSongs[Number(scope)]){flow.reveal(2);setOpportunityError('Choose a song still included in this project.');return;}
      setOpportunityBusy(true);setOpportunityError('');
      try {
        if(!created.current) {
          const key=JSON.stringify({submittedData,songs});if(createOperation.current.key!==key)createOperation.current={key,id:crypto.randomUUID()};
          const saved=await createProject.mutateAsync({data:{...submittedData,status:ProjectInputStatus.draft,...{operationId:createOperation.current.id},...(hasTracklist?{songs:projectSongs}:{})}});
          created.current={project:saved};
        }
        const saved=created.current.project;
        const tracks=hasTracklist?await apiRequest<Tracklist>(`/api/projects/${saved.id}/songs`):null;
        const workId=scope===''?null:tracks?.songs[Number(scope)]?.id;
        if(scope!==''&&!workId)throw new Error('The selected song could not be found. Your project is kept as a draft.');
        if(!created.current.offerId) {
          const result=await apiRequest<{id:number}>(`/api/projects/${saved.id}/offers`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...offer,workId})});
          created.current.offerId=result.id;
        }
        if(submittedData.status!==ProjectInputStatus.draft)await updateProject.mutateAsync({id:saved.id,data:{status:submittedData.status,expected:saved} as ProjectUpdate});
        await Promise.all(['projects','opportunity-projects','offers','public-artist'].map(key=>queryClient.invalidateQueries({queryKey:[key]})));allowDeparture(); onClose();
      } catch(e){setOpportunityError((e as Error).message);} finally{setOpportunityBusy(false);}
      return;
    }
    if (project) {
      updateProject.mutate(
        { id: project.id, data: { ...Object.fromEntries(Object.entries(submittedData).filter(([key,value])=>JSON.stringify(value)!==JSON.stringify((baseline.current as unknown as Record<string,unknown>)[key]))), expected: project } as ProjectUpdate },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            allowDeparture(); onClose();
          },
        },
      );
    } else {
      const key=JSON.stringify({submittedData,songs});if(createOperation.current.key!==key)createOperation.current={key,id:crypto.randomUUID()};
      createProject.mutate(
        { data: { ...submittedData, ...(isServerMode()?{operationId:createOperation.current.id,...(hasTracklist?{songs:projectSongs}: {})}:{}) } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            allowDeparture(); onClose();
          },
        },
      );
    }
  };

  const handleDelete = () => {
    if (project && confirm("Remove this project from discovery? Existing pledges and receipts will be kept.")) {
      deleteProject.mutate(
        { id: project.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            onClose();
          },
        },
      );
    }
  };

  const isPending = createProject.isPending || updateProject.isPending || opportunityBusy;
  const initial = useRef(JSON.stringify(formData));
  const changed = initial.current !== JSON.stringify(formData) || initialFunding.current !== fundingEnabled || songs.length > 0 || seeking;
  const allowDeparture = useLeaveGuard(isPending || changed ? 'Leave without saving your project changes?' : null);

  const identityFields = <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="project-title" className="voice text-[10px] text-muted ml-2">TITLE</label>
            <input
              id="project-title"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full bg-surfaceAlt border border-white/5 rounded-2xl px-6 py-4 text-ink focus:border-accent outline-none transition"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="project-category" className="voice text-[10px] text-muted ml-2">
              CATEGORY
            </label>
            <select
              id="project-category"
              value={formData.category}
              onChange={(e) => {
                const category = e.target.value;
                setFormData({ ...formData, category });
                if (!['Album', 'EP'].includes(category) && scope !== '') {
                  setScope('');
                  setOffer(current => ({ ...current, referenceMediaId: null }));
                  setOpportunityError('');
                }
              }}
              className="w-full bg-surfaceAlt border border-white/5 rounded-2xl px-6 py-4 text-ink focus:border-accent outline-none appearance-none transition"
            >
              <option>Album</option>
              <option>EP</option>
              {project?.category === 'Single' && <option value="Single">Single</option>}
              <option>Tour</option>
              <option value="Video">Music video</option>
            </select>
          </div>
        </div>

  </>;
  const statusField = <>
          <div className="space-y-2">
            <label htmlFor="project-status" className="voice text-[10px] text-muted ml-2">STATUS</label>
            <select
              id="project-status"
              disabled={isCatalog}
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as ProjectInputStatus,
                })
              }
              className="w-full bg-surfaceAlt border border-white/5 rounded-2xl px-6 py-4 text-ink focus:border-accent outline-none appearance-none transition"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              {fundingEnabled && <option value="funding">Funding (Active)</option>}
              {fundingEnabled && <option value="funded">Funded</option>}
              <option value="closed">Closed</option>
            </select>
          </div>
  </>;
  const pitchField = <>
        <div className="space-y-2">
          <label htmlFor="project-pitch" className="voice text-[10px] text-muted ml-2">
            PITCH (Short description)
          </label>
          <textarea
              id="project-pitch"
            rows={2}
            value={formData.pitch || ""}
            onChange={(e) =>
              setFormData({ ...formData, pitch: e.target.value })
            }
            className="w-full bg-surfaceAlt border border-white/5 rounded-2xl px-6 py-4 text-ink focus:border-accent outline-none resize-none transition"
          />
        </div>

  </>;
  const storyField = <>
        <div className="space-y-2">
          <label htmlFor="project-story" className="voice text-[10px] text-muted ml-2">
            FULL STORY
          </label>
          <textarea
              id="project-story"
            rows={6}
            value={formData.story || ""}
            onChange={(e) =>
              setFormData({ ...formData, story: e.target.value })
            }
            className="w-full bg-surfaceAlt border border-white/5 rounded-2xl px-6 py-4 text-ink focus:border-accent outline-none resize-none transition"
          />
        </div>

  </>;
  const coverField = <>
        <ImageUpload
          label="COVER IMAGE"
          value={formData.coverUrl}
          onChange={(coverUrl) => setFormData({ ...formData, coverUrl })}
        />

  </>;
  const songFields = <>
        {!project && isServerMode() && hasTracklist && <><SongFields value={songs} onChange={setSongs} disabled={isPending}/></>}
  </>;
  const opportunityFields = <>
        {!project && isServerMode() && <section className="space-y-4 border-t border-border pt-6">
          <h3 className="text-xl font-semibold">Make it together</h3><label className="flex items-center gap-3 min-h-11"><input type="checkbox" checked={seeking} disabled={isPending||!!created.current} onChange={e=>setSeeking(e.target.checked)}/>Find collaborators for this project</label>
          {seeking&&<><label className="block space-y-2">Opportunity scope<select className="w-full border border-border bg-surface p-3" value={scope} onChange={e=>{setScope(e.target.value);setOffer({...offer,referenceMediaId:null});}}><option value="">Entire project</option>{projectSongs.map((song,i)=><option key={i} value={i}>{song.title||`Song ${i+1}`}</option>)}</select></label><OpportunityFields value={offer} onChange={setOffer} onBusy={setOpportunityBusy}/></>}
        </section>}
  </>;
  const fundingFields = !isCatalog && <section className="border-t border-border pt-6 space-y-5">
    <label className="flex items-center justify-between gap-4 min-h-11 cursor-pointer">
      <span className="font-semibold">Enable funding</span>
      <input type="checkbox" role="switch" className="h-5 w-5 accent-accent" checked={fundingEnabled} disabled={fundingLocked} onChange={event => toggleFunding(event.target.checked)} />
    </label>
    {fundingLocked && <p className="text-sm text-muted">Contributions received. Choose Closed to stop funding.</p>}
    {fundingEnabled && <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-5">
      <label className="block space-y-2"><span className="text-sm">Goal (USD)</span>
        <input type="number" required min="0.01" max="100000000" step="0.01" value={formData.goalAmount || ''}
          onChange={event => setFormData({ ...formData, goalAmount: Number(event.target.value) })}
          className="w-full bg-surfaceAlt border border-border rounded-xl px-4 min-h-11 text-ink focus:border-accent outline-none" />
      </label>
      <fieldset className="space-y-3"><legend className="text-sm font-semibold mb-3">Use of funds</legend>
        {(formData.useOfFunds ?? []).map((fund, index) => <div key={index} className="flex items-end gap-2">
          <label className="min-w-0 flex-1 space-y-2"><span className="text-xs text-muted">Purpose</span>
            <input aria-label={`Fund purpose ${index + 1}`} required maxLength={120} value={fund.label}
              onChange={event => setFormData({ ...formData, useOfFunds: formData.useOfFunds!.map((item, at) => at === index ? { ...item, label: event.target.value } : item) })}
              className="w-full min-h-11 bg-surfaceAlt border border-border rounded-xl px-3" />
          </label>
          <label className="w-20 shrink-0 space-y-2"><span className="text-xs text-muted">Percent</span>
            <input aria-label={`Fund percentage ${index + 1}`} type="number" required min="0" max="100" step="0.01" value={fund.percentage}
              onChange={event => setFormData({ ...formData, useOfFunds: formData.useOfFunds!.map((item, at) => at === index ? { ...item, percentage: Number(event.target.value) } : item) })}
              className="w-full min-h-11 bg-surfaceAlt border border-border rounded-xl px-3" />
          </label>
          <button type="button" aria-label={`Remove fund purpose ${index + 1}`} disabled={formData.useOfFunds!.length === 1} onClick={() => setFormData({ ...formData, useOfFunds: formData.useOfFunds!.filter((_, at) => at !== index) })} className="min-h-11 min-w-11 rounded-full border border-border disabled:opacity-30">×</button>
        </div>)}
        <div className="flex flex-wrap justify-between items-center gap-2">
          <button type="button" disabled={(formData.useOfFunds?.length ?? 0) >= 20} onClick={() => setFormData({ ...formData, useOfFunds: [...(formData.useOfFunds ?? []), { label: '', percentage: 0 }] })} className="min-h-11 px-3 border border-border rounded-full text-sm disabled:opacity-30">Add purpose</button>
          <p role="status" className={`text-sm ${Math.abs(fundsTotal - 100) < 0.01 ? 'text-accent' : 'text-muted'}`}>Total: {Number(fundsTotal.toFixed(2))}% / 100%</p>
        </div>
      </fieldset>
    </div>}
  </section>;

  function goProject(next: number) {
    if (isPending) return;
    if (next > 2 && seeking && !offer.referenceMediaId) { flow.reveal(2); setOpportunityError('Choose a musical reference.'); return; }
    setOpportunityError(''); flow.go(next);
  }
  if (!project) return <div className="max-w-6xl mx-auto py-4 md:py-6 space-y-6">
    <header className="flex items-center justify-between gap-4"><h1 className="text-2xl font-semibold">New Project</h1><button type="button" className="min-h-11 px-3 text-sm text-muted" disabled={isPending} onClick={() => { if (!changed || confirm('Leave without saving your project changes?')) { allowDeparture(); onClose(); } }}>Cancel</button></header>
    <form ref={flow.form} noValidate onSubmit={event => { event.preventDefault(); if (flow.step < 3) goProject(flow.step + 1); else void handleSubmit(event); }}>
      <CreationFrame label="Project" steps={['Identity',hasTracklist ? 'Songs & story' : 'Story','Opportunities','Review']} flow={{...flow,go:goProject}} locked={isPending}
        context={<JourneyContext cover={formData.coverUrl} title={formData.title || 'New project'} artist={projectFormat} />}
        footer={<>
          {flow.step > 0 && <JourneyBack disabled={isPending} onClick={() => goProject(flow.step - 1)} />}
          <button type="button" className="creation-save" disabled={isPending || !formData.title.trim()} onClick={event => void handleSubmit(event,ProjectInputStatus.draft)}>{isPending ? 'Saving…' : 'Save & exit'}</button>
          {flow.step < 3 ? <JourneyNext disabled={isPending} onClick={() => goProject(flow.step + 1)}/> : <button type="submit" className="guided-next" disabled={isPending}>{isPending ? 'Saving…' : formData.status === 'draft' ? 'Save project' : 'Publish project'}</button>}
        </>}>
        <fieldset disabled={isPending} className="space-y-6">
          <section data-creation-step="0" hidden={flow.step !== 0} className="space-y-6">{identityFields}{coverField}</section>
          <section data-creation-step="1" hidden={flow.step !== 1} className="space-y-6">{pitchField}{storyField}{songFields}</section>
          <section data-creation-step="2" hidden={flow.step !== 2} className="space-y-6">{opportunityFields}</section>
          <section data-creation-step="3" hidden={flow.step !== 3} className="space-y-6">
            <div className="creation-summary"><h3 className="text-xl font-semibold">{formData.title}</h3><dl><dt>Format</dt><dd>{projectFormat}</dd>{hasTracklist && <><dt>Songs</dt><dd>{songs.length}</dd></>}<dt>Collaboration</dt><dd>{seeking ? offer.need : 'Not seeking'}</dd>{seeking && <><dt>Compensation</dt><dd>{offer.compensation.kind === 'split' ? `${offer.compensation.percent}% royalties` : `USD ${offer.compensation.amount}`}</dd><dt>Song</dt><dd>{scope === '' ? 'Entire project' : songs[Number(scope)]?.title}</dd><dt>Deliverable</dt><dd>{offer.deliverable}</dd></>}</dl>{seeking && offer.requirements && <details><summary className="min-h-11 cursor-pointer text-sm">Terms</summary><p className="text-sm text-muted whitespace-pre-wrap">{offer.requirements}</p></details>}</div>
            {fundingFields}{statusField}
          </section>
        </fieldset>
        {(createProject.error || updateProject.error || opportunityError) && <p role="alert" className="text-sm text-danger">{opportunityError || createProject.error?.message || updateProject.error?.message}</p>}
      </CreationFrame>
    </form>
  </div>;

  return (
    <div className="glass-band rounded-[32px] p-6 lg:p-10 space-y-8 animate-fade-in relative border-accent/10 shadow-2xl">
      <button
        onClick={onClose}
        disabled={songEditing.busy}
        className="absolute top-6 right-8 text-muted hover:text-cream text-[10px] voice cursor-pointer p-2"
      >
        CANCEL
      </button>

      <div>
        <h2 className="text-2xl font-display font-bold text-ink text-veil">
          {project ? "Edit Project" : "New Project"}
        </h2>
        <p className="text-muted text-sm mt-1">Shape your next release and invite collaborators.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {identityFields}{statusField}
        {pitchField}
        {storyField}
        {coverField}
        {songFields}
        {opportunityFields}
        {fundingFields}
        {(createProject.error || updateProject.error || deleteProject.error || opportunityError) && (
          <p role="alert" className="text-sm text-danger">
        {opportunityError || (createProject.error || updateProject.error || deleteProject.error)?.message}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/5">
          <button
            type="submit"
            disabled={isPending || songEditing.dirty || songEditing.busy}
            className="flex-1 py-4 bg-cream text-bg rounded-full font-bold voice text-xs hover:bg-white transition disabled:opacity-50 cursor-pointer shadow-lg"
          >
            {isPending ? "SAVING..." : "SAVE PROJECT"}
          </button>
          {project && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteProject.isPending || songEditing.busy}
              className="py-4 px-8 glass-band-strong text-danger border-danger/20 rounded-full font-bold voice text-xs hover:bg-danger/10 transition disabled:opacity-50 cursor-pointer"
            >
              DELETE
            </button>
          )}
        </div>
      </form>
      {songEditing.dirty && <p className="text-sm text-muted">Save or reload your song-list changes before saving project details.</p>}
      {project && isServerMode() && <ProjectOffers projectId={project.id} ownerId={project.artistId}/> }
      {project && isServerMode() && musicalProject(project.category) && <SongManager projectId={project.id} status={project.status} onStateChange={setSongEditing}/>}
    </div>
  );
}
