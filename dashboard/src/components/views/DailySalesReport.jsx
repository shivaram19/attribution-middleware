// Why: daily accountability — single-date picker + role tabs (progressive disclosure)
import { useState } from 'react';
import { useDashboardData } from '@/data/api';
import { dailySalesReport } from '@/data/mockData';
import PageContainer from '@/components/layout/PageContainer';
import DataTable from '@/components/primitives/DataTable';
import { TableSkeleton } from '@/components/primitives/Skeletons';
import { ErrorState, EmptyState } from '@/components/primitives/ErrorState';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fmtMoney, fmtNum } from '@/lib/utils';
import { Calendar } from 'lucide-react';

export default function DailySalesReport({ refreshKey }) {
  // Daily sales uses a single date picker (demo anchored to 2026-08-25)
  const [date, setDate] = useState('2026-08-25');
  const [tab, setTab] = useState('call_center');

  const { data, loading, error, isFallback, refetch } = useDashboardData(
    'daily-sales',
    { date, _r: refreshKey },
    dailySalesReport,
    (d) => d
  );

  // Leader = top sales_amount among managers with actual sales; if nobody
  // closed anything, show a neutral activity summary instead of a $0 "leader".
  const closers = (data.sales_managers || []).filter((u) => u.sales_amount > 0);
  const topManager = closers.sort((a, b) => b.sales_amount - a.sales_amount)[0];
  const totalConsults = (data.sales_managers || []).reduce((acc, u) => acc + (u.consultations_conducted || 0), 0);
  const totalFafsa = (data.sales_managers || []).reduce((acc, u) => acc + (u.fafsa_submitted || 0), 0);
  const insight = topManager
    ? `${topManager.name} led the team with ${fmtMoney(topManager.sales_amount)} in sales and ${topManager.enrollments} enrollment(s) on this date.`
    : `No closed sales recorded on this date — ${totalConsults} consultations conducted, ${totalFafsa} FAFSA submissions.`;

  return (
    <PageContainer viewId="sales" isFallback={isFallback} insight={insight}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={15} className="text-muted-foreground" />
          <input
            type="date"
            data-testid="sales-date"
            className="h-9 rounded-md border border-input bg-card px-2.5 text-sm shadow-sm"
            value={date}
            min="2026-08-01"
            max="2026-08-31"
            onChange={(e) => setDate(e.target.value)}
          />
          <span className="text-muted-foreground">Daily performance report</span>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="call_center" data-testid="tab-call-center">Call Center</TabsTrigger>
            <TabsTrigger value="sales_managers" data-testid="tab-sales-managers">Sales Managers</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? <TableSkeleton rows={4} /> : error && !isFallback ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : tab === 'call_center' ? (
        <DataTable
          testId="call-center-table"
          rowKey="user_id"
          columns={[
            { key: 'name', label: 'Name', render: (u) => <span className="font-medium">{u.name}</span> },
            { key: 'calls_made', label: 'Calls', align: 'right' },
            { key: 'completed_dialogues_20s', label: 'Completed 20s+', align: 'right' },
            { key: 'appointments_booked', label: 'Appts', align: 'right' },
            { key: 'check_ins', label: 'Check-ins', align: 'right' },
            { key: 'show_up_rate', label: 'Show-up %', align: 'right', render: (u) => `${u.show_up_rate}%` },
            { key: 'hours_worked', label: 'Hours', align: 'right' }
          ]}
          rows={data.call_center || []}
        />
      ) : (
        <DataTable
          testId="sales-managers-table"
          rowKey="user_id"
          columns={[
            { key: 'name', label: 'Name', render: (u) => <span className="font-medium">{u.name}</span> },
            { key: 'calls_completed', label: 'Calls', align: 'right', render: (u) => `${u.calls_completed}/${u.calls_attempted}` },
            { key: 'consultations_conducted', label: 'Consults', align: 'right' },
            { key: 'fafsa_submitted', label: 'FAFSA Sub', align: 'right' },
            { key: 'fafsa_confirmed', label: 'FAFSA Conf', align: 'right' },
            { key: 'enrollments', label: 'Enroll', align: 'right' },
            { key: 'sales_amount', label: 'Sales', align: 'right', render: (u) => fmtMoney(u.sales_amount) }
          ]}
          rows={data.sales_managers || []}
        />
      )}
      {!loading && (data.call_center || []).length === 0 && (data.sales_managers || []).length === 0 && (
        <EmptyState message={`No sales activity recorded for ${date}`} />
      )}
    </PageContainer>
  );
}
