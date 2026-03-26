import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const variantStyles = {
  default: "gradient-primary",
  success: "gradient-success",
  warning: "gradient-warning",
  danger: "gradient-danger",
  info: "bg-primary",
};

const variantBgStyles = {
  default: "bg-primary/5",
  success: "bg-status-paid/5",
  warning: "bg-yellow-500/5",
  danger: "bg-destructive/5",
  info: "bg-primary/5",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
}: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card p-6 shadow-card premium-hover animate-slide-up border border-border/50">
      {/* Subtle gradient accent */}
      <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-[0.04]" style={{ background: 'var(--gradient-primary)' }} />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-extrabold tracking-tight text-foreground">
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1",
                trend.isPositive 
                  ? "text-status-paid bg-status-paid/10" 
                  : "text-status-overdue bg-status-overdue/10"
              )}
            >
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground transition-transform duration-300 group-hover:scale-110 shadow-md",
            variantStyles[variant]
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
