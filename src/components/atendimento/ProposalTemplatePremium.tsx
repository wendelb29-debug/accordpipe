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
    } = data;

    const statusInfo = statusLabels[status] || statusLabels.enviada;
    const computedTotal = items.length > 0 ? items.reduce((s, i) => s + i.total, 0) : totalMrr;

    const f = compact
      ? { xs: 7, sm: 8, base: 9, md: 10, lg: 12, xl: 14, xxl: 18, val: 22 }
      : { xs: 9, sm: 10, base: 12, md: 13, lg: 15, xl: 18, xxl: 22, val: 28 };

    const gap = compact ? 12 : 20;

    return (
      <div
        ref={ref}
        className={cn("overflow-hidden", className)}
        style={{ backgroundColor: "#FFFFFF", color: textColor, fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        {/* ── TOP BRAND LINE ── */}
        <div style={{ height: compact ? 4 : 5, backgroundColor: primaryColor }} />

        <div style={{ padding: compact ? 20 : 36 }}>
          {/* ── HEADER ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: compact ? 12 : 16 }}>
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{
                    height: compact ? 36 : 52,
                    maxWidth: compact ? 80 : 140,
                    objectFit: "contain",
                  }}
                />
              )}
              <div>
                <h1
                  style={{
                    fontSize: f.xl,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: primaryColor,
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  Proposta Comercial
                </h1>
                <p style={{ fontSize: f.xs, color: textColor, opacity: 0.45, marginTop: 2 }}>
                  {companyRazaoSocial || companyName}
                </p>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: f.sm, fontWeight: 600, color: textColor, margin: 0 }}>
                Ref: {reference}
              </p>
              <p style={{ fontSize: f.xs, color: textColor, opacity: 0.5, margin: "2px 0" }}>
                Emissao: {emissionDate}
              </p>
              <p style={{ fontSize: f.xs, color: textColor, opacity: 0.5, margin: 0 }}>
                Validade: {validityDays} dias{validUntil ? ` (ate ${validUntil})` : ""}
              </p>
              <span
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  padding: "2px 8px",
                  fontSize: f.xs,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#FFFFFF",
                  backgroundColor: statusInfo.color,
                  borderRadius: 2,
                }}
              >
                {statusInfo.label}
              </span>
            </div>
          </div>

          {/* ── HEADER DIVIDER ── */}
          <div style={{ marginTop: gap, height: 2, backgroundColor: primaryColor, opacity: 0.15 }} />

          {/* ── INTRODUCTION ── */}
          {introduction && (
            <p style={{ marginTop: gap, fontSize: f.base, lineHeight: 1.6, color: textColor, opacity: 0.75 }}>
              {introduction}
            </p>
          )}

          {/* ── CLIENT / VENDOR ── */}
          <div style={{ marginTop: gap, display: "grid", gridTemplateColumns: "1fr 1fr", gap: compact ? 16 : 28 }}>
            <div>
              <p style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor, opacity: 0.5, margin: "0 0 4px 0" }}>
                Cliente
              </p>
              <p style={{ fontSize: f.md, fontWeight: 700, color: textColor, margin: 0 }}>{clientName}</p>
              {clientDocument && (
                <p style={{ fontSize: f.xs, color: textColor, opacity: 0.5, margin: "2px 0 0" }}>
                  {clientDocument.replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ"}: {clientDocument}
                </p>
              )}
            </div>
            <div>
              <p style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor, opacity: 0.5, margin: "0 0 4px 0" }}>
                Consultor
              </p>
              <p style={{ fontSize: f.md, fontWeight: 700, color: textColor, margin: 0 }}>{vendorName}</p>
              {vendorEmail && (
                <p style={{ fontSize: f.xs, color: textColor, opacity: 0.5, margin: "2px 0 0" }}>{vendorEmail}</p>
              )}
            </div>
          </div>

          {/* ── SERVICES TABLE ── */}
          {items.length > 0 && (
            <div style={{ marginTop: gap }}>
              <p style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor, opacity: 0.5, margin: "0 0 8px 0" }}>
                Servicos Contratados
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: f.base }}>
                <thead>
                  <tr>
                    {["Servico", "Qtd", "Unitario", "Desc.", "Total"].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: compact ? "5px 6px" : "8px 10px",
                          fontWeight: 700,
                          fontSize: f.sm,
                          color: primaryColor,
                          textAlign: i === 0 ? "left" : i === 1 || i === 3 ? "center" : "right",
                          borderBottom: `2px solid ${primaryColor}25`,
                          backgroundColor: `${primaryColor}06`,
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
                    const bg = i % 2 !== 0 ? `${textColor}04` : "transparent";
                    const cellPad = compact ? "5px 6px" : "7px 10px";
                    return (
                      <tr key={i} style={{ backgroundColor: bg, borderBottom: `1px solid ${textColor}08` }}>
                        <td style={{ padding: cellPad, fontWeight: 500 }}>{row.name}</td>
                        <td style={{ padding: cellPad, textAlign: "center" }}>{row.quantity}</td>
                        <td style={{ padding: cellPad, textAlign: "right" }}>{fmtCur(row.unitValue, currency)}</td>
                        <td style={{ padding: cellPad, textAlign: "center", opacity: 0.45 }}>{discStr}</td>
                        <td style={{ padding: cellPad, textAlign: "right", fontWeight: 700 }}>{fmtCur(row.total, currency)}</td>
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
                paddingTop: compact ? 10 : 16,
                borderTop: `2px solid ${primaryColor}20`,
                display: "flex",
                alignItems: "baseline",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <span style={{ fontSize: f.sm, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: textColor, opacity: 0.4 }}>
                Investimento Mensal
              </span>
              <span style={{ fontSize: f.val, fontWeight: 800, color: accentColor, lineHeight: 1 }}>
                {fmtCur(computedTotal, currency)}
              </span>
              <span style={{ fontSize: f.xs, color: textColor, opacity: 0.35 }}>/mes</span>
            </div>
          )}

          {/* ── CONDITIONS ── */}
          {conditions.length > 0 && (
            <div style={{ marginTop: gap }}>
              <p style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor, opacity: 0.5, margin: "0 0 6px 0" }}>
                Condicoes Comerciais
              </p>
              {conditions.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: compact ? 3 : 5 }}>
                  <span style={{ color: primaryColor, fontWeight: 700, fontSize: f.sm, lineHeight: "1.5" }}>•</span>
                  <span style={{ fontSize: f.sm, color: textColor, opacity: 0.65, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── DESCRIPTION / NOTES ── */}
          {description && (
            <div style={{ marginTop: gap }}>
              <p style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor, opacity: 0.5, margin: "0 0 4px 0" }}>
                Observacoes
              </p>
              <p style={{ fontSize: f.sm, color: textColor, opacity: 0.6, lineHeight: 1.5, whiteSpace: "pre-wrap", margin: 0 }}>
                {description}
              </p>
            </div>
          )}

          {/* ── SIGNATURE BLOCK ── */}
          <div style={{ marginTop: compact ? 24 : 40 }}>
            <p style={{ textAlign: "center", fontSize: f.xs, color: textColor, opacity: 0.35, margin: "0 0 16px 0" }}>
              Documento com validade juridica conforme MP 2.200-2/2001
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: compact ? 24 : 48 }}>
              {[
                { name: companyRazaoSocial || companyName, role: "CONTRATADA" },
                { name: clientName, role: "CONTRATANTE" },
              ].map((party) => (
                <div key={party.role} style={{ textAlign: "center" }}>
                  <div style={{ borderBottom: `1px solid ${textColor}30`, height: compact ? 28 : 40 }} />
                  <p style={{ fontSize: f.md, fontWeight: 600, color: textColor, opacity: 0.75, margin: "6px 0 0" }}>
                    {party.name}
                  </p>
                  <p style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: primaryColor, opacity: 0.4, margin: "2px 0 0" }}>
                    {party.role}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{ marginTop: compact ? 20 : 32, borderTop: `1px solid ${textColor}10`, paddingTop: compact ? 8 : 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: f.xs, color: textColor, opacity: 0.3 }}>
              <div>
                <p style={{ margin: 0 }}>{companyRazaoSocial || companyName} — CNPJ {companyCnpj || "00.000.000/0000-00"}</p>
                <p style={{ margin: "1px 0 0" }}>{companyEmail || "contato@empresa.com"} — {companyPhone || "(00) 00000-0000"}</p>
              </div>
              <p style={{ margin: 0 }}>Documento gerado automaticamente</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ProposalTemplatePremium.displayName = "ProposalTemplatePremium";
