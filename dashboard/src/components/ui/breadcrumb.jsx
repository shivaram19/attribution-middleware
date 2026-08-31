// Why: shadcn/ui-style primitive — shared visual grammar (Gestalt similarity), 8px grid, rounded-xl
import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// items: [{ label, onClick? }] — last item is current (not clickable)
function Breadcrumb({ items, className, ...props }) {
  return (
    <nav aria-label="breadcrumb" className={cn('flex items-center gap-1 text-sm', className)} {...props}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight size={14} className="text-muted-foreground" />}
            {isLast || !item.onClick ? (
              <span className={cn(isLast ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {item.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export { Breadcrumb };
