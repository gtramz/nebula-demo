import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { homeFilterEntries, type HomeFilters, type HomeFacetOptions, type HomeMode } from '@nebula/local';
import { HomeSearchControl, useHomeSearch } from './search';
import { HomeFiltersPanel } from './filters';
import './home-toolbar.css';

type Props = { model: ReturnType<typeof useHomeSearch>; mode: HomeMode; onModeChange: (mode: HomeMode) => void; canFollow: boolean; filters: HomeFilters; facets?: HomeFacetOptions; loading: boolean; failed: boolean; retry: () => void };

export function HomeToolbar({ model, mode, onModeChange, canFollow, filters, facets, loading, failed, retry }: Props) {
  const toolbar = useRef<HTMLDivElement>(null), leading = useRef<HTMLDivElement>(null), search = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const ignoreFocus = useRef(false), focusFrame = useRef(0);
  const [pinned, setPinned] = useState(false), [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false), [filtersOpen, setFiltersOpen] = useState(false), [compact, setCompact] = useState(false);
  const queryActive = !!model.search.q.trim(), count = homeFilterEntries(filters).length;
  const open = pinned || hovered || focused || filtersOpen || queryActive;
  useLayoutEffect(() => {
    const measure = () => {
      if (!toolbar.current || !leading.current || !search.current || !panel.current) return;
      const bounds = toolbar.current.getBoundingClientRect(), anchor = search.current.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(toolbar.current).columnGap) || 0;
      // Leading options keep their measurable width while temporarily out of
      // flow, so opening compact search cannot flip the breakpoint back again.
      const closedSpace = bounds.width - leading.current.getBoundingClientRect().width - gap - anchor.width;
      setCompact(closedSpace < 180);
      panel.current.style.setProperty('--home-search-width', `${Math.min(320, Math.max(0, bounds.right - anchor.right))}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (toolbar.current) observer.observe(toolbar.current);
    if (leading.current) observer.observe(leading.current);
    return () => observer.disconnect();
  }, [open, compact]);
  useEffect(() => () => cancelAnimationFrame(focusFrame.current), []);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (queryActive || filtersOpen || !(event.target instanceof Node) || search.current?.contains(event.target)) return;
      cancelAnimationFrame(focusFrame.current);
      setPinned(false); setHovered(false); setFocused(false);
      if (document.activeElement instanceof HTMLElement && search.current?.contains(document.activeElement)) document.activeElement.blur();
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [queryActive, filtersOpen]);
  function launch() {
    setPinned(true); cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => search.current?.querySelector<HTMLInputElement>('#home-search')?.focus({ preventScroll: true }));
  }
  function escape() {
    if (queryActive || filtersOpen) return;
    cancelAnimationFrame(focusFrame.current);
    setPinned(false); setHovered(false); setFocused(false);
    ignoreFocus.current = true; trigger.current?.focus({ preventScroll: true }); ignoreFocus.current = false;
  }
  return <div ref={toolbar} className="home-toolbar text-tabs" role="group" aria-label="Discovery mode" data-open={open} data-compact={compact} onKeyDown={event => { if (event.key === 'Escape' && !queryActive && !filtersOpen) { event.preventDefault(); escape(); } }}>
    <div ref={leading} className="home-toolbar-leading text-tabs" inert={open && compact} aria-hidden={open && compact}>
      <button type="button" className="text-tab-option" aria-pressed={mode === 'for-you'} onClick={() => onModeChange('for-you')}><span>For You</span></button>
      <button type="button" className="text-tab-option" aria-pressed={mode === 'recent'} onClick={() => onModeChange('recent')}><span>Recently created</span></button>
      <button type="button" className="text-tab-option" disabled={!canFollow} aria-pressed={mode === 'following'} aria-describedby={!canFollow ? 'following-unavailable' : undefined} onClick={() => onModeChange('following')}><span>Following</span></button>
    </div>
    <div ref={search} className="home-toolbar-search" data-open={open}
      onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(true); }} onPointerLeave={() => setHovered(false)}
      onFocus={event => { if (!ignoreFocus.current && event.currentTarget.contains(event.target)) setFocused(true); }}
      onBlur={event => { if (event.currentTarget.contains(event.target) && !event.currentTarget.contains(event.relatedTarget as Node | null)) { setFocused(false); setPinned(false); } }}>
      <button ref={trigger} type="button" className="home-toolbar-search-trigger" aria-label="Search Home" aria-expanded={open} aria-controls="home-toolbar-search-panel" aria-describedby={count ? 'home-toolbar-filter-count' : undefined} onClick={launch}>
        <Search size={18} aria-hidden="true"/>{count > 0 && <span className="home-toolbar-search-dot" aria-hidden="true"/>}
      </button>
      <div ref={panel} id="home-toolbar-search-panel" className="home-toolbar-search-panel" aria-hidden={!open} inert={!open}>
        <div className={`home-search-tools${model.search.q ? ' has-search-text' : ''}`}>
          <HomeSearchControl model={model} mode={mode}/>
          <HomeFiltersPanel filters={filters} facets={facets} loading={loading} failed={failed} retry={retry} onApply={model.applyFilters} onOpenChange={value => { setFiltersOpen(value); setPinned(true); }}/>
        </div>
      </div>
    </div>
    {count > 0 && <span id="home-toolbar-filter-count" className="sr-only">{count} active filters</span>}
  </div>;
}
