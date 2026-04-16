import { AlertTriangle, CreditCard, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenantBillingStatus } from "@/hooks/useTenantBillingStatus";

export function TenantBillingBanner() {
  const alert = useTenantBillingStatus();

  if (!alert.show) return null;

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  if (alert.type === "suspended") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 bg-destructive text-destructive-foreground text-xs sm:text-sm font-medium py-2.5 px-4">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Seu acesso está suspenso por inadimplência. Regularize o pagamento para reativar o sistema.
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Regularizar agora
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-destructive-foreground hover:text-destructive-foreground/80">
            <MessageCircle className="h-3.5 w-3.5" />
            Suporte
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-500 text-white text-xs sm:text-sm font-medium py-2.5 px-4">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        Sua assinatura venceu em {fmtDate(alert.due_date)}.
        {alert.grace_until && <> Regularize até {fmtDate(alert.grace_until)} para evitar bloqueio.</>}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5">
          <CreditCard className="h-3.5 w-3.5" />
          Ver cobrança
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-white hover:text-white/80">
          <MessageCircle className="h-3.5 w-3.5" />
          Suporte
        </Button>
      </div>
    </div>
  );
}
