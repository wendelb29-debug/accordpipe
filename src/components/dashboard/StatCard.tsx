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

const variantIconBg = {
  default: "bg-primary/10 text-primary",
  success: "bg-status-paid/10 text-status-paid",
  warning: "bg-yellow-500/10 text-yellow-600",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-primary/10 text-primary",
};

const variantAccentBar = {
  default: "#2563EB",
  success: "#22c55e",
  warning: "#eab308",
  danger: "#ef4444",
  info: "#7A3FF2",
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
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{ background: variantAccentBar[variant] }}
      />

      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground/70">{description}</p>
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
            "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
            variantIconBg[variant]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}