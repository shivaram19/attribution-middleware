// Why: primary navigation — Gestalt figure/ground dark rail; full ≥xl, icon rail md–xl, hamburger overlay <md
import { LayoutDashboard, BarChart3, Target, Award, AlertTriangle, Users, TrendingUp, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';

export const NAV_ITEMS = [
  { id: 'executive', label: 'Executive Summary', icon: LayoutDashboard },
  { id: 'channel', label: 'Channel Breakdown', icon: BarChart3 },
  { id: 'campaign', label: 'Campaign Drill-Down', icon: Target },
  { id: 'quality', label: 'Lead Quality', icon: Award },
  { id: 'lost', label: 'Lost Leads', icon: AlertTriangle },
  { id: 'sales', label: 'Daily Sales', icon: Users }
];

function NavContent({ activeView, onNavigate, collapsed }) {
  const navTestId = (id) => (collapsed ? `nav-icon-${id}` : `nav-${id}`);
  return (
    <>
      <div className={cn('flex items-center gap-2.5 border-b border-slate-800 py-4', collapsed ? 'justify-center px-2' : 'px-5')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <TrendingUp size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-white">Attribution</div>
            <div className="text-xs text-slate-400">Dashboard</div>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2" data-testid="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          const btn = (
            <button
              key={item.id}
              type="button"
              data-testid={navTestId(item.id)}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                active ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon size={17} />
              {!collapsed && item.label}
            </button>
          );
          return collapsed
            ? <Tooltip key={item.id} content={item.label} className="block">{btn}</Tooltip>
            : btn;
        })}
      </nav>
      {!collapsed && (
        <div className="space-y-1.5 border-t border-slate-800 p-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Meta API: Live
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Google API: Simulated
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Responsive sidebar:
 *   ≥xl  full width with labels
 *   md–xl icon rail (w-16, tooltips on hover)
 *   <md  hidden; hamburger opens a slide-over overlay
 */
export default function Sidebar({ activeView, onNavigate, mobileOpen, onCloseMobile }) {
  return (
    <>
      <aside
        className="hidden shrink-0 flex-col bg-slate-900 md:flex md:w-16 xl:w-64"
        data-testid="sidebar"
      >
        {/* icon rail for md–xl, full labels at xl+ */}
        <div className="hidden h-full xl:flex xl:flex-col">
          <NavContent activeView={activeView} onNavigate={onNavigate} collapsed={false} />
        </div>
        <div className="flex h-full flex-col xl:hidden">
          <NavContent activeView={activeView} onNavigate={onNavigate} collapsed={true} />
        </div>
      </aside>
      {/* Mobile overlay (<md) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-slate-900" data-testid="sidebar-mobile">
            <div className="absolute right-2 top-2">
              <button onClick={onCloseMobile} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <NavContent activeView={activeView} onNavigate={(v) => { onNavigate(v); onCloseMobile(); }} collapsed={false} />
          </aside>
        </div>
      )}
    </>
  );
}

export function MobileMenuButton({ onClick }) {
  return (
    <button onClick={onClick} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden" data-testid="mobile-menu">
      <Menu size={18} />
    </button>
  );
}
