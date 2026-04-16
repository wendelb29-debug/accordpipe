import { AlertTriangle, CreditCard, MessageCircle, QrCode, ExternalLink, Copy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenantAccessGuard } from "@/hooks/useTenantAccessGuard";
import { toast } from "sonner";

export function TenantBillingBanner() {
  const guard = useTenantAccessGuard();

  if (guard.loading || guard.bannerVariant === "none") return null;

  const handleCopyPix = () => {
    if (guard.pixPayload) {
      navigator.clipboard.writeText(guard.pixPayload);
      toast.success("Código PIX copiado!");
    }
  };

  if (guard.bannerVariant === "suspended") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 bg-destructive text-destructive-foreground text-xs sm:text-sm font-medium py-2.5 px-4">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{guard.warningMessage}</span>
        <div className="flex gap-1.5 flex-wrap">
          {guard.invoiceUrl && (
            <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={() => window.open(guard.invoiceUrl!, "_blank")}>
              <ExternalLink className="h-3.5 w-3.5" /> Fatura
            </Button>
          )}
          {guard.bankSlipUrl && (
            <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={() => window.open(guard.bankSlipUrl!, "_blank")}>
              <CreditCard className="h-3.5 w-3.5" /> Boleto
            </Button>
          )}
          {guard.pixPayload && (
            <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={handleCopyPix}>
              <QrCode className="h-3.5 w-3.5" /> Copiar PIX
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-destructive-foreground hover:text-destructive-foreground/80">
            <MessageCircle className="h-3.5 w-3.5" /> Suporte
          </Button>
        </div>
      </div>
    );
  }

  if (guard.bannerVariant === "overdue") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-500 text-white text-xs sm:text-sm font-medium py-2.5 px-4">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{guard.warningMessage}</span>
        <div className="flex gap-1.5 flex-wrap">
          {guard.invoiceUrl && (
            <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={() => window.open(guard.invoiceUrl!, "_blank")}>
              <ExternalLink className="h-3.5 w-3.5" /> Fatura
            </Button>
          )}
          {guard.bankSlipUrl && (
            <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={() => window.open(guard.bankSlipUrl!, "_blank")}>
              <CreditCard className="h-3.5 w-3.5" /> Boleto
            </Button>
          )}
          {guard.pixPayload && (
            <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={handleCopyPix}>
              <QrCode className="h-3.5 w-3.5" /> Copiar PIX
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-white hover:text-white/80">
            <MessageCircle className="h-3.5 w-3.5" /> Suporte
          </Button>
        </div>
      </div>
    );
  }

  // pre_due
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-blue-500/90 text-white text-xs sm:text-sm font-medium py-2 px-4">
      <Clock className="h-4 w-4 shrink-0" />
      <span>{guard.warningMessage}</span>
      <div className="flex gap-1.5 flex-wrap">
        {guard.invoiceUrl && (
          <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={() => window.open(guard.invoiceUrl!, "_blank")}>
            <ExternalLink className="h-3.5 w-3.5" /> Ver cobrança
          </Button>
        )}
        {guard.pixPayload && (
          <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={handleCopyPix}>
            <QrCode className="h-3.5 w-3.5" /> Copiar PIX
          </Button>
        )}
      </div>
    </div>
  );
}
