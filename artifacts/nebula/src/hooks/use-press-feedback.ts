import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';

/** Visual feedback only: native clicks, Radix triggers and keyboard actions run unchanged. */
export function usePressFeedback(disabled = false) {
  const [pressed, setPressed] = useState(false);
  const started = useRef(0), pointer = useRef<number | null>(null), key = useRef<string | null>(null), timer = useRef<number | undefined>(undefined), mounted = useRef(true);
  function clearTimer() { window.clearTimeout(timer.current); timer.current = undefined; }
  function begin() { clearTimer(); started.current = performance.now(); if (mounted.current) setPressed(true); }
  function release() {
    if (pointer.current !== null || key.current !== null) return;
    clearTimer();
    timer.current = window.setTimeout(() => { timer.current = undefined; if (mounted.current) setPressed(false); }, Math.max(0, 100 - (performance.now() - started.current)));
  }
  function cancel() { clearTimer(); pointer.current = null; key.current = null; if (mounted.current) setPressed(false); }
  useEffect(() => {
    mounted.current = true;
    const pointerUp = (event: globalThis.PointerEvent) => { if (event.pointerId === pointer.current) { pointer.current = null; release(); } };
    const pointerCancel = (event: globalThis.PointerEvent) => { if (event.pointerId === pointer.current) cancel(); };
    const keyUp = (event: globalThis.KeyboardEvent) => { if (event.key === key.current) { key.current = null; release(); } };
    const hidden = () => { if (document.hidden) cancel(); };
    window.addEventListener('pointerup', pointerUp, true); window.addEventListener('pointercancel', pointerCancel, true);
    window.addEventListener('keyup', keyUp, true); window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      mounted.current = false; clearTimer();
      window.removeEventListener('pointerup', pointerUp, true); window.removeEventListener('pointercancel', pointerCancel, true);
      window.removeEventListener('keyup', keyUp, true); window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
  useEffect(() => { if (disabled) cancel(); }, [disabled]);
  return {
    'data-pressed': pressed,
    onPointerDownCapture: (event: PointerEvent<HTMLButtonElement>) => { if (!disabled && event.button === 0) { pointer.current = event.pointerId; begin(); } },
    onKeyDownCapture: (event: KeyboardEvent<HTMLButtonElement>) => { if (!disabled && !event.repeat && (event.key === 'Enter' || event.key === ' ')) { key.current = event.key; begin(); } },
    // Trackpad taps, assistive activation and programmatic clicks may have no down event.
    onClickCapture: (event: MouseEvent<HTMLButtonElement>) => { if (!disabled && event.button === 0) { begin(); release(); } },
  };
}
