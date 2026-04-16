import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TenantAccessStatus {
  loading: boolean;
  canAccessApp: boolean;
  canOnlyAccessBilling: boolean;
  bannerVariant: "none" | "pre_due" | "overdue" | "suspended";
  warningMessage: string | null;
  dueDate: string | null;
  graceUntil: string | null;
  blockedAt: string | null;
  subscriptionStatus: string | null;
  paymentStatus: string | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  pixPayload: string | null;
}

const DEFAULT: TenantAccessStatus = {
  loading: true,
  canAccessApp: true,
  canOnlyAccessBilling: false,
  bannerVariant: "none",
  warningMessage: null,
  dueDate: null,
  graceUntil: null,
  blockedAt: null,
  subscriptionStatus: null,
  paymentStatus: null,
  invoiceUrl: null,
  bankSlipUrl: null,
  pixPayload: null,
};

export function useTenantAccessGuard(): TenantAccessStatus {
  const { profile, isMasterTenantAdmin } = useAuth();
  const [data, setData] = useState<TenantAccessStatus>(DEFAULT);

  useEffect(() => {
    if (!profile?.company_id || isMasterTenantAdmin) {
      setData({ ...DEFAULT, loading: false });
      return;
    }

    const check = async () => {
      const { data: client } = await supabase
        .from("master_tenant_clients")
        .select("subscription_status, payment_status, next_due_date, grace_until, blocked_at")
        .eq("tenant_id", profile.company_id)
        .maybeSingle();

      if (!client) {
        setData({ ...DEFAULT, loading: false });
        return;
      }

      const c = client as any;
      const today = new Date().toISOString().split("T")[0];
      const dueDate = c.next_due_date || null;
      const graceUntil = c.grace_until || null;

      // Also fetch current invoice for links
      const { data: invoice } = await supabase
        .from("tenant_invoices")
        .select("invoice_url, bank_slip_url, pix_payload")
        .eq("tenant_id", profile.company_id)
        .eq("is_current", true)
        .maybeSingle();

      const inv = invoice as any;

      let result: TenantAccessStatus = {
        loading: false,
        canAccessApp: true,
        canOnlyAccessBilling: false,
        bannerVariant: "none",
        warningMessage: null,
        dueDate,
        graceUntil,
        blockedAt: c.blocked_at,
        subscriptionStatus: c.subscription_status,
        paymentStatus: c.payment_status,
        invoiceUrl: inv?.invoice_url || null,
        bankSlipUrl: inv?.bank_slip_url || null,
        pixPayload: inv?.pix_payload || null,
      };

      if (c.subscription_status === "suspended") {
        result.canAccessApp = false;
        result.canOnlyAccessBilling = true;
        result.bannerVariant = "suspended";
        result.warningMessage = "Seu acesso está suspenso por inadimplência. Regularize o pagamento para reativar o sistema.";
      } else if (c.subscription_status === "overdue" || c.payment_status === "overdue") {
        result.bannerVariant = "overdue";
        const fmtDue = dueDate ? new Date(dueDate + "T12:00:00").toLocaleDateString("pt-BR") : "—";
        const fmtGrace = graceUntil ? new Date(graceUntil + "T12:00:00").toLocaleDateString("pt-BR") : null;
        result.warningMessage = `Sua assinatura venceu em ${fmtDue}.${fmtGrace ? ` Regularize até ${fmtGrace} para evitar bloqueio.` : ""}`;
      } else if (dueDate && today >= dueDate && c.payment_status === "pending") {
        // Edge case: due today or past but not yet marked overdue
        result.bannerVariant = "overdue";
        const fmtDue = new Date(dueDate + "T12:00:00").toLocaleDateString("pt-BR");
        result.warningMessage = `Sua assinatura venceu em ${fmtDue}. Regularize para evitar bloqueio.`;
      } else if (dueDate && c.payment_status === "pending") {
        // Pre-due: warn 5 days before
        const dueDateObj = new Date(dueDate + "T12:00:00");
        const daysUntilDue = Math.ceil((dueDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 5 && daysUntilDue > 0) {
          result.bannerVariant = "pre_due";
          result.warningMessage = `Sua assinatura vence em ${daysUntilDue} dia${daysUntilDue > 1 ? "s" : ""} (${dueDateObj.toLocaleDateString("pt-BR")}). Garanta seu pagamento em dia.`;
        }
      }

      setData(result);
    };

    check();
  }, [profile?.company_id, isMasterTenantAdmin]);

  return data;
}
