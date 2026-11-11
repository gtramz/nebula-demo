import { MorphAdvanceButton, type MorphAdvanceHandle } from '@/components/blob-face';
import { createContext, useContext, useEffect, useRef, useState, type Ref, type ReactNode } from 'react';
import { ArrowLeft, Check, Music2 } from 'lucide-react';
import './journey.css';

const JourneyMotion = createContext({ pending: false, setPending: (_value: boolean) => {} });
const prefix = 'nebula-journey-v1:';
const memory = new Map<string, { step: number; method: string }>();
window.addEventListener('nebula-session-identity', event => {
  if ((event as CustomEvent).detail !== null) return; // Identity is also part of every key; hydration must not erase resumption.
  memory.clear();
  try { for (const key of Object.keys(sessionStorage)) if (key.startsWith(prefix)) sessionStorage.removeItem(key); } catch { /* Memory fallback. */ }
});
/** UI position only. Never stores media, credentials, terms or authorization. */
export function useJourney(key: string, defaults: { step: number; method: string }) {
  const storageKey = prefix + key;
  const [value, setValue] = useState(() => {
    try { const parsed = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null'); if (parsed && Number.isInteger(parsed.step) && parsed.step >= 0 && parsed.step < 4 && typeof parsed.method === 'string') return parsed as typeof defaults; } catch { /* Storage can be blocked. */ }
    return memory.get(storageKey) ?? defaults;
  });
  function update(patch: Partial<typeof defaults>) {
    setValue(current => { const next = { ...current, ...patch }; memory.set(storageKey, next); try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep editing. */ } return next; });
  }
  return [value, update] as const;
}
export function pauseJourneyMedia() { document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(media => media.pause()); }
export function Journey({ label, showStepLabel = true, steps, step, maxStep, locked, onStep, context, children, footer }: {
  label: string; showStepLabel?: boolean; steps: { title: string; description: string }[]; step: number; maxStep: number; locked: boolean; onStep: (step: number) => void; context: ReactNode; children: ReactNode; footer: ReactNode;
}) {
  const [advancing, setAdvancing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null), previous = useRef(step);
  useEffect(() => { if (previous.current !== step) { heading.current?.focus({ preventScroll: true }); heading.current?.closest('.guided-heading')?.scrollIntoView({ block: 'start', behavior: 'instant' }); previous.current = step; } }, [step]);
  return <JourneyMotion.Provider value={{ pending: advancing, setPending: setAdvancing }}><div className="guided-journey">
    <aside className="guided-context" aria-label={`${label} context`}>{context}<p className="guided-private">Private workspace</p></aside>
    <div className="guided-main">
      <ol className="guided-progress" aria-label={`${label} progress`}>{steps.map((item, index) => <li key={index} aria-current={step === index ? 'step' : undefined}><button type="button" disabled={locked || advancing || index > maxStep} onClick={() => onStep(index)} aria-label={`Step ${index + 1}: ${item.title}`}><span className="guided-number">{index < step ? <Check size={14}/> : index + 1}</span><span>{item.title}</span></button></li>)}</ol>
      <header className="guided-heading">{showStepLabel ? <p className="voice text-xs text-accent">{label} · {step + 1} OF {steps.length}</p> : null}<h2 ref={heading} tabIndex={-1}>{steps[step].title}</h2>{steps[step].description&&<p>{steps[step].description}</p>}</header>
      <fieldset disabled={advancing && !locked} className="guided-body min-w-0">{children}</fieldset>
      <fieldset disabled={advancing} className="guided-footer">{footer}</fieldset>
    </div>
  </div></JourneyMotion.Provider>;
}
export function JourneyContext({ cover, title, artist, children }: { cover?: string | null; title: string; artist: string; children?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [cover]);
  return <><div className="guided-cover">{cover && !failed ? <img src={cover} alt="" onError={() => setFailed(true)}/> : <Music2 size={28} aria-hidden="true"/>}</div><div className="guided-context-copy"><strong>{title}</strong><p>{artist}</p>{children}</div></>;
}
export function JourneyBack({ disabled, onClick }: { disabled: boolean; onClick: () => void }) { const motion = useContext(JourneyMotion); return <button type="button" className="guided-back" disabled={disabled || motion.pending} onClick={onClick}><ArrowLeft size={16}/>Back</button>; }
export function JourneyNext({ disabled, onClick, children = 'Continue', actionRef, onBeforeAdvance, onAttempt, onError }: { disabled: boolean; onClick: () => void; children?: ReactNode; actionRef?: Ref<MorphAdvanceHandle>; onBeforeAdvance?: () => boolean; onAttempt?: () => Promise<void | boolean> | void | boolean; onError?: (error: unknown) => void }) {
  const motion = useContext(JourneyMotion), surface = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  function validate() {
    setError('');
    if (onBeforeAdvance && !onBeforeAdvance()) return false;
    const form = surface.current?.closest('form');
    for (const input of form?.querySelectorAll<HTMLInputElement>('input,select,textarea') ?? []) {
      if (input.getClientRects().length && input.willValidate && !input.checkValidity()) { input.focus(); input.reportValidity(); return false; }
    }
    pauseJourneyMedia(); return true;
  }
  return <div ref={surface}><MorphAdvanceButton ref={actionRef} disabled={disabled} onBeforeAdvance={validate} onAttempt={onAttempt} onError={cause => { setError((cause as Error).message); onError?.(cause); }} onAdvance={onClick} onPendingChange={motion.setPending} buttonClassName="guided-next" faceSize={72}>{children}</MorphAdvanceButton>{error && <p role="alert" className="text-sm text-danger">{error}</p>}</div>;
}
