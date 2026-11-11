import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AVATAR_VIEW, angryAvatarParams, angryFeatures, blobPath, eyeShapes, featureColor, happyAvatarParams, mouthShape, seededAvatarParams, strokeWidth, type AvatarParams } from '@/lib/avatar';

export type FaceMood = 'happy' | 'angry';

function Features({ params }: { params: AvatarParams }) {
  const fg = featureColor(params.face), sw = strokeWidth(params), mouth = mouthShape(params);
  return <>{[...eyeShapes(params), ...(mouth ? [mouth] : [])].map((shape, i) => <path key={i} d={shape.d} fill={shape.stroke ? 'none' : fg} stroke={shape.stroke ? fg : undefined} strokeWidth={sw} strokeLinecap="round" />)}</>;
}

/** Decorative by default: the surrounding link/image label names the person. */
export function StaticFace({ seed = 'nebula', params, size = 64, className }: { seed?: string | number; params?: AvatarParams; size?: number; className?: string }) {
  const stable = useMemo(() => params ?? seededAvatarParams(seed), [params, seed]);
  return <svg viewBox={`0 0 ${AVATAR_VIEW} ${AVATAR_VIEW}`} width={size} height={size} className={className} aria-hidden="true" focusable="false"><path d={blobPath(stable.radii, stable.wobble, stable.scale)} fill={stable.face} /><Features params={stable}/></svg>;
}

export function SpringFace({ mood = 'happy', params, size = 80, onDone }: { mood?: FaceMood; params?: AvatarParams; size?: number; onDone?: () => void }) {
  const reduced = useReducedMotion(), [generated] = useState(() => mood === 'angry' ? angryAvatarParams() : happyAvatarParams());
  const face = params ?? generated, fg = featureColor(face.face), sw = strokeWidth(face), mouth = mouthShape(face), angry = angryFeatures(face);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), entered = useRef(false), done = useRef(onDone); done.current = onDone;
  function completeEntrance() {
    if (entered.current || !done.current) return;
    entered.current = true;
    timer.current = setTimeout(() => { timer.current = null; done.current?.(); }, reduced ? 100 : mood === 'angry' ? 650 : 380);
  }
  useEffect(() => {
    if (reduced) completeEntrance();
    return () => { if (timer.current) clearTimeout(timer.current); entered.current = false; };
  }, [reduced]);
  return <motion.div data-blob-mood={mood} aria-hidden="true" className="shrink-0" style={{ width: size, height: size }}
    initial={reduced ? false : { scale: 0, opacity: 0, rotate: -18 }}
    animate={{ scale: 1, opacity: 1, rotate: 0, ...(mood === 'angry' && !reduced ? { x: [0, -6, 6, -5, 5, -3, 0] } : {}) }}
    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 20, x: { delay: .5, duration: .45 } }}
    exit={reduced ? { opacity: 0, transition: { duration: .01 } } : { scale: 0, opacity: 0, rotate: 18, transition: { duration: .22, ease: 'easeIn' } }}
    onAnimationComplete={completeEntrance}>
    <svg viewBox={`0 0 ${AVATAR_VIEW} ${AVATAR_VIEW}`} className="h-full w-full overflow-visible" focusable="false">
      <path d={blobPath(face.radii, face.wobble, face.scale)} fill={face.face} />
      {eyeShapes(face).map((shape, i) => <motion.path key={i} d={shape.d} fill={shape.stroke ? 'none' : fg} stroke={shape.stroke ? fg : undefined} strokeWidth={sw} strokeLinecap="round"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }} initial={reduced ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={reduced ? { duration: 0 } : { delay: .18 + i * .06, type: 'spring', stiffness: 500, damping: 18 }} />)}
      {mood === 'angry' && angry.brows.map((d,i) => <motion.path key={d} d={d} fill="none" stroke={fg} strokeWidth={sw} strokeLinecap="round" initial={reduced ? false : { y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={reduced ? { duration: 0 } : { delay: .24+i*.05, type: 'spring', stiffness: 500, damping: 18 }} />)}
      {(mouth || mood === 'angry') && <motion.path d={mood === 'angry' ? angry.mouth : mouth!.d} fill={mood === 'angry' || mouth?.stroke ? 'none' : fg} stroke={mood === 'angry' || mouth?.stroke ? fg : undefined} strokeWidth={sw} strokeLinecap="round" initial={reduced ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={reduced ? { duration: 0 } : { delay: .32, duration: mood === 'angry' ? .35 : .4 }} />}
    </svg>
  </motion.div>;
}

export function FieldError({ message, id }: { message?: string | null; id?: string }) {
  return message ? <p id={id} role="alert" className="flex items-start gap-2 text-sm text-danger"><StaticFace seed="field-error" params={{ ...seededAvatarParams('field-error'), face: '#ff5a3c', eyes: 'bars', mouth: 'flat' }} size={20} className="shrink-0"/><span>{message}</span></p> : null;
}

export function OnboardingBadge() {
  const reduced = useReducedMotion();
  return <motion.span className="inline-flex items-center gap-2 voice text-[10px] tracking-widest text-accent" initial={reduced ? false : { opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 22 }}><StaticFace seed="onboarding" size={32}/><span>ARTIST SETUP</span></motion.span>;
}

/** A once-per-mount heading accent; query refetches cannot restart it. */
export function WinkFace({ active = true, size = 36, placeholder = '.' }: { active?: boolean; size?: number; placeholder?: ReactNode }) {
  const reduced = useReducedMotion(), [phase, setPhase] = useState<'hidden'|'blooming'|'winking'|'morphing'|'done'>(() => active ? reduced ? 'done' : 'blooming' : 'hidden'), started = useRef(false), completed = useRef(false);
  const [params] = useState(() => happyAvatarParams()), fg = featureColor(params.face), sw = strokeWidth(params), mouth = mouthShape(params);
  const slot = useRef<HTMLSpanElement>(null), dot = useRef<HTMLSpanElement>(null), baseline = useRef<HTMLSpanElement>(null);
  const [layout, setLayout] = useState({ top: 0, x: 0, y: 0, scaleX: .2, scaleY: .2, color: '#f5f5f2' });
  const circle = useMemo(() => blobPath(Array(8).fill(.5), 0, 1), []);
  useLayoutEffect(() => {
    let alive = true;
    function measure() {
      if (!alive || !slot.current || !dot.current || !baseline.current) return;
      const context = document.createElement('canvas').getContext('2d');
      if (!context) return;
      const style = getComputedStyle(dot.current);
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const glyph = context.measureText(typeof placeholder === 'string' ? placeholder : '.'), cap = context.measureText('H');
      const bounds = slot.current.getBoundingClientRect(), text = dot.current.getBoundingClientRect();
      const base = baseline.current.getBoundingClientRect().top - bounds.top;
      const width = glyph.actualBoundingBoxLeft + glyph.actualBoundingBoxRight, height = glyph.actualBoundingBoxAscent + glyph.actualBoundingBoxDescent;
      const faceY = base - cap.actualBoundingBoxAscent / 2 + 1;
      // Match the actual font's punctuation ink, preserving its natural baseline and spacing.
      setLayout({ top: faceY - size / 2, x: text.left - bounds.left - glyph.actualBoundingBoxLeft + width / 2 - size / 2 - 4, y: base - glyph.actualBoundingBoxAscent + height / 2 - faceY, scaleX: width / (size * .67), scaleY: height / (size * .67), color: style.color });
    }
    measure();
    const observer = new ResizeObserver(measure);
    if (slot.current) observer.observe(slot.current);
    void document.fonts.ready.then(measure);
    return () => { alive = false; observer.disconnect(); };
  }, [size, placeholder]);
  useEffect(() => {
    if (!active) {
      if (started.current) { completed.current = true; setPhase('done'); }
      return;
    }
    if (completed.current) return;
    if (reduced) { completed.current = true; setPhase('done'); return; }
    started.current = true; setPhase('blooming');
    const timers = [setTimeout(() => setPhase('winking'), 800), setTimeout(() => { completed.current = true; setPhase('morphing'); }, 1700)];
    return () => timers.forEach(clearTimeout);
  }, [active, reduced]);
  const visible = phase === 'blooming' || phase === 'winking' || phase === 'morphing', merged = phase === 'morphing' || phase === 'done';
  const morph = { duration: .56, ease: [.22, 1, .36, 1] as const };
  return <span ref={slot} aria-hidden="true" className="relative inline-block whitespace-nowrap" data-blob-wink={phase} style={{ width: size + 4, verticalAlign: 'baseline' }}>
    <motion.span ref={dot} data-blob-wink-dot initial={false} animate={{ opacity: visible ? 0 : 1 }} transition={{ duration: 0 }}>{placeholder}</motion.span><span ref={baseline} style={{ display: 'inline-block', width: 0, height: 0 }}/>
    <motion.span data-blob-wink-face className="absolute pointer-events-none" style={{ left: 4, top: layout.top, width: size, height: size, transformOrigin: 'center' }}
      initial={reduced ? false : { scaleX: .85, scaleY: .85, opacity: active ? 1 : 0, x: 0, y: 0 }}
      animate={{ scaleX: merged ? layout.scaleX : 1, scaleY: merged ? layout.scaleY : 1, x: merged ? layout.x : 0, y: merged ? layout.y : 0, opacity: visible ? 1 : 0 }}
      transition={reduced ? { duration: 0 } : { ...morph, opacity: { duration: .08 } }}
      onAnimationComplete={() => { if (phase === 'morphing') setPhase('done'); }}>
      <svg viewBox={`0 0 ${AVATAR_VIEW} ${AVATAR_VIEW}`} className="h-full w-full" focusable="false">
        <motion.path d={blobPath(params.radii, params.wobble, params.scale)} initial={false} animate={{ d: merged ? circle : blobPath(params.radii, params.wobble, params.scale), fill: merged ? layout.color : params.face }} transition={reduced ? { duration: 0 } : morph}/>
        <motion.g animate={{ opacity: merged ? 0 : 1 }} transition={{ duration: reduced ? 0 : .14 }}>
          {eyeShapes(params).map((shape,i) => <motion.path key={i} d={shape.d} fill={shape.stroke ? 'none' : fg} stroke={shape.stroke ? fg : undefined} strokeWidth={sw} strokeLinecap="round" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} animate={{ scaleY: i === 0 && phase === 'winking' ? 0 : 1 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 18 }}/>) }
          {mouth && (
            <motion.path d={mouth.d} fill="none" stroke={fg} strokeWidth={sw} strokeLinecap="round" initial={false} animate={{ pathLength: visible ? 1 : 0 }} transition={reduced ? { duration: 0 } : { delay: .22, duration: .36 }} />
          )}
        </motion.g>
      </svg>
    </motion.span>
  </span>;
}

export type MorphAdvanceHandle = { run: () => void };
type MorphAdvanceButtonProps = {
  children: ReactNode; onAdvance: () => void; onBeforeAdvance?: () => boolean | 'cancel';
  /** Resolve only after real persistence. A rejection shows angry feedback and never advances. */
  onAttempt?: () => Promise<void | boolean> | void | boolean;
  onError?: (error: unknown) => void; onPendingChange?: (pending: boolean) => void;
  invalid?: boolean; disabled?: boolean; className?: string; buttonClassName?: string; faceSize?: number; buttonType?: 'button' | 'submit';
};
export const MorphAdvanceButton = forwardRef<MorphAdvanceHandle, MorphAdvanceButtonProps>(function MorphAdvanceButton(props, ref) {
  const reduced = useReducedMotion(), [phase, setPhase] = useState<'idle'|'saving'|'face'|'exiting'>('idle'), [mood, setMood] = useState<FaceMood>('happy'), [face, setFace] = useState<AvatarParams>();
  const latest = useRef(props); latest.current = props;
  const mounted = useRef(true), locked = useRef(false), settled = useRef(true), accepted = useRef(false), previous = useRef<AvatarParams>(undefined), button = useRef<HTMLButtonElement>(null), restoreFocus = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; locked.current = false; latest.current.onPendingChange?.(false); }; }, []);
  useEffect(() => { if (phase === 'idle' && restoreFocus.current) { restoreFocus.current = false; button.current?.focus(); } }, [phase]);
  async function run() {
    const current = latest.current;
    if (locked.current || current.disabled) return;
    locked.current = true; settled.current = false; accepted.current = false;
    current.onPendingChange?.(true);
    let valid = !current.invalid;
    try {
      const before = current.onBeforeAdvance?.();
      if (before === 'cancel') { locked.current = false; settled.current = true; current.onPendingChange?.(false); return; }
      if (before === false) valid = false;
      if (valid) { setPhase('saving'); valid = (await current.onAttempt?.()) !== false; }
    } catch (error) { valid = false; if (mounted.current) current.onError?.(error); }
    if (!mounted.current) return;
    accepted.current = valid;
    const next = valid ? happyAvatarParams(previous.current) : angryAvatarParams();
    if (valid) previous.current = next;
    restoreFocus.current = !valid && (document.activeElement === button.current || document.activeElement === document.body);
    setMood(valid ? 'happy' : 'angry'); setFace(next); setPhase('face');
  }
  useImperativeHandle(ref, () => ({ run: () => { void run(); } }));
  function finish() {
    if (phase !== 'exiting' || settled.current || !mounted.current) return;
    settled.current = true; locked.current = false; setPhase('idle'); latest.current.onPendingChange?.(false);
    if (accepted.current) latest.current.onAdvance();
  }
  return <div className={`relative flex min-h-20 min-w-[9.5rem] items-center justify-center ${props.className ?? ''}`} aria-busy={phase !== 'idle'}>
    <AnimatePresence mode="wait" initial={false} onExitComplete={finish}>
      {(phase === 'idle' || phase === 'saving') && <motion.button key="button" ref={button} type={props.buttonType ?? 'button'} onClick={event => { event.preventDefault(); void run(); }} disabled={props.disabled || phase === 'saving'} className={props.buttonClassName}
        initial={reduced ? false : { opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={reduced ? { opacity: 0, transition: { duration: .01 } } : { opacity: 0, scale: .4, transition: { duration: .14, ease: 'easeIn' } }}>{props.children}</motion.button>}
      {phase === 'face' && face && <SpringFace key="face" params={face} mood={mood} size={props.faceSize ?? 80} onDone={() => setPhase('exiting')} />}
    </AnimatePresence>
    <span className="sr-only" role="status">{phase === 'face' || phase === 'exiting' ? mood === 'happy' ? 'Continuing to the next step' : 'Some input could not be saved. Review the error and try again.' : ''}</span>
  </div>;
});
