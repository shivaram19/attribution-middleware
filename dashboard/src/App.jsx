// Why: lifted global filter state + view routing — context.dev full-page filter bar; one state feeds every view
import { useState, useCallback } from 'react';
import Sidebar, { NAV_ITEMS } from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ExecutiveSummary from '@/components/views/ExecutiveSummary';
import ChannelBreakdown from '@/components/views/ChannelBreakdown';
import CampaignDrillDown from '@/components/views/CampaignDrillDown';
import LeadQualityMatrix from '@/components/views/LeadQualityMatrix';
import LostLeadAnalysis from '@/components/views/LostLeadAnalysis';
import DailySalesReport from '@/components/views/DailySalesReport';
import { PRESETS } from '@/components/filters/DateRangePicker';

export default function App() {
  const [activeView, setActiveView] = useState('executive');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Global filter state (lifted): date range + platform, plus refresh trigger.
  const [filters, setFilters] = useState({
    dateRange: { preset: 'full', ...PRESETS.full },
    platform: 'all'
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Progressive disclosure: channel row click -> campaign drill-down
  const onDrillChannel = useCallback((platform) => {
    setFilters((f) => ({ ...f, platform }));
    setActiveView('campaign');
  }, []);

  const title = NAV_ITEMS.find((i) => i.id === activeView)?.label || '';

  const viewProps = { filters, refreshKey };
  const views = {
    executive: <ExecutiveSummary {...viewProps} />,
    channel: <ChannelBreakdown {...viewProps} onDrillChannel={onDrillChannel} />,
    campaign: <CampaignDrillDown {...viewProps} />,
    quality: <LeadQualityMatrix {...viewProps} />,
    lost: <LostLeadAnalysis {...viewProps} />,
    sales: <DailySalesReport {...viewProps} />
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={onRefresh}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1" key={activeView}>
          {views[activeView]}
        </main>
      </div>
    </div>
  );
}
