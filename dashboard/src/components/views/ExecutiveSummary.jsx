// Why: Shneiderman overview-first — money KPIs top-left, trend+funnel middle, secondary stats bottom
import { useDashboardData } from '@/data/api';
import { executiveSummary } from '@/data/mockData';
import PageContainer from '@/components/layout/PageContainer';
import KpiCard from '@/components/primitives/KpiCard';
import TrendChart from '@/components/primitives/TrendChart';
import FunnelChart from '@/components/primitives/FunnelChart';
import { KpiRowSkeleton, ChartSkeleton } from '@/components/primitives/Skeletons';
import { ErrorState } from '@/components/primitives/ErrorState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { fmtMoney, fmtNum, fmtRoas } from '@/lib/utils';
import { DollarSign, Target, Award, Calculator } from 'lucide-react';

export default function ExecutiveSummary({ filters, refreshKey }) {
  const params = {
    start_date: filters.dateRange.start,
    end_date: filters.dateRange.end,
    platform: filters.platform !== 'all' ? filters.platform : undefined,
    _r: refreshKey
  };
  const { data, loading, error, isFallback, refetch } = useDashboardData(
    'executive',
    params,
    executiveSummary,
    (d) => ({
      ...d,
      trend: (d.trend || []).map((t) => ({
        ...t,
        date: new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }))
    })
  );

  if (loading) {
    return (
      <PageContainer viewId="executive">
        <KpiRowSkeleton />
        <div className="grid gap-4 lg:grid-cols-2"><ChartSkeleton /><ChartSkeleton /></div>
      </PageContainer>
    );
  }

  const s = data.summary;
  if (!s) {
    return <PageContainer viewId="executive"><ErrorState message={error?.message} onRetry={refetch} /></PageContainer>;
  }

  const funnel = [
    { stage: 'New Lead', count: s.total_leads },
    { stage: 'Qualified', count: s.qualified_leads },
    { stage: 'Appointment', count: s.appointments },
    { stage: 'Check-in', count: s.check_ins },
    { stage: 'Consultation', count: s.consultations },
    { stage: 'Enrollment', count: s.enrollments }
  ];

  const insight = `${fmtRoas(s.roas)} ROAS on ${fmtMoney(s.total_marketing_spend, { compact: true })} spend — ` +
    `${s.enrollments} enrollments at ${fmtMoney(s.cac)} CAC (${s.lead_to_enrollment_rate}% lead→enrollment).`;

  return (
    <PageContainer viewId="executive" isFallback={isFallback} insight={insight}>
      {/* 3-second rule: the 4 money KPIs, big, top-left */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="kpi-row">
        <KpiCard title="Revenue" value={fmtMoney(s.total_revenue, { compact: true })} icon={DollarSign} tone="good"
          subtext={`${fmtMoney(s.average_deal_value)} avg deal`} testId="kpi-revenue" />
        <KpiCard title="ROAS" value={fmtRoas(s.roas)} icon={Target} tone="brand"
          subtext={`${s.roi_percentage}% ROI`} testId="kpi-roas" />
        <KpiCard title="Enrollments" value={fmtNum(s.enrollments)} icon={Award}
          subtext={`${s.lead_to_enrollment_rate}% of ${fmtNum(s.total_leads)} leads`} testId="kpi-enrollments" />
        <KpiCard title="CAC" value={fmtMoney(s.cac)} icon={Calculator}
          subtext={`CPL ${fmtMoney(s.cost_per_lead)}`} testId="kpi-cac" />
      </div>

      {/* Middle band: trend + funnel */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="trend-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Trend</CardTitle>
            <CardDescription>Leads, enrollments & revenue</CardDescription>
          </CardHeader>
          <CardContent><TrendChart data={data.trend || []} /></CardContent>
        </Card>
        <Card data-testid="funnel-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Enrollment Funnel</CardTitle>
            <CardDescription>Pipeline stage progression</CardDescription>
          </CardHeader>
          <CardContent><FunnelChart data={funnel} /></CardContent>
        </Card>
      </div>

      {/* Bottom strip: secondary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Marketing Spend" value={fmtMoney(s.total_marketing_spend, { compact: true })} testId="kpi-spend" />
        <KpiCard title="Total Leads" value={fmtNum(s.total_leads)} testId="kpi-total-leads"
          subtext={`${s.lead_to_appointment_rate}% book appointments`} />
        <KpiCard title="Show-up Rate" value={`${s.appointment_to_checkin_rate}%`} testId="kpi-showup"
          subtext={`${fmtNum(s.check_ins)} check-ins`} />
        <KpiCard title="Lost Leads" value={fmtNum(s.lost_leads)} tone="bad" testId="kpi-lost"
          subtext={`${s.lost_lead_percentage}% of leads`} />
      </div>
    </PageContainer>
  );
}
