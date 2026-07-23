import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

    const variants = {
      default: "bg-primary text-white hover:bg-primary-hover shadow-md hover:shadow-lg",
      secondary: "bg-secondary text-white hover:bg-secondary-hover shadow-md",
      accent: "bg-accent text-white hover:bg-accent-hover shadow-md",
      outline: "border border-primary/30 bg-transparent text-primary hover:bg-primary/10",
      ghost: "hover:bg-primary/10 text-primary",
      danger: "bg-error text-white hover:bg-red-700 shadow-md",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-12 rounded-lg px-8 text-base font-semibold",
      icon: "h-10 w-10 p-0",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
