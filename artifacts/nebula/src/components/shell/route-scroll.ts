import { useLayoutEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useAuth } from '@/context/AuthContext';

/** Reset page surfaces, keeping media timelines and in-page controls intact. */
function scrollPageToTop() {
  window.scrollTo({ top: 0, behavior: 'instant' });
  for (const element of document.querySelectorAll<HTMLElement>(
    'html,body,.app-shell,.shell-content,.shell-page,[data-page-scroll],.shell-page .overflow-y-auto,.shell-page .overflow-auto,.shell-page .overflow-y-scroll,.shell-page .overflow-scroll',
  )) {
    // Discovery selects its first/linked publication through its own snap controller.
    if (element.matches('.discovery-feed,input,textarea,select') || element.closest('[role="dialog"],[role="menu"]')) continue;
    if (element.scrollTop !== 0) element.scrollTo({ top: 0, behavior: 'instant' });
  }
}

/** New routes, history entries and reopening the current page all start at its top. */
export function useRouteScrollTop() {
  const [path] = useLocation(), search = useSearch(), { user } = useAuth();
  const identity = user ? `${user.role}:${user.artistId ?? user.investorId}` : 'guest';
  useLayoutEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    return () => { history.scrollRestoration = previous; };
  }, []);
  useLayoutEffect(() => {
    scrollPageToTop();
    let frame = requestAnimationFrame(scrollPageToTop);
    const reselect = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.hasAttribute('download') || link.getAttribute('aria-disabled') === 'true' || link.target && link.target !== '_self') return;
      const url = new URL(link.href, window.location.href);
      if (url.hash || link.getAttribute('href')?.startsWith('#') || url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search) return;
      scrollPageToTop();
      cancelAnimationFrame(frame); frame = requestAnimationFrame(scrollPageToTop);
    };
    document.addEventListener('click', reselect, true);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('click', reselect, true); };
  }, [path, search, identity]);
}
