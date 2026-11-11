import { useLayoutEffect, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import './scroll-progress.css';

/** A read-only indicator of the page's real scroll position; never drives scrolling. */
export function ScrollProgress() {
  const track = useRef<HTMLDivElement>(null), fill = useRef<HTMLSpanElement>(null);
  const [path] = useLocation(), search = useSearch();
  useLayoutEffect(() => {
    const bar = track.current, line = fill.current;
    if (!bar || !line) return;
    const shell = bar.closest('.app-shell') ?? document;
    const page = shell.querySelector<HTMLElement>('.shell-page');
    const documentRoot = (document.scrollingElement ?? document.documentElement) as HTMLElement;
    let root = documentRoot, frame = 0, rescan = true, disposed = false;
    let observed = new Set<Element>();
    line.style.transform = 'scaleX(0)'; bar.dataset.progress = '0';

    function schedule(scan = false) {
      if (disposed) return;
      rescan ||= scan;
      if (!frame) frame = requestAnimationFrame(paint);
    }
    const resize = new ResizeObserver(() => schedule(true));
    function selectRoot() {
      const feed = page?.querySelector<HTMLElement>('.discovery-feed');
      if (feed && feed.clientHeight > 0) return feed;
      // Only page surfaces qualify. Comment lists, navigation, dialogs and
      // textareas cannot replace the main root merely because they scroll.
      const candidates = [...shell.querySelectorAll<HTMLElement>('.shell-page [data-page-scroll]'), page, shell.querySelector<HTMLElement>('.shell-content'), shell instanceof HTMLElement ? shell : null, document.body];
      for (const element of candidates) {
        if (!element || element.closest('[role="dialog"],[role="alertdialog"],[role="menu"]') || !element.clientHeight || element.scrollHeight <= element.clientHeight + 1) continue;
        if (/^(auto|scroll)$/.test(getComputedStyle(element).overflowY)) return element;
      }
      return documentRoot;
    }
    function watchSize() {
      const targets = new Set<Element>([document.body, root]);
      if (page) targets.add(page);
      if (root.firstElementChild) targets.add(root.firstElementChild);
      if (targets.size === observed.size && [...targets].every(element => observed.has(element))) return;
      resize.disconnect(); observed = targets;
      for (const element of targets) resize.observe(element);
    }
    function paint() {
      frame = 0;
      bar!.hidden = !!document.fullscreenElement;
      // Modal scroll locking can temporarily change mobile body geometry.
      // Keep the page's last position until its scroll surface is released.
      if (document.body.hasAttribute('data-scroll-locked')) { rescan = true; return; }
      if (rescan) { rescan = false; root = selectRoot(); watchSize(); }
      const range = Math.max(0, root.scrollHeight - root.clientHeight);
      const position = root === documentRoot ? window.scrollY || root.scrollTop : root.scrollTop;
      const progress = range > 1 ? Math.min(1, Math.max(0, position / range)) : 0;
      line!.style.transform = `scaleX(${progress})`;
      bar!.dataset.progress = String(progress);
      bar!.dataset.scrollable = String(range > 1);
    }
    const scroll = (event: Event) => {
      if (event.target === root || root === documentRoot && (event.target === document || event.target === window)) schedule();
    };
    const resized = () => schedule(true);
    const content = new MutationObserver(records => {
      if (records.some(record => !(record.target instanceof Element) || !record.target.closest('[role="dialog"],[role="alertdialog"],[role="menu"]'))) schedule(true);
    });
    const lock = new MutationObserver(() => schedule(true));
    lock.observe(document.body, { attributes: true, attributeFilter: ['data-scroll-locked'] });
    if (page) content.observe(page, { childList: true, subtree: true });
    document.addEventListener('scroll', scroll, { capture: true, passive: true });
    window.addEventListener('resize', resized, { passive: true });
    document.addEventListener('fullscreenchange', resized);
    page?.addEventListener('load', resized, true);
    schedule(true);
    return () => {
      disposed = true; cancelAnimationFrame(frame); resize.disconnect(); content.disconnect(); lock.disconnect();
      document.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', resized);
      document.removeEventListener('fullscreenchange', resized); page?.removeEventListener('load', resized, true);
    };
  }, [path, search]);
  return <div ref={track} className="shell-scroll-progress" aria-hidden="true" data-testid="scroll-progress" data-progress="0" data-scrollable="false"><span ref={fill} className="shell-scroll-progress-fill"/></div>;
}
