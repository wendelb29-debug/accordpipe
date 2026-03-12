import { cn } from "@/lib/utils";

export type InvoiceStatus = "paid" | "open" | "overdue" | "cancelled";
export type CompanyStatus = "active" | "delinquent" | "cancelled";

interface StatusBadgeProps {
  status: InvoiceStatus | CompanyStatus;
  size?: "sm" | "md";
}

const invoiceStatusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  paid: {
    label: "Pago",
    className: "bg-status-paid text-status-paid-foreground",
  },
  open: {
    label: "Em Aberto",
    className: "bg-status-open text-status-open-foreground",
  },
  overdue: {
    label: "Atrasado",
    className: "bg-status-overdue text-status-overdue-foreground",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-status-cancelled text-status-cancelled-foreground",
  },
};

const companyStatusConfig: Record<CompanyStatus, { label: string; className: string }> = {
  active: {
    label: "Ativo",
    className: "bg-status-paid text-status-paid-foreground",
  },
  delinquent: {
    label: "Inadimplente",
    className: "bg-status-overdue text-status-overdue-foreground",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-status-cancelled text-status-cancelled-foreground",
  },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config =
    status in invoiceStatusConfig
      ? invoiceStatusConfig[status as InvoiceStatus]
      : companyStatusConfig[status as CompanyStatus];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
