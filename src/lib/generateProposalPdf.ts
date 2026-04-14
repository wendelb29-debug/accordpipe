import { jsPDF } from "jspdf";
import type { ProposalTemplateData, ProposalTemplateItem } from "@/components/atendimento/ProposalTemplatePremium";

const fmtCur = (v: number, cur = "BRL") =>
  v.toLocaleString("pt-BR", { style: "currency", currency: cur });

/** Convert hex color to RGB tuple */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** Wrap text to fit within maxWidth, returning lines */
function wrapText(pdf: jsPDF, text: string, maxWidth: number): string[] {
  return pdf.splitTextToSize(text, maxWidth) as string[];
}

const STATUS_MAP: Record<string, { label: string; rgb: [number, number, number] }> = {
  enviada: { label: "PROPOSTA APRESENTADA", rgb: [59, 130, 246] },
  aceita: { label: "APROVADA", rgb: [16, 185, 129] },
  declinada: { label: "DECLINADA", rgb: [239, 68, 68] },
  cancelada: { label: "CANCELADA", rgb: [107, 114, 128] },
};

export async function generateProposalPdf(data: ProposalTemplateData, filename: string) {
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

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth(); // 210
  const H = pdf.internal.pageSize.getHeight(); // 297
  const ML = 15; // margin left
  const MR = 15; // margin right
  const UW = W - ML - MR; // usable width
  const FOOTER_H = 18;

  const primaryRgb = hexToRgb(primaryColor);
  const accentRgb = hexToRgb(accentColor);
  const textRgb = hexToRgb(textColor);
  const grayRgb: [number, number, number] = [107, 114, 128];
  const lightGray: [number, number, number] = [229, 231, 235];
  const statusInfo = STATUS_MAP[status] || STATUS_MAP.enviada;

  let y = 0;

  // ─── Helper: check page break ───
  const ensureSpace = (needed: number) => {
    if (y + needed > H - FOOTER_H - 10) {
      drawFooter();
      pdf.addPage();
      y = 15;
    }
  };

  // ─── Helper: draw footer ───
  const drawFooter = () => {
    const fy = H - FOOTER_H;
    pdf.setDrawColor(...lightGray);
    pdf.setLineWidth(0.3);
    pdf.line(ML, fy, W - MR, fy);
    pdf.setFontSize(7);
    pdf.setTextColor(...grayRgb);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${companyRazaoSocial || companyName} — CNPJ ${companyCnpj || "00.000.000/0000-00"}`, ML, fy + 5);
    pdf.text(`${companyEmail || "contato@empresa.com"} — ${companyPhone || "(00) 00000-0000"}`, ML, fy + 9);
    pdf.text("Documento gerado automaticamente", W - MR, fy + 7, { align: "right" });
  };

  // ═══════════════════════════════════════════
  // TOP BRAND LINE
  // ═══════════════════════════════════════════
  pdf.setFillColor(...accentRgb);
  pdf.rect(0, 0, W, 4, "F");
  y = 4;

  // ═══════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════
  y += 8;

  // Logo (if available, try to load as image)
  let logoX = ML;
  if (logoUrl) {
    try {
      const img = await loadImage(logoUrl);
      const maxH = 16;
      const maxW = 40;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const imgW = img.width * ratio;
      const imgH = img.height * ratio;
      pdf.addImage(img, "PNG", ML, y, imgW, imgH);
      logoX = ML + imgW + 6;
    } catch {
      // logo failed to load, skip
    }
  }

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(...primaryRgb);
  pdf.text("PROPOSTA COMERCIAL", logoX, y + 8);

  // Subtitle
  const subtitle = [companyCnpj, companyRazaoSocial || companyName, `Ref: ${reference}`].filter(Boolean).join(" · ");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...grayRgb);
  pdf.text(subtitle, logoX, y + 13);

  // Status badge (right side)
  pdf.setFillColor(...statusInfo.rgb);
  const badgeText = statusInfo.label;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  const badgeW = pdf.getTextWidth(badgeText) + 10;
  const badgeX = W - MR - badgeW;
  pdf.roundedRect(badgeX, y, badgeW, 6, 3, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.text(badgeText, badgeX + badgeW / 2, y + 4.2, { align: "center" });

  // Dates (right side)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...grayRgb);
  pdf.text(`Emissão: ${emissionDate}`, W - MR, y + 10, { align: "right" });
  pdf.text(`Válida por ${validityDays} dias`, W - MR, y + 14, { align: "right" });
  if (validUntil) {
    pdf.text(`Validade: ${validUntil}`, W - MR, y + 18, { align: "right" });
  }

  y += 22;

  // ─── Gradient divider line ───
  // Simulate gradient with segments
  const segments = 60;
  const segW = UW / segments;
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const r = Math.round(primaryRgb[0] + (accentRgb[0] - primaryRgb[0]) * t);
    const g = Math.round(primaryRgb[1] + (accentRgb[1] - primaryRgb[1]) * t);
    const b = Math.round(primaryRgb[2] + (accentRgb[2] - primaryRgb[2]) * t);
    pdf.setFillColor(r, g, b);
    pdf.rect(ML + i * segW, y, segW + 0.5, 1.5, "F");
  }
  y += 6;

  // ═══════════════════════════════════════════
  // INTRODUCTION
  // ═══════════════════════════════════════════
  if (introduction) {
    ensureSpace(15);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(75, 85, 99);
    const lines = wrapText(pdf, introduction, UW);
    lines.forEach((line) => {
      ensureSpace(5);
      pdf.text(line, ML, y);
      y += 4.5;
    });
    y += 4;
  }

  // ═══════════════════════════════════════════
  // CLIENT / CONSULTANT CARDS
  // ═══════════════════════════════════════════
  ensureSpace(30);
  const cardW = (UW - 6) / 2;
  const cardH = 24;

  // Client card
  drawInfoCard(pdf, ML, y, cardW, cardH, "CLIENTE", clientName,
    clientDocument ? `${clientDocument.replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ"}: ${clientDocument}` : undefined,
    primaryRgb, textRgb, grayRgb, lightGray
  );

  // Consultant card
  drawInfoCard(pdf, ML + cardW + 6, y, cardW, cardH, "CONSULTOR", vendorName,
    vendorEmail || undefined,
    primaryRgb, textRgb, grayRgb, lightGray
  );

  y += cardH + 8;

  // ═══════════════════════════════════════════
  // SERVICES TABLE
  // ═══════════════════════════════════════════
  if (items.length > 0) {
    ensureSpace(20);
    // Section title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...primaryRgb);
    pdf.text("SERVIÇOS CONTRATADOS", ML, y);
    y += 5;

    // Table header
    const cols = [
      { label: "Serviço", x: ML, w: UW * 0.38, align: "left" as const },
      { label: "Qtd", x: ML + UW * 0.38, w: UW * 0.1, align: "center" as const },
      { label: "Unitário", x: ML + UW * 0.48, w: UW * 0.18, align: "right" as const },
      { label: "Desc.", x: ML + UW * 0.66, w: UW * 0.14, align: "center" as const },
      { label: "Total", x: ML + UW * 0.80, w: UW * 0.20, align: "right" as const },
    ];

    const rowH = 7;
    // Header row
    pdf.setFillColor(...primaryRgb);
    pdf.rect(ML, y, UW, rowH, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    cols.forEach((col) => {
      const tx = col.align === "right" ? col.x + col.w - 3 : col.align === "center" ? col.x + col.w / 2 : col.x + 3;
      pdf.text(col.label, tx, y + 5, { align: col.align });
    });
    y += rowH;

    // Data rows
    items.forEach((row, i) => {
      ensureSpace(rowH + 2);
      const bg = i % 2 !== 0;
      if (bg) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(ML, y, UW, rowH, "F");
      }
      // Bottom border
      pdf.setDrawColor(...lightGray);
      pdf.setLineWidth(0.2);
      pdf.line(ML, y + rowH, ML + UW, y + rowH);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);

      // Service name
      pdf.setTextColor(...textRgb);
      pdf.text(row.name, ML + 3, y + 5);

      // Quantity
      pdf.setTextColor(...accentRgb);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(row.quantity), cols[1].x + cols[1].w / 2, y + 5, { align: "center" });

      // Unit value
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...textRgb);
      pdf.text(fmtCur(row.unitValue, currency), cols[2].x + cols[2].w - 3, y + 5, { align: "right" });

      // Discount
      const discStr = row.discountValue && row.discountValue > 0
        ? row.discountType === "percent" ? `${row.discountValue}%` : fmtCur(row.discountValue, currency)
        : "—";
      pdf.setTextColor(156, 163, 175);
      pdf.text(discStr, cols[3].x + cols[3].w / 2, y + 5, { align: "center" });

      // Total
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...primaryRgb);
      pdf.text(fmtCur(row.total, currency), cols[4].x + cols[4].w - 3, y + 5, { align: "right" });

      y += rowH;
    });
    y += 6;
  }

  // ═══════════════════════════════════════════
  // TOTAL VALUE BANNER
  // ═══════════════════════════════════════════
  const computedTotal = items.length > 0 ? items.reduce((s, i) => s + i.total, 0) : totalMrr;
  if (computedTotal > 0) {
    ensureSpace(18);
    const bannerH = 14;
    // Green gradient banner
    const steps = 40;
    const stepW = UW / steps;
    const greenEnd: [number, number, number] = [5, 150, 105]; // #059669
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.round(accentRgb[0] + (greenEnd[0] - accentRgb[0]) * t);
      const g = Math.round(accentRgb[1] + (greenEnd[1] - accentRgb[1]) * t);
      const b = Math.round(accentRgb[2] + (greenEnd[2] - accentRgb[2]) * t);
      pdf.setFillColor(r, g, b);
      if (i === 0) {
        pdf.roundedRect(ML + i * stepW, y, stepW + 0.5, bannerH, 3, 3, "F");
      } else if (i === steps - 1) {
        pdf.roundedRect(ML + i * stepW - 0.5, y, stepW + 1, bannerH, 3, 3, "F");
      } else {
        pdf.rect(ML + i * stepW, y, stepW + 0.5, bannerH, "F");
      }
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text("INVESTIMENTO MENSAL", ML + 8, y + bannerH / 2 + 1);

    const totalStr = fmtCur(computedTotal, currency);
    const mesStr = "/mês";
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    const mesW = pdf.getTextWidth(mesStr);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    const totalW = pdf.getTextWidth(totalStr);
    const totalX = W - MR - 6 - mesW - totalW;
    pdf.text(totalStr, totalX, y + bannerH / 2 + 2);

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(mesStr, totalX + totalW + 2, y + bannerH / 2 + 1);

    y += bannerH + 8;
  }

  // ═══════════════════════════════════════════
  // CONDITIONS
  // ═══════════════════════════════════════════
  if (conditions.length > 0) {
    ensureSpace(20);
    drawSectionBox(pdf, ML, y, UW, "CONDIÇÕES COMERCIAIS", primaryRgb, lightGray);
    y += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(75, 85, 99);
    conditions.forEach((item) => {
      ensureSpace(6);
      pdf.text(`•  ${item}`, ML + 4, y);
      y += 5;
    });
    y += 6;
  }

  // ═══════════════════════════════════════════
  // DESCRIPTION / NOTES
  // ═══════════════════════════════════════════
  if (description) {
    ensureSpace(20);
    drawSectionBox(pdf, ML, y, UW, "OBSERVAÇÕES", primaryRgb, lightGray);
    y += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(75, 85, 99);
    const lines = wrapText(pdf, description, UW - 8);
    lines.forEach((line) => {
      ensureSpace(5);
      pdf.text(line, ML + 4, y);
      y += 4.5;
    });
    y += 6;
  }

  // ═══════════════════════════════════════════
  // PRÓXIMOS PASSOS
  // ═══════════════════════════════════════════
  ensureSpace(45);
  drawSectionBox(pdf, ML, y, UW, "PRÓXIMOS PASSOS", primaryRgb, lightGray);
  y += 12;

  const steps_list = [
    "Alinhamento final com consultor",
    "Aprovação interna",
    "Geração do contrato",
    "Início da implantação",
  ];

  pdf.setFontSize(8.5);
  steps_list.forEach((step, i) => {
    ensureSpace(7);
    // Number circle
    pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2], 0.1);
    pdf.setFillColor(...primaryRgb);
    pdf.circle(ML + 6, y - 1.2, 3, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text(String(i + 1), ML + 6, y - 0.2, { align: "center" });

    // Step text
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(75, 85, 99);
    pdf.text(step, ML + 13, y);
    y += 7;
  });
  y += 4;

  // ═══════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════
  drawFooter();

  pdf.save(filename);
}

// ─── Helper: load image as HTMLImageElement ───
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Helper: draw info card (client/consultant) ───
function drawInfoCard(
  pdf: jsPDF, x: number, y: number, w: number, h: number,
  title: string, name: string, subtitle: string | undefined,
  primaryRgb: [number, number, number],
  textRgb: [number, number, number],
  grayRgb: [number, number, number],
  borderRgb: [number, number, number],
) {
  pdf.setDrawColor(...borderRgb);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x, y, w, h, 2, 2, "S");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...primaryRgb);
  pdf.text(title, x + 5, y + 6);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...textRgb);
  pdf.text(name, x + 5, y + 13);

  if (subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...grayRgb);
    pdf.text(subtitle, x + 5, y + 18);
  }
}

// ─── Helper: draw section title with underline ───
function drawSectionBox(
  pdf: jsPDF, x: number, y: number, _w: number,
  title: string,
  primaryRgb: [number, number, number],
  _borderRgb: [number, number, number],
) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...primaryRgb);
  pdf.text(title, x, y + 4);
}
