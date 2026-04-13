import { forwardRef } from "react";
import { CheckCircle2, Calendar, User, Star, Shield, FileSignature, FileText, Briefcase } from "lucide-react";
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

    const sz = compact
      ? { xs: "text-[8px]", sm: "text-[9px]", base: "text-[10px]", md: "text-xs", lg: "text-sm", xl: "text-base", xxl: "text-lg" }
      : { xs: "text-[10px]", sm: "text-xs", base: "text-sm", md: "text-sm", lg: "text-base", xl: "text-lg", xxl: "text-xl" };

    const gap = compact ? "space-y-4" : "space-y-7";
    const pad = compact ? "p-5" : "p-8 md:p-10";
    const iconSm = compact ? "h-3 w-3" : "h-3.5 w-3.5";
    const iconMd = compact ? "h-4 w-4" : "h-5 w-5";
    const iconLg = compact ? "h-5 w-5" : "h-6 w-6";

    return (
      <div
        ref={ref}
        className={cn("rounded-xl border overflow-hidden shadow-lg", className)}
        style={{ backgroundColor: bgColor, borderColor: `${primaryColor}15` }}
      >
        <div className={cn(pad, gap)}>
          {/* ── HEADER ── */}
          <div className={cn("flex items-start justify-between", compact ? "gap-3" : "gap-4")}>
            {/* Left: logo + title */}
            <div className={cn("flex items-center", compact ? "gap-3" : "gap-4")}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className={cn("object-contain rounded-lg", compact ? "h-10 max-w-[80px]" : "h-14 max-w-[120px]")}
                />
              ) : (
                <div
                  className={cn("rounded-xl flex items-center justify-center shrink-0", compact ? "h-10 w-10" : "h-14 w-14")}
                  style={{ backgroundColor: `${primaryColor}12` }}
                >
                  <FileSignature className={iconLg} style={{ color: primaryColor }} />
                </div>
              )}
              <div>
                <h3
                  className={cn("font-extrabold uppercase tracking-widest", sz.xl)}
                  style={{ color: primaryColor, letterSpacing: "0.08em" }}
                >
                  Proposta Comercial
                </h3>
                <p className={cn("mt-0.5", sz.xs)} style={{ color: textColor, opacity: 0.5 }}>
                  {companyRazaoSocial || companyName} &middot; Ref: {reference}
                </p>
              </div>
            </div>

            {/* Right: meta */}
            <div className="text-right shrink-0 space-y-0.5">
              <div
                className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-white mb-1", sz.xs)}
                style={{ backgroundColor: badgeColor }}
              >
                <CheckCircle2 className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
                {statusInfo.label}
              </div>
              <p className={sz.xs} style={{ color: textColor, opacity: 0.55 }}>
                <Calendar className={cn("inline mr-0.5 -mt-px", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
                Emissão: {emissionDate}
              </p>
              <p className={sz.xs} style={{ color: textColor, opacity: 0.55 }}>
                Válida por {validityDays} dias
              </p>
              {validUntil && (
                <p className={sz.xs} style={{ color: textColor, opacity: 0.45 }}>
                  Validade: {validUntil}
                </p>
              )}
            </div>
          </div>

          {/* ── BRAND LINE ── */}
          <div
            className="rounded-full"
            style={{
              height: compact ? 3 : 4,
              background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor}, ${accentColor})`,
            }}
          />

          {/* ── INTRODUCTION ── */}
          {introduction && (
            <div
              className={cn("rounded-lg", compact ? "p-3" : "p-4", sz.sm)}
              style={{ backgroundColor: `${primaryColor}06`, color: textColor, opacity: 0.85 }}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{introduction}</p>
            </div>
          )}

          {/* ── CLIENT / VENDOR ── */}
          <div className={cn("grid grid-cols-2", compact ? "gap-4" : "gap-6")}>
            {/* Client */}
            <div
              className={cn("rounded-lg", compact ? "p-3 space-y-1" : "p-4 space-y-1.5")}
              style={{ backgroundColor: `${primaryColor}06` }}
            >
              <p className={cn("font-bold uppercase tracking-wider flex items-center gap-1", sz.xs)} style={{ color: primaryColor, opacity: 0.7 }}>
                <User className={iconSm} /> Cliente
              </p>
              <p className={cn("font-semibold", sz.md)} style={{ color: textColor }}>{clientName}</p>
              {clientDocument && (
                <p className={sz.xs} style={{ color: textColor, opacity: 0.55 }}>
                  {clientDocument.replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ"}: {clientDocument}
                </p>
              )}
            </div>
            {/* Vendor */}
            <div
              className={cn("rounded-lg", compact ? "p-3 space-y-1" : "p-4 space-y-1.5")}
              style={{ backgroundColor: `${secondaryColor}06` }}
            >
              <p className={cn("font-bold uppercase tracking-wider flex items-center gap-1", sz.xs)} style={{ color: primaryColor, opacity: 0.7 }}>
                <Star className={iconSm} /> Consultor
              </p>
              <p className={cn("font-semibold", sz.md)} style={{ color: textColor }}>{vendorName}</p>
              {vendorEmail && (
                <p className={sz.xs} style={{ color: textColor, opacity: 0.55 }}>{vendorEmail}</p>
              )}
            </div>
          </div>

          {/* ── SERVICES TABLE ── */}
          {items.length > 0 && (
            <div className={compact ? "space-y-2" : "space-y-3"}>
              <p className={cn("font-bold uppercase tracking-wider flex items-center gap-1.5", sz.xs)} style={{ color: primaryColor, opacity: 0.7 }}>
                <Briefcase className={iconSm} /> Serviços Contratados
              </p>
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: `${primaryColor}18` }}>
                {/* Table header */}
                <div
                  className={cn("grid grid-cols-12 gap-0 font-bold", sz.xs, compact ? "px-3 py-2" : "px-4 py-2.5")}
                  style={{ backgroundColor: primaryColor, color: "#FFFFFF" }}
                >
                  <span className="col-span-5">Serviço</span>
                  <span className="col-span-1 text-center">Qtd</span>
                  <span className="col-span-2 text-right">Unitário</span>
                  <span className="col-span-2 text-center">Desc.</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                {/* Table rows */}
                {items.map((row, i) => {
                  const discStr =
                    row.discountValue && row.discountValue > 0
                      ? row.discountType === "percent"
                        ? `${row.discountValue}%`
                        : fmtCur(row.discountValue, currency)
                      : "—";
                  const isEven = i % 2 === 0;
                  return (
                    <div
                      key={i}
                      className={cn("grid grid-cols-12 gap-0 border-t", sz.base, compact ? "px-3 py-2" : "px-4 py-2.5")}
                      style={{
                        borderColor: `${primaryColor}10`,
                        color: textColor,
                        backgroundColor: isEven ? "transparent" : `${primaryColor}04`,
                      }}
                    >
                      <span className="col-span-5 font-medium">{row.name}</span>
                      <span className="col-span-1 text-center">{row.quantity}</span>
                      <span className="col-span-2 text-right">{fmtCur(row.unitValue, currency)}</span>
                      <span className="col-span-2 text-center" style={{ opacity: 0.6 }}>{discStr}</span>
                      <span className="col-span-2 text-right font-bold">{fmtCur(row.total, currency)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TOTAL BLOCK ── */}
          {computedTotal > 0 && (
            <div
              className={cn("rounded-xl flex items-center justify-between", compact ? "p-4" : "p-5")}
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}DD)`,
                boxShadow: `0 4px 20px -4px ${accentColor}50`,
              }}
            >
              <div>
                <p className={cn("text-white font-medium uppercase tracking-wider", sz.xs)} style={{ opacity: 0.85 }}>
                  Investimento Mensal
                </p>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={cn("font-extrabold text-white", compact ? "text-xl" : "text-2xl")}>
                  {fmtCur(computedTotal, currency)}
                </span>
                <span className={cn("text-white font-normal", sz.sm)} style={{ opacity: 0.7 }}>/mês</span>
              </div>
            </div>
          )}

          {/* ── CONDITIONS ── */}
          {conditions.length > 0 && (
            <div
              className={cn("rounded-lg border", compact ? "p-4 space-y-2" : "p-5 space-y-3")}
              style={{ borderColor: `${secondaryColor}25`, backgroundColor: `${primaryColor}04` }}
            >
              <p className={cn("font-bold uppercase tracking-wider flex items-center gap-1.5", sz.xs)} style={{ color: primaryColor, opacity: 0.75 }}>
                <FileText className={iconSm} /> Condições Comerciais
              </p>
              <ul className={compact ? "space-y-1" : "space-y-1.5"}>
                {conditions.map((item, i) => (
                  <li key={i} className={cn("flex items-start gap-2", sz.sm)} style={{ color: textColor, opacity: 0.75 }}>
                    <CheckCircle2
                      className={cn("mt-0.5 shrink-0", compact ? "h-3 w-3" : "h-3.5 w-3.5")}
                      style={{ color: accentColor }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── DESCRIPTION / NOTES ── */}
          {description && (
            <div
              className={cn("rounded-lg", compact ? "p-3" : "p-4", sz.sm)}
              style={{ backgroundColor: `${secondaryColor}06`, color: textColor, opacity: 0.75 }}
            >
              <p className={cn("font-bold uppercase tracking-wider mb-1.5", sz.xs)} style={{ color: primaryColor, opacity: 0.7 }}>
                Observações
              </p>
              <p className="whitespace-pre-wrap leading-relaxed">{description}</p>
            </div>
          )}

          {/* ── SIGNATURE BLOCK ── */}
          <div
            className={cn("rounded-xl border-2 border-dashed", compact ? "p-4" : "p-5")}
            style={{ borderColor: `${accentColor}40`, backgroundColor: `${accentColor}04` }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn("rounded-full flex items-center justify-center shrink-0", compact ? "h-8 w-8" : "h-10 w-10")}
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <Shield className={iconMd} style={{ color: accentColor }} />
                </div>
                <div>
                  <p className={cn("font-bold", sz.md)} style={{ color: textColor }}>
                    Assinatura Digital
                  </p>
                  <p className={sz.xs} style={{ color: textColor, opacity: 0.5 }}>
                    Documento com validade jurídica conforme MP 2.200-2/2001
                  </p>
                </div>
              </div>
              <div
                className={cn("px-4 py-2 rounded-lg font-bold text-white shrink-0", sz.sm)}
                style={{ backgroundColor: accentColor, boxShadow: `0 2px 8px -2px ${accentColor}60` }}
              >
                Aceitar Proposta
              </div>
            </div>
            {/* Signature lines */}
            <div className={cn("grid grid-cols-2 mt-4 pt-4", compact ? "gap-4" : "gap-6")} style={{ borderTop: `1px dashed ${accentColor}25` }}>
              <div className="text-center space-y-1">
                <div className="border-b" style={{ borderColor: `${textColor}20`, paddingBottom: compact ? 16 : 24 }} />
                <p className={cn("font-medium", sz.xs)} style={{ color: textColor, opacity: 0.6 }}>
                  {companyRazaoSocial || companyName}
                </p>
                <p className={sz.xs} style={{ color: textColor, opacity: 0.35 }}>Contratada</p>
              </div>
              <div className="text-center space-y-1">
                <div className="border-b" style={{ borderColor: `${textColor}20`, paddingBottom: compact ? 16 : 24 }} />
                <p className={cn("font-medium", sz.xs)} style={{ color: textColor, opacity: 0.6 }}>
                  {clientName}
                </p>
                <p className={sz.xs} style={{ color: textColor, opacity: 0.35 }}>Contratante</p>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="rounded-full" style={{ height: 1, backgroundColor: `${primaryColor}12` }} />
          <div className={cn("flex items-center justify-between", sz.xs)}>
            <div style={{ color: textColor, opacity: 0.4 }}>
              <p>{companyRazaoSocial || companyName} &middot; CNPJ {companyCnpj || "00.000.000/0000-00"}</p>
              <p>{companyEmail || "contato@empresa.com"} &middot; {companyPhone || "(00) 00000-0000"}</p>
            </div>
            <p style={{ color: textColor, opacity: 0.3 }}>
              Documento gerado automaticamente
            </p>
          </div>
        </div>
      </div>
    );
  }
);

ProposalTemplatePremium.displayName = "ProposalTemplatePremium";
