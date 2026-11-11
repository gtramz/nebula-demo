import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Link, useLocation, useSearch } from 'wouter';
import { useLogout, type SessionUser } from '@nebula/local';
import { toast } from '@/hooks/use-toast';
import './account-menu.css';

export function AccountMenu({ user, active = false, children }: { user: SessionUser; active?: boolean; children: ReactNode }) {
  const [location, navigate] = useLocation(), search = useSearch(), logout = useLogout();
  const [open, setOpen] = useState(false), [error, setError] = useState('');
  const content = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), focusFrame = useRef(0);
  const pinned = useRef(false), keyboard = useRef(false), mounted = useRef(true), busy = useRef(false);
  const identity = `${user.role}:${user.artistId ?? user.investorId}`;
  function clearClose() { clearTimeout(timer.current); timer.current = undefined; }
  function changeOpen(next: boolean) { clearClose(); if (!next) pinned.current = false; setOpen(next); }
  function closeLater() {
    clearClose();
    if (!keyboard.current) timer.current = setTimeout(() => changeOpen(false), 120);
  }
  function pin(fromKeyboard = false, toggle = true) {
    clearClose(); keyboard.current = fromKeyboard;
    if (toggle && open && pinned.current) { changeOpen(false); return; }
    pinned.current = true; setOpen(true);
    cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => content.current?.querySelector<HTMLElement>('[role="menuitem"]:not([data-disabled])')?.focus({ preventScroll: true }));
  }
  useEffect(() => { changeOpen(false); setError(''); }, [location, search, identity]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; clearClose(); cancelAnimationFrame(focusFrame.current); }; }, []);
  async function signOut() {
    if (busy.current) return;
    busy.current = true; setError('');
    try { await logout.mutateAsync(); navigate('/'); }
    catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Unable to log out. Try again.';
      // The existing logout clears its local user immediately, so a failed
      // network response can arrive after Navigation has removed this trigger.
      if (mounted.current) setError(message); else toast({ title: 'Could not log out', description: message, variant: 'destructive' });
    } finally { busy.current = false; }
  }
  // Radix forwards this Menu focus callback, but omits it from DropdownMenu's public type.
  const hoverFocus = { onOpenAutoFocus: (event: Event) => { if (!pinned.current && !keyboard.current) event.preventDefault(); } };
  return <DropdownMenu.Root open={open} onOpenChange={changeOpen} modal={false}>
    <DropdownMenu.Trigger asChild>
      <button ref={trigger} type="button" aria-label="profile" aria-current={active ? 'page' : undefined} disabled={logout.isPending} className="sidebar-link primary-link account-menu-trigger text-muted"
        onPointerEnter={event => { if (event.pointerType === 'mouse') { clearClose(); if (!open) { keyboard.current = false; setOpen(true); } } }} onPointerLeave={closeLater}
        onPointerDown={event => { if (event.button === 0 && !event.ctrlKey) event.preventDefault(); }}
        onClick={event => { if (!event.ctrlKey && !event.metaKey) pin(event.detail === 0); }}
        onKeyDown={event => { if (['Enter', ' ', 'ArrowDown'].includes(event.key)) { event.preventDefault(); pin(true, event.key !== 'ArrowDown'); } }}>
        {children}
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content {...hoverFocus} ref={content} className="account-menu-content" side="top" align="start" sideOffset={8} collisionPadding={12} loop aria-label="Account"
        onPointerEnter={clearClose} onPointerLeave={closeLater}
        onEscapeKeyDown={() => { keyboard.current = true; }}
        onCloseAutoFocus={event => { if (!keyboard.current) event.preventDefault(); keyboard.current = false; }}
        onInteractOutside={event => { if (trigger.current?.contains(event.detail.originalEvent.target as Node)) event.preventDefault(); }}>
        <DropdownMenu.Item asChild disabled={logout.isPending} onSelect={() => changeOpen(false)}><Link href="/profile" onClick={() => changeOpen(false)} className="account-menu-item">Profile</Link></DropdownMenu.Item>
        <DropdownMenu.Item asChild disabled={logout.isPending} onSelect={() => changeOpen(false)}><a href="https://antiq.xyz/settings" target="_blank" rel="noopener noreferrer" onClick={() => changeOpen(false)} className="account-menu-item">Settings</a></DropdownMenu.Item>
        <DropdownMenu.Separator className="account-menu-separator" />
        <DropdownMenu.Item className="account-menu-item" disabled={logout.isPending} onSelect={event => { event.preventDefault(); void signOut(); }}>{logout.isPending ? 'Logging out…' : 'Log Out'}</DropdownMenu.Item>
        {error && <p className="account-menu-error" role="alert">{error}</p>}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>;
}
