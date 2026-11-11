import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Music2 } from 'lucide-react';
import './journey.css';

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
  const heading = useRef<HTMLHeadingElement>(null), previous = useRef(step);
  useEffect(() => { if (previous.current !== step) { heading.current?.focus({ preventScroll: true }); heading.current?.closest('.guided-heading')?.scrollIntoView({ block: 'start', behavior: 'instant' }); previous.current = step; } }, [step]);
  return <div className="guided-journey">
    <aside className="guided-context" aria-label={`${label} context`}>{context}<p className="guided-private">Private workspace</p></aside>
    <div className="guided-main">
      <ol className="guided-progress" aria-label={`${label} progress`}>{steps.map((item, index) => <li key={index} aria-current={step === index ? 'step' : undefined}><button type="button" disabled={locked || index > maxStep} onClick={() => onStep(index)} aria-label={`Step ${index + 1}: ${item.title}`}><span className="guided-number">{index < step ? <Check size={14}/> : index + 1}</span><span>{item.title}</span></button></li>)}</ol>
      <header className="guided-heading">{showStepLabel ? <p className="voice text-xs text-accent">{label} · {step + 1} OF {steps.length}</p> : null}<h2 ref={heading} tabIndex={-1}>{steps[step].title}</h2>{steps[step].description&&<p>{steps[step].description}</p>}</header>
      <div className="guided-body">{children}</div>
      <div className="guided-footer">{footer}</div>
    </div>
  </div>;
}
export function JourneyContext({ cover, title, artist, children }: { cover?: string | null; title: string; artist: string; children?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [cover]);
  return <><div className="guided-cover">{cover && !failed ? <img src={cover} alt="" onError={() => setFailed(true)}/> : <Music2 size={28} aria-hidden="true"/>}</div><div className="guided-context-copy"><strong>{title}</strong><p>{artist}</p>{children}</div></>;
}
export function JourneyBack({ disabled, onClick }: { disabled: boolean; onClick: () => void }) { return <button type="button" className="guided-back" disabled={disabled} onClick={onClick}><ArrowLeft size={16}/>Back</button>; }
export function JourneyNext({ disabled, onClick, children = 'Continue' }: { disabled: boolean; onClick: () => void; children?: ReactNode }) { return <button type="button" className="guided-next" disabled={disabled} onClick={onClick}>{children}<ArrowRight size={16}/></button>; }
