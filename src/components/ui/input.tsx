import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, inputMode, onWheel, ...props }, ref) => {
    // For number inputs: add numeric keyboard on mobile, prevent scroll-to-change
    const isNumber = type === "number";
    const resolvedInputMode = inputMode ?? (isNumber ? "decimal" : undefined);
    const handleWheel = onWheel ?? (isNumber ? (e: React.WheelEvent<HTMLInputElement>) => (e.target as HTMLInputElement).blur() : undefined);

    return (
      <input
        type={type}
        inputMode={resolvedInputMode}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          isNumber && "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className,
        )}
        ref={ref}
        onWheel={handleWheel}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
