import * as React from "react";
import { cn } from "@/lib/utils";

const Label = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(
        "text-xs font-semibold uppercase tracking-wider text-text/80 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
});

Label.displayName = "Label";

export { Label };
