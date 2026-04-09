import jsPDF from "jspdf";

export interface AnnexLineItem {
  name: string;
  unitValue: number;
  quantity: number;
  discountType: "percent" | "fixed";
  discountValue: number;
  total: number;
}

export interface AnnexData {
  clientName: string;
  clientCnpj: string;
  items: AnnexLineItem[];
  paymentMethod: string;
  paymentFrequency: string;
  numberOfInstallments: number;
  sigla: string;
  firstPaymentDate?: string;
  totalContract?: number;
}

const fmtCur = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Adds "ANEXO I – SERVICOS CONTRATADOS" page(s) to an existing jsPDF instance.
 * Call this AFTER all contract pages have been added.
 */
export function addAnnexPage(pdf: jsPDF, data: AnnexData) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const mL = 20;
  const mR = 20;
  const mTop = 25;
  const mBottom = 20;
  const usableW = pageWidth - mL - mR;

  pdf.addPage();
  let y = mTop;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - mBottom) {
      pdf.addPage();
      y = mTop;
    }
  };

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("ANEXO I - SERVICOS CONTRATADOS", pageWidth / 2, y, { align: "center" });
  y += 12;

  // Client info
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Revenda: ", mL, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(data.clientName || "---", mL + pdf.getTextWidth("Revenda: "), y);
  y += 6;

  pdf.setFont("helvetica", "bold");
  pdf.text("CNPJ: ", mL, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(data.clientCnpj || "[CNPJ nao informado]", mL + pdf.getTextWidth("CNPJ: "), y);
  y += 10;

  // Table
  const cols = [
    { label: "Nome", w: usableW * 0.30 },
    { label: "Valor Unit.", w: usableW * 0.15 },
    { label: "Qtd", w: usableW * 0.08 },
    { label: "Sub-Total", w: usableW * 0.15 },
    { label: "Desconto", w: usableW * 0.15 },
    { label: "Total", w: usableW * 0.17 },
  ];

  const rowH = 8;
  const headerH = 8;

  // Header row
  ensureSpace(headerH + rowH * data.items.length + rowH);
  pdf.setFillColor(230, 230, 230);
  pdf.rect(mL, y, usableW, headerH, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  let cx = mL;
  for (const col of cols) {
    pdf.text(col.label, cx + 2, y + 5.5);
    cx += col.w;
  }
  // Lines
  pdf.setDrawColor(180);
  pdf.line(mL, y, mL + usableW, y);
  pdf.line(mL, y + headerH, mL + usableW, y + headerH);
  y += headerH;

  // Data rows
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  let grandTotal = 0;

  for (const item of data.items) {
    ensureSpace(rowH);
    cx = mL;
    const subtotal = item.unitValue * item.quantity;
    const discountAmt = item.discountType === "percent"
      ? subtotal * (item.discountValue / 100)
      : item.discountValue;
    const rowTotal = subtotal - discountAmt;
    grandTotal += rowTotal;

    const discountLabel = item.discountType === "percent"
      ? `${item.discountValue}%\n${fmtCur(discountAmt)}`
      : fmtCur(discountAmt);

    const values = [
      item.name,
      fmtCur(item.unitValue),
      String(item.quantity),
      fmtCur(subtotal),
      discountLabel.split("\n")[0],
      fmtCur(rowTotal),
    ];

    for (let i = 0; i < cols.length; i++) {
      const cellX = cx + 2;
      const text = values[i];
      // Truncate long names
      const maxW = cols[i].w - 4;
      const lines = pdf.splitTextToSize(text, maxW);
      pdf.text(lines[0] || "", cellX, y + 5.5);
      cx += cols[i].w;
    }

    // Discount second line (amount below percentage)
    if (item.discountType === "percent" && item.discountValue > 0) {
      const discAmtText = fmtCur(discountAmt);
      const discColX = mL + cols[0].w + cols[1].w + cols[2].w + cols[3].w + 2;
      pdf.setFontSize(7);
      pdf.setTextColor(100);
      pdf.text(discAmtText, discColX, y + 5.5 + 3.5);
      pdf.setFontSize(9);
      pdf.setTextColor(0);
    }

    pdf.line(mL, y + rowH, mL + usableW, y + rowH);
    y += rowH;
  }

  // Total row
  ensureSpace(rowH);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Total", mL + 2, y + 5.5);
  const totalColX = mL + cols[0].w + cols[1].w + cols[2].w + cols[3].w + cols[4].w + 2;
  pdf.text(fmtCur(grandTotal), totalColX, y + 5.5);
  pdf.line(mL, y + rowH, mL + usableW, y + rowH);
  y += rowH + 10;

  // Vertical lines for all table rows
  const tableTop = y - 10 - rowH - (data.items.length * rowH) - headerH;
  const tableBottom = y - 10;
  cx = mL;
  pdf.setDrawColor(180);
  for (let i = 0; i <= cols.length; i++) {
    pdf.line(cx, tableTop, cx, tableBottom);
    if (i < cols.length) cx += cols[i].w;
  }

  // Payment details
  ensureSpace(30);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);

  const freqLabels: Record<string, string> = {
    avista: "A Vista",
    mensal: "Mensal",
    trimestral: "Trimestral",
    semestral: "Semestral",
    anual: "Anual",
  };
  const payLabels: Record<string, string> = {
    boleto: "Boleto",
    pix: "PIX",
    cartao: "Cartao",
    transferencia: "Transferencia",
  };

  const freq = freqLabels[data.paymentFrequency] || data.paymentFrequency || "---";
  const payMethod = payLabels[data.paymentMethod] || data.paymentMethod || "---";
  const parcelas = data.numberOfInstallments > 0 ? `${data.numberOfInstallments}x` : "1x";

  pdf.text("Forma de Pagamento: ", mL, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(freq, mL + pdf.getTextWidth("Forma de Pagamento: "), y);
  y += 7;

  pdf.setFont("helvetica", "bold");
  pdf.text("Meio de Pagamento: ", mL, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(payMethod, mL + pdf.getTextWidth("Meio de Pagamento: "), y);
  y += 7;

  pdf.setFont("helvetica", "bold");
  pdf.text("Parcelas: ", mL, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(parcelas, mL + pdf.getTextWidth("Parcelas: "), y);
  y += 7;

  // First payment date
  if (data.firstPaymentDate) {
    ensureSpace(7);
    pdf.setFont("helvetica", "bold");
    pdf.text("Data da 1a Parcela: ", mL, y);
    pdf.setFont("helvetica", "normal");
    const dateStr = data.firstPaymentDate.includes("T")
      ? new Date(data.firstPaymentDate).toLocaleDateString("pt-BR")
      : data.firstPaymentDate;
    pdf.text(dateStr, mL + pdf.getTextWidth("Data da 1a Parcela: "), y);
    y += 7;
  }

  // Total contract
  if (data.totalContract && data.totalContract > 0) {
    ensureSpace(7);
    pdf.setFont("helvetica", "bold");
    pdf.text("Total do Contrato: ", mL, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(fmtCur(data.totalContract), mL + pdf.getTextWidth("Total do Contrato: "), y);
  }

  return pdf;
}
