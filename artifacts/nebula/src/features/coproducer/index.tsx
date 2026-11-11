import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { MessageSquare, Phone, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useWorkspaceOverlayLocked } from '@/features/notifications';
import { usePressFeedback } from '@/hooks/use-press-feedback';
import { CoproducerFace } from './face';
import './coproducer.css';

const Controls = createContext({ open: false, setOpen: (_open: boolean) => {} });
export function useCoproducerOpen() { return useContext(Controls).open; }

export function CoproducerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth(), [location] = useLocation();
  const identity = user ? `${user.role}:${user.artistId ?? user.investorId}` : 'guest';
  const scope = `${identity}:${location}`;
  const [openedAt, setOpenedAt] = useState<string>();
  const open = !!user && openedAt === scope;
  useEffect(() => { setOpenedAt(undefined); }, [scope]);
  useEffect(() => {
    if (!open) return;
    const pause = (event: Event) => { if (event.target instanceof HTMLMediaElement) event.target.pause(); };
    document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(media => media.pause());
    document.addEventListener('play', pause, true);
    return () => document.removeEventListener('play', pause, true);
  }, [open]);
  const controls = useMemo(() => ({ open, setOpen: (value: boolean) => setOpenedAt(value ? scope : undefined) }), [open, scope]);
  return <Controls.Provider value={controls}>{children}</Controls.Provider>;
}

/** Presentation shell only: no chat, microphone or external service is started. */
export function CoproducerDock() {
  const { open, setOpen } = useContext(Controls), locked = useWorkspaceOverlayLocked();
  const pressFeedback = usePressFeedback(locked);
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return <Dialog.Root open={open} onOpenChange={value => { if (!value || !locked) setOpen(value); }}>
    <div className="coproducer-dock" data-resting={!visible || open}>
      <Dialog.Trigger asChild><button {...pressFeedback} type="button" className="coproducer-trigger" disabled={locked}
        aria-label="Open Julio, your co-producer" title={locked ? 'Finish or cancel the current recording or operation to open Julio.' : undefined}>
        <CoproducerFace />
      </button></Dialog.Trigger>
    </div>
    <Dialog.Portal>
      <Dialog.Overlay className="coproducer-overlay" />
      <Dialog.Content className="coproducer-panel" data-resting={!visible}>
        <Dialog.Close className="coproducer-close" aria-label="Close Julio"><X size={20} aria-hidden="true" /></Dialog.Close>
        <header className="coproducer-heading">
          <div className="coproducer-portrait"><CoproducerFace smiling /></div>
          <Dialog.Title>Julio</Dialog.Title>
          <Dialog.Description>Your co-producer</Dialog.Description>
        </header>
        <div className="coproducer-actions">
          <button type="button" disabled><MessageSquare size={20} aria-hidden="true" /><span>Open chat</span><small>Coming soon</small></button>
          <button type="button" disabled><Phone size={20} aria-hidden="true" /><span>Call Julio</span><small>Coming soon</small></button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
