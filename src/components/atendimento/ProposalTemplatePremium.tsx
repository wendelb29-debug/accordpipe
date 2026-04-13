import { forwardRef } from "react";
import { CheckCircle2, Calendar, User, Star, Shield, FileSignature } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProposalTemplateData {
  // Status
  status?: string;
  // Header
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
  // Colors (white label)
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  // Client
  clientName?: string;
  clientDocument?: string;
  // Vendor
  vendorName?: string;
  vendorEmail?: string;
  // Services
  items?: ProposalTemplateItem[];
  // Total
  totalMrr?: number;
  currency?: string;
  // Conditions
  conditions?: string[];
  // Introduction / description
  introduction?: string;
  description?: string;
  // Payment
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
  enviada: { label: "AGUARDANDO ACEITE", color: "" }, // uses accent
  aceita: { label: "APROVADA", color: "#10B981" },
  declinada: { label: "DECLINADA", color: "#EF4444" },
  cancelada: { label: "CANCELADA", color: "#6B7280" },
};

interface Props {
  data: ProposalTemplateData;
  className?: string;
  compact?: boolean; // for preview mode (smaller)
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
      secondaryColor = "#4F46E5",
      accentColor = "#10B981",
      bgColor = "#F8F9FC",
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
    const badgeColor = statusInfo.color || accentColor;
    const computedTotal = items.length > 0 ? items.reduce((s, i) => s + i.total, 0) : totalMrr;

    const fontSize = compact ? {
      xs: "text-[8px]",
      sm: "text-[9px]",
      base: "text-[10px]",
      md: "text-xs",
      lg: "text-sm",
      xl: "text-base",
    } : {
      xs: "text-[10px]",
      sm: "text-xs",
      base: "text-sm",
      md: "text-sm",
      lg: "text-base",
      xl: "text-lg",
    };

    const spacing = compact ? "p-4 space-y-3" : "p-6 md:p-8 space-y-5";

    return (
      <div
        ref={ref}
        className={cn("rounded-xl border border-border overflow-hidden shadow-md", className)}
        style={{ backgroundColor: bgColor }}
      >
        <div className={spacing}>
          {/* Status bar */}
          <div className="flex items-center justify-between">
            <div
              className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full font-bold uppercase tracking-wider text-white", fontSize.xs)}
              style={{ backgroundColor: badgeColor }}
            >
              <CheckCircle2 className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
              {statusInfo.label}
            </div>
            <div className={cn("flex items-center gap-1", fontSize.xs)} style={{ color: textColor, opacity: 0.4 }}>
              <Calendar className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
              {emissionDate}
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className={cn("object-contain", compact ? "h-8" : "h-12")} />
              ) : (
                <div
                  className={cn("rounded-lg flex items-center justify-center", compact ? "h-8 w-8" : "h-12 w-12")}
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <FileSignature className={compact ? "h-4 w-4" : "h-6 w-6"} style={{ color: primaryColor }} />
                </div>
              )}
              <div>
                <h3 className={cn("font-bold tracking-wide", fontSize.lg)} style={{ color: primaryColor }}>
                  PROPOSTA COMERCIAL
                </h3>
                <p className={fontSize.xs} style={{ color: textColor, opacity: 0.5 }}>
                  {companyRazaoSocial || companyName} · Ref: {reference}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={cn("font-medium", fontSize.xs)} style={{ color: textColor, opacity: 0.6 }}>
                Válida por {validityDays} dias
              </p>
              <p className={fontSize.xs} style={{ color: textColor, opacity: 0.4 }}>
                Emissão: {emissionDate}
              </p>
              {validUntil && (
                <p className={fontSize.xs} style={{ color: textColor, opacity: 0.4 }}>
                  Validade: {validUntil}
                </p>
              )}
            </div>
          </div>

          {/* Brand line */}
          <div
            className="h-[3px] rounded-full transition-colors duration-300"
            style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }}
          />

          {/* Introduction */}
          {introduction && (
            <div className={cn("rounded-lg p-3", fontSize.sm)} style={{ backgroundColor: `${primaryColor}05`, color: textColor, opacity: 0.8 }}>
              <p className="whitespace-pre-wrap">{introduction}</p>
            </div>
          )}

          {/* Client / Vendor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className={cn("font-bold uppercase tracking-wider", fontSize.xs)} style={{ color: primaryColor, opacity: 0.6 }}>
                <User className={cn("inline mr-1", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
                Cliente
              </p>
              <p className={cn("font-medium", fontSize.md)} style={{ color: textColor }}>
                {clientName}
              </p>
              {clientDocument && (
                <p className={fontSize.xs} style={{ color: textColor, opacity: 0.6 }}>
                  {clientDocument.replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ"}: {clientDocument}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className={cn("font-bold uppercase tracking-wider", fontSize.xs)} style={{ color: primaryColor, opacity: 0.6 }}>
                <Star className={cn("inline mr-1", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
                Vendedor
              </p>
              <p className={cn("font-medium", fontSize.md)} style={{ color: textColor }}>
                {vendorName}
              </p>
              {vendorEmail && (
                <p className={fontSize.xs} style={{ color: textColor, opacity: 0.6 }}>
                  {vendorEmail}
                </p>
              )}
            </div>
          </div>

          {/* Services table */}
          {items.length > 0 && (
            <div>
              <p className={cn("font-bold uppercase tracking-wider mb-2", fontSize.xs)} style={{ color: primaryColor, opacity: 0.6 }}>
                Serviços Contratados
              </p>
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: `${secondaryColor}40` }}>
                <div
                  className={cn("grid grid-cols-12 gap-0 px-3 py-1.5 font-bold", fontSize.xs)}
                  style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
                >
                  <span className="col-span-5">Serviço</span>
                  <span className="col-span-1 text-center">Qtd</span>
                  <span className="col-span-2 text-right">Unitário</span>
                  <span className="col-span-2 text-center">Desc.</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                {items.map((row, i) => {
                  const discStr = row.discountValue && row.discountValue > 0
                    ? (row.discountType === "percent" ? `${row.discountValue}%` : fmtCur(row.discountValue, currency))
                    : "—";
                  return (
                    <div
                      key={i}
                      className={cn("grid grid-cols-12 gap-0 px-3 py-1.5 border-t", fontSize.base)}
                      style={{ borderColor: `${secondaryColor}20`, color: textColor }}
                    >
                      <span className="col-span-5 font-medium">{row.name}</span>
                      <span className="col-span-1 text-center">{row.quantity}</span>
                      <span className="col-span-2 text-right">{fmtCur(row.unitValue, currency)}</span>
                      <span className="col-span-2 text-center">{discStr}</span>
                      <span className="col-span-2 text-right font-semibold">{fmtCur(row.total, currency)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Total */}
          {computedTotal > 0 && (
            <div className="flex items-center justify-end gap-3">
              <span className={cn("font-medium", fontSize.md)} style={{ color: textColor, opacity: 0.7 }}>
                Total Mensal:
              </span>
              <div
                className={cn("inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-white transition-colors duration-300", fontSize.md)}
                style={{ backgroundColor: accentColor }}
              >
                {fmtCur(computedTotal, currency)}
                <span className={cn("font-normal opacity-80", fontSize.xs)}>/mês</span>
              </div>
            </div>
          )}

          {/* Conditions */}
          {conditions.length > 0 && (
            <div
              className="rounded-lg p-3 space-y-1.5"
              style={{ backgroundColor: `${primaryColor}08`, borderLeft: `3px solid ${secondaryColor}` }}
            >
              <p className={cn("font-bold uppercase tracking-wider", fontSize.xs)} style={{ color: primaryColor, opacity: 0.7 }}>
                Condições Comerciais
              </p>
              <ul className="space-y-0.5">
                {conditions.map((item, i) => (
                  <li key={i} className={cn("flex items-start gap-1.5", fontSize.sm)} style={{ color: textColor, opacity: 0.7 }}>
                    <CheckCircle2 className={cn("mt-0.5 shrink-0", compact ? "h-2.5 w-2.5" : "h-3 w-3")} style={{ color: accentColor }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Description / notes */}
          {description && (
            <div className={cn("rounded-lg p-3", fontSize.sm)} style={{ backgroundColor: `${secondaryColor}08`, color: textColor, opacity: 0.7 }}>
              <p className={cn("font-bold uppercase tracking-wider mb-1", fontSize.xs)} style={{ color: primaryColor, opacity: 0.7 }}>
                Observações
              </p>
              <p className="whitespace-pre-wrap">{description}</p>
            </div>
          )}

          {/* Signature / Accept area */}
          <div
            className="rounded-lg border-2 border-dashed p-3 flex items-center justify-between gap-3"
            style={{ borderColor: `${accentColor}50` }}
          >
            <div className="flex items-center gap-2">
              <Shield className={compact ? "h-4 w-4" : "h-5 w-5"} style={{ color: accentColor }} />
              <div>
                <p className={cn("font-semibold", fontSize.base)} style={{ color: textColor }}>
                  Assinatura Digital
                </p>
                <p className={fontSize.xs} style={{ color: textColor, opacity: 0.5 }}>
                  Documento com validade jurídica
                </p>
              </div>
            </div>
            <div
              className={cn("px-3 py-1.5 rounded-md font-bold text-white", fontSize.sm)}
              style={{ backgroundColor: accentColor }}
            >
              Aceitar Proposta
            </div>
          </div>

          {/* Footer divider */}
          <div className="h-px transition-colors duration-300" style={{ backgroundColor: `${secondaryColor}40` }} />

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div>
              <p className={fontSize.xs} style={{ color: primaryColor, opacity: 0.5 }}>
                {companyRazaoSocial || companyName} · CNPJ {companyCnpj || "00.000.000/0000-00"}
              </p>
              <p className={cn(fontSize.xs)} style={{ color: textColor, opacity: 0.3 }}>
                {companyEmail || "contato@empresa.com"} · {companyPhone || "(00) 00000-0000"}
              </p>
            </div>
            <p className={fontSize.xs} style={{ color: textColor, opacity: 0.3 }}>
              Documento gerado automaticamente · Página 1 de 1
            </p>
          </div>
        </div>
      </div>
    );
  }
);

ProposalTemplatePremium.displayName = "ProposalTemplatePremium";
