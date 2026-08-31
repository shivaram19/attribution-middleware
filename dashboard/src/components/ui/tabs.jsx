// Why: shadcn/ui-style primitive — shared visual grammar (Gestalt similarity), 8px grid, rounded-xl
import * as React from 'react';
import { cn } from '@/lib/utils';

// Minimal tabs (shadcn-style API, no radix dep)
function Tabs({ value, onValueChange, children, className }) {
  return (
    <div className={className} data-value={value}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) ? React.cloneElement(child, { __value: value, __onChange: onValueChange }) : child
      )}
    </div>
  );
}

function TabsList({ children, className, __value, __onChange }) {
  return (
    <div className={cn('inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground', className)}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) ? React.cloneElement(child, { __value, __onChange }) : child
      )}
    </div>
  );
}

function TabsTrigger({ value, children, __value, __onChange, ...props }) {
  const active = __value === value;
  return (
    <button
      type="button"
      data-state={active ? 'active' : 'inactive'}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all',
        active ? 'bg-card text-foreground shadow' : 'hover:text-foreground'
      )}
      onClick={() => __onChange && __onChange(value)}
      {...props}
    >
      {children}
    </button>
  );
}

export { Tabs, TabsList, TabsTrigger };
