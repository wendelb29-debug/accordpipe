import mammoth from "mammoth";
import { jsPDF } from "jspdf";

/**
 * Convert a .doc/.docx File to a PDF File using mammoth (extracts text)
 * and jsPDF (renders the text into pages). Plain-text fidelity only —
 * formatting like tables and images are not preserved, which is acceptable
 * for contract uploads that will be re-signed with placed signature fields.
 */
export async function convertWordToPdf(file: File): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();
  const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 48;
  const marginY = 56;
  const maxWidth = pageWidth - marginX * 2;
  const lineHeight = 16;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  let cursorY = marginY;
  const paragraphs = (rawText || "").split(/\r?\n/);

  for (const paragraph of paragraphs) {
    const text = paragraph.replace(/\s+$/g, "");
    if (text.length === 0) {
      cursorY += lineHeight;
      if (cursorY > pageHeight - marginY) {
        pdf.addPage();
        cursorY = marginY;
      }
      continue;
    }
    const lines = pdf.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      if (cursorY > pageHeight - marginY) {
        pdf.addPage();
        cursorY = marginY;
      }
      pdf.text(line, marginX, cursorY);
      cursorY += lineHeight;
    }
  }

  const blob = pdf.output("blob");
  const baseName = file.name.replace(/\.(docx?|DOCX?)$/i, "");
  return new File([blob], `${baseName}.pdf`, { type: "application/pdf" });
}

export function isWordFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    file.type === "application/msword" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}
