import React from 'react';
import { cn } from '@/lib/utils';

export function AuroraBackground({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "relative flex flex-col min-h-screen items-center justify-center bg-background text-text transition-colors overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={cn(
            "absolute -inset-[10px] opacity-40 filter blur-[60px] pointer-events-none transition-all",
            "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]",
            "from-[#17878E]/40 via-[#0B4C52]/30 to-[#5CA627]/20",
            "animate-pulse-slow"
          )}
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(23, 135, 142, 0.35) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(11, 76, 82, 0.4) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(92, 166, 39, 0.15) 0%, transparent 60%)
            `,
          }}
        />
        {/* Soft grid overlay for medical tech aesthetic */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(#0B4C52 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
