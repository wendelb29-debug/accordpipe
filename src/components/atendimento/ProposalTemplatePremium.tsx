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
  /** @deprecated No longer used — proposals don't have accept buttons */
  showAcceptButton?: boolean;
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
  enviada: { label: "PROPOSTA APRESENTADA", color: "#3B82F6" },
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
      bgColor = "#F9FAFB",
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
      showAcceptButton = false,
    } = data;

    const statusInfo = statusLabels[status] || statusLabels.enviada;
    const computedTotal = items.length > 0 ? items.reduce((s, i) => s + i.total, 0) : totalMrr;

    const f = compact
      ? { xs: 7, sm: 8, base: 9, md: 10, lg: 12, xl: 14, xxl: 16, val: 20 }
      : { xs: 10, sm: 11, base: 13, md: 14, lg: 16, xl: 20, xxl: 24, val: 30 };

    const gap = compact ? 14 : 22;
    const pad = compact ? 20 : 36;
    const cardBorder = "#E5E7EB";
    const cardRadius = compact ? 8 : 12;
    const cnpjOrCpfLabel = clientDocument && clientDocument.replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ";
    const companySubtitle = [companyCnpj, companyRazaoSocial || companyName, `Ref: ${reference}`].filter(Boolean).join(" · ");

    return (
      <div
        ref={ref}
        className={cn("overflow-hidden", className)}
        style={{
          backgroundColor: "#F9FAFB",
          color: textColor,
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* ── INNER WHITE CARD ── */}
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: compact ? 10 : 16, margin: compact ? 8 : 16, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          {/* ── TOP BRAND LINE ── */}
          <div style={{ height: compact ? 4 : 5, backgroundColor: accentColor, borderRadius: `${compact ? 10 : 16}px ${compact ? 10 : 16}px 0 0` }} />

          <div style={{ padding: pad }}>
            {/* ── HEADER ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: compact ? 10 : 16 }}>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    style={{
                      height: compact ? 44 : 64,
                      maxWidth: compact ? 100 : 160,
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                )}
                <div>
                  <h1
                    style={{
                      fontSize: compact ? f.lg : f.xxl,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: primaryColor,
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    Proposta Comercial
                  </h1>
                  <p style={{ fontSize: f.xs, color: "#6B7280", margin: "4px 0 0", lineHeight: 1.4 }}>
                    {companySubtitle}
                  </p>
                </div>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: compact ? "4px 10px" : "5px 14px",
                    fontSize: f.xs,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "#FFFFFF",
                    backgroundColor: statusInfo.color,
                    borderRadius: 999,
                  }}
                >
                  {statusInfo.label}
                </span>
                <p style={{ fontSize: f.xs, color: "#6B7280", margin: `${compact ? 6 : 8}px 0 0`, lineHeight: 1.5 }}>
                  Emissão: {emissionDate}
                </p>
                <p style={{ fontSize: f.xs, color: "#6B7280", margin: "2px 0 0", lineHeight: 1.5 }}>
                  Válida por {validityDays} dias
                </p>
                {validUntil && (
                  <p style={{ fontSize: f.xs, color: "#6B7280", margin: "2px 0 0", lineHeight: 1.5 }}>
                    Validade: {validUntil}
                  </p>
                )}
              </div>
            </div>

            {/* ── HEADER DIVIDER — gradient line ── */}
            <div
              style={{
                marginTop: gap,
                height: compact ? 3 : 4,
                borderRadius: 4,
                background: `linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%)`,
              }}
            />

            {/* ── INTRODUCTION ── */}
            {introduction && (
              <p style={{ marginTop: gap, fontSize: f.base, lineHeight: 1.7, color: "#4B5563" }}>
                {introduction}
              </p>
            )}

            {/* ── CLIENT / VENDOR CARDS ── */}
            <div
              style={{
                marginTop: gap,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: compact ? 10 : 16,
              }}
            >
              {/* Cliente */}
              <div
                style={{
                  border: `1px solid ${cardBorder}`,
                  borderRadius: cardRadius,
                  padding: compact ? "10px 12px" : "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: compact ? 6 : 10 }}>
                  <span style={{ fontSize: f.sm, color: primaryColor }}>&#128100;</span>
                  <span style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor }}>
                    Cliente
                  </span>
                </div>
                <p style={{ fontSize: f.md, fontWeight: 700, color: textColor, margin: 0 }}>{clientName}</p>
                {clientDocument && (
                  <p style={{ fontSize: f.xs, color: "#6B7280", margin: "4px 0 0" }}>
                    {cnpjOrCpfLabel}: {clientDocument}
                  </p>
                )}
              </div>
              {/* Consultor */}
              <div
                style={{
                  border: `1px solid ${cardBorder}`,
                  borderRadius: cardRadius,
                  padding: compact ? "10px 12px" : "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: compact ? 6 : 10 }}>
                  <span style={{ fontSize: f.sm, color: primaryColor }}>&#9734;</span>
                  <span style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor }}>
                    Consultor
                  </span>
                </div>
                <p style={{ fontSize: f.md, fontWeight: 700, color: textColor, margin: 0 }}>{vendorName}</p>
                {vendorEmail && (
                  <p style={{ fontSize: f.xs, color: "#6B7280", margin: "4px 0 0" }}>{vendorEmail}</p>
                )}
              </div>
            </div>

            {/* ── SERVICES TABLE ── */}
            {items.length > 0 && (
              <div style={{ marginTop: gap }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: compact ? 8 : 12 }}>
                  <span style={{ fontSize: f.sm, color: primaryColor }}>&#127970;</span>
                  <span style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor }}>
                    Serviços Contratados
                  </span>
                </div>
                <div style={{ border: `1px solid ${cardBorder}`, borderRadius: cardRadius, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: f.base }}>
                    <thead>
                      <tr>
                        {["Serviço", "Qtd", "Unitário", "Desc.", "Total"].map((h, i) => (
                          <th
                            key={h}
                            style={{
                              padding: compact ? "7px 8px" : "10px 14px",
                              fontWeight: 700,
                              fontSize: f.sm,
                              color: "#FFFFFF",
                              textAlign: i === 0 ? "left" : i === 1 || i === 3 ? "center" : "right",
                              backgroundColor: primaryColor,
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
                        const bg = i % 2 !== 0 ? "#F9FAFB" : "#FFFFFF";
                        const cellPad = compact ? "6px 8px" : "10px 14px";
                        return (
                          <tr key={i} style={{ backgroundColor: bg, borderBottom: `1px solid ${cardBorder}` }}>
                            <td style={{ padding: cellPad, fontWeight: 500 }}>{row.name}</td>
                            <td style={{ padding: cellPad, textAlign: "center", color: accentColor, fontWeight: 600 }}>{row.quantity}</td>
                            <td style={{ padding: cellPad, textAlign: "right" }}>{fmtCur(row.unitValue, currency)}</td>
                            <td style={{ padding: cellPad, textAlign: "center", color: "#9CA3AF" }}>{discStr}</td>
                            <td style={{ padding: cellPad, textAlign: "right", fontWeight: 700, color: primaryColor }}>{fmtCur(row.total, currency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TOTAL VALUE — GREEN BANNER ── */}
            {computedTotal > 0 && (
              <div
                style={{
                  marginTop: gap,
                  padding: compact ? "12px 16px" : "18px 24px",
                  borderRadius: cardRadius,
                  background: `linear-gradient(135deg, ${accentColor} 0%, #059669 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: f.sm,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#FFFFFF",
                  }}
                >
                  Investimento Mensal
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: compact ? 4 : 6 }}>
                  <span style={{ fontSize: compact ? f.val : f.val + 2, fontWeight: 800, color: "#FFFFFF", lineHeight: 1 }}>
                    {fmtCur(computedTotal, currency)}
                  </span>
                  <span style={{ fontSize: f.sm, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>/mês</span>
                </div>
              </div>
            )}

            {/* ── CONDITIONS CARD ── */}
            {conditions.length > 0 && (
              <div
                style={{
                  marginTop: gap,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: cardRadius,
                  padding: compact ? "12px 14px" : "18px 22px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: compact ? 8 : 12 }}>
                  <span style={{ fontSize: f.sm, color: primaryColor }}>&#128196;</span>
                  <span style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor }}>
                    Condições Comerciais
                  </span>
                </div>
                {conditions.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: compact ? 4 : 6 }}>
                    <span style={{ fontSize: f.sm, color: "#9CA3AF" }}>&#9201;</span>
                    <span style={{ fontSize: f.sm, color: "#4B5563", lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── DESCRIPTION / NOTES ── */}
            {description && (
              <div
                style={{
                  marginTop: gap,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: cardRadius,
                  padding: compact ? "12px 14px" : "18px 22px",
                }}
              >
                <p style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor, margin: "0 0 6px 0" }}>
                  Observações
                </p>
                <p style={{ fontSize: f.sm, color: "#4B5563", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>
                  {description}
                </p>
              </div>
            )}

            {/* ── PRÓXIMOS PASSOS ── */}
            <div
              style={{
                marginTop: gap,
                border: `1px solid ${cardBorder}`,
                borderRadius: cardRadius,
                padding: compact ? "14px 14px" : "20px 24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: compact ? 8 : 12 }}>
                <span style={{ fontSize: f.sm, color: primaryColor }}>&#128640;</span>
                <span style={{ fontSize: f.xs, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: primaryColor }}>
                  Próximos Passos
                </span>
              </div>
              {[
                "Alinhamento final com consultor",
                "Aprovação interna",
                "Geração do contrato",
                "Início da implantação",
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: compact ? 5 : 8 }}>
                  <div
                    style={{
                      width: compact ? 20 : 24,
                      height: compact ? 20 : 24,
                      borderRadius: "50%",
                      backgroundColor: `${primaryColor}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: f.xs,
                      fontWeight: 700,
                      color: primaryColor,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span style={{ fontSize: f.sm, color: "#4B5563", lineHeight: 1.5 }}>{step}</span>
                </div>
              ))}
            </div>

            {/* ── FOOTER ── */}
            <div style={{ marginTop: compact ? 16 : 28, borderTop: `1px solid ${cardBorder}`, paddingTop: compact ? 8 : 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, fontSize: f.xs, color: "#9CA3AF" }}>
                <div>
                  <p style={{ margin: 0 }}>{companyRazaoSocial || companyName} — CNPJ {companyCnpj || "00.000.000/0000-00"}</p>
                  <p style={{ margin: "3px 0 0" }}>{companyEmail || "contato@empresa.com"} — {companyPhone || "(00) 00000-0000"}</p>
                </div>
                <p style={{ margin: 0, whiteSpace: "nowrap" }}>Documento gerado automaticamente</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ProposalTemplatePremium.displayName = "ProposalTemplatePremium";
