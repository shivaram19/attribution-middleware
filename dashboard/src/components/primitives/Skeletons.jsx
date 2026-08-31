// Why: perceived performance + visible refetch on filter change — context.dev feedback states
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function KpiRowSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="kpi-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}><CardContent className="p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-8 w-28" />
          <Skeleton className="mt-2 h-3 w-24" />
        </CardContent></Card>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 280 }) {
  return (
    <Card data-testid="chart-skeleton"><CardContent className="p-5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 w-full" style={{ height }} />
    </CardContent></Card>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <Card data-testid="table-skeleton"><CardContent className="p-5 space-y-3">
      <Skeleton className="h-4 w-48" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </CardContent></Card>
  );
}
