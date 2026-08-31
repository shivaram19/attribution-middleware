// Why: CPL-vs-enrollment quality ranking — sortable table, chunked score bar (Miller)
import { useDashboardData } from '@/data/api';
import { leadQualityMatrix } from '@/data/mockData';
import PageContainer from '@/components/layout/PageContainer';
import DataTable from '@/components/primitives/DataTable';
import { TableSkeleton } from '@/components/primitives/Skeletons';
import { ErrorState, EmptyState } from '@/components/primitives/ErrorState';
import { Badge } from '@/components/ui/badge';
import { fmtMoney, fmtNum, fmtRoas, cn } from '@/lib/utils';

function QualityBadge({ score }) {
  if (score >= 9) return <Badge variant="success">Excellent</Badge>;
  if (score >= 7) return <Badge variant="default">Good</Badge>;
  if (score >= 5) return <Badge variant="warning">Average</Badge>;
  return <Badge variant="destructive">Poor</Badge>;
}

export default function LeadQualityMatrix({ filters, refreshKey }) {
  const { data, loading, error, isFallback, refetch } = useDashboardData(
    'quality',
    { start_date: filters.dateRange.start, end_date: filters.dateRange.end, _r: refreshKey },
    { campaigns: leadQualityMatrix },
    (d) => d
  );

  if (loading) {
    return <PageContainer viewId="quality"><TableSkeleton rows={8} /></PageContainer>;
  }
  if (error && !isFallback) {
    return <PageContainer viewId="quality"><ErrorState message={error.message} onRetry={refetch} /></PageContainer>;
  }

  let campaigns = data.campaigns || [];
  if (filters.platform !== 'all') {
    campaigns = campaigns.filter((c) => c.platform === filters.platform);
  }

  const top = campaigns[0];
  const bottom = campaigns[campaigns.length - 1];
  const insight = top && bottom && campaigns.length > 1
    ? `'${top.name}' scores ${top.quality_score}/10 (${fmtMoney(top.cpl)} CPL, ${top.enrollment_rate}% enroll); ` +
      `'${bottom.name}' scores ${bottom.quality_score}/10 — review for pausing.`
    : null;

  return (
    <PageContainer viewId="quality" isFallback={isFallback} insight={insight}>
      {campaigns.length === 0 ? <EmptyState /> : (
        <DataTable
          testId="quality-table"
          rowKey="name"
          columns={[
            { key: 'name', label: 'Campaign', render: (c) => <span className="font-medium">{c.name}</span> },
            { key: 'platform', label: 'Platform', render: (c) => (
              <Badge variant={c.platform === 'google' ? 'success' : 'default'}>{c.platform}</Badge>
            )},
            { key: 'cpl', label: 'CPL', align: 'right', render: (c) => fmtMoney(c.cpl) },
            { key: 'leads', label: 'Leads', align: 'right', render: (c) => fmtNum(c.leads) },
            { key: 'qualified_rate', label: 'Qual %', align: 'right', render: (c) => `${c.qualified_rate}%` },
            { key: 'showup_rate', label: 'Show-up %', align: 'right', render: (c) => `${c.showup_rate}%` },
            { key: 'enrollment_rate', label: 'Enroll %', align: 'right', render: (c) => `${c.enrollment_rate}%` },
            { key: 'revenue_per_lead', label: 'Rev/Lead', align: 'right', render: (c) => fmtMoney(c.revenue_per_lead) },
            { key: 'roas', label: 'ROAS', align: 'right', render: (c) => <span className="font-bold">{fmtRoas(c.roas)}</span> },
            { key: 'quality_score', label: 'Quality', align: 'right', render: (c) => (
              <span className="flex items-center justify-end gap-2">
                <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                  <span className={cn('block h-full rounded-full',
                    c.quality_score >= 9 ? 'bg-emerald-500' : c.quality_score >= 7 ? 'bg-primary' : c.quality_score >= 5 ? 'bg-amber-500' : 'bg-red-500')}
                    style={{ width: `${c.quality_score * 10}%` }} />
                </span>
                <span className="font-bold tabular-nums">{c.quality_score}</span>
                <QualityBadge score={c.quality_score} />
              </span>
            )}
          ]}
          rows={campaigns}
        />
      )}
    </PageContainer>
  );
}
