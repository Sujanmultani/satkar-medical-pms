import * as React from 'react';
import { cn } from '@/lib/utils';

export function Badge({ className, variant = 'default', children, ...props }) {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide transition-colors font-mono';

  const variants = {
    default: 'bg-primary/10 text-primary border border-primary/20',
    secondary: 'bg-secondary/15 text-secondary-dark border border-secondary/30',
    active: 'bg-teal-100 text-teal-800 border border-teal-300',
    expiring_soon: 'bg-amber-100 text-amber-800 border border-amber-300',
    expired: 'bg-red-100 text-red-800 border border-red-300',
    accent: 'bg-accent/15 text-accent border border-accent/30',
    outline: 'border border-gray-300 text-gray-700',
  };

  return (
    <span className={cn(baseStyles, variants[variant] || variants.default, className)} {...props}>
      {children}
    </span>
  );
}
