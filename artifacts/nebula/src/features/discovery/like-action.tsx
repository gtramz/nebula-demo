import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import './like-action.css';

// Both drawings use one move and eight cubic curves: Motion can interpolate
// corresponding coordinates without replacing the SVG or crossfading shapes.
const heart = 'M12 21 C10.5 19.5 3 14.2 3 9 C3 6.5 4.8 4.5 7.2 4.5 C9.2 4.5 10.7 5.9 12 7.5 C13.3 5.9 14.8 4.5 16.8 4.5 C19.2 4.5 21 6.5 21 9 C21 11.4 19.1 14.1 17 16.3 C15.9 17.5 14.6 18.6 13.5 19.6 C12.9 20.1 12.4 20.6 12 21';
const clef = 'M13.1 14.8 C10.1 16.2 8.3 12.6 10.7 11.3 C13.3 9.8 17.8 11.6 16.6 15.4 C15.3 19.6 7.1 19 7.1 13.5 C7.1 9.3 16.9 6.4 14.4 2.4 C12.1 -0.3 10.6 4.7 11.8 8.4 C12.5 11.1 13.3 16.2 13.6 19 C14 22.9 9.3 24 8.7 20.8 C8.4 19.2 10.7 19.1 10.8 20.7';
type Phase = 'idle' | 'clef' | 'return';

export function DiscoveryLike({ pressed, detail, disabled, active, onToggle }: {
  pressed: boolean; detail: number; disabled: boolean; active: boolean;
  // begin runs only after authorization and the shared request guard accept.
  onToggle: (enabled: boolean, begin: () => void, confirm: () => void) => Promise<boolean>;
}) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const [confirmed, setConfirmed] = useState<boolean>();
  const marked = confirmed ?? pressed;
  const running = useRef(false), generation = useRef(0), timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  function cancel() {
    generation.current++; running.current = false;
    timers.current.forEach(clearTimeout); timers.current = [];
  }
  useEffect(() => { if (!active) { cancel(); setPhase('idle'); setConfirmed(undefined); } }, [active]);
  useEffect(() => { setConfirmed(undefined); }, [pressed]);
  useEffect(() => cancel, []);

  async function activate() {
    if (disabled || running.current || !active) return;
    running.current = true;
    const token = ++generation.current;
    let started: number | undefined;
    let acknowledged = false;
    // Fast requests still show the whole gesture. Slow requests hold the clef
    // without looping; neither timer postpones the actual write or data refresh.
    function finish(success: boolean) {
      if (started === undefined) return;
      const hold = success ? Math.max(0, (reduced ? 100 : 420) - (performance.now() - started)) : 0;
      timers.current.push(setTimeout(() => {
        setPhase('return');
        timers.current.push(setTimeout(() => {
          setPhase('idle'); running.current = false; timers.current = [];
        }, reduced ? 100 : 230));
      }, hold));
    }
    await onToggle(!marked, () => {
      if (!marked) { started = performance.now(); setPhase('clef'); }
    }, () => {
      if (generation.current !== token) return;
      acknowledged = true; setConfirmed(!marked); finish(true);
    });
    if (generation.current !== token) return;
    if (started === undefined) running.current = false;
    else if (!acknowledged) finish(false);
  }

  const showingClef = phase === 'clef';
  return <button type="button" className="discovery-action discovery-like" aria-label="Like" aria-pressed={marked}
    aria-busy={phase !== 'idle'} data-like-phase={phase} disabled={disabled || phase !== 'idle'} onClick={() => void activate()}>
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {reduced ? <>
        <motion.path d={heart} fill={marked ? 'currentColor' : 'none'} initial={false} animate={{ opacity: showingClef ? 0 : 1 }} transition={{ duration: .1 }} />
        <motion.path d={clef} initial={false} animate={{ opacity: showingClef ? 1 : 0 }} transition={{ duration: .1 }} />
      </> : <motion.path fill="currentColor" initial={false} animate={{ d: showingClef ? clef : heart, fillOpacity: !showingClef && marked ? 1 : 0 }} transition={{ duration: phase === 'idle' ? 0 : .23, ease: [.22, 1, .36, 1] }} />}
    </svg>
    <span>{detail}</span>
  </button>;
}
