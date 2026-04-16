import { useState, useEffect } from "react";
import {
  CreditCard, Receipt, Copy, ExternalLink, QrCode,
  RefreshCw, Check, Ban, Clock, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useTenantInvoices,
  TenantInvoice,
  ASAAS_STATUS_LABELS,
  deriveTenantFinancialStatus,
  FINANCIAL_STATUS_LABELS,
  FINANCIAL_STATUS_COLORS,
} from "@/hooks/useTenantInvoices";
import { toast } from "sonner";

const fmtCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

interface Props {
  tenantId: string;
  onStatusUpdate?: () => void;
}

export function TenantBillingTab({ tenantId, onStatusUpdate }: Props) {
  const { invoices, currentInvoice, loading, fetchInvoices, markAsPaid, syncInvoiceStatus } = useTenantInvoices();

  useEffect(() => {
    if (tenantId) fetchInvoices(tenantId);
  }, [tenantId, fetchInvoices]);

  const handleCopy = (text: string | null, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleMarkPaid = async (inv: TenantInvoice) => {
    const ok = await markAsPaid(inv.id);
    if (ok) {
      fetchInvoices(tenantId);
      onStatusUpdate?.();
    }
  };

  const handleSync = async (inv: TenantInvoice) => {
    if (!inv.asaas_payment_id) {
      toast.error("Cobrança sem ID Asaas vinculado");
      return;
    }
    const ok = await syncInvoiceStatus(inv.id, inv.asaas_payment_id, tenantId);
    if (ok) {
      fetchInvoices(tenantId);
      onStatusUpdate?.();
    }
  };

  if (loading) return <Skeleton className="h-40 w-full" />;

  const financialStatus = deriveTenantFinancialStatus(currentInvoice);

  return (
    <div className="space-y-4">
      {/* Financial Status Banner */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`text-xs px-3 py-1 ${FINANCIAL_STATUS_COLORS[financialStatus] || ""}`}>
          {FINANCIAL_STATUS_LABELS[financialStatus] || financialStatus}
        </Badge>
        {currentInvoice?.last_status_sync_at && (
          <span className="text-[10px] text-muted-foreground">
            Sincronizado: {new Date(currentInvoice.last_status_sync_at).toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="current">Cobrança Atual</TabsTrigger>
          <TabsTrigger value="history">Histórico ({invoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-3 mt-3">
          {!currentInvoice ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma cobrança registrada.</p>
          ) : (
            <CurrentInvoiceView
              invoice={currentInvoice}
              onCopy={handleCopy}
              onMarkPaid={handleMarkPaid}
              onSync={handleSync}
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-3">
          <InvoiceHistoryList
            invoices={invoices}
            onCopy={handleCopy}
            onMarkPaid={handleMarkPaid}
            onSync={handleSync}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CurrentInvoiceView({
  invoice,
  onCopy,
  onMarkPaid,
  onSync,
}: {
  invoice: TenantInvoice;
  onCopy: (text: string | null, label: string) => void;
  onMarkPaid: (inv: TenantInvoice) => void;
  onSync: (inv: TenantInvoice) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Main info */}
      <Card className="border-primary/20">
        <CardContent className="py-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Valor</div>
              <div className="text-sm font-bold">{fmtCurrency(invoice.amount)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tipo</div>
              <div className="text-sm font-medium">{invoice.payment_method_label || invoice.billing_type || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <Badge variant="outline" className="text-[10px]">
                {ASAAS_STATUS_LABELS[invoice.status] || invoice.status}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Vencimento</div>
              <div className="text-sm font-medium">{fmtDate(invoice.due_date)}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Carência até</div>
              <div className="text-sm">{fmtDate(invoice.grace_until)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Bloqueio em</div>
              <div className="text-sm">{fmtDate(invoice.blocking_date)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Pago em</div>
              <div className="text-sm">{fmtDate(invoice.paid_at)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment links */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground">Links de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invoice.invoice_url && (
            <LinkButton label="Fatura" url={invoice.invoice_url} icon={ExternalLink} />
          )}
          {invoice.bank_slip_url && (
            <LinkButton label="Boleto" url={invoice.bank_slip_url} icon={ExternalLink} />
          )}
          {invoice.identification_field && (
            <CopyButton label="Linha Digitável" value={invoice.identification_field} onCopy={onCopy} />
          )}
          {invoice.bar_code && (
            <CopyButton label="Código de Barras" value={invoice.bar_code} onCopy={onCopy} />
          )}
          {invoice.pix_payload && (
            <CopyButton label="Código PIX (Copia e Cola)" value={invoice.pix_payload} onCopy={onCopy} icon={QrCode} />
          )}
          {invoice.pix_qrcode_url && (
            <div className="flex flex-col items-center gap-1 py-2">
              <span className="text-xs text-muted-foreground">QR Code PIX</span>
              <img src={invoice.pix_qrcode_url} alt="QR Code PIX" className="w-32 h-32 rounded border" />
            </div>
          )}
          {!invoice.invoice_url && !invoice.bank_slip_url && !invoice.pix_payload && (
            <p className="text-xs text-muted-foreground text-center py-2">Nenhum link de pagamento disponível.</p>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {!["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(invoice.status) && (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => onMarkPaid(invoice)}>
            <Check className="h-3.5 w-3.5" /> Marcar como Pago
          </Button>
        )}
        {invoice.asaas_payment_id && (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => onSync(invoice)}>
            <RefreshCw className="h-3.5 w-3.5" /> Sincronizar Status
          </Button>
        )}
      </div>
    </div>
  );
}

function InvoiceHistoryList({
  invoices,
  onCopy,
  onMarkPaid,
  onSync,
}: {
  invoices: TenantInvoice[];
  onCopy: (text: string | null, label: string) => void;
  onMarkPaid: (inv: TenantInvoice) => void;
  onSync: (inv: TenantInvoice) => void;
}) {
  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Nenhuma cobrança registrada.</p>;
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {invoices.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between text-xs border rounded-lg p-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-medium">{fmtCurrency(inv.amount)}</span>
              <Badge variant="outline" className="text-[10px]">
                {ASAAS_STATUS_LABELS[inv.status] || inv.status}
              </Badge>
              {inv.is_current && <Badge className="text-[9px] h-4 bg-primary/20 text-primary">Atual</Badge>}
            </div>
            <div className="text-muted-foreground">
              Venc: {fmtDate(inv.due_date)}
              {inv.paid_at && <> · Pago: {fmtDate(inv.paid_at)}</>}
              {inv.payment_method_label && <> · {inv.payment_method_label}</>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {inv.invoice_url && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => window.open(inv.invoice_url!, "_blank")}>
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
            {inv.pix_payload && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onCopy(inv.pix_payload, "PIX")}>
                <QrCode className="h-3 w-3" />
              </Button>
            )}
            {!["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(inv.status) && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onMarkPaid(inv)}>
                <Check className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function LinkButton({ label, url, icon: Icon }: { label: string; url: string; icon: any }) {
  return (
    <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => window.open(url, "_blank")}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

function CopyButton({
  label, value, onCopy, icon: Icon = Copy,
}: { label: string; value: string; onCopy: (text: string, label: string) => void; icon?: any }) {
  return (
    <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => onCopy(value, label)}>
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate flex-1 text-left">{label}: {value.slice(0, 40)}...</span>
      <Copy className="h-3 w-3 text-muted-foreground" />
    </Button>
  );
}
