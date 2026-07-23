import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const Select = React.forwardRef(({ className, children, error, ...props }, ref) => {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cn(
          'w-full appearance-none rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-text transition-all focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-error focus:border-error focus:ring-error/20',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
});

Select.displayName = 'Select';

export { Select };
