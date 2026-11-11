import { useCallback, useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import './feed-scroll.css';

const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"]';
const overlay = '[role="dialog"],[role="menu"],[role="listbox"]';

function ownsScroll(target: EventTarget | null, feed: HTMLElement) {
  if (!(target instanceof Element)) return false;
  for (let element: Element | null = target; element && element !== feed; element = element.parentElement) {
    if (element.matches(overlay)) return true;
    if (element.scrollHeight > element.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(element).overflowY)) return true;
  }
  return false;
}

type ScrollOptions = {
  feed: RefObject<HTMLDivElement | null>;
  cards: RefObject<(HTMLElement | null)[]>;
  activeIndex: number;
  activeIndexRef: RefObject<number>;
  count: number;
  order: string;
  blocked: boolean;
  onSelect: (index: number) => void;
};
type Controller = { moveTo: (index: number, instant?: boolean) => boolean; reconcile: () => void };

/** Touch stays compositor-driven. React/media selection changes only at a snap
 * boundary; wheel momentum is one intent, rather than a series of new posts. */
export function useDiscoveryScroll(options: ScrollOptions) {
  const latest = useRef(options); latest.current = options;
  const controller = useRef<Controller | null>(null);

  useLayoutEffect(() => {
    const container = latest.current.feed.current;
    if (!container) return;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let height = container.clientHeight, selected = latest.current.activeIndex, target: number | null = null;
    let aligning = false, touching = false, moving = false, frame = 0;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let lastWheel = -Infinity, wheelDelta = 0, wheelConsumed = false;

    const locked = () => latest.current.blocked || document.body.hasAttribute('data-scroll-locked');
    const clearSettle = () => { clearTimeout(settleTimer); settleTimer = undefined; };
    const markMoving = (next: boolean) => {
      if (moving === next) return;
      moving = next;
      if (next) container.dataset.scrolling = 'true'; else delete container.dataset.scrolling;
    };
    const select = (index: number) => {
      selected = index;
      const current = latest.current;
      if (index === current.activeIndexRef.current) return;
      current.cards.current[current.activeIndexRef.current]?.querySelectorAll<HTMLMediaElement>('audio,video').forEach(media => media.pause());
      current.activeIndexRef.current = index;
      current.onSelect(index);
    };
    const settle = () => {
      clearSettle();
      if (aligning || touching || !height) return;
      // A menu can lock body without changing Discovery props. Cancel back to
      // the audible/selected post rather than completing behind that overlay.
      if (locked()) { align(latest.current.activeIndexRef.current); return; }
      const index = Math.max(0, Math.min(latest.current.count - 1, Math.round(container.scrollTop / height)));
      // A quiet timer may release an interrupted gesture, but it cannot activate
      // half-visible media. A real snap boundary is required with either API.
      if (Math.abs(container.scrollTop - index * height) > 2) { target = null; markMoving(false); return; }
      target = null;
      markMoving(false);
      select(index);
    };
    const scheduleSettle = () => {
      clearSettle(); settleTimer = setTimeout(settle, 120);
    };
    const align = (index: number) => {
      const interrupted = target !== null || moving;
      clearSettle(); cancelAnimationFrame(frame);
      target = null; aligning = true; markMoving(false);
      const top = index * height;
      if (interrupted || Math.abs(container.scrollTop - top) > 1) container.scrollTo({ top, behavior: 'instant' });
      frame = requestAnimationFrame(() => {
        // Chromium can deliver one queued compositor position after cancelling
        // a smooth scroll. Correct that residual once, without a polling loop.
        if (Math.abs(container.scrollTop - top) > 1) container.scrollTo({ top, behavior: 'instant' });
        aligning = false;
      });
    };
    const moveTo = (index: number, instant = false) => {
      const current = latest.current;
      if (!height || locked() || index < 0 || index >= current.count || index === current.activeIndexRef.current || target !== null || touching) return false;
      target = index; markMoving(true);
      container.scrollTo({ top: index * height, behavior: instant || reducedMotion.matches ? 'instant' : 'smooth' });
      if (instant || reducedMotion.matches) settle(); else scheduleSettle();
      return true;
    };
    const onScroll = () => {
      if (aligning || locked()) return;
      markMoving(true); scheduleSettle();
    };
    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY) || !event.deltaY) return;
      if (event.target instanceof Element && event.target.closest(editable)) return;
      if (ownsScroll(event.target, container)) return;
      if (!event.cancelable) return;
      event.preventDefault();
      if (locked()) return;
      const now = performance.now();
      if (now - lastWheel > 180 && target === null) { wheelDelta = 0; wheelConsumed = false; }
      lastWheel = now;
      if (wheelConsumed || target !== null) return;
      wheelDelta += event.deltaY * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? height : 1);
      if (Math.abs(wheelDelta) < 32) return;
      wheelConsumed = true;
      moveTo(latest.current.activeIndexRef.current + Math.sign(wheelDelta));
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || ownsScroll(event.target, container)) return;
      touching = true;
      if (target !== null) { target = null; container.scrollTo({ top: container.scrollTop, behavior: 'instant' }); }
    };
    const onTouchEnd = (event: TouchEvent) => { touching = event.touches.length > 0; if (!touching) scheduleSettle(); };
    const reconcile = () => {
      const current = latest.current, nextHeight = container.clientHeight;
      container.dataset.scrollLocked = String(current.blocked);
      // A width-only comments/card reflow does not write scrollTop. Appended pages
      // likewise keep a gesture in flight; only height or the selected slot moves.
      if (nextHeight !== height || current.activeIndex !== selected || current.blocked && moving) {
        height = nextHeight; selected = current.activeIndex; align(selected);
      }
    };
    controller.current = { moveTo, reconcile };
    align(selected);
    const resize = new ResizeObserver(reconcile);
    resize.observe(container);
    container.addEventListener('scroll', onScroll, { passive: true });
    container.addEventListener('scrollend', settle);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      clearSettle(); cancelAnimationFrame(frame); resize.disconnect(); controller.current = null;
      container.removeEventListener('scroll', onScroll); container.removeEventListener('scrollend', settle);
      container.removeEventListener('wheel', onWheel); container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd); container.removeEventListener('touchcancel', onTouchEnd);
      delete container.dataset.scrolling; delete container.dataset.scrollLocked;
    };
  }, []);

  useLayoutEffect(() => { controller.current?.reconcile(); }, [options.activeIndex, options.order, options.blocked]);
  const moveTo = useCallback((index: number) => controller.current?.moveTo(index) ?? false, []);
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || latest.current.blocked) return;
    if (event.target instanceof Element && (event.target.closest(editable) || ownsScroll(event.target, event.currentTarget))) return;
    if (!['ArrowDown', 'PageDown', 'ArrowUp', 'PageUp'].includes(event.key)) return;
    event.preventDefault();
    if (event.repeat) return;
    const direction = ['ArrowDown', 'PageDown'].includes(event.key) ? 1 : -1;
    if (controller.current?.moveTo(latest.current.activeIndexRef.current + direction)) event.currentTarget.focus({ preventScroll: true });
  }, []);
  return { moveTo, onKeyDown };
}
