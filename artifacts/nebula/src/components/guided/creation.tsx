import { useRef, useState, type ReactNode } from 'react';
import { Journey, pauseJourneyMedia } from './journey';
import './creation.css';

/** Form data stays with its owner; moving between stages never unmounts inputs. */
export function useCreationSteps() {
  const form = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState(0);
  function reveal(next: number) {
    pauseJourneyMedia();
    setStep(next);
    setVisited(current => Math.max(current, next));
  }
  function validate(through = 3) {
    const controls = form.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input,select,textarea') ?? [];
    for (const control of controls) {
      const section = control.closest<HTMLElement>('[data-creation-step]');
      if (!section || Number(section.dataset.creationStep) > through || !control.willValidate || control.checkValidity()) continue;
      reveal(Number(section.dataset.creationStep));
      requestAnimationFrame(() => { control.focus(); control.reportValidity(); });
      return false;
    }
    return true;
  }
  function go(next: number) {
    if (next > step && !validate(next - 1)) return;
    reveal(next);
  }
  return { form, step, visited, go, reveal, validate };
}
export function CreationFrame({ enabled = true, label, steps, flow, locked, context, footer, children }: {
  enabled?: boolean; label: string; steps: string[]; flow: ReturnType<typeof useCreationSteps>; locked: boolean;
  context: ReactNode; footer: ReactNode; children: ReactNode;
}) {
  if (!enabled) return <>{children}{footer}</>;
  return <div className="creation-flow"><Journey label={label} steps={steps.map(title => ({ title, description: '' }))} step={flow.step} maxStep={flow.visited} locked={locked} onStep={flow.go} context={context} footer={footer}>{children}</Journey></div>;
}
