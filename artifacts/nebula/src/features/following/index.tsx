import { SectionSkeleton } from '@/components/loading-states';
import { StaticFace } from '@/components/blob-face';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import './following.css';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { apiRequest, isServerMode } from '@nebula/local';
import { useAuth } from '@/context/AuthContext';
import { controlStyles } from '@/components/antiq/workspace';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTitle } from '@/components/ui/dialog';

type Summary = { followers:number; following:number; isFollowing:boolean };
type FollowPage = { items:{id:number;name:string;picture:string|null;isFollowing:boolean}[]; nextCursor:number|null };
const prefixes = ['artist-social','artist-follow-list','opportunity-projects','home-suggestions','share-targets'];
export function useFollowSync() {
  const client = useQueryClient();
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('nebula-follow-changes');
    channel.onmessage = () => { void client.invalidateQueries({ predicate:q=>prefixes.includes(String(q.queryKey[0])) }); };
    return () => channel.close();
  },[client]);
}
function useViewer() {
  const { user } = useAuth();
  return { user, identity:user ? `${user.role}:${user.artistId ?? user.investorId}` : 'guest' };
}
function useFollowMutation(artistId:number,following:boolean) {
  const client=useQueryClient();
  return useMutation({mutationFn:()=>apiRequest<Summary>(`/api/artists/${artistId}/follow`,{method:following?'DELETE':'PUT'}),onSuccess:async()=>{
    if (typeof BroadcastChannel !== 'undefined') { const channel=new BroadcastChannel('nebula-follow-changes'); channel.postMessage('changed');channel.close(); }
    await client.invalidateQueries({predicate:q=>prefixes.includes(String(q.queryKey[0]))});
  }});
}
function useShortcutSocial(artistId:number,identity:string,nearby:boolean) {
  return useQuery({queryKey:['artist-social',identity,artistId],queryFn:({signal})=>apiRequest<Summary>(`/api/artists/${artistId}/social`,{signal}),enabled:nearby,refetchInterval:nearby?15000:false,staleTime:15000});
}

// Discovery's avatar is another presentation of the same relationship, never a
// separate local follow flag. Its caller owns the active-post/open-card boundary.
export function useArtistFollowState(artistId:number,active:boolean) {
  const {user,identity}=useViewer();
  const available=isServerMode();
  const canFollow=available && user?.role==='artist' && user.artistId!==artistId;
  const query=useShortcutSocial(artistId,identity,active && canFollow);
  const change=useFollowMutation(artistId,query.data?.isFollowing??false);
  return {user,identity,available,canFollow,query,change};
}

function FollowButton({artistId,following,compact=false,profile=false}:{artistId:number;following:boolean;compact?:boolean;profile?:boolean}) {
  const {user}=useViewer();
  const change=useFollowMutation(artistId,following);
  const buttonClass=profile?'artist-profile-social-action':compact?'discovery-follow-button':controlStyles.button;
  if (!user) return <Link href="/login" className={buttonClass}>Sign in to follow</Link>;
  if (user.role !== 'artist' || user.artistId === artistId) return null;
  return <div className={profile?'artist-profile-follow-control':'space-y-1'}><button className={buttonClass} aria-pressed={following} title={following?'Unfollow artist':'Follow artist'} disabled={change.isPending} onClick={()=>change.mutate()}>{change.isPending?'Updating…':following?'Following':'Follow'}</button>{change.error && <p role="alert" className="text-xs text-danger max-w-64">{change.error.message} Try again.</p>}</div>;
}
export function ArtistFollowControls({artistId,variant='default',actions}:{artistId:number;variant?:'default'|'profile';actions?:ReactNode}) {
  const {identity}=useViewer();
  return isServerMode() ? <SocialControls key={`${identity}:${artistId}`} artistId={artistId} identity={identity} profile={variant==='profile'} actions={actions} /> : <><p className="text-xs text-muted">Following is unavailable. Please try again later.</p>{variant==='profile' && actions && <div className="artist-profile-social-actions">{actions}</div>}</>;
}
function SocialControls({artistId,identity,profile=false,actions}:{artistId:number;identity:string;profile?:boolean;actions?:ReactNode}) {
  useFollowSync();
  const [direction,setDirection]=useState<'followers'|'following'|null>(null);
  const trigger=useRef<HTMLButtonElement|null>(null);
  const query=useQuery({queryKey:['artist-social',identity,artistId],queryFn:({signal})=>apiRequest<Summary>(`/api/artists/${artistId}/social`,{signal}),refetchInterval:15000,staleTime:0});
  const list=useInfiniteQuery({queryKey:['artist-follow-list',identity,artistId,direction],enabled:!!direction,initialPageParam:null as number|null,
    queryFn:({pageParam,signal})=>apiRequest<FollowPage>(`/api/artists/${artistId}/${direction}${pageParam?`?before=${pageParam}`:''}`,{signal}),
    getNextPageParam:page=>page.nextCursor??undefined,refetchInterval:15000,staleTime:0});
  if (query.isPending) return profile ? <div className="artist-profile-connections"><SectionSkeleton variant="tabs" label="Loading follow information" className="max-w-sm"/>{actions && <div className="artist-profile-social-actions">{actions}</div>}</div> : <SectionSkeleton variant="tabs" label="Loading follow information" className="max-w-sm"/>;
  if (query.isError) return profile ? <div className="artist-profile-connections"><p role="alert">Follow information unavailable.</p><div className="artist-profile-social-actions"><button className="artist-profile-social-action" onClick={()=>void query.refetch()}>Retry follow information</button>{actions}</div></div> : <div><p role="alert">Follow information unavailable.</p><button className={controlStyles.button} onClick={()=>void query.refetch()}>Retry follow information</button></div>;
  const items=[...new Map((list.data?.pages.flatMap(p=>p.items)??[]).map(a=>[a.id,a])).values()];
  const counts=(['followers','following'] as const).map(kind=><button key={kind} className={profile?'artist-profile-connection-count':controlStyles.button} onClick={event=>{trigger.current=event.currentTarget;setDirection(kind);}} aria-label={`${query.data[kind]} ${kind}`}><strong>{query.data[kind]}</strong> <span>{kind}</span></button>);
  return <div className={profile?'artist-profile-connections':'flex flex-wrap gap-3 items-center'}>
    {profile ? <div className="artist-profile-connection-counts">{counts}</div> : counts}
    {profile ? <div className="artist-profile-social-actions"><FollowButton artistId={artistId} following={query.data.isFollowing} profile />{actions}</div> : <FollowButton artistId={artistId} following={query.data.isFollowing} />}
    <Dialog open={!!direction} onOpenChange={open=>{if(!open)setDirection(null);}}>
      <DialogPortal><DialogOverlay className="z-[80]" /><DialogPrimitive.Content className="follow-panel" aria-describedby={undefined} onCloseAutoFocus={event=>{event.preventDefault();if(trigger.current?.isConnected)trigger.current.focus();}}>
        <header className="pr-12 shrink-0"><DialogClose className="absolute top-3 right-3 min-h-11 min-w-11 flex items-center justify-center" aria-label="Close artist connections"><X size={20} aria-hidden /></DialogClose>
        <DialogTitle>{direction==='followers'?'Followers':'Following'}</DialogTitle></header>
        <div className="min-h-0 overflow-y-auto space-y-4">{list.isPending?<SectionSkeleton variant="list" label="Loading artists" rows={4}/>:list.isError?<div><p role="alert">{list.error.message}</p><button className={controlStyles.button} onClick={()=>void list.refetch()}>Retry artists</button></div>:<>
          {!items.length && <p className="text-muted">{direction==='followers'?'No followers yet.':'Not following any artists yet.'}</p>}
          <ul className="space-y-4 min-w-0">{items.map(a=><li key={a.id} className="flex flex-wrap gap-3 items-center border-b border-border pb-3"><Link href={`/artist/${a.id}`} onClick={()=>setDirection(null)} className="flex min-h-11 gap-3 items-center flex-1 min-w-0"><Avatar aria-hidden="true"><AvatarImage src={a.picture??undefined} alt=""/><AvatarFallback><StaticFace seed={a.id} size={40}/></AvatarFallback></Avatar><span className="break-words min-w-0">{a.name}</span></Link><FollowButton artistId={a.id} following={a.isFollowing}/></li>)}</ul>
          {list.isFetchingNextPage && <SectionSkeleton variant="list" label="Loading more artists" rows={1}/>}
          {list.hasNextPage && <button className={controlStyles.button} disabled={list.isFetchingNextPage} aria-busy={list.isFetchingNextPage} onClick={()=>void list.fetchNextPage()}>Load more artists</button>}
        </>}</div>
      </DialogPrimitive.Content></DialogPortal>
    </Dialog>
  </div>;
}

// Same identity-scoped social cache and mutation as public artist profiles.
export function ArtistFollowShortcut({artistId,nearby}:{artistId:number;nearby:boolean}) {
  const {user,identity}=useViewer();
  if (!isServerMode() || user?.role==='investor' || user?.artistId===artistId) return null;
  if (!user) return <Link href="/login" className="discovery-follow-button">Sign in to follow</Link>;
  return <FollowShortcut key={`${identity}:${artistId}`} artistId={artistId} identity={identity} nearby={nearby}/>;
}
function FollowShortcut({artistId,identity,nearby}:{artistId:number;identity:string;nearby:boolean}) {
  const query=useShortcutSocial(artistId,identity,nearby);
  if(query.isError) return <button className="discovery-follow-button" title="Follow information unavailable" onClick={()=>void query.refetch()}>Retry Follow</button>;
  if(!query.data) return <button className="discovery-follow-button" disabled aria-label="Loading follow status">Follow</button>;
  return <FollowButton artistId={artistId} following={query.data.isFollowing} compact/>;
}
