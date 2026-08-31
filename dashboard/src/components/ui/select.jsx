// Why: shadcn/ui-style primitive — shared visual grammar (Gestalt similarity), 8px grid, rounded-xl
import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// shadcn-style select backed by a native <select> (demo-grade, no radix dep)
const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <div className="relative inline-flex items-center">
    <select
      ref={ref}
      className={cn(
        'h-9 appearance-none rounded-md border border-input bg-card pl-3 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-muted-foreground" />
  </div>
));
Select.displayName = 'Select';

export { Select };
