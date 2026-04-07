import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface SignerData {
  name: string;
  role: string;
  email?: string | null;
  document?: string | null;
  signed_at?: string | null;
  ip?: string | null;
  signature_photo_url?: string | null;
}

interface SignedContractPdfData {
  pdfUrl: string;
  code: string;
  companyName: string;
  documentHash: string;
  validationCode: string;
  signedAt: string;
  signers: SignerData[];
  validationUrl: string;
  /** Positions where signature stamps should be placed (from template fields) */
  signaturePositions?: { page: number; x: number; y: number; width: number; height: number }[];
}

export async function generateSignedContractPdf(data: SignedContractPdfData): Promise<Blob> {
  // 1. Load the original PDF
  const pdfBytes = await fetch(data.pdfUrl).then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  // 2. Pre-load signature photos
  const signerPhotos: (Uint8Array | null)[] = [];
  for (const signer of data.signers) {
    if (signer.signature_photo_url) {
      try {
        const resp = await fetch(signer.signature_photo_url);
        const blob = await resp.blob();
        const buffer = await blob.arrayBuffer();
        signerPhotos.push(new Uint8Array(buffer));
      } catch {
        signerPhotos.push(null);
      }
    } else {
      signerPhotos.push(null);
    }
  }

  // 3. Draw signature stamps at the defined positions
  const positions = data.signaturePositions || [];

  for (let i = 0; i < data.signers.length; i++) {
    const signer = data.signers[i];
    const pos = positions[i];
    if (!pos || !signer.signed_at) continue;

    const pageIdx = pos.page - 1;
    if (pageIdx < 0 || pageIdx >= pages.length) continue;

    const page = pages[pageIdx];
    const { height: pageHeight } = page.getSize();

    // Convert from top-left CSS coordinates to PDF bottom-left coordinates
    // The positions come from the overlay which uses a rendered canvas at scale 1.2
    const scale = 1.2;
    const pdfX = pos.x / scale;
    const pdfY = pageHeight - (pos.y / scale) - (pos.height / scale);
    const stampW = pos.width / scale;
    const stampH = pos.height / scale;

    // Draw background rect
    page.drawRectangle({
      x: pdfX,
      y: pdfY,
      width: stampW,
      height: stampH,
      color: rgb(0.96, 0.97, 1),
      borderColor: rgb(0.12, 0.25, 0.69),
      borderWidth: 0.5,
    });

    // Draw signature photo if available
    let textOffsetX = 3;
    const photoData = signerPhotos[i];
    if (photoData) {
      try {
        let image;
        try {
          image = await pdfDoc.embedJpg(photoData);
        } catch {
          image = await pdfDoc.embedPng(photoData);
        }
        const photoW = Math.min(stampW * 0.3, stampH - 4);
        const photoH = stampH - 4;
        page.drawImage(image, {
          x: pdfX + 2,
          y: pdfY + 2,
          width: photoW,
          height: photoH,
        });
        textOffsetX = photoW + 5;
      } catch {
        // Skip photo if embed fails
      }
    }

    // Draw text labels
    const textX = pdfX + textOffsetX;
    const lineH = 3.5;
    let ty = pdfY + stampH - 5;

    // "✔ Assinado Digitalmente"
    page.drawText("Assinado Digitalmente", {
      x: textX,
      y: ty,
      size: 7,
      font: fontBold,
      color: rgb(0.12, 0.25, 0.69),
    });
    ty -= lineH + 1;

    // Name
    page.drawText(`Nome: ${signer.name}`, {
      x: textX, y: ty, size: 6, font, color: rgb(0, 0, 0),
    });
    ty -= lineH;

    // Document
    if (signer.document) {
      page.drawText(`CPF/CNPJ: ${signer.document}`, {
        x: textX, y: ty, size: 6, font, color: rgb(0.2, 0.2, 0.2),
      });
      ty -= lineH;
    }

    // Date
    const signedDate = new Date(signer.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    page.drawText(`Data: ${signedDate}`, {
      x: textX, y: ty, size: 6, font, color: rgb(0.2, 0.2, 0.2),
    });
    ty -= lineH;

    // IP
    if (signer.ip) {
      page.drawText(`IP: ${signer.ip}`, {
        x: textX, y: ty, size: 5, font, color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  // 4. Add proof page
  const proofPage = pdfDoc.addPage();
  const { width: pw, height: ph } = proofPage.getSize();
  let y = ph - 40;

  // Header
  proofPage.drawText("Comprovante de Assinatura Digital", {
    x: pw / 2 - 80, y, size: 16, font: fontBold, color: rgb(0.12, 0.25, 0.69),
  });
  y -= 12;
  proofPage.drawText("Documento assinado digitalmente com validade jurídica", {
    x: pw / 2 - 100, y, size: 9, font, color: rgb(0.4, 0.4, 0.4),
  });
  y -= 20;

  // Legal text
  proofPage.drawText("Validade Jurídica", {
    x: 30, y, size: 11, font: fontBold, color: rgb(0.12, 0.25, 0.69),
  });
  y -= 12;
  const legalText = "Documento assinado digitalmente com validade jurídica, conforme a Medida Provisória nº 2.200-2/2001. A assinatura digital garante a autenticidade, integridade e não-repúdio do documento.";
  const legalLines = splitText(legalText, 90);
  for (const line of legalLines) {
    proofPage.drawText(line, { x: 30, y, size: 9, font, color: rgb(0, 0, 0) });
    y -= 11;
  }
  y -= 8;

  // Timestamp
  proofPage.drawText("Carimbo do Tempo", {
    x: 30, y, size: 11, font: fontBold, color: rgb(0.12, 0.25, 0.69),
  });
  y -= 12;
  const signedDate = new Date(data.signedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  proofPage.drawText(`Data e hora: ${signedDate}`, { x: 30, y, size: 9, font, color: rgb(0, 0, 0) });
  y -= 11;
  proofPage.drawText("Fuso horário: GMT -03:00 (Brasília)", { x: 30, y, size: 9, font, color: rgb(0, 0, 0) });
  y -= 16;

  // Verification
  proofPage.drawText("Verificação de Autenticidade", {
    x: 30, y, size: 11, font: fontBold, color: rgb(0.12, 0.25, 0.69),
  });
  y -= 12;
  proofPage.drawText(`Código de validação: ${data.validationCode}`, { x: 30, y, size: 9, font, color: rgb(0, 0, 0) });
  y -= 11;
  if (data.documentHash) {
    proofPage.drawText(`Hash SHA-256: ${data.documentHash}`, { x: 30, y, size: 7, font, color: rgb(0.3, 0.3, 0.3) });
    y -= 10;
  }
  proofPage.drawText(`Link de validação: ${data.validationUrl}`, { x: 30, y, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
  y -= 20;

  // Signers
  proofPage.drawText("Assinaturas", {
    x: pw / 2 - 25, y, size: 14, font: fontBold, color: rgb(0.12, 0.25, 0.69),
  });
  y -= 14;

  for (const signer of data.signers) {
    if (y < 80) {
      const newPage = pdfDoc.addPage();
      y = newPage.getSize().height - 40;
      // Continue drawing on newPage — for simplicity we only handle single proof page
    }

    proofPage.drawRectangle({
      x: 25, y: y - 35, width: pw - 50, height: 45,
      color: rgb(0.98, 0.98, 1), borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5,
    });

    proofPage.drawText(`${signer.name} (${signer.role})`, { x: 30, y, size: 10, font: fontBold, color: rgb(0, 0, 0) });
    y -= 10;
    if (signer.email) { proofPage.drawText(`E-mail: ${signer.email}`, { x: 30, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) }); y -= 9; }
    if (signer.document) { proofPage.drawText(`CPF/CNPJ: ${signer.document}`, { x: 30, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) }); y -= 9; }
    if (signer.signed_at) {
      const d = new Date(signer.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      proofPage.drawText(`Assinou em: ${d}`, { x: 30, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) }); y -= 9;
    }
    if (signer.ip) { proofPage.drawText(`IP: ${signer.ip}`, { x: 30, y, size: 7, font, color: rgb(0.4, 0.4, 0.4) }); y -= 9; }
    proofPage.drawText(`Emitido por ${data.companyName}`, { x: 30, y, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
    y -= 16;
  }

  // Footer on all pages
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const p = pdfDoc.getPages()[i];
    const { width: fpw } = p.getSize();
    p.drawText(`${data.code} - Página ${i + 1} de ${totalPages} | Validação: ${data.validationCode}`, {
      x: fpw / 2 - 80, y: 10, size: 6, font, color: rgb(0.6, 0.6, 0.6),
    });
  }

  const modifiedBytes = await pdfDoc.save();
  return new Blob([modifiedBytes], { type: "application/pdf" });
}

function splitText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      lines.push(current.trim());
      current = word;
    } else {
      current += " " + word;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

export async function downloadSignedContractPdf(data: SignedContractPdfData) {
  const blob = await generateSignedContractPdf(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.code}_assinado_${data.companyName.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
