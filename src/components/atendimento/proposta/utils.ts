import type { ProposalLineItem, PSPayment, MRRPayment, ProposalTotals, PSInstallment } from "./types";

export const fmtCur = (v: number, cur = "BRL") =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: cur });

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
};

export function calcItemTotal(item: Pick<ProposalLineItem, "quantity" | "unit_value" | "discount_type" | "discount_value">): number {
  const subtotal = (item.quantity || 0) * (item.unit_value || 0);
  if (item.discount_type === "percent") {
    return Math.max(0, subtotal * (1 - (item.discount_value || 0) / 100));
  }
  return Math.max(0, subtotal - (item.discount_value || 0));
}

export function calcTotals(items: ProposalLineItem[], mrr: Partial<MRRPayment>): ProposalTotals {
  const ps_total = items.filter(i => i.item_type === "servico").reduce((s, i) => s + (i.total || 0), 0);
  const mrr_monthly = items.filter(i => i.item_type === "mrr").reduce((s, i) => s + (i.total || 0), 0);
  const months = Math.max(1, Number(mrr?.num_installments) || 12);
  const mrr_contract = mrr_monthly * months;
  return {
    ps_total: round2(ps_total),
    mrr_monthly: round2(mrr_monthly),
    mrr_contract: round2(mrr_contract),
    grand_total: round2(ps_total + mrr_contract),
  };
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function generatePSInstallments(ps_total: number, payment: Partial<PSPayment>): PSInstallment[] {
  const total = round2(ps_total);
  if (total <= 0) return [];
  const isVista = payment.mode !== "parcelado";
  const count = isVista ? 1 : Math.max(1, payment.installments?.length || 1);
  const days = Math.max(0, Number(payment.days_to_first) || 0);
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + days);

  const base = Math.floor((total / count) * 100) / 100;
  const result: PSInstallment[] = [];
  let sumSoFar = 0;
  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate);
    d.setMonth(d.getMonth() + i);
    const isLast = i === count - 1;
    const value = isLast ? round2(total - sumSoFar) : base;
    sumSoFar += value;
    result.push({
      number: i + 1,
      date: d.toISOString().split("T")[0],
      value,
      method: payment.method || "boleto",
    });
  }
  return result;
}

export function randomPublicToken() {
  // 32-char url-safe token
  const arr = new Uint8Array(24);
  (globalThis.crypto || (window as any).crypto).getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

export const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  aberta: { label: "Aberta", color: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30" },
  aprovada: { label: "Aprovada", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30" },
  recusada: { label: "Recusada", color: "bg-red-500/15 text-red-600 dark:text-red-300 border border-red-500/30" },
};
