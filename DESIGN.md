# DESIGN.md — Attribution Dashboard Design System

Research-driven design contract for the rebuilt dashboard
(Vite + React 18 + Tailwind + shadcn/ui + recharts).

## Sources

| Source | Used for |
|--------|----------|
| resolution.de — dashboard best practices | 3-second rule, KPI hierarchy, F-pattern page structure |
| uxpin.com — dashboard design principles | progressive disclosure, card-based grouping, consistency |
| uxpilot.ai — 12 dashboard principles | 60-30-10 color, 8px grid, visual hierarchy |
| context.dev — SaaS dashboard practices | sticky global filter bar, feedback states, responsive SaaS layout |
| pencilandpaper.io — filter UX patterns | full-page filter bar in sticky topbar, preset date ranges |
| Nielsen Norman Group | F-pattern scanning, progressive disclosure |
| Shneiderman (1996) | "Overview first, zoom and filter, then details-on-demand" — drill-down architecture |
| Wertheimer/Koffka — Gestalt principles | proximity, similarity, common region, figure/ground |
| Tufte — data-ink ratio | minimal chrome, no chartjunk |
| Hick's Law | ≤4 filter controls in the topbar |
| Miller (7±2) — chunking | KPI row ≤ 5 cards |
| Fitts's Law | sticky topbar keeps filters perpetually reachable |
| Ware — visual perception | red = danger/loss, green = good/winner conventions |
| Sweller — cognitive load | one story per view, no competing widgets |
| Material/Spec 8pt grid | all spacing in 8px multiples |

---

## Design principles applied (mandatory)

1. **3-second rule** — Revenue, ROAS, Enrollments, CAC are the top-left KPI band,
   3xl extrabold, readable in a glance (resolution.de).
2. **F-pattern** — every view: KPI/summary band → charts band → granular table (NN/g).
3. **60-30-10 color** — neutral slate/white ~60%, muted surfaces ~30%, one brand accent
   (indigo-500) ~10%. Green reserved for winners, red/amber reserved for alerts/losers
   (Ware's learned color semantics). No rainbow palettes.
4. **8px grid + Inter** — all spacing p-2/4/6/8, `rounded-xl` cards, `shadow-sm`,
   Inter with tabular-nums for figures (uxpilot, Material 8pt).
5. **Sticky global filter bar** — date range (7D/14D/30D/Full + custom, anchored to the
   DATA max 2026-08-31, never "today") and platform (All/Meta/Google/Organic) in the
   topbar; every change refetches every view with skeleton loaders (pencilandpaper.io,
   context.dev).
6. **Progressive disclosure** — summary first, click to drill: channel row → campaigns,
   campaign → ad sets → ads, with breadcrumb back (Nielsen; Shneiderman).
7. **Feedback states everywhere** — skeletons while loading, error state with retry,
   empty state, "offline demo data" badge on mock fallback.
8. **Data-driven insight callouts** — 1–2 sentence insight computed from the live API
   response, shown under the view title (resolution.de: "tell the story, not just numbers").
9. **Smooth finish** — 200ms fade/slide on view switches, compact number formatting
   ($690K, 30.7x), hover states on rows, sticky table headers, responsive.
10. **Gestalt organization ("the whole is smarter than the part")** — proximity groups
    related metrics into shared cards (common region); identical KPI card grammar across
    views (similarity); whitespace separates unrelated groups; consistent color meaning
    everywhere so learning one view teaches all views (Wertheimer/Koffka).
11. **Responsive for all desktops, graceful below** — sidebar: full labels ≥xl,
    icon rail md–xl, hamburger overlay <md; KPI grid 4→2→1 columns; tables
    horizontal-scroll with sticky first column; charts in ResponsiveContainer.

---

## Component Rationale Register

| Component / Decision | Why it exists | Why this position | Why this color/style | Citation |
|---|---|---|---|---|
| `KpiCard` (Revenue, ROAS, Enrollments, CAC) | The 4 money questions a stakeholder asks first | Top-left band, first in reading order | 3xl extrabold tabular-nums; green only for positive-money semantics | resolution.de 3-second rule; NN/g F-pattern; Miller 7±2 (≤5 cards) |
| `Topbar` (sticky) with filters | Filters must affect the whole page and never scroll away | Sticky top-0, full width | backdrop-blur neutral bar; single accent for active preset | pencilandpaper.io full-page filter bar; Fitts's Law; context.dev |
| `DateRangePicker` presets (7D/14D/30D/Full/Custom) | Fixed choices beat free-form for demo repeatability | Left group inside topbar | segmented control, active = raised card | Hick's Law (4+1 choices); pencilandpaper.io presets |
| Presets anchored to DATA_MAX 2026-08-31 | Demo data is historical; "today" would yield empty charts | — | — | context.dev SaaS practices; demo determinism |
| `PlatformFilter` (All/Meta/Google/Organic) | One mental model: "which channel am I looking at" | Topbar, right of date range | native select, muted | Hick's Law; maps to real API params |
| `RefreshButton` | Explicit re-fetch affordance for live demos | Topbar far right | outline ghost button | context.dev feedback states |
| `Sidebar` nav | 6 views = one per business question | Left rail; icon rail md–xl, overlay <md | dark slate region separates nav from content (figure/ground) | Gestalt figure/ground; Material nav rail |
| `PageContainer` | One coherent story per view: badge → insight → content | Wraps every view | 200ms fade-in, 8px-grid spacing | Sweller cognitive load; Gestalt common region |
| `InsightCallout` | Computes the "so what" from live data | Directly under view title | subtle accent tint, bulb icon, no chrome | resolution.de data storytelling; Tufte (max signal, min ink) |
| `DataTable` (sortable, sticky header, sticky first col) | Granular detail is the bottom of the F | Bottom band of each view | white card, hover rows, indigo sort icons | NN/g F-pattern; Shneiderman details-on-demand |
| `TrendChart` (area) | Shows rhythm/spikes over the period | Middle band | indigo leads + green enrollments + dashed slate revenue | Tufte data-ink; Ware color semantics |
| `FunnelChart` | Stage drop-off reads as one shape | Middle band, beside trend | indigo bars, green final stage (winner) | Gestalt similarity; Ware |
| `DonutChart` | Part-to-whole share at a glance | Left of channel/lost layouts | restrained palette (indigo, green, grays) | 60-30-10; no rainbow (uxpilot) |
| `BarList` | Ranked stages/reasons without a chart lib | Right column / card body | red-400 bars reserved for losses | Ware red=danger |
| `DataBadge` (Live API / Simulated) | Doc 06 demo-mode honesty: Google data is mocked | Inline next to channel/campaign name | green = live, amber = simulated | Doc 06 DEMO_MODE; Ware semantics |
| `OfflineBadge` | Signals mock fallback so demos never lie | Top of view, before insight | amber badge | Doc 06; context.dev feedback states |
| `Skeletons` (KpiRow/Chart/Table) | Perceived performance + visible refetch on filter change | Exact footprint of final content | neutral shimmer | context.dev; Nielsen response-time feedback |
| `ErrorState` + retry | Failure must be recoverable in one click | Replaces content region | red icon, outline retry button | Nielsen error-recovery heuristic |
| `EmptyState` | Filter combos (e.g. Organic campaigns) can be legitimately empty | Content region | muted inbox icon | Nielsen visibility-of-status |
| `Breadcrumb` | Orientation while drilling | Top-left of drill views | muted links, chevron separators | Shneiderman zoom/details; NN/g wayfinding |
| Channel row click → Campaign view | Cross-view drill preserves the story | Whole row clickable | hover affordance | Progressive disclosure (Nielsen) |
| F-pattern view grammar (KPIs→charts→tables) | Every view teaches every other view | Fixed per view | shared card radius/shadow | Gestalt similarity; uxpin consistency |
| Compact number formatting ($690K, 30.7x) | Big numbers readable in <1s | All KPI/table cells | tabular-nums, en-US grouping | resolution.de readability; Tufte |

---

## Component inventory (built)

```
src/
  App.jsx                       # lifted filter state (dateRange, platform, refreshKey), view router
  main.jsx
  index.css                     # Tailwind + CSS vars theme + Inter + 60-30-10 tokens
  lib/utils.js                  # cn(), fmtMoney/fmtNum/fmtRoas (compact, tabular)
  data/api.js                   # fetchDashboard + useDashboardData + OfflineBadge (mock fallback)
  data/mockData.js              # doc 04 static demo data (offline fallback)
  components/
    ui/                         # shadcn/ui-style primitives
      card.jsx  button.jsx  badge.jsx  skeleton.jsx  table.jsx
      select.jsx  separator.jsx  tabs.jsx  tooltip.jsx  breadcrumb.jsx
    layout/
      Sidebar.jsx               # full ≥xl / icon rail md–xl / hamburger overlay <md
      Topbar.jsx                # sticky global filter bar
      PageContainer.jsx         # view grammar wrapper (badge → insight → content)
    filters/
      DateRangePicker.jsx       # presets anchored to DATA_MAX=2026-08-31 + custom
      PlatformFilter.jsx        # All/Meta/Google/Organic -> API params
      RefreshButton.jsx
    primitives/
      KpiCard.jsx  DataTable.jsx  TrendChart.jsx  DonutChart.jsx  FunnelChart.jsx
      BarList.jsx  DataBadge.jsx  InsightCallout.jsx  Skeletons.jsx  ErrorState.jsx
    views/
      ExecutiveSummary.jsx      # Revenue/ROAS/Enrollments/CAC band -> trend+funnel -> stats
      ChannelBreakdown.jsx      # donut + channel table; row click drills to campaigns
      CampaignDrillDown.jsx     # campaigns -> ad sets -> ads (breadcrumb), google keywords
      LeadQualityMatrix.jsx     # sortable quality table w/ score bars
      LostLeadAnalysis.jsx      # KPIs + donut + stage bars + reasons table
      DailySalesReport.jsx      # date picker + call-center/sales-manager tabs
```
