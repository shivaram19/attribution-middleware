// Why: one-story-per-view grammar (badge → insight → content) — Sweller cognitive load, Gestalt common region
import { OfflineBadge } from '@/data/api';
import InsightCallout from '@/components/primitives/InsightCallout';

/**
 * F-pattern page wrapper: insight callout under the title area, then content
 * (top KPI band -> middle charts -> bottom tables supplied by the view).
 */
export default function PageContainer({ viewId, isFallback, insight, children }) {
  return (
    <div className="animate-fade-in space-y-4 p-4 lg:p-6" data-testid={`view-${viewId}`}>
      <div className="flex flex-wrap items-center gap-2">
        {isFallback && <OfflineBadge />}
      </div>
      {insight && <InsightCallout>{insight}</InsightCallout>}
      {children}
    </div>
  );
}
