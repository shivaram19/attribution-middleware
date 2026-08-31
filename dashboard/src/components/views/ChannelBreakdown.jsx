// Why: channel comparison with row→campaign drill — progressive disclosure (Nielsen)
import { useDashboardData } from '@/data/api';
import { channelBreakdown } from '@/data/mockData';
import PageContainer from '@/components/layout/PageContainer';
import DataTable from '@/components/primitives/DataTable';
import DataBadge from '@/components/primitives/DataBadge';
import DonutChart from '@/components/primitives/DonutChart';
import { TableSkeleton, ChartSkeleton, KpiRowSkeleton } from '@/components/primitives/Skeletons';
import { ErrorState } from '@/components/primitives/ErrorState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { fmtMoney, fmtNum, fmtRoas, cn } from '@/lib/utils';

const CHANNEL_MAP = { meta: 'Meta', google: 'Google', organic: 'Organic' };

export default function ChannelBreakdown({ filters, refreshKey, onDrillChannel }) {
  const params = {
    start_date: filters.dateRange.start,
    end_date: filters.dateRange.end,
    _r: refreshKey
  };
  const { data, loading, error, isFallback, refetch } = useDashboardData(
    'channel',
    params,
    { channels: channelBreakdown },
    (d) => ({
      channels: d.channels.map((c) => ({
        ...c,
        isLive: c.data_source === 'live',
        dataSource: c.data_source || (c.isLive ? 'live' : 'simulated')
      }))
    })
  );

  if (loading) {
    return (
      <PageContainer viewId="channel">
        <KpiRowSkeleton count={4} />
        <TableSkeleton />
      </PageContainer>
    );
  }
  if (error && !isFallback) {
    return <PageContainer viewId="channel"><ErrorState message={error.message} onRetry={refetch} /></PageContainer>;
  }

  let channels = data.channels;
  if (filters.platform !== 'all') {
    channels = channels.filter((c) => c.name === CHANNEL_MAP[filters.platform]);
  }

  const meta = data.channels.find((c) => c.name === 'Meta');
  const google = data.channels.find((c) => c.name === 'Google');
  const insight = meta && google
    ? google.roas > meta.roas
      ? `Google ROAS ${fmtRoas(google.roas)} beats Meta ${fmtRoas(meta.roas)} — consider reallocating ~20% of Meta budget to Google Search.`
      : `Meta ROAS ${fmtRoas(meta.roas)} beats Google ${fmtRoas(google.roas)} — Meta is the stronger paid channel this period.`
    : null;

  const roasClass = (r) => (r >= 20 ? 'text-emerald-600' : r >= 10 ? 'text-primary' : 'text-red-600');

  return (
    <PageContainer viewId="channel" isFallback={isFallback} insight={insight}>
      {/* Donut + table (F-pattern: summary band then granular table).
          Stack below xl so the 9-column table fits without clipping. */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card data-testid="channel-donut">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Lead Distribution</CardTitle>
            <CardDescription>Where leads come from</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={channels.map((c) => ({ name: c.name, value: c.leads }))} />
          </CardContent>
        </Card>
        <div className="xl:col-span-2">
          <DataTable
            testId="channel-table"
            rowKey="name"
            onRowClick={onDrillChannel ? (row) => {
              const p = row.name === 'Meta' ? 'meta' : row.name === 'Google' ? 'google' : null;
              if (p) onDrillChannel(p);
            } : undefined}
            columns={[
              { key: 'name', label: 'Channel', render: (c) => (
                <span className="flex items-center gap-2 font-medium">{c.name}
                  {c.name === 'Meta' || c.name === 'Google'
                    ? <DataBadge source={c.dataSource} testId={`badge-${c.name.toLowerCase()}`} />
                    : null}
                </span>
              )},
              { key: 'spend', label: 'Spend', align: 'right', render: (c) => fmtMoney(c.spend, { compact: true }) },
              { key: 'leads', label: 'Leads', align: 'right', render: (c) => fmtNum(c.leads) },
              { key: 'cpl', label: 'CPL', align: 'right', render: (c) => fmtMoney(c.cpl) },
              { key: 'appointments', label: 'Appts', align: 'right' },
              { key: 'enrollments', label: 'Enroll', align: 'right' },
              { key: 'revenue', label: 'Revenue', align: 'right', render: (c) => fmtMoney(c.revenue, { compact: true }) },
              { key: 'cac', label: 'CAC', align: 'right', render: (c) => fmtMoney(c.cac) },
              { key: 'roas', label: 'ROAS', align: 'right', render: (c) => (
                <span className={cn('font-bold', c.roas ? roasClass(c.roas) : 'text-muted-foreground')}>{fmtRoas(c.roas)}</span>
              )}
            ]}
            rows={channels}
          />
        </div>
      </div>
    </PageContainer>
  );
}
