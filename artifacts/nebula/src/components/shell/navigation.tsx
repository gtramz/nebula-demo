import { Fragment } from 'react';
import { Link, useLocation } from 'wouter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { StaticFace } from '@/components/blob-face';
import { DISCOVERY_REFRESH } from '@/features/discovery/refresh-event';
import { Bookmark, MessageCircle, Compass, Clapperboard, Home, Search, HeartHandshake, UserCircle, LogIn, UserPlus, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { AntiqLogo } from '@/components/antiq-logo';
import { NotificationBell } from '@/features/notifications';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { projectDestination } from './project-destination';
import { useNavigationSection } from './return-context';
import { CreateShortcut } from './create-shortcut';
import { AccountMenu } from './account-menu';

const routes = [
  { href: '/discovery', label: 'discovery', icon: Compass, match: (path: string) => path === '/discovery' },
  { href: '/explore', label: 'explore', icon: Home, match: (path: string) => path === '/explore' },
  { href: '/search', label: 'search', icon: Search, match: (path: string) => path.startsWith('/search') },
  { href: '/pledges', label: 'pledges', icon: HeartHandshake, authOnly: true, match: (path: string) => path.startsWith('/pledges') || path.startsWith('/received') },
  { href: '/messages', label: 'messages', icon: MessageCircle, artistOnly: true, match: (path: string) => path.startsWith('/messages') || path.startsWith('/collaborations') },
  { href: '/saved', label: 'saved', icon: Bookmark, authOnly: true, match: (path: string) => path === '/saved' },
  { href: '/profile', label: 'profile', icon: UserCircle, authOnly: true, match: (path: string) => path.startsWith('/profile') },
];

export function Navigation({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const section = useNavigationSection();
  const orderedRoutes = isMobile ? [routes[1], routes[0], ...routes.slice(2)] : routes;
  const receivedInProfile = isMobile && (section === '/saved' || user?.role === 'artist' && location.startsWith('/received'));
  const collapseLabel = expanded ? 'Collapse sidebar' : 'Expand sidebar';
  const accountTools = <div className="navigation-account-tools">
    <Tooltip><TooltipTrigger asChild><button type="button" aria-label={collapseLabel} aria-expanded={expanded} aria-controls="primary-navigation" onClick={onToggle} className="sidebar-link navigation-collapse text-muted" title={collapseLabel}>
      <span className="nav-icon">{expanded ? <PanelLeftClose aria-hidden size={22} /> : <PanelLeftOpen aria-hidden size={22} />}</span>
    </button></TooltipTrigger><TooltipContent side="right" className="navigation-tooltip">{collapseLabel}</TooltipContent></Tooltip>
    <NotificationBell navigation />
  </div>;
  return <div className="app-navigation fixed inset-x-0 bottom-0 z-40 bg-bg border-t border-border md:inset-x-auto md:left-0 md:top-0 md:border-t-0 md:border-r" data-testid="app-navigation">
    <div className="hidden md:flex flex-col gap-4 mb-6">
      <Link href="/explore" aria-label={`go to ${projectDestination(user?.role).toLowerCase()}`} className="sidebar-link text-ink font-display text-xl font-bold">
        <span className="nav-icon"><AntiqLogo className="h-9 w-6" imageScaleClass="h-[272%] w-auto" /></span><span className="sidebar-label">nebula</span>
      </Link>
    </div>
    <nav id="primary-navigation" aria-label="Primary navigation" data-artist={user?.role === 'artist' || undefined} className="primary-navigation flex items-stretch md:flex-col md:gap-2">
      {!isMobile && <CreateShortcut />}
      {orderedRoutes.filter(route => (!route.authOnly || isAuthenticated) && (!route.artistOnly || user?.role === "artist")).map(route => {
        const received = route.href === '/pledges' && user?.role === 'artist';
        const label = received ? 'received' : route.href === '/explore' ? projectDestination(user?.role).toLowerCase() : route.label;
        const displayLabel = route.href === '/profile' ? user?.name.trim() || label : label;
        const href = received ? '/received' : route.href;
        const active = receivedInProfile ? route.href === '/profile' : route.href === section;
        const Icon = isMobile && route.href === '/discovery' ? Clapperboard : route.icon;
        const accountFooter = route.href === '/profile' ? <div className="navigation-account-spacer hidden md:block">{accountTools}</div> : null;
        if (route.href === '/profile' && user && !isMobile) return <Fragment key={route.href}>
          {accountFooter}
          <AccountMenu key={`${user.role}:${user.artistId ?? user.investorId}`} user={user} active={active}>
            <span className="nav-icon"><Avatar key={`${user.role}:${user.artistId ?? user.investorId}:${user.picture}`} className="h-8 w-8"><AvatarImage src={user.picture || undefined} alt="" className="object-cover" /><AvatarFallback><StaticFace seed={user.artistId ?? user.investorId ?? user.name} size={32} /></AvatarFallback></Avatar></span>
            <span className="sidebar-label truncate font-display text-sm font-medium">{displayLabel}</span>
          </AccountMenu>
        </Fragment>;
        return <Fragment key={route.href}>{accountFooter}<Tooltip><TooltipTrigger asChild>
          <Link href={href} onClick={event => { if (href === '/discovery' && location === '/discovery' && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); window.dispatchEvent(new Event(DISCOVERY_REFRESH)); } }} aria-label={label} aria-current={active ? 'page' : undefined} data-mobile-hidden={received || route.href === '/saved' || undefined} className="sidebar-link primary-link text-muted hover:text-ink">
            <span className="nav-icon">{route.href === '/profile' && user ? <Avatar key={`${user.role}:${user.artistId ?? user.investorId}:${user.picture}`} className="h-8 w-8"><AvatarImage src={user.picture || undefined} alt="" className="object-cover" /><AvatarFallback><StaticFace seed={user.artistId ?? user.investorId ?? user.name} size={32} /></AvatarFallback></Avatar> : <Icon aria-hidden className="h-6 w-6" strokeWidth={1.75} />}</span><span className={`sidebar-label truncate ${route.href === '/profile' ? 'font-display text-sm font-medium' : 'voice text-xs'}`} title={route.href === '/profile' ? displayLabel : undefined}>{displayLabel}</span>
          </Link>
        </TooltipTrigger><TooltipContent side="right" className="navigation-tooltip">{displayLabel}</TooltipContent></Tooltip>{isMobile && route.href === '/search' && <CreateShortcut />}</Fragment>;
      })}
    </nav>
    {!isAuthenticated && <div className="hidden md:flex flex-col gap-2 mt-auto pt-6">
        {accountTools}
        <Link href="/login" aria-label="log in" title="log in" className="sidebar-link text-muted hover:text-ink"><span className="nav-icon"><LogIn aria-hidden size={22} /></span><span className="sidebar-label text-sm">log in</span></Link>
        <Link href="/register" aria-label="sign up" title="sign up" className="sidebar-link text-ink"><span className="nav-icon"><UserPlus aria-hidden size={22} /></span><span className="sidebar-label text-sm">sign up</span></Link>
    </div>}
  </div>;
}
