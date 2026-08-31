// Why: 3-second-rule money KPIs, top-left — resolution.de; Miller 7±2 caps the KPI row
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Big, instantly-readable KPI card (3-second rule). KPIs live top-left.
 */
export default function KpiCard({ title, value, subtext, icon: Icon, tone = 'neutral', delta, testId }) {
  const tones = {
    neutral: 'text-foreground',
    good: 'text-emerald-600',
    bad: 'text-red-600',
    brand: 'text-primary'
  };
  return (
    <Card data-testid={testId || `kpi-${String(title).toLowerCase().replace(/\s+/g, '-')}`} className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className={cn('mt-1.5 text-3xl font-extrabold tabular-nums tracking-tight', tones[tone])}>
              {value}
            </p>
          </div>
          {Icon && (
            <div className="rounded-lg bg-accent p-2 text-primary">
              <Icon size={18} />
            </div>
          )}
        </div>
        {(subtext || delta !== undefined) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            {delta !== undefined && (
              <span className={cn('inline-flex items-center gap-0.5 font-semibold', delta >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {delta > 0 ? '+' : ''}{delta}%
              </span>
            )}
            {subtext && <span className="truncate">{subtext}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
