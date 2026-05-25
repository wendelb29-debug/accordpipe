import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  /** Right-aligned actions (buttons, badges, selects) */
  actions?: ReactNode;
  /** Optional row beneath the header — typically tabs or filters */
  children?: ReactNode;
  className?: string;
  /** Render a bottom border separator */
  bordered?: boolean;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  iconClassName,
  actions,
  children,
  className,
  bordered = true,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4",
        bordered && "pb-4 border-b border-border/60",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div
              className={cn(
                "h-10 w-10 shrink-0 rounded-lg flex items-center justify-center bg-primary/10 text-primary",
                iconClassName
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {actions}
          </div>
        )}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </header>
  );
}
