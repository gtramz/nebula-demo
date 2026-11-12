import { forwardRef, useEffect, useState, type CSSProperties, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import './share-surface.css';

/** Share's responsive surface. Each flow retains ownership of state, guards and media. */
export const ShareSurface = forwardRef<ElementRef<typeof Dialog.Content>, ComponentPropsWithoutRef<typeof Dialog.Content> & { styled?: boolean }>(
  ({ className = '', styled = true, style, ...props }, ref) => {
    const [viewport, setViewport] = useState({ height: window.innerHeight, bottom: 0 });
    useEffect(() => {
      if (!styled) return;
      const visual = window.visualViewport;
      const update = () => {
        const height = visual?.height ?? window.innerHeight;
        const bottom = Math.max(0, window.innerHeight - height - (visual?.offsetTop ?? 0));
        setViewport(previous => previous.height === height && previous.bottom === bottom ? previous : { height, bottom });
      };
      update(); visual?.addEventListener('resize', update); visual?.addEventListener('scroll', update); window.addEventListener('resize', update);
      return () => { visual?.removeEventListener('resize', update); visual?.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
    }, [styled]);
    return <Dialog.Content {...props} ref={ref} className={`${styled ? 'app-modal ' : ''}${className}`} data-share-surface={styled ? 'true' : undefined}
      style={{ '--share-viewport-height': `${viewport.height}px`, '--share-viewport-bottom': `${viewport.bottom}px`, ...style } as CSSProperties} />;
  },
);
ShareSurface.displayName = 'ShareSurface';
export const ShareOverlay = forwardRef<ElementRef<typeof Dialog.Overlay>, ComponentPropsWithoutRef<typeof Dialog.Overlay>>(
  ({ className = '', ...props }, ref) => <Dialog.Overlay {...props} ref={ref} className={`app-modal-overlay ${className}`} />,
);
ShareOverlay.displayName = 'ShareOverlay';
