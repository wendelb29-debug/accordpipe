import jsPDF from "jspdf";
import { addAnnexPage } from "./generateContractAnnex";
import type { AnnexData } from "./generateContractAnnex";

interface ContractPdfData {
  content: string;
  code: string;
  companyName: string;
  annexData?: AnnexData;
}

export function generateContractPdf({ content, code, companyName }: ContractPdfData): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const marginTop = 25;
  const marginBottom = 20;
  const usableWidth = pageWidth - marginLeft - marginRight;
  let y = marginTop;

  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Title line (first line or all-caps lines)
    if (trimmed === lines[0]?.trim() && trimmed.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      const titleLines = doc.splitTextToSize(trimmed, usableWidth);
      for (const tl of titleLines) {
        if (y + 7 > pageHeight - marginBottom) { doc.addPage(); y = marginTop; }
        doc.text(tl, pageWidth / 2, y, { align: "center" });
        y += 7;
      }
      y += 5;
      continue;
    }

    // Clause headers
    if (/^CLÁUSULA\s/i.test(trimmed)) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const clauseLines = doc.splitTextToSize(trimmed, usableWidth);
      for (const cl of clauseLines) {
        if (y + 6 > pageHeight - marginBottom) { doc.addPage(); y = marginTop; }
        doc.text(cl, marginLeft, y);
        y += 6;
      }
      y += 2;
      continue;
    }

    // Bullet points
    if (trimmed.startsWith("•")) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const bulletLines = doc.splitTextToSize(trimmed, usableWidth - 5);
      for (const bl of bulletLines) {
        if (y + 5 > pageHeight - marginBottom) { doc.addPage(); y = marginTop; }
        doc.text(bl, marginLeft + 5, y);
        y += 5;
      }
      continue;
    }

    // Signature lines
    if (trimmed.startsWith("_")) {
      y += 4;
      if (y + 5 > pageHeight - marginBottom) { doc.addPage(); y = marginTop; }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("_".repeat(40), marginLeft, y);
      y += 5;
      continue;
    }

    // Empty line
    if (trimmed === "") {
      y += 3;
      continue;
    }

    // Regular paragraph
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const paraLines = doc.splitTextToSize(trimmed, usableWidth);
    for (const pl of paraLines) {
      if (y + 5 > pageHeight - marginBottom) { doc.addPage(); y = marginTop; }
      doc.text(pl, marginLeft, y);
      y += 5;
    }
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${code} - Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    doc.setTextColor(0);
  }

  return doc.output("blob");
}

export function downloadContractPdf(data: ContractPdfData) {
  const blob = generateContractPdf(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.code}_${data.companyName.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
