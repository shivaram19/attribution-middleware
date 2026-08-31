// Why: ranked losses without chart chrome — red reserved for loss semantics (Ware)
/** Label + horizontal bar + value rows (lost-lead stages/reasons etc.) */
export default function BarList({ items, barColor = 'bg-red-400', testId }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2.5" data-testid={testId}>
      {items.map((item, i) => (
        <div key={i}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="tabular-nums text-muted-foreground">{item.display ?? item.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-300 ${item.color || barColor}`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
