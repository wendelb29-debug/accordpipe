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

const normalizeHex = (color?: string | null) => {
  if (!color) return null;
  const value = color.trim();
  if (!value.startsWith("#")) return null;

  const hex = value.slice(1);
  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((char) => char + char)
      .join("")}`;
  }

  return hex.length === 6 ? value : null;
};

const withAlpha = (color: string | undefined, alpha: number, fallback: string) => {
  const normalized = normalizeHex(color);
  if (!normalized) return fallback;

  const hex = normalized.slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getPaymentSuffix = (paymentFrequency?: string) => {
  const normalized = paymentFrequency?.trim().toLowerCase();

  switch (normalized) {
    case "anual":
    case "annual":
    case "annually":
    case "yearly":
      return "/ano";
    case "único":
    case "unico":
    case "one_time":
    case "once":
      return "pagamento único";
    case "mensal":
    case "monthly":
    default:
      return "/mês";
  }
};

const statusLabels: Record<string, { label: string; color: string }> = {
  enviada: { label: "AGUARDANDO ACEITE", color: "#D97706" },
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
      paymentFrequency,
    } = data;

    const statusInfo = statusLabels[status] || statusLabels.enviada;
    const computedTotal = items.length > 0 ? items.reduce((s, i) => s + i.total, 0) : totalMrr;
    const mutedPrimary = withAlpha(primaryColor, 0.14, "rgba(30, 41, 82, 0.14)");
    const softPrimary = withAlpha(primaryColor, 0.05, "rgba(30, 41, 82, 0.05)");
    const mutedSecondary = withAlpha(secondaryColor, 0.3, "rgba(79, 70, 229, 0.3)");
    const subtleText = withAlpha(textColor, 0.72, "rgba(31, 41, 55, 0.72)");
    const faintText = withAlpha(textColor, 0.52, "rgba(31, 41, 55, 0.52)");
    const subtleRule = withAlpha(textColor, 0.12, "rgba(31, 41, 55, 0.12)");
    const lightZebra = withAlpha(textColor, 0.035, "rgba(31, 41, 55, 0.035)");
    const signatureRule = withAlpha(textColor, 0.32, "rgba(31, 41, 55, 0.32)");
    const paymentSuffix = getPaymentSuffix(paymentFrequency);

    const f = compact
      ? { xs: 7, sm: 8, base: 9, md: 10, lg: 12, xl: 14, xxl: 18, val: 22 }
      : { xs: 9, sm: 10, base: 12, md: 13, lg: 15, xl: 18, xxl: 22, val: 28 };

    const gap = compact ? 12 : 20;

    return (
      <div
        ref={ref}
        className={cn("overflow-hidden", className)}
          style={{
            backgroundColor: "#FFFFFF",
            color: textColor,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
      >
        {/* ── TOP BRAND LINE ── */}
        <div style={{ height: compact ? 4 : 6, backgroundColor: primaryColor }} />

        <div style={{ padding: compact ? 20 : 34 }}>
          {/* ── HEADER ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: compact ? 12 : 16 }}>
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{
                    height: compact ? 42 : 64,
                    maxWidth: compact ? 96 : 168,
                    objectFit: "contain",
                  }}
                />
              )}
              <div>
                <h1
                  style={{
                    fontSize: compact ? f.xl + 1 : f.xxl,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: compact ? "0.07em" : "0.08em",
                    color: primaryColor,
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  Proposta Comercial
                </h1>
                <p style={{ fontSize: f.sm, color: subtleText, margin: "4px 0 0" }}>
                  {companyRazaoSocial || companyName}
                </p>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: f.sm, fontWeight: 700, color: textColor, margin: 0 }}>
                Ref: {reference}
              </p>
              <p style={{ fontSize: f.xs, color: faintText, margin: "4px 0 0" }}>
                Emissão: {emissionDate}
              </p>
              <p style={{ fontSize: f.xs, color: faintText, margin: "2px 0 0" }}>
                Validade: {validityDays} dias{validUntil ? ` (até ${validUntil})` : ""}
              </p>
              <span
                style={{
                  display: "inline-block",
                  marginTop: 10,
                  padding: compact ? "3px 9px" : "4px 12px",
                  fontSize: f.xs,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#FFFFFF",
                  backgroundColor: statusInfo.color,
                  borderRadius: 999,
                }}
              >
                {statusInfo.label}
              </span>
            </div>
          </div>

          {/* ── HEADER DIVIDER ── */}
          <div
            style={{
              marginTop: gap,
              height: 1,
              background: `linear-gradient(90deg, ${primaryColor} 0%, ${mutedSecondary} 100%)`,
            }}
          />

          {/* ── INTRODUCTION ── */}
          {introduction && (
            <p style={{ marginTop: gap, fontSize: f.base, lineHeight: 1.7, color: subtleText }}>
              {introduction}
            </p>
          )}

          {/* ── CLIENT / VENDOR ── */}
          <div
            style={{
              marginTop: gap,
              paddingBottom: compact ? 12 : 18,
              borderBottom: `1px solid ${subtleRule}`,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: compact ? 16 : 28,
            }}
          >
            <div>
              <p style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor, margin: "0 0 6px 0" }}>
                Cliente
              </p>
              <p style={{ fontSize: f.md, fontWeight: 700, color: textColor, margin: 0 }}>{clientName}</p>
              {clientDocument && (
                <p style={{ fontSize: f.xs, color: faintText, margin: "4px 0 0" }}>
                  {clientDocument.replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ"}: {clientDocument}
                </p>
              )}
            </div>
            <div>
              <p style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor, margin: "0 0 6px 0" }}>
                Consultor
              </p>
              <p style={{ fontSize: f.md, fontWeight: 700, color: textColor, margin: 0 }}>{vendorName}</p>
              {vendorEmail && (
                <p style={{ fontSize: f.xs, color: faintText, margin: "4px 0 0" }}>{vendorEmail}</p>
              )}
            </div>
          </div>

          {/* ── SERVICES TABLE ── */}
          {items.length > 0 && (
            <div style={{ marginTop: gap }}>
              <p style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor, margin: "0 0 10px 0" }}>
                Serviços Contratados
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: f.base }}>
                <thead>
                  <tr>
                    {["Serviço", "Qtd", "Unitário", "Desc.", "Total"].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: compact ? "6px 6px" : "9px 10px",
                          fontWeight: 700,
                          fontSize: f.sm,
                          color: primaryColor,
                          textAlign: i === 0 ? "left" : i === 1 || i === 3 ? "center" : "right",
                          borderBottom: `1px solid ${mutedPrimary}`,
                          backgroundColor: softPrimary,
                        }}
                      >
                        {h}
                      </th>
                    ))}
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
                    const bg = i % 2 !== 0 ? lightZebra : "transparent";
                    const cellPad = compact ? "5px 6px" : "7px 10px";
                    return (
                      <tr key={i} style={{ backgroundColor: bg, borderBottom: `1px solid ${subtleRule}` }}>
                        <td style={{ padding: cellPad, fontWeight: 500 }}>{row.name}</td>
                        <td style={{ padding: cellPad, textAlign: "center" }}>{row.quantity}</td>
                        <td style={{ padding: cellPad, textAlign: "right" }}>{fmtCur(row.unitValue, currency)}</td>
                        <td style={{ padding: cellPad, textAlign: "center", color: faintText }}>{discStr}</td>
                        <td style={{ padding: cellPad, textAlign: "right", fontWeight: 700, color: primaryColor }}>{fmtCur(row.total, currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TOTAL VALUE — MAIN HIGHLIGHT ── */}
          {computedTotal > 0 && (
            <div
              style={{
                marginTop: gap + 4,
                paddingTop: compact ? 12 : 18,
                borderTop: `1px solid ${mutedPrimary}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "flex-end",
                gap: compact ? 4 : 6,
              }}
            >
              <span style={{ fontSize: f.sm, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: faintText }}>
                Investimento Mensal
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: compact ? 6 : 8 }}>
                <span style={{ fontSize: compact ? f.val + 2 : f.val + 4, fontWeight: 800, color: accentColor, lineHeight: 1 }}>
                  {fmtCur(computedTotal, currency)}
                </span>
                <span style={{ fontSize: f.sm, color: subtleText, fontWeight: 500 }}>{paymentSuffix}</span>
              </div>
            </div>
          )}

          {/* ── CONDITIONS ── */}
          {conditions.length > 0 && (
            <div style={{ marginTop: gap, paddingTop: compact ? 10 : 14, borderTop: `1px solid ${subtleRule}` }}>
              <p style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor, margin: "0 0 8px 0" }}>
                Condições Comerciais
              </p>
              {conditions.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: compact ? 4 : 6 }}>
                  <span style={{ color: primaryColor, fontWeight: 700, fontSize: f.sm, lineHeight: "1.5" }}>•</span>
                  <span style={{ fontSize: f.sm, color: subtleText, lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── DESCRIPTION / NOTES ── */}
          {description && (
            <div style={{ marginTop: gap, paddingTop: compact ? 10 : 14, borderTop: `1px solid ${subtleRule}` }}>
              <p style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor, margin: "0 0 6px 0" }}>
                Observações
              </p>
              <p style={{ fontSize: f.sm, color: subtleText, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>
                {description}
              </p>
            </div>
          )}

          {/* ── SIGNATURE BLOCK ── */}
          <div style={{ marginTop: compact ? 24 : 40, paddingTop: compact ? 14 : 20, borderTop: `1px solid ${subtleRule}` }}>
            <p style={{ textAlign: "center", fontSize: f.xs, color: faintText, margin: "0 0 4px 0" }}>
              Documento com validade jurídica conforme MP 2.200-2/2001
            </p>
            <p style={{ textAlign: "center", fontSize: f.xs, color: faintText, margin: "0 0 18px 0" }}>
              Assinatura realizada digitalmente via plataforma
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: compact ? 24 : 48 }}>
              {[
                { name: companyRazaoSocial || companyName, role: "CONTRATADA" },
                { name: clientName, role: "CONTRATANTE" },
              ].map((party) => (
                <div key={party.role} style={{ textAlign: "center" }}>
                  <div style={{ borderBottom: `1px solid ${signatureRule}`, height: compact ? 30 : 44 }} />
                  <p style={{ fontSize: f.md, fontWeight: 700, color: textColor, margin: "8px 0 0" }}>
                    {party.name}
                  </p>
                  <p style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: primaryColor, margin: "3px 0 0" }}>
                    {party.role}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{ marginTop: compact ? 20 : 32, borderTop: `1px solid ${subtleRule}`, paddingTop: compact ? 10 : 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, fontSize: f.xs, color: subtleText }}>
              <div>
                <p style={{ margin: 0 }}>{companyRazaoSocial || companyName} — CNPJ {companyCnpj || "00.000.000/0000-00"}</p>
                <p style={{ margin: "3px 0 0" }}>{companyEmail || "contato@empresa.com"} — {companyPhone || "(00) 00000-0000"}</p>
              </div>
              <p style={{ margin: 0, whiteSpace: "nowrap" }}>Documento gerado automaticamente</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ProposalTemplatePremium.displayName = "ProposalTemplatePremium";
