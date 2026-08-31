// Why: sticky global filters — Fitts's Law (always reachable) + pencilandpaper.io full-page filter bar
import DateRangePicker from '@/components/filters/DateRangePicker';
import PlatformFilter from '@/components/filters/PlatformFilter';
import RefreshButton from '@/components/filters/RefreshButton';
import { MobileMenuButton } from '@/components/layout/Sidebar';
import { Separator } from '@/components/ui/separator';

/**
 * Sticky topbar: global filters live here and affect the ENTIRE page.
 */
export default function Topbar({ title, filters, onFiltersChange, onRefresh, onOpenMobileNav }) {
  return (
    <header
      data-testid="topbar"
      className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75"
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
        <MobileMenuButton onClick={onOpenMobileNav} />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight" data-testid="view-title">{title}</h1>
          <p className="hidden text-xs text-muted-foreground sm:block">Education Enrollment Attribution</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <DateRangePicker
            value={filters.dateRange}
            onChange={(dateRange) => onFiltersChange({ ...filters, dateRange })}
          />
          <Separator orientation="vertical" className="hidden h-6 md:block" />
          <PlatformFilter
            value={filters.platform}
            onChange={(platform) => onFiltersChange({ ...filters, platform })}
          />
          <RefreshButton onRefresh={onRefresh} />
        </div>
      </div>
    </header>
  );
}
