import jsPDF from "jspdf";

interface SignerData {
  name: string;
  role: string;
  email?: string | null;
  document?: string | null;
  signed_at?: string | null;
  ip?: string | null;
  signature_hash?: string;
  birth_date?: string | null;
  signature_photo_url?: string | null;
}

interface HistoryEntry {
  timestamp: string;
  user: string;
  email?: string;
  action: string;
}

interface SignedContractPdfData {
  content: string;
  code: string;
  companyName: string;
  documentHash: string;
  validationCode: string;
  signedAt: string;
  signers: SignerData[];
  history: HistoryEntry[];
  validationUrl: string;
  companyEmitter?: string;
}

async function generateSignatureHash(
  contractId: string,
  signerName: string,
  signerDoc: string,
  signedAt: string
): Promise<string> {
  const data = `${contractId}|${signerName}|${signerDoc}|${signedAt}`;
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function addPageBreakIfNeeded(doc: jsPDF, y: number, needed: number, marginTop: number, marginBottom: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - marginBottom) {
    doc.addPage();
    return marginTop;
  }
  return y;
}

export async function generateSignedContractPdf(data: SignedContractPdfData): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const mL = 20, mR = 20, mT = 25, mB = 25;
  const uW = pageWidth - mL - mR;
  let y = mT;
  let signatureStampIndex = 0;

  // ── CONTRACT CONTENT ──
  const lines = data.content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === lines[0]?.trim() && trimmed.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      const titleLines = doc.splitTextToSize(trimmed, uW);
      for (const tl of titleLines) {
        y = addPageBreakIfNeeded(doc, y, 7, mT, mB);
        doc.text(tl, pageWidth / 2, y, { align: "center" });
        y += 7;
      }
      y += 5;
      continue;
    }

    if (/^CLÁUSULA\s/i.test(trimmed)) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const cl = doc.splitTextToSize(trimmed, uW);
      for (const c of cl) {
        y = addPageBreakIfNeeded(doc, y, 6, mT, mB);
        doc.text(c, mL, y);
        y += 6;
      }
      y += 2;
      continue;
    }

    if (trimmed.startsWith("•")) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const bl = doc.splitTextToSize(trimmed, uW - 5);
      for (const b of bl) {
        y = addPageBreakIfNeeded(doc, y, 5, mT, mB);
        doc.text(b, mL + 5, y);
        y += 5;
      }
      continue;
    }

    if (trimmed.startsWith("_")) {
      y += 4;
      // Check if there's a signer to stamp here
      if (signatureStampIndex < data.signers.length) {
        const signer = data.signers[signatureStampIndex];
        signatureStampIndex++;
        if (signer.signed_at) {
          // Stamp the signature visually
          const hasPhoto = !!signer.signature_photo_url;
          const stampHeight = hasPhoto ? 30 : 22;
          y = addPageBreakIfNeeded(doc, y, stampHeight, mT, mB);

          // Draw signature box
          doc.setDrawColor(30, 64, 175);
          doc.setFillColor(245, 247, 255);
          doc.roundedRect(mL, y - 3, uW, stampHeight, 1.5, 1.5, "FD");

          // If there's a signature photo, load and add it
          const photoOffset = hasPhoto ? 28 : 0;
          if (hasPhoto && signerPhotoImages[signatureStampIndex - 1]) {
            try {
              doc.addImage(signerPhotoImages[signatureStampIndex - 1], "JPEG", mL + 2, y - 1, 24, stampHeight - 4);
            } catch {}
          }

          // "Assinado digitalmente" label
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(30, 64, 175);
          doc.text("✔ Assinado Digitalmente", mL + 4 + photoOffset, y + 1);
          doc.setTextColor(0);

          // Signer details
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text(`Nome: ${signer.name}`, mL + 4 + photoOffset, y + 5.5);
          if (signer.document) {
            doc.text(`CPF/CNPJ: ${signer.document}`, mL + 4 + photoOffset, y + 9.5);
          }
          const signedDate = new Date(signer.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
          doc.text(`Data: ${signedDate}`, mL + 4 + photoOffset, y + (signer.document ? 13.5 : 9.5));
          if (signer.ip) {
            doc.setFontSize(6);
            doc.setTextColor(120);
            doc.text(`IP: ${signer.ip}`, mL + uW - 40, y + 1);
            doc.setTextColor(0);
          }

          y += stampHeight + 3;
        } else {
          // Pending - show line with "Pendente"
          y = addPageBreakIfNeeded(doc, y, 8, mT, mB);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text("_".repeat(40), mL, y);
          y += 4;
          doc.setFontSize(7);
          doc.setTextColor(150);
          doc.text(`(${signer.name} - Assinatura pendente)`, mL, y);
          doc.setTextColor(0);
          y += 4;
        }
      } else {
        y = addPageBreakIfNeeded(doc, y, 5, mT, mB);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("_".repeat(40), mL, y);
        y += 5;
      }
      continue;
    }

    if (trimmed === "") { y += 3; continue; }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const pl = doc.splitTextToSize(trimmed, uW);
    for (const p of pl) {
      y = addPageBreakIfNeeded(doc, y, 5, mT, mB);
      doc.text(p, mL, y);
      y += 5;
    }
  }

  // ── SIGNATURE PROOF PAGE ──
  doc.addPage();
  y = mT;

  // Section: Comprovante de Assinatura
  const drawSectionBox = (startY: number, height: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(mL, startY - 4, uW, height, 2, 2, "FD");
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175); // blue
  doc.text("Comprovante de Assinatura Digital", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Documento assinado digitalmente com validade jurídica", pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 10;

  // ── Section 1: Validade Jurídica ──
  const s1Start = y;
  drawSectionBox(s1Start, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.text("🔐  Validade Jurídica", mL + 4, y);
  doc.setTextColor(0);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const legalText = doc.splitTextToSize(
    "Documento assinado digitalmente com validade jurídica, conforme a Medida Provisória nº 2.200-2/2001. " +
    "A assinatura digital garante a autenticidade, integridade e não-repúdio do documento.",
    uW - 8
  );
  for (const lt of legalText) {
    doc.text(lt, mL + 4, y);
    y += 4;
  }
  y += 6;

  // ── Section 2: Carimbo do Tempo ──
  const s2Start = y;
  drawSectionBox(s2Start, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.text("⏱️  Carimbo do Tempo", mL + 4, y);
  doc.setTextColor(0);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const signedDate = new Date(data.signedAt);
  doc.text(`Data e hora: ${signedDate.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`, mL + 4, y);
  y += 4;
  doc.text("Fuso horário: GMT -03:00 (Brasília)", mL + 4, y);
  y += 4;
  doc.text("Documento com carimbo de tempo para comprovação de data e hora das assinaturas.", mL + 4, y);
  y += 8;

  // ── Section 3: Verificação de Autenticidade ──
  const s3Start = y;
  drawSectionBox(s3Start, 28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.text("✔️  Verificação de Autenticidade", mL + 4, y);
  doc.setTextColor(0);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Este documento pode ser verificado através de sua chave pública.", mL + 4, y);
  y += 5;
  doc.text(`Código de validação: ${data.validationCode}`, mL + 4, y);
  y += 5;
  doc.setFontSize(7);
  doc.setTextColor(80);
  const hashLines = doc.splitTextToSize(`Hash SHA-256: ${data.documentHash}`, uW - 8);
  for (const hl of hashLines) {
    doc.text(hl, mL + 4, y);
    y += 3.5;
  }
  doc.setTextColor(0);
  y += 5;

  // Validation URL
  doc.setFontSize(9);
  doc.text(`Link de validação: ${data.validationUrl}`, mL + 4, y);
  y += 10;

  // ── SIGNATURES SECTION ──
  y = addPageBreakIfNeeded(doc, y, 20, mT, mB);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 64, 175);
  doc.text("Assinaturas", pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 8;

  for (const signer of data.signers) {
    const blockHeight = 42;
    y = addPageBreakIfNeeded(doc, y, blockHeight, mT, mB);

    // Signer box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(mL, y - 3, uW, blockHeight, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const roleLabel = signer.role === "signatario" ? "signatário" :
      signer.role === "testemunha" ? "testemunha" : signer.role;
    doc.text(`${signer.name} (${roleLabel})`, mL + 4, y + 1);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const signerLines = [
      signer.email ? `E-mail: ${signer.email}` : null,
      signer.document ? `CPF/CNPJ: ${signer.document}` : null,
      signer.birth_date ? `Data de Nascimento: ${new Date(signer.birth_date).toLocaleDateString("pt-BR")}` : null,
      signer.signed_at ? `Assinou em: ${new Date(signer.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : "Assinatura pendente",
      signer.ip ? `IP: ${signer.ip}` : null,
      signer.signature_hash ? `Hash da assinatura: ${signer.signature_hash}` : null,
    ].filter(Boolean) as string[];

    for (const sl of signerLines) {
      doc.text(sl, mL + 4, y + 1);
      y += 4;
    }

    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`Emitido por ${data.companyEmitter || data.companyName}`, mL + 4, y + 1);
    doc.setTextColor(0);
    y += 8;
  }

  // ── HISTORY SECTION ──
  if (data.history.length > 0) {
    y += 5;
    y = addPageBreakIfNeeded(doc, y, 15, mT, mB);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text("Histórico", mL, y);
    doc.setTextColor(0);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    for (const entry of data.history) {
      y = addPageBreakIfNeeded(doc, y, 5, mT, mB);
      const ts = new Date(entry.timestamp).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const text = `${ts} - ${entry.user}${entry.email ? ` (${entry.email})` : ""} ${entry.action}`;
      const histLines = doc.splitTextToSize(text, uW);
      for (const hl of histLines) {
        y = addPageBreakIfNeeded(doc, y, 4, mT, mB);
        doc.text(hl, mL, y);
        y += 4;
      }
      y += 1;
    }
  }

  // ── Footer on each page ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`${data.code} - Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: "center" });
    doc.text(`Validação: ${data.validationCode}`, pageWidth / 2, pageHeight - 5, { align: "center" });
    doc.setTextColor(0);
  }

  return doc.output("blob");
}

export function downloadSignedContractPdf(data: SignedContractPdfData) {
  const blob = generateSignedContractPdf(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.code}_assinado_${data.companyName.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
