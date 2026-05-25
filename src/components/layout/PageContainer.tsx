import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /** Max width — defaults to 1440px. Use "full" for operational pages (Inbox, Pulse) */
  size?: "default" | "narrow" | "wide" | "full";
  /** Vertical rhythm between direct children */
  spacing?: "sm" | "md" | "lg";
}

const sizeMap = {
  narrow: "max-w-3xl",
  default: "max-w-[1440px]",
  wide: "max-w-[1600px]",
  full: "max-w-none",
};

const spacingMap = {
  sm: "space-y-4",
  md: "space-y-6",
  lg: "space-y-8",
};

export function PageContainer({
  children,
  className,
  size = "default",
  spacing = "md",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 md:px-6 lg:px-8 py-6",
        sizeMap[size],
        spacingMap[spacing],
        className
      )}
    >
      {children}
    </div>
  );
}
