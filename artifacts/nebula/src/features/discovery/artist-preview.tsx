import { SectionSkeleton } from '@/components/loading-states';
import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Popover from '@radix-ui/react-popover';
import { ArrowUpRight, Check, LoaderCircle, MapPin, Plus, RotateCw, X } from 'lucide-react';
import { Link } from 'wouter';
import { creativeRoleTaxonomy, getLocalStore, musicalGenreTaxonomy, type Artist } from '@nebula/local';
import { StaticFace } from '@/components/blob-face';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useArtistFollowState } from '@/features/following';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const compact = useIsMobile();
  const follow = useArtistFollowState(post.artistId ?? 0, live && active && !!post.artistId);
  const hasProfile = live && follow.available && !!post.artistId;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null), content = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), pinned = useRef(false), restoreFocus = useRef(false), activeRef = useRef(active);
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
  const clearTimer = () => { clearTimeout(timer.current); timer.current = undefined; };
  const changeOpen = (next: boolean) => { clearTimer(); if (!next) pinned.current = false; setOpen(next && active); };
  const scheduleClose = () => {
    clearTimer();
    if (!pinned.current && !content.current?.contains(document.activeElement)) timer.current = setTimeout(() => changeOpen(false), 220);
  };
  const hover = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !active) return;
    clearTimer(); timer.current = setTimeout(() => setOpen(true), 140);
  };
  useEffect(() => { if (!active) { clearTimeout(timer.current); pinned.current = false; setOpen(false); } }, [active]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function toggleFollow() {
    if (follow.query.isError) { void follow.query.refetch(); return; }
    if (!follow.canFollow || !follow.query.data || follow.change.isPending) return;
    follow.change.mutate(undefined, { onError: () => { if (activeRef.current) { pinned.current = true; setOpen(true); } } });
  }

  return <div className="discovery-artist" data-artist-id={post.artistId}>
    <Popover.Root open={open} onOpenChange={changeOpen} modal={false}>
      <Popover.Anchor asChild>
        <button ref={trigger} type="button" className="discovery-artist-trigger" aria-label={`About ${post.author}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? cardId : undefined}
          data-artist-id={post.artistId} onPointerEnter={hover} onPointerLeave={scheduleClose}
          onClick={() => {
            const next = !open || !pinned.current; pinned.current = next; changeOpen(next);
            if (next) requestAnimationFrame(() => content.current?.querySelector<HTMLElement>('button,a')?.focus({ preventScroll: true }));
          }}>
          <ArtistFace picture={post.artistPicture} name={post.author} id={post.artistId} initials={post.initials} />
        </button>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content ref={content} id={cardId} className="discovery-artist-card" side={compact ? 'top' : 'left'} align={compact ? 'end' : 'start'} sideOffset={12} collisionPadding={12} aria-labelledby={headingId} onFocusCapture={() => { restoreFocus.current = true; }}
          onPointerEnter={clearTimer} onPointerLeave={scheduleClose} onKeyDown={event => event.stopPropagation()}
          onOpenAutoFocus={event => { if (!pinned.current) event.preventDefault(); }}
          onInteractOutside={event => { if (trigger.current?.contains(event.detail.originalEvent.target as Node)) event.preventDefault(); }}
          onCloseAutoFocus={event => {
            event.preventDefault();
            if (restoreFocus.current && (document.activeElement === document.body || content.current?.contains(document.activeElement))) trigger.current?.focus({ preventScroll: true });
            restoreFocus.current = false;
          }}>
          <header className="discovery-artist-card-header">
            <ArtistFace picture={artist?.picture ?? post.artistPicture} name={artist?.name ?? post.author} id={post.artistId} initials={post.initials} />
            <div><p className="discovery-artist-kicker">artist / nebula</p><h3 id={headingId}>{artist?.name ?? post.author}</h3>{artist?.username && <p className="discovery-artist-username">{artist.username.startsWith('@') ? artist.username : `@${artist.username}`}</p>}</div>
            <Popover.Close className="discovery-artist-card-close" aria-label="Close artist preview"><X size={16} aria-hidden="true" /></Popover.Close>
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
    {hasProfile && (!follow.user ? <Link href="/login" className="discovery-follow-button discovery-artist-follow" aria-label="Sign in to follow" title={`Sign in to follow ${post.author}`}><span><Plus size={15} aria-hidden="true" /></span></Link>
      : follow.canFollow && <button type="button" className="discovery-follow-button discovery-artist-follow" aria-label={follow.query.isError ? 'Retry follow information' : !follow.query.data ? 'Loading follow status' : following ? 'Following' : 'Follow'} aria-pressed={follow.query.data ? following : undefined}
        title={follow.query.isError ? 'Follow information unavailable. Retry.' : following ? `Unfollow ${post.author}` : `Follow ${post.author}`} disabled={follow.change.isPending || !follow.query.data && !follow.query.isError || follow.query.isError && follow.query.isFetching}
        data-pending={follow.change.isPending} onClick={toggleFollow}>
        <span>{follow.change.isPending ? <LoaderCircle size={14} aria-hidden="true" /> : follow.query.isError ? <RotateCw size={13} aria-hidden="true" /> : following ? <Check size={14} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}</span>
      </button>)}
    <span className="sr-only" role="status">{follow.change.isSuccess && follow.query.data ? `${following ? 'Following' : 'Unfollowed'} ${post.author}.` : ''}</span>
  </div>;
}
