import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useNavigationSafety } from './navigation-guard';
import { navigationScope, previousEntry } from './return-history';
import { useAuth } from '@/context/AuthContext';

type Memory = { trail: string[]; returning: boolean; values: Map<string, unknown> };
const Context = createContext<Memory | null>(null);
const empty = (): Memory => ({ trail: [], returning: false, values: new Map() });

/** Per-account, in-memory UI context, never credentials, media or server records. */
export function ReturnContext({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const identity = user ? `${user.role}:${user.artistId ?? user.investorId}` : 'guest';
  const scope = useMemo(() => navigationScope(identity), [identity]);
  useNavigationSafety(identity, scope);
  const memory = useMemo(empty, [identity]);
  const [path] = useLocation(), search = useSearch(), route = path + (search ? `?${search}` : '');
  const current = useRef(''), previousIndex = useRef<number>(Number(history.state?.__nebulaNavigationIndex ?? 0));
  if (current.current !== route || !memory.trail.length) {
    const index = Number(history.state?.__nebulaNavigationIndex ?? 0);
    const returning = !!history.state?.__nebulaReturn || index < previousIndex.current;
    memory.returning = returning;
    const previous = returning ? memory.trail.lastIndexOf(route) : -1;
    const trail = !returning && index === previousIndex.current ? memory.trail.slice(0, -1) : memory.trail;
    memory.trail = previous >= 0 ? memory.trail.slice(0, previous + 1) : returning ? [route] : [...trail.slice(-49), route];
    previousIndex.current = index;
    current.current = route;
  }
  return <Context.Provider value={memory}>{children}</Context.Provider>;
}

/** Distinguish returning to a saved view from entering an explicit shared link. */
export function useIsReturnNavigation() {
  return useContext(Context)?.returning ?? false;
}

export function useReturnTarget(fallback: string) {
  const { user } = useAuth();
  const identity = user ? `${user.role}:${user.artistId ?? user.investorId}` : 'guest';
  const scope = useMemo(() => navigationScope(identity), [identity]);
  const entry = previousEntry(history.state, identity, scope, location.pathname + location.search + location.hash);
  return { href: entry?.href ?? fallback, delta: entry ? entry.index - Number(history.state.__nebulaNavigationIndex) : null };
}

export function returnLabel(href: string) {
  const path = href.split('?')[0];
  const label = ({ '/': 'landing page', '/login': 'login', '/register': 'sign up', '/onboarding': 'artist setup', '/publish': 'publication editor', '/presentation': 'presentation tools', '/notifications': 'notifications', '/messages': 'messages', '/explore': 'Explore', '/search': 'Search', '/discovery': 'Discovery', '/profile': 'profile', '/studio': 'studio', '/studio/remix': 'Remix studio', '/saved': 'saved publications', '/collaborations': 'collaborations', '/received': 'received pledges', '/pledges': 'pledges' } as Record<string, string>)[path]
    ?? (path.startsWith('/messages/') || path.startsWith('/collaborations/') ? 'conversation' : path.startsWith('/receipt/') ? 'receipt' : path.startsWith('/publish/') ? 'publication editor' : path.startsWith('/artist/') ? 'artist' : path.startsWith('/project/') ? 'project' : 'previous page');
  return `Back to ${label}`;
}

export function useViewState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const memory = useContext(Context);
  const [value, setValue] = useState<T>(() => memory?.values.has(key) ? memory.values.get(key) as T : typeof initial === 'function' ? (initial as () => T)() : initial);
  const update: Dispatch<SetStateAction<T>> = next => setValue(previous => {
    const result = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;
    memory?.values.set(key, result); return result;
  });
  return [value, update];
}

// Store context on the history entry, so reload and both history directions agree.
export function useNavigationSection() {
  const memory = useContext(Context), [path] = useLocation(), { user } = useAuth();
  const identity = user ? `${user.role}:${user.artistId ?? user.investorId}` : 'guest';
  const primary = (route: string): string | undefined => {
    const p = route.split('?')[0];
    if (p === '/' || p === '/login' || p === '/register') return '';
    if(/^\/(onboarding|studio|publish)(\/|$)/.test(p)) return '/profile';
    if (/^\/(messages|collaborations)(\/|$)/.test(p)) return '/messages';
    if (/^\/(pledges|received|receipt)(\/|$)/.test(p)) return '/pledges';
    return ['/discovery','/explore','/search','/profile','/saved'].find(x => p === x || p.startsWith(x + '/'));
  };
  const entry = history.state?.__nebulaSection;
  const section = primary(path) ?? (entry?.identity === identity ? entry.section : undefined)
    ?? [...(memory?.trail ?? [])].slice(0,-1).reverse().map(primary).find(x => x)
    ?? (path.startsWith('/studio') || path === '/publish' ? '/profile' : '/explore');
  useLayoutEffect(() => { history.replaceState({ ...history.state, __nebulaSection: { identity, section } }, ''); }, [path, identity, section]);
  return section;
}
