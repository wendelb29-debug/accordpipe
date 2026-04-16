import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TenantInvoice {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  asaas_payment_id: string | null;
  asaas_customer_id: string | null;
  billing_type: string | null;
  amount: number;
  due_date: string | null;
  status: string;
  invoice_url: string | null;
  bank_slip_url: string | null;
  pix_payload: string | null;
  pix_qrcode_url: string | null;
  identification_field: string | null;
  bar_code: string | null;
  paid_at: string | null;
  grace_until: string | null;
  blocking_date: string | null;
  external_reference: string | null;
  payment_method_label: string | null;
  invoice_number: string | null;
  is_current: boolean;
  last_status_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export const ASAAS_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  RECEIVED: "Recebido",
  CONFIRMED: "Confirmado",
  OVERDUE: "Vencido",
  CANCELED: "Cancelado",
  REFUNDED: "Estornado",
  RECEIVED_IN_CASH: "Pago manualmente",
  REFUND_IN_PROGRESS: "Estorno em andamento",
  PARTIALLY_REFUNDED: "Parcialmente estornado",
  DELETED: "Excluído",
  RESTORED: "Restaurado",
};

export function deriveTenantFinancialStatus(invoice: TenantInvoice | null): string {
  if (!invoice) return "sem_cobranca";
  const today = new Date().toISOString().split("T")[0];
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(invoice.status)) return "ativo";
  if (invoice.status === "PENDING") {
    if (invoice.due_date && today <= invoice.due_date) return "pendente";
    if (invoice.grace_until && today <= invoice.grace_until) return "em_carencia";
    return "suspenso";
  }
  if (invoice.status === "OVERDUE") {
    if (invoice.grace_until && today <= invoice.grace_until) return "em_carencia";
    return "suspenso";
  }
  return invoice.status.toLowerCase();
}

export const FINANCIAL_STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  pendente: "Pendente",
  em_carencia: "Em carência",
  suspenso: "Suspenso por inadimplência",
  sem_cobranca: "Sem cobrança",
};

export const FINANCIAL_STATUS_COLORS: Record<string, string> = {
  ativo: "border-green-500/30 text-green-600 bg-green-500/10",
  pendente: "border-amber-500/30 text-amber-600 bg-amber-500/10",
  em_carencia: "border-orange-500/30 text-orange-600 bg-orange-500/10",
  suspenso: "border-red-500/30 text-red-600 bg-red-500/10",
  sem_cobranca: "border-muted text-muted-foreground bg-muted/50",
};

export function useTenantInvoices() {
  const [invoices, setInvoices] = useState<TenantInvoice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<TenantInvoice | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInvoices = useCallback(async (tenantId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenant_invoices")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching invoices:", error);
    }
    const list = (data as unknown as TenantInvoice[]) || [];
    setInvoices(list);
    setCurrentInvoice(list.find((i) => i.is_current) || list[0] || null);
    setLoading(false);
    return list;
  }, []);

  const markAsPaid = async (invoiceId: string) => {
    const { error } = await supabase
      .from("tenant_invoices")
      .update({ status: "RECEIVED_IN_CASH", paid_at: new Date().toISOString() } as any)
      .eq("id", invoiceId);
    if (error) {
      toast.error("Erro ao marcar como pago: " + error.message);
      return false;
    }
    toast.success("Cobrança marcada como paga!");
    return true;
  };

  const syncInvoiceStatus = async (invoiceId: string, asaasPaymentId: string, tenantId: string) => {
    // Call edge function to sync from Asaas
    const { data, error } = await supabase.functions.invoke("asaas-api", {
      body: { action: "get_payment", payment_id: asaasPaymentId, tenant_id: tenantId },
    });
    if (error) {
      toast.error("Erro ao sincronizar: " + (error as any).message);
      return false;
    }
    if (data?.payment) {
      const p = data.payment;
      await supabase
        .from("tenant_invoices")
        .update({
          status: p.status || "PENDING",
          invoice_url: p.invoiceUrl,
          bank_slip_url: p.bankSlipUrl,
          paid_at: p.paymentDate,
          last_status_sync_at: new Date().toISOString(),
        } as any)
        .eq("id", invoiceId);
      toast.success("Status sincronizado!");
      return true;
    }
    return false;
  };

  return { invoices, currentInvoice, loading, fetchInvoices, markAsPaid, syncInvoiceStatus };
}
