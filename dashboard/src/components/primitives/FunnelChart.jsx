// Why: stage drop-off reads as one shape — Gestalt similarity; green reserved for the winner (Ware)
import { cn } from '@/lib/utils';

/** Horizontal funnel bars (stage -> count) */
export default function FunnelChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2" data-testid="funnel-chart">
      {data.map((d, i) => (
        <div key={d.stage} className="group">
          <div className="mb-0.5 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">{d.stage}</span>
            <span className="tabular-nums text-muted-foreground">{Number(d.count).toLocaleString()}</span>
          </div>
          <div className="h-5 w-full overflow-hidden rounded-md bg-muted">
            <div
              className={cn('h-full rounded-md transition-all duration-300', i === data.length - 1 ? 'bg-emerald-500' : 'bg-primary/80')}
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
