import { SectionSkeleton } from '@/components/loading-states';
import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { ShareSurface, ShareOverlay } from '@/components/ui/share-surface';
import { ArrowUpRight, Check, LoaderCircle, MapPin, Plus, RotateCw, X } from 'lucide-react';
import { Link } from 'wouter';
import { creativeRoleTaxonomy, getLocalStore, musicalGenreTaxonomy, type Artist } from '@nebula/local';
import { StaticFace } from '@/components/blob-face';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useArtistFollowState } from '@/features/following';
import type { DemoPost } from './demo-posts';
import './artist-preview.css';

function ArtistFace({ picture, name, id, initials }: { picture?: string | null; name: string; id?: number; initials: string }) {
  return <Avatar className="discovery-artist-face" aria-hidden="true">
    <AvatarImage src={picture ?? undefined} alt="" />
    <AvatarFallback>{id ? <StaticFace seed={id} size={48} /> : <span>{initials || name.slice(0, 2)}</span>}</AvatarFallback>
  </Avatar>;
}

function ArtistDetails({ artist }: { artist: Artist }) {
  const roles = artist.creativeRoles?.flatMap(id => creativeRoleTaxonomy.find(item => item.id === id)?.label ?? []) ?? [];
  const genres = artist.genreIds?.flatMap(id => musicalGenreTaxonomy.find(item => item.id === id)?.label ?? []) ?? [];
  const genre = genres.length ? genres.slice(0, 3).join(' / ') : artist.genre;
  // Match the public profile's treatment of the old presentation-only biography.
  const biography = artist.bio === 'Music by gramz. Explore releases, collaborations and short performances. Catalog audio previews are silent; videos include their original sound.'
    || artist.name === 'CHILZ' && artist.bio === 'Explore the releases, songs and collaborations of CHILZ.' ? ''
    : artist.name === 'SANNFERNNA' && artist.bio === 'LUNA presentation artist. Original recording by gramz & SANNFERNNA.' ? 'Original recording of LUNA with gramz.' : artist.bio;
  return <div className="discovery-artist-card-details">
    {!!roles.length && <p className="discovery-artist-roles">{roles.slice(0, 3).join(' · ')}</p>}
    {genre && <p className="discovery-artist-genres">{genre}</p>}
    {biography && <p className="discovery-artist-bio">{biography}</p>}
    {artist.basedIn && <p className="discovery-artist-location"><MapPin size={13} aria-hidden="true" />{artist.basedIn}</p>}
    {artist.collaborationAvailability === 'open' && <p className="discovery-artist-availability"><span aria-hidden="true" />Open to collaborate</p>}
    {artist.collaborationAvailability === 'limited' && <p className="discovery-artist-availability">Limited availability</p>}
  </div>;
}

export function DiscoveryArtistPreview({ post, live, active }: { post: DemoPost; live: boolean; active: boolean }) {
  const follow = useArtistFollowState(post.artistId ?? 0, live && active && !!post.artistId);
  const hasProfile = live && follow.available && !!post.artistId;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null), content = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const headingId = useId(), cardId = useId();
  const profile = useQuery({
    queryKey: ['discovery-artist-preview', follow.identity, post.artistId],
    queryFn: () => getLocalStore().getPublicArtist(post.artistId!),
    enabled: hasProfile && active && open,
    staleTime: 60_000,
    retry: false,
  });
  const artist = profile.data?.artist;
  const following = follow.query.data?.isFollowing ?? false;
  const changeOpen = (next: boolean) => setOpen(next && active);
  useEffect(() => { if (!active) setOpen(false); }, [active]);

  function toggleFollow() {
    if (follow.query.isError) { void follow.query.refetch(); return; }
    if (!follow.canFollow || !follow.query.data || follow.change.isPending) return;
    follow.change.mutate(undefined, { onError: () => { if (activeRef.current) { setOpen(true); } } });
  }

  return <div className="discovery-artist" data-artist-id={post.artistId}>
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>
        <button ref={trigger} type="button" className="discovery-artist-trigger" aria-label={`About ${post.author}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? cardId : undefined}
          data-artist-id={post.artistId}>
          <ArtistFace picture={post.artistPicture} name={post.author} id={post.artistId} initials={post.initials} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <ShareOverlay />
        <ShareSurface ref={content} id={cardId} className="discovery-artist-card" aria-labelledby={headingId} aria-describedby={undefined}
          onCloseAutoFocus={event => { event.preventDefault(); if (trigger.current?.isConnected) trigger.current.focus({preventScroll:true}); }}>
          <div className="app-modal-body">
          <header className="discovery-artist-card-header">
            <ArtistFace picture={artist?.picture ?? post.artistPicture} name={artist?.name ?? post.author} id={post.artistId} initials={post.initials} />
            <div><p className="discovery-artist-kicker">artist / nebula</p><Dialog.Title id={headingId}>{artist?.name ?? post.author}</Dialog.Title>{artist?.username && <p className="discovery-artist-username">{artist.username.startsWith('@') ? artist.username : `@${artist.username}`}</p>}</div>
            <Dialog.Close className="discovery-artist-card-close app-modal-close" aria-label="Close artist preview"><X size={16} aria-hidden="true" /></Dialog.Close>
          </header>
          {hasProfile ? <>
            {profile.isPending && <SectionSkeleton variant="list" label="Loading artist details" rows={1} className="py-3 [&_.loading-avatar]:hidden [&_.loading-row-end]:hidden [&_.loading-list-row]:border-0 [&_.loading-list-row]:min-h-0 [&_.loading-list-row]:py-0"/>}
            {artist && <ArtistDetails artist={artist} />}
            {profile.isError && <div className="discovery-artist-card-state"><p role="alert">{artist ? 'Artist details may be out of date.' : 'Artist details are unavailable.'}</p><button onClick={() => void profile.refetch()} disabled={profile.isFetching}>Retry artist details</button></div>}
            {profile.data === null && <p className="discovery-artist-card-state">This artist profile is unavailable.</p>}
          </> : <p className="discovery-artist-card-state">Artist profile unavailable.</p>}
          {hasProfile && follow.canFollow && follow.query.isError && <div className="discovery-artist-card-state"><p role="alert">Follow information is unavailable.</p><button onClick={() => void follow.query.refetch()} disabled={follow.query.isFetching}>Retry follow information</button></div>}
          {follow.change.error && <p className="discovery-artist-card-error" role="alert">{follow.change.error.message} Try again.</p>}
          {hasProfile && <footer className="discovery-artist-card-footer">
            {follow.canFollow && follow.query.data && !follow.query.isError && <span className="discovery-artist-follow-status">{following ? <><Check size={13} aria-hidden="true" />Following</> : 'Not following'}</span>}
            <Link href={`/artist/${post.artistId}`} onClick={() => changeOpen(false)}>View profile <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </footer>}
          </div>
        </ShareSurface>
      </Dialog.Portal>
    </Dialog.Root>
    {hasProfile && (!follow.user ? <Link href="/login" className="discovery-follow-button discovery-artist-follow" aria-label="Sign in to follow" title={`Sign in to follow ${post.author}`}><span><Plus size={15} aria-hidden="true" /></span></Link>
      : follow.canFollow && <button type="button" className="discovery-follow-button discovery-artist-follow" aria-label={follow.query.isError ? 'Retry follow information' : !follow.query.data ? 'Loading follow status' : following ? 'Following' : 'Follow'} aria-pressed={follow.query.data ? following : undefined}
        title={follow.query.isError ? 'Follow information unavailable. Retry.' : following ? `Unfollow ${post.author}` : `Follow ${post.author}`} disabled={follow.change.isPending || !follow.query.data && !follow.query.isError || follow.query.isError && follow.query.isFetching}
        data-pending={follow.change.isPending} onClick={toggleFollow}>
        <span>{follow.change.isPending ? <LoaderCircle size={14} aria-hidden="true" /> : follow.query.isError ? <RotateCw size={13} aria-hidden="true" /> : following ? <Check size={14} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}</span>
      </button>)}
    <span className="sr-only" role="status">{follow.change.isSuccess && follow.query.data ? `${following ? 'Following' : 'Unfollowed'} ${post.author}.` : ''}</span>
  </div>;
}
