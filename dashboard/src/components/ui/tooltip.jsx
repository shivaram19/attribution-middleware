// Why: shadcn/ui-style primitive — shared visual grammar (Gestalt similarity), 8px grid, rounded-xl
import * as React from 'react';
import { cn } from '@/lib/utils';

// CSS-only tooltip (shadcn-style wrapper, no radix dep)
function Tooltip({ content, children, className }) {
  return (
    <span className={cn('group relative inline-flex', className)}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-md group-hover:block">
        {content}
      </span>
    </span>
  );
}

export { Tooltip };
