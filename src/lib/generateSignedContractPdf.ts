import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface SignerData {
  id?: string;
  name: string;
  role: string;
  email?: string | null;
  document?: string | null;
  signed_at?: string | null;
  ip?: string | null;
  signature_photo_url?: string | null;
}

interface SignaturePosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signerId?: string | null;
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
  signaturePositions?: SignaturePosition[];
}

export async function generateSignedContractPdf(data: SignedContractPdfData): Promise<Blob> {
  const pdfBytes = await fetch(data.pdfUrl).then((r) => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  const signerPhotos: (Uint8Array | null)[] = [];
  for (const signer of data.signers) {
    if (!signer.signature_photo_url) {
      signerPhotos.push(null);
      continue;
    }

    try {
      const resp = await fetch(signer.signature_photo_url);
      const blob = await resp.blob();
      const buffer = await blob.arrayBuffer();
      signerPhotos.push(new Uint8Array(buffer));
    } catch {
      signerPhotos.push(null);
    }
  }

  let positions = [...(data.signaturePositions || [])].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  const signedSigners = data.signers.filter((signer) => Boolean(signer.signed_at));

  // Fallback: if no signature positions defined, create default positions
  // at the bottom of the last page for each signed signer.
  // Positions must be in screen coordinates (×1.2) since the rendering
  // loop divides by 1.2 to convert back to PDF coordinates.
  const PDF_SCALE = 1.2;
  if (positions.length === 0 && signedSigners.length > 0) {
    const lastPage = pages.length;
    const stampW = 220;
    const stampH = 60;
    const gap = 10;
    const startY = 140; // PDF-space distance from top where stamps begin on last page
    const { height: lpH } = pages[lastPage - 1].getSize();
    positions = signedSigners.map((_, idx) => ({
      page: lastPage,
      x: 40 * PDF_SCALE,
      y: (lpH - startY + (stampH + gap) * idx) * PDF_SCALE,
      width: stampW * PDF_SCALE,
      height: stampH * PDF_SCALE,
      signerId: null,
    }));
  }

  const usedSignerIds = new Set<string>();

  for (const pos of positions) {
    const signer = pos.signerId
      ? signedSigners.find((candidate) => candidate.id === pos.signerId)
      : signedSigners.find((candidate) => !candidate.id || !usedSignerIds.has(candidate.id));

    if (!signer || !signer.signed_at) continue;
    if (signer.id) usedSignerIds.add(signer.id);

    const signerIndex = data.signers.findIndex((candidate) => candidate.id === signer.id);
    const pageIdx = pos.page - 1;
    if (pageIdx < 0 || pageIdx >= pages.length) continue;

    const page = pages[pageIdx];
    const { height: pageHeight } = page.getSize();
    const scale = 1.2;
    const pdfX = pos.x / scale;
    const pdfY = pageHeight - pos.y / scale - pos.height / scale;
    const stampW = pos.width / scale;
    const stampH = pos.height / scale;

    page.drawRectangle({
      x: pdfX,
      y: pdfY,
      width: stampW,
      height: stampH,
      color: rgb(0.96, 0.97, 1),
      borderColor: rgb(0.12, 0.25, 0.69),
      borderWidth: 0.5,
    });

    let textOffsetX = 3;
    const photoData = signerIndex >= 0 ? signerPhotos[signerIndex] : null;
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
        // ignore invalid image payloads
      }
    }

    const textX = pdfX + textOffsetX;
    const lineH = 3.5;
    let ty = pdfY + stampH - 5;

    page.drawText("Assinado Digitalmente", {
      x: textX,
      y: ty,
      size: 7,
      font: fontBold,
      color: rgb(0.12, 0.25, 0.69),
    });
    ty -= lineH + 1;

    page.drawText(`Nome: ${signer.name}`, {
      x: textX,
      y: ty,
      size: 6,
      font,
      color: rgb(0, 0, 0),
    });
    ty -= lineH;

    if (signer.document) {
      page.drawText(`CPF/CNPJ: ${signer.document}`, {
        x: textX,
        y: ty,
        size: 6,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      ty -= lineH;
    }

    const signedDateText = new Date(signer.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    page.drawText(`Data: ${signedDateText}`, {
      x: textX,
      y: ty,
      size: 6,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    ty -= lineH;

    if (signer.ip) {
      page.drawText(`IP: ${signer.ip}`, {
        x: textX,
        y: ty,
        size: 5,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  const proofPage = pdfDoc.addPage();
  const { width: pw, height: ph } = proofPage.getSize();
  let y = ph - 40;

  proofPage.drawText("Comprovante de Assinatura Digital", {
    x: pw / 2 - 80,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.12, 0.25, 0.69),
  });
  y -= 12;

  proofPage.drawText("Documento assinado digitalmente com validade jurídica", {
    x: pw / 2 - 100,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 20;

  proofPage.drawText("Validade Jurídica", {
    x: 30,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.12, 0.25, 0.69),
  });
  y -= 12;

  const legalText = "Documento assinado digitalmente com validade jurídica, conforme a Medida Provisória nº 2.200-2/2001. A assinatura digital garante a autenticidade, integridade e não-repúdio do documento.";
  const legalLines = splitText(legalText, 90);
  for (const line of legalLines) {
    proofPage.drawText(line, { x: 30, y, size: 9, font, color: rgb(0, 0, 0) });
    y -= 11;
  }
  y -= 8;

  proofPage.drawText("Carimbo do Tempo", {
    x: 30,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.12, 0.25, 0.69),
  });
  y -= 12;

  const signedDate = new Date(data.signedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  proofPage.drawText(`Data e hora: ${signedDate}`, { x: 30, y, size: 9, font, color: rgb(0, 0, 0) });
  y -= 11;
  proofPage.drawText("Fuso horário: GMT -03:00 (Brasília)", { x: 30, y, size: 9, font, color: rgb(0, 0, 0) });
  y -= 16;

  proofPage.drawText("Verificação de Autenticidade", {
    x: 30,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.12, 0.25, 0.69),
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

  proofPage.drawText("Assinaturas", {
    x: pw / 2 - 25,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0.12, 0.25, 0.69),
  });
  y -= 14;

  for (const signer of data.signers) {
    proofPage.drawRectangle({
      x: 25,
      y: y - 35,
      width: pw - 50,
      height: 45,
      color: rgb(0.98, 0.98, 1),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5,
    });

    proofPage.drawText(`${signer.name} (${signer.role})`, { x: 30, y, size: 10, font: fontBold, color: rgb(0, 0, 0) });
    y -= 10;
    if (signer.email) {
      proofPage.drawText(`E-mail: ${signer.email}`, { x: 30, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      y -= 9;
    }
    if (signer.document) {
      proofPage.drawText(`CPF/CNPJ: ${signer.document}`, { x: 30, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      y -= 9;
    }
    if (signer.signed_at) {
      const signerSignedAt = new Date(signer.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      proofPage.drawText(`Assinou em: ${signerSignedAt}`, { x: 30, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      y -= 9;
    }
    if (signer.ip) {
      proofPage.drawText(`IP: ${signer.ip}`, { x: 30, y, size: 7, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 9;
    }
    proofPage.drawText(`Emitido por ${data.companyName}`, { x: 30, y, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
    y -= 16;
  }

  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPages()[i];
    const { width } = page.getSize();
    page.drawText(`${data.code} - Página ${i + 1} de ${totalPages} | Validação: ${data.validationCode}`, {
      x: width / 2 - 80,
      y: 10,
      size: 6,
      font,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  const modifiedBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(modifiedBytes).buffer as ArrayBuffer], { type: "application/pdf" });
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
      current += ` ${word}`;
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
