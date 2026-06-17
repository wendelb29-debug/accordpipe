export type ProposalItemType = "servico" | "mrr";
export type DiscountType = "percent" | "fixed";
export type ProposalStatus = "aberta" | "aprovada" | "recusada" | "draft";

export interface ProposalLineItem {
  id?: string;
  catalog_item_id?: string | null;
  name: string;
  description?: string | null;
  item_type: ProposalItemType;
  quantity: number;
  unit_value: number;
  discount_type: DiscountType;
  discount_value: number;
  total: number;
  position: number;
}

export interface PSPayment {
  method: string;          // pix | boleto | cartao | ted
  mode: "vista" | "parcelado";
  days_to_first: number;
  installments: PSInstallment[];
}

export interface PSInstallment {
  number: number;
  date: string;            // ISO date
  value: number;
  method: string;
}

export interface MRRPayment {
  method: string;          // pix | boleto | cartao
  due_day: number;         // 1-28
  first_date: string;      // ISO date
  num_installments: number;
}

export interface ProposalTotals {
  ps_total: number;
  mrr_monthly: number;
  mrr_contract: number;
  grand_total: number;
}

export interface ProposalRecord {
  id: string;
  servidor_id: string;
  lead_id: string;
  titulo: string;
  status: ProposalStatus | string;
  version: number;
  control_code: string | null;
  client_oc: string | null;
  currency: string;
  created_date: string;
  validity_days: number;
  intro_html: string | null;
  observations: string | null;
  ps_payment: PSPayment | Record<string, never>;
  mrr_payment: MRRPayment | Record<string, never>;
  totals: ProposalTotals | Record<string, never>;
  template_id: string | null;
  public_token: string | null;
  public_accepted_at: string | null;
  created_by_name: string | null;
  created_at: string;
  valor?: number;
}

export interface ProposalTemplate {
  id: string;
  servidor_id: string;
  name: string;
  description: string | null;
  intro_html: string | null;
  observations: string | null;
  default_validity_days: number;
  is_active: boolean;
}
