// Why: the loss story (who/where/why) — Ware red semantics, insight computes top reason+stage
import { useDashboardData } from '@/data/api';
import { lostLeadAnalysis } from '@/data/mockData';
import PageContainer from '@/components/layout/PageContainer';
import KpiCard from '@/components/primitives/KpiCard';
import DataTable from '@/components/primitives/DataTable';
import DonutChart from '@/components/primitives/DonutChart';
import BarList from '@/components/primitives/BarList';
import { KpiRowSkeleton, TableSkeleton } from '@/components/primitives/Skeletons';
import { ErrorState } from '@/components/primitives/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtMoney, fmtNum } from '@/lib/utils';
import { AlertTriangle, TrendingDown, ArrowRight } from 'lucide-react';

const prettyStage = (s) => String(s).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

export default function LostLeadAnalysis({ filters, refreshKey }) {
  const { data, loading, error, isFallback, refetch } = useDashboardData(
    'lost-leads',
    {
      start_date: filters.dateRange.start,
      end_date: filters.dateRange.end,
      source: filters.platform !== 'all' ? filters.platform : undefined,
      _r: refreshKey
    },
    lostLeadAnalysis,
    (d) => ({ ...d, by_source_and_reason: d.by_source_and_reason || {} })
  );

  if (loading) {
    return <PageContainer viewId="lost"><KpiRowSkeleton count={3} /><TableSkeleton /></PageContainer>;
  }
  if (error && !isFallback) {
    return <PageContainer viewId="lost"><ErrorState message={error.message} onRetry={refetch} /></PageContainer>;
  }

  const topReason = data.by_reason?.[0];
  const topStage = data.by_stage?.[0];
  const insight = topReason && topStage
    ? `Top loss reason: '${topReason.reason}' (${topReason.percentage}%). Biggest drop-off at ${prettyStage(topStage.stage)} (${topStage.percentage}%) — coach financing objections earlier in the funnel.`
    : null;

  return (
    <PageContainer viewId="lost" isFallback={isFallback} insight={insight}>
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Total Lost Leads" value={fmtNum(data.summary.total_lost)} icon={AlertTriangle} tone="bad"
          subtext={`${data.summary.lost_percentage}% of all leads`} testId="kpi-lost-total" />
        <KpiCard title="Potential Revenue Lost" value={fmtMoney(data.summary.total_potential_revenue, { compact: true })}
          icon={TrendingDown} tone="bad" testId="kpi-lost-revenue" />
        <KpiCard title="Biggest Drop-off" value={topStage ? prettyStage(topStage.stage) : '—'} icon={ArrowRight}
          subtext={topStage ? `${topStage.percentage}% of losses` : ''} testId="kpi-lost-stage" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="lost-by-source">
          <CardHeader className="pb-0"><CardTitle className="text-base">Lost by Source</CardTitle></CardHeader>
          <CardContent>
            <DonutChart data={(data.by_source || []).map((s) => ({ name: s.source, value: s.lost }))} />
          </CardContent>
        </Card>
        <Card data-testid="lost-by-stage">
          <CardHeader><CardTitle className="text-base">Losses by Pipeline Stage</CardTitle></CardHeader>
          <CardContent>
            <BarList
              testId="lost-stage-list"
              items={(data.by_stage || []).map((s) => ({
                label: prettyStage(s.stage),
                value: s.lost,
                display: `${s.lost} (${s.percentage}%)`
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <DataTable
        testId="lost-reason-table"
        rowKey="reason"
        columns={[
          { key: 'reason', label: 'Reason', render: (r) => <span className="font-medium">{r.reason}</span> },
          { key: 'count', label: 'Count', align: 'right' },
          { key: 'percentage', label: 'Share', align: 'right', render: (r) => `${r.percentage}%` }
        ]}
        rows={data.by_reason || []}
      />
    </PageContainer>
  );
}
