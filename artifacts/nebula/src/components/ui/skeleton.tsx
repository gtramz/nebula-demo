import { cn } from '@/lib/utils';
import './skeleton.css';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('nebula-skeleton', className)}
      {...props}
    />
  );
}

export { Skeleton };
