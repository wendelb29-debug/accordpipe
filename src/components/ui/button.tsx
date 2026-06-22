import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "gradient-primary text-white font-semibold rounded-full shadow-[0_8px_20px_-6px_rgba(122,63,242,0.55)] hover:shadow-[0_12px_26px_-6px_rgba(122,63,242,0.7)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_4px_12px_-4px_rgba(122,63,242,0.5)]",
        destructive:
          "bg-gradient-to-br from-red-500 to-red-600 text-white font-semibold rounded-full shadow-[0_8px_20px_-6px_rgba(220,38,38,0.55)] hover:shadow-[0_12px_26px_-6px_rgba(220,38,38,0.7)] hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "gradient-primary text-white font-semibold rounded-full shadow-[0_8px_20px_-6px_rgba(122,63,242,0.55)] hover:shadow-[0_12px_26px_-6px_rgba(122,63,242,0.7)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_4px_12px_-4px_rgba(122,63,242,0.5)]",
        secondary:
          "bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 hover:shadow-[0_6px_16px_-8px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 active:translate-y-0",
        ghost: "rounded-full hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-full px-4",
        lg: "h-11 rounded-full px-8",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
