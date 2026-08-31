// Why: shadcn/ui-style primitive — shared visual grammar (Gestalt similarity), 8px grid, rounded-xl
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
