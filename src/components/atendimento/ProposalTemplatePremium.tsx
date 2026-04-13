import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ProposalTemplateData {
  status?: string;
  logoUrl?: string | null;
  companyName?: string;
  companyRazaoSocial?: string;
  companyCnpj?: string;
  companyEmail?: string;
  companyPhone?: string;
  reference?: string;
  emissionDate?: string;
  validityDays?: number;
  validUntil?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  clientName?: string;
  clientDocument?: string;
  vendorName?: string;
  vendorEmail?: string;
  items?: ProposalTemplateItem[];
  totalMrr?: number;
  currency?: string;
  conditions?: string[];
  introduction?: string;
  description?: string;
  paymentFrequency?: string;
}

export interface ProposalTemplateItem {
  name: string;
  quantity: number;
  unitValue: number;
  total: number;
  discountValue?: number;
  discountType?: string;
}

const fmtCur = (v: number, cur = "BRL") =>
  v.toLocaleString("pt-BR", { style: "currency", currency: cur });

const statusLabels: Record<string, { label: string; color: string }> = {
  enviada: { label: "AGUARDANDO ACEITE", color: "" },
  aceita: { label: "APROVADA", color: "#10B981" },
  declinada: { label: "DECLINADA", color: "#EF4444" },
  cancelada: { label: "CANCELADA", color: "#6B7280" },
};

interface Props {
  data: ProposalTemplateData;
  className?: string;
  compact?: boolean;
}

export const ProposalTemplatePremium = forwardRef<HTMLDivElement, Props>(
  ({ data, className, compact = false }, ref) => {
    const {
      status = "enviada",
      logoUrl,
      companyName = "Empresa",
      companyRazaoSocial,
      companyCnpj,
      companyEmail,
      companyPhone,
      reference = "#PC-2026-001",
      emissionDate = new Date().toLocaleDateString("pt-BR"),
      validityDays = 15,
      validUntil,
      primaryColor = "#1E2952",
      textColor = "#1F2937",
      clientName = "Cliente",
      clientDocument,
      vendorName = "Consultor",
      vendorEmail,
      items = [],
      totalMrr = 0,
      currency = "BRL",
      conditions = [],
      introduction,
      description,
    } = data;

    const statusInfo = statusLabels[status] || statusLabels.enviada;
    const badgeColor = statusInfo.color || primaryColor;
    const computedTotal = items.length > 0 ? items.reduce((s, i) => s + i.total, 0) : totalMrr;

    const sz = compact
      ? { xs: "text-[8px]", sm: "text-[9px]", base: "text-[10px]", md: "text-xs", lg: "text-sm", xl: "text-base" }
      : { xs: "text-[10px]", sm: "text-xs", base: "text-sm", md: "text-sm", lg: "text-base", xl: "text-lg" };

    const sectionGap = compact ? "mt-4" : "mt-6";
    const px = compact ? "px-5" : "px-8 md:px-10";
    const py = compact ? "py-5" : "py-8 md:py-10";

    return (
      <div
        ref={ref}
        className={cn("overflow-hidden", className)}
        style={{ backgroundColor: "#FFFFFF", color: textColor }}
      >
        {/* ── TOP BRAND LINE ── */}
        <div style={{ height: compact ? 3 : 4, backgroundColor: primaryColor }} />

        <div className={cn(px, py)}>
          {/* ── HEADER ── */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className={cn("object-contain", compact ? "h-8 max-w-[60px]" : "h-12 max-w-[100px]")}
                />
              )}
              <div>
                <h1
                  className={cn("font-bold uppercase tracking-wide", sz.xl)}
                  style={{ color: primaryColor }}
                >
                  Proposta Comercial
                </h1>
                <p className={cn("mt-0.5", sz.xs)} style={{ color: textColor, opacity: 0.5 }}>
                  {companyRazaoSocial || companyName}
                </p>
              </div>
            </div>
            <div className="text-right space-y-0.5">
              <p className={cn("font-semibold", sz.sm)} style={{ color: textColor }}>
                Ref: {reference}
              </p>
              <p className={sz.xs} style={{ color: textColor, opacity: 0.55 }}>
                Emissão: {emissionDate}
              </p>
              <p className={sz.xs} style={{ color: textColor, opacity: 0.55 }}>
                Validade: {validityDays} dias{validUntil ? ` (até ${validUntil})` : ""}
              </p>
              <span
                className={cn("inline-block px-2 py-0.5 font-bold uppercase tracking-wider", sz.xs)}
                style={{
                  color: badgeColor,
                  border: `1px solid ${badgeColor}`,
                  marginTop: 4,
                }}
              >
                {statusInfo.label}
              </span>
            </div>
          </div>

          {/* ── DIVIDER ── */}
          <div className={sectionGap} style={{ borderBottom: `1px solid ${primaryColor}20` }} />

          {/* ── INTRODUCTION ── */}
          {introduction && (
            <div className={sectionGap}>
              <p className={cn("leading-relaxed whitespace-pre-wrap", sz.base)} style={{ color: textColor, opacity: 0.8 }}>
                {introduction}
              </p>
            </div>
          )}

          {/* ── CLIENT / VENDOR ── */}
          <div className={cn("grid grid-cols-2", sectionGap, compact ? "gap-4" : "gap-8")}>
            <div className="space-y-1">
              <p className={cn("font-bold uppercase tracking-wider", sz.xs)} style={{ color: primaryColor, opacity: 0.6 }}>
                Cliente
              </p>
              <p className={cn("font-semibold", sz.md)} style={{ color: textColor }}>{clientName}</p>
              {clientDocument && (
                <p className={sz.xs} style={{ color: textColor, opacity: 0.55 }}>
                  {clientDocument.replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ"}: {clientDocument}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className={cn("font-bold uppercase tracking-wider", sz.xs)} style={{ color: primaryColor, opacity: 0.6 }}>
                Consultor
              </p>
              <p className={cn("font-semibold", sz.md)} style={{ color: textColor }}>{vendorName}</p>
              {vendorEmail && (
                <p className={sz.xs} style={{ color: textColor, opacity: 0.55 }}>{vendorEmail}</p>
              )}
            </div>
          </div>

          {/* ── SERVICES TABLE ── */}
          {items.length > 0 && (
            <div className={sectionGap}>
              <p className={cn("font-bold uppercase tracking-wider mb-2", sz.xs)} style={{ color: primaryColor, opacity: 0.6 }}>
                Serviços Contratados
              </p>
              <table className="w-full border-collapse" style={{ fontSize: compact ? 10 : 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${primaryColor}30` }}>
                    <th className="text-left py-1.5 font-semibold" style={{ color: primaryColor }}>Serviço</th>
                    <th className="text-center py-1.5 font-semibold w-12" style={{ color: primaryColor }}>Qtd</th>
                    <th className="text-right py-1.5 font-semibold w-24" style={{ color: primaryColor }}>Unitário</th>
                    <th className="text-center py-1.5 font-semibold w-16" style={{ color: primaryColor }}>Desc.</th>
                    <th className="text-right py-1.5 font-semibold w-24" style={{ color: primaryColor }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => {
                    const discStr =
                      row.discountValue && row.discountValue > 0
                        ? row.discountType === "percent"
                          ? `${row.discountValue}%`
                          : fmtCur(row.discountValue, currency)
                        : "—";
                    return (
                      <tr
                        key={i}
                        style={{
                          borderBottom: `1px solid ${textColor}10`,
                          backgroundColor: i % 2 !== 0 ? `${textColor}03` : "transparent",
                        }}
                      >
                        <td className="py-1.5">{row.name}</td>
                        <td className="text-center py-1.5">{row.quantity}</td>
                        <td className="text-right py-1.5">{fmtCur(row.unitValue, currency)}</td>
                        <td className="text-center py-1.5" style={{ opacity: 0.5 }}>{discStr}</td>
                        <td className="text-right py-1.5 font-semibold">{fmtCur(row.total, currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TOTAL ── */}
          {computedTotal > 0 && (
            <div className={cn("flex items-baseline justify-end gap-2", sectionGap)} style={{ borderTop: `2px solid ${primaryColor}25`, paddingTop: compact ? 8 : 12 }}>
              <span className={cn("uppercase tracking-wider font-medium", sz.xs)} style={{ color: textColor, opacity: 0.5 }}>
                Investimento Mensal
              </span>
              <span className={cn("font-bold", compact ? "text-lg" : "text-xl")} style={{ color: primaryColor }}>
                {fmtCur(computedTotal, currency)}
              </span>
              <span className={sz.xs} style={{ color: textColor, opacity: 0.4 }}>/mês</span>
            </div>
          )}

          {/* ── CONDITIONS ── */}
          {conditions.length > 0 && (
            <div className={sectionGap}>
              <p className={cn("font-bold uppercase tracking-wider mb-2", sz.xs)} style={{ color: primaryColor, opacity: 0.6 }}>
                Condições Comerciais
              </p>
              <ul className="space-y-1">
                {conditions.map((item, i) => (
                  <li key={i} className={cn("flex items-start gap-2", sz.sm)} style={{ color: textColor, opacity: 0.7 }}>
                    <span style={{ color: primaryColor, fontWeight: 700 }}>&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── DESCRIPTION / NOTES ── */}
          {description && (
            <div className={sectionGap}>
              <p className={cn("font-bold uppercase tracking-wider mb-1", sz.xs)} style={{ color: primaryColor, opacity: 0.6 }}>
                Observações
              </p>
              <p className={cn("whitespace-pre-wrap leading-relaxed", sz.sm)} style={{ color: textColor, opacity: 0.7 }}>
                {description}
              </p>
            </div>
          )}

          {/* ── SIGNATURE BLOCK ── */}
          <div className={cn(compact ? "mt-6" : "mt-10")}>
            <p className={cn("text-center mb-1", sz.xs)} style={{ color: textColor, opacity: 0.4 }}>
              Documento com validade juridica conforme MP 2.200-2/2001
            </p>
            <div className={cn("grid grid-cols-2", compact ? "gap-6 mt-4" : "gap-10 mt-6")}>
              <div className="text-center">
                <div style={{ borderBottom: `1px solid ${textColor}30`, height: compact ? 24 : 36 }} />
                <p className={cn("font-medium mt-1", sz.sm)} style={{ color: textColor, opacity: 0.7 }}>
                  {companyRazaoSocial || companyName}
                </p>
                <p className={sz.xs} style={{ color: textColor, opacity: 0.4 }}>Contratada</p>
              </div>
              <div className="text-center">
                <div style={{ borderBottom: `1px solid ${textColor}30`, height: compact ? 24 : 36 }} />
                <p className={cn("font-medium mt-1", sz.sm)} style={{ color: textColor, opacity: 0.7 }}>
                  {clientName}
                </p>
                <p className={sz.xs} style={{ color: textColor, opacity: 0.4 }}>Contratante</p>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className={cn(compact ? "mt-6" : "mt-10")} style={{ borderTop: `1px solid ${textColor}12`, paddingTop: compact ? 8 : 12 }}>
            <div className={cn("flex items-end justify-between", sz.xs)} style={{ color: textColor, opacity: 0.35 }}>
              <div>
                <p>{companyRazaoSocial || companyName} — CNPJ {companyCnpj || "00.000.000/0000-00"}</p>
                <p>{companyEmail || "contato@empresa.com"} — {companyPhone || "(00) 00000-0000"}</p>
              </div>
              <p>Documento gerado automaticamente</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ProposalTemplatePremium.displayName = "ProposalTemplatePremium";
