import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
      "data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-red-500",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <X
      className="pointer-events-none absolute right-1 h-3 w-3 text-white transition-opacity group-data-[state=checked]:opacity-0 group-data-[state=unchecked]:opacity-100"
      strokeWidth={3}
      aria-hidden
    />
    <Check
      className="pointer-events-none absolute left-1 h-3 w-3 text-white transition-opacity group-data-[state=checked]:opacity-100 group-data-[state=unchecked]:opacity-0"
      strokeWidth={3}
      aria-hidden
    />
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none relative z-10 block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
