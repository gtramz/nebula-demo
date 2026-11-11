import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { useReturnTarget, returnLabel } from '@/components/shell/return-context';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { projectDestination } from '@/components/shell/project-destination';

export const controlStyles = {
  field: 'w-full min-w-0 min-h-11 rounded-field border border-border bg-surfaceAlt px-4 py-3 text-sm text-ink disabled:opacity-50',
  button: 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium transition-colors hover:border-accent hover:bg-surfaceAlt active:bg-surface disabled:cursor-not-allowed disabled:opacity-40',
  primary: 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-cream bg-cream px-5 py-3 text-sm font-semibold text-bg transition-colors hover:bg-accent hover:border-accent active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40',
};
export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return <section {...props} className={cn('min-w-0 rounded-surface border border-border bg-surface p-5 sm:p-6 space-y-4', className)} />;
}
export function StateBadge({ children }: { children: ReactNode }) {
  return <span className="inline-flex w-fit rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">{children}</span>;
}
const returnStyle = 'inline-flex min-h-11 min-w-11 items-center gap-2 text-sm text-muted transition-colors hover:text-ink active:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4';
export function ReturnButton({ children, className, ...props }: ComponentProps<'button'>) {
  return <button type="button" {...props} className={cn(returnStyle, className)}><ArrowLeft size={16} aria-hidden="true" />{children}</button>;
}
export function ReturnLink({ href, children, onClick, contextual = true, className }: { href: string; children?: ReactNode; onClick?: () => void; contextual?: boolean; className?: string }) {
  const { user } = useAuth();
  const target = useReturnTarget(href), destination = contextual ? target.href : href;
  const label = destination.split('?')[0] === '/explore' ? `Back to ${projectDestination(user?.role)}` : returnLabel(destination);
  const text = contextual ? (target.delta === null ? label.replace(/^Back to /, 'Go to ') : label) : children ?? label;
  return <Link href={destination} data-contextual-return={contextual || undefined} onClick={event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    onClick?.();
    if (contextual && target.delta !== null) { event.preventDefault(); history.go(target.delta); }
  }} className={cn(returnStyle, className)}><ArrowLeft size={16} aria-hidden="true" />{text}</Link>;
}
