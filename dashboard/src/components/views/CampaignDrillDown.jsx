// Why: Shneiderman zoom-and-filter — campaign → ad set → ad with breadcrumb wayfinding
import { useState, useEffect } from 'react';
import { useDashboardData } from '@/data/api';
import { metaCampaigns, metaAdSets, metaAds, googleCampaigns, googleKeywords } from '@/data/mockData';
import PageContainer from '@/components/layout/PageContainer';
import DataTable from '@/components/primitives/DataTable';
import { TableSkeleton } from '@/components/primitives/Skeletons';
import { ErrorState, EmptyState } from '@/components/primitives/ErrorState';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { fmtMoney, fmtNum, fmtRoas, cn } from '@/lib/utils';

const DRILL_PLATFORMS = ['meta', 'google'];

export default function CampaignDrillDown({ filters, refreshKey }) {
  // Global platform filter drives the drill platform when it's meta/google
  const [localPlatform, setLocalPlatform] = useState('meta');
  const platform = DRILL_PLATFORMS.includes(filters.platform) ? filters.platform : localPlatform;

  const [campaign, setCampaign] = useState(null);
  const [adset, setAdset] = useState(null);

  useEffect(() => { setCampaign(null); setAdset(null); }, [platform, filters.dateRange]);

  const listFallback = { campaigns: platform === 'meta' ? metaCampaigns : googleCampaigns };
  const list = useDashboardData(
    'campaign',
    { platform, start_date: filters.dateRange.start, end_date: filters.dateRange.end, _r: refreshKey },
    listFallback,
    (d) => ({ campaigns: d.campaigns.map((c) => ({ ...c, status: c.status || 'active' })) })
  );

  const detailFallback = {
    campaign,
    adsets: campaign ? metaAdSets[campaign.id] || [] : [],
    ads: adset ? metaAds[adset.id] || [] : [],
    keywords: campaign ? googleKeywords[campaign.id] || [] : []
  };
  const detail = useDashboardData(
    'campaign',
    campaign ? { platform, campaign_id: campaign.id, start_date: filters.dateRange.start, end_date: filters.dateRange.end, _r: refreshKey } : null,
    detailFallback,
    (d) => ({
      ...d,
      keywords: (d.keywords || []).map((k) => ({
        text: k.keyword,
        match_type: k.match_type,
        // insights are campaign-level; demo approximations
        cpl: Math.round((k.enrollments ? k.spend / k.enrollments : k.spend) * 100) / 100,
        enroll_rate: d.campaign ? d.campaign.conversion_rate : 0,
        rev_per_lead: k.enrollments ? Math.round(k.revenue / k.enrollments) : 0
      }))
    })
  );

  const isFallback = list.isFallback || detail.isFallback;
  const loading = list.loading || (campaign && detail.loading);

  const campaigns = list.data.campaigns || [];
  const best = campaigns.length ? [...campaigns].sort((a, b) => b.roas - a.roas)[0] : null;
  const worst = campaigns.length ? [...campaigns].sort((a, b) => a.roas - b.roas)[0] : null;
  const insight = best && worst && best.id !== worst.id
    ? `'${best.name}' leads at ${fmtRoas(best.roas)} ROAS; '${worst.name}' trails at ${fmtRoas(worst.roas)} — shift budget toward the winner.`
    : null;

  const roasClass = (r) => (r >= 20 ? 'text-emerald-600' : r >= 10 ? 'text-primary' : 'text-red-600');

  const crumbs = [
    { label: 'Campaigns', onClick: () => { setCampaign(null); setAdset(null); } },
    ...(campaign ? [{ label: campaign.name, onClick: adset ? () => setAdset(null) : undefined }] : []),
    ...(adset ? [{ label: adset.name }] : [])
  ];

  const platformTabs = (
    <Tabs value={platform} onValueChange={setLocalPlatform}>
      <TabsList data-testid="platform-tabs">
        <TabsTrigger value="meta" data-testid="tab-meta">Meta Ads (Live)</TabsTrigger>
        <TabsTrigger value="google" data-testid="tab-google">Google Ads (Simulated)</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  if (filters.platform === 'organic') {
    return (
      <PageContainer viewId="campaign" isFallback={isFallback}>
        <EmptyState message="Organic traffic has no paid campaigns — pick Meta or Google in the platform filter." />
      </PageContainer>
    );
  }

  // ---- Ads (deepest level) ----
  if (campaign && adset && platform === 'meta') {
    const ads = detail.isFallback ? (detail.data.ads || []) : (detail.data.ads || []).filter((a) => a.adset_id === adset.id);
    return (
      <PageContainer viewId="campaign" isFallback={isFallback}>
        <Breadcrumb items={crumbs} data-testid="breadcrumb" />
        {detail.loading ? <TableSkeleton rows={3} /> : (
          <div className="grid gap-4 md:grid-cols-2" data-testid="ads-grid">
            {ads.map((ad) => (
              <Card key={ad.id} data-testid={`ad-${ad.id}`}>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-semibold">{ad.name}</h4>
                    <Badge variant="secondary">{ad.placement}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[['Spend', fmtMoney(ad.spend)], ['Leads', fmtNum(ad.leads)], ['Enroll', fmtNum(ad.enrollments)]].map(([l, v]) => (
                      <div key={l} className="rounded-lg bg-muted p-2.5">
                        <p className="text-xs text-muted-foreground">{l}</p>
                        <p className="text-lg font-bold tabular-nums">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Revenue: <strong>{fmtMoney(ad.revenue)}</strong></span>
                    <span className={cn('font-bold', roasClass(ad.roas))}>{fmtRoas(ad.roas)} ROAS</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    );
  }

  // ---- Ad sets / keywords (campaign detail) ----
  if (campaign) {
    const d = detail.data;
    return (
      <PageContainer viewId="campaign" isFallback={isFallback}>
        <Breadcrumb items={crumbs} data-testid="breadcrumb" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[['Spend', fmtMoney(d.campaign?.spend ?? campaign.spend)], ['Leads', fmtNum(d.campaign?.leads ?? campaign.leads)],
            ['Enrollments', fmtNum(d.campaign?.enrollments ?? campaign.enrollments)], ['ROAS', fmtRoas(d.campaign?.roas ?? campaign.roas)]
          ].map(([l, v]) => (
            <Card key={l}><CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{l}</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{v}</p>
            </CardContent></Card>
          ))}
        </div>
        {detail.loading ? <TableSkeleton /> : platform === 'meta' ? (
          <DataTable
            testId="adset-table"
            onRowClick={(row) => setAdset(row)}
            columns={[
              { key: 'name', label: 'Ad Set', render: (a) => <span className="font-medium">{a.name}</span> },
              { key: 'spend', label: 'Spend', align: 'right', render: (a) => fmtMoney(a.spend) },
              { key: 'leads', label: 'Leads', align: 'right' },
              { key: 'enrollments', label: 'Enroll', align: 'right' },
              { key: 'revenue', label: 'Revenue', align: 'right', render: (a) => fmtMoney(a.revenue) },
              { key: 'roas', label: 'ROAS', align: 'right', render: (a) => <span className={cn('font-bold', roasClass(a.roas))}>{fmtRoas(a.roas)}</span> }
            ]}
            rows={d.adsets || []}
          />
        ) : (
          <DataTable
            testId="keyword-table"
            rowKey="text"
            columns={[
              { key: 'text', label: 'Keyword', render: (k) => <span className="font-medium">"{k.text}"</span> },
              { key: 'match_type', label: 'Match', render: (k) => <Badge variant="secondary">{k.match_type}</Badge> },
              { key: 'cpl', label: 'CPL', align: 'right', render: (k) => fmtMoney(k.cpl) },
              { key: 'enroll_rate', label: 'Enroll %', align: 'right', render: (k) => `${k.enroll_rate}%` },
              { key: 'rev_per_lead', label: 'Rev/Lead', align: 'right', render: (k) => fmtMoney(k.rev_per_lead) }
            ]}
            rows={d.keywords || []}
          />
        )}
      </PageContainer>
    );
  }

  // ---- Campaign list ----
  return (
    <PageContainer viewId="campaign" isFallback={isFallback} insight={insight}>
      {platformTabs}
      {loading ? <TableSkeleton /> : campaigns.length === 0 ? <EmptyState /> : (
        <DataTable
          testId="campaign-table"
          onRowClick={(row) => setCampaign(row)}
          columns={[
            { key: 'name', label: 'Campaign', render: (c) => <span className="font-medium">{c.name}</span> },
            { key: 'spend', label: 'Spend', align: 'right', render: (c) => fmtMoney(c.spend) },
            { key: 'leads', label: 'Leads', align: 'right' },
            { key: 'cpl', label: 'CPL', align: 'right', render: (c) => fmtMoney(c.cpl) },
            { key: 'enrollments', label: 'Enroll', align: 'right' },
            { key: 'revenue', label: 'Revenue', align: 'right', render: (c) => fmtMoney(c.revenue) },
            { key: 'roas', label: 'ROAS', align: 'right', render: (c) => <span className={cn('font-bold', roasClass(c.roas))}>{fmtRoas(c.roas)}</span> }
          ]}
          rows={campaigns}
        />
      )}
    </PageContainer>
  );
}
