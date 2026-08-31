// Why: preset date ranges anchored to DATA_MAX (2026-08-31) — Hick's Law few choices; pencilandpaper.io presets
import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

// Demo data anchor: the dataset is Aug 1-31 2026. Presets anchor to the DATA's
// max date (NOT today): "7D" = Aug 25-31, "30D" = Aug 2-31, "Full" = Aug 1-31.
export const DATA_MIN = '2026-08-01';
export const DATA_MAX = '2026-08-31';

function daysBefore(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - (n - 1));
  return d.toISOString().slice(0, 10);
}

export const PRESETS = {
  full: { label: 'Full range', start: DATA_MIN, end: DATA_MAX },
  '30d': { label: '30D', start: daysBefore(DATA_MAX, 30), end: DATA_MAX },
  '14d': { label: '14D', start: daysBefore(DATA_MAX, 14), end: DATA_MAX },
  '7d': { label: '7D', start: daysBefore(DATA_MAX, 7), end: DATA_MAX }
};

export default function DateRangePicker({ value, onChange }) {
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');

  const pick = (key) => {
    setShowCustom(key === 'custom');
    if (key === 'custom') {
      onChange({ preset: 'custom', start: value.start, end: value.end });
    } else {
      onChange({ preset: key, ...PRESETS[key] });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="date-range-picker">
      <Calendar size={14} className="text-muted-foreground" />
      <div className="inline-flex rounded-lg bg-muted p-0.5">
        {Object.entries(PRESETS).map(([key, p]) => (
          <button
            key={key}
            type="button"
            data-testid={`date-preset-${key}`}
            onClick={() => pick(key)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
              value.preset === key ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          data-testid="date-preset-custom"
          onClick={() => pick('custom')}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
            value.preset === 'custom' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Custom
        </button>
      </div>
      {(showCustom || value.preset === 'custom') && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="date"
            data-testid="date-start"
            className="h-8 rounded-md border border-input bg-card px-2 text-xs shadow-sm"
            value={value.start}
            min={DATA_MIN}
            max={DATA_MAX}
            onChange={(e) => onChange({ preset: 'custom', start: e.target.value, end: value.end })}
          />
          <span>–</span>
          <input
            type="date"
            data-testid="date-end"
            className="h-8 rounded-md border border-input bg-card px-2 text-xs shadow-sm"
            value={value.end}
            min={DATA_MIN}
            max={DATA_MAX}
            onChange={(e) => onChange({ preset: 'custom', start: value.start, end: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
