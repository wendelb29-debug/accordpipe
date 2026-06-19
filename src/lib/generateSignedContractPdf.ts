import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";

/**
 * Try to refresh a signed Supabase storage URL (signatures bucket) when fetch fails.
 * Extracts the path from a previously stored signed URL like:
 *   https://<proj>.supabase.co/storage/v1/object/sign/<bucket>/<path>?token=...
 */
async function refreshSignedPhotoUrl(url: string): Promise<string | null> {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    const [, bucket, path] = match;
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  } catch {
    return null;
  }
}

async function fetchPhotoBytes(url: string): Promise<Uint8Array | null> {
  const tryFetch = async (u: string) => {
    const r = await fetch(u, { cache: "no-store" });
    if (!r.ok) throw new Error(`status ${r.status}`);
    return new Uint8Array(await r.arrayBuffer());
  };
  try {
    return await tryFetch(url);
  } catch (e) {
    const fresh = await refreshSignedPhotoUrl(url);
    if (!fresh) return null;
    try {
      return await tryFetch(fresh);
    } catch {
      return null;
    }
  }
}

/** Draws a circular ICP-Brasil seal centered at (cx, cy) with radius r */
function drawIcpSeal(
  page: any,
  font: any,
  fontBold: any,
  cx: number,
  cy: number,
  r: number,
) {
  const green = rgb(0.04, 0.42, 0.27);
  const goldBg = rgb(0.98, 0.93, 0.78);
  // Outer ring
  page.drawCircle({ x: cx, y: cy, size: r, color: goldBg, borderColor: green, borderWidth: 1.5 });
  // Inner ring
  page.drawCircle({ x: cx, y: cy, size: r - 6, borderColor: green, borderWidth: 0.6, color: rgb(1, 1, 1) });
  // Center crest
  page.drawCircle({ x: cx, y: cy, size: r - 14, color: green });
  // ICP text
  const tw1 = fontBold.widthOfTextAtSize("ICP", 10);
  page.drawText("ICP", { x: cx - tw1 / 2, y: cy + 2, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  const tw2 = fontBold.widthOfTextAtSize("BRASIL", 7);
  page.drawText("BRASIL", { x: cx - tw2 / 2, y: cy - 8, size: 7, font: fontBold, color: rgb(1, 1, 1) });
  // Bottom label outside circle
  const lbl = "Selo ICP-Brasil";
  const lw = fontBold.widthOfTextAtSize(lbl, 7);
  page.drawText(lbl, { x: cx - lw / 2, y: cy - r - 9, size: 7, font: fontBold, color: green });
  const lbl2 = "Carimbo do Tempo";
  const lw2 = font.widthOfTextAtSize(lbl2, 6);
  page.drawText(lbl2, { x: cx - lw2 / 2, y: cy - r - 17, size: 6, font, color: rgb(0.3, 0.3, 0.3) });
}

interface SignerData {
  id?: string;
  name: string;
  role: string;
  email?: string | null;
  document?: string | null;
  birth_date?: string | null;
  company_name?: string | null;
  signed_at?: string | null;
  ip?: string | null;
  signature_photo_url?: string | null;
}

function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return cpf;
}

function formatBirthDate(d: string): string {
  if (!d) return "";
  // Handle ISO date (YYYY-MM-DD)
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
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
    signerPhotos.push(await fetchPhotoBytes(signer.signature_photo_url));
  }


  // ── Signature page: dedicated page for all signed signers ──
  const signedSigners = data.signers.filter((signer) => Boolean(signer.signed_at));

  if (signedSigners.length > 0) {
    const sigPage = pdfDoc.addPage();
    const { width: spW, height: spH } = sigPage.getSize();
    let sy = spH - 40;

    sigPage.drawText("Comprovação de Assinaturas", {
      x: spW / 2 - 90,
      y: sy,
      size: 16,
      font: fontBold,
      color: rgb(0.12, 0.25, 0.69),
    });
    sy -= 14;

    sigPage.drawText("Este documento foi assinado digitalmente com validade jurídica.", {
      x: spW / 2 - 140,
      y: sy,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    sy -= 24;

    for (let si = 0; si < signedSigners.length; si++) {
      const signer = signedSigners[si];
      const signerIndex = data.signers.findIndex((c) => c === signer);
      const photoData = signerIndex >= 0 ? signerPhotos[signerIndex] : null;

      // Check if we need a new page
      if (sy < 160) {
        const newPage = pdfDoc.addPage();
        sy = newPage.getSize().height - 40;
        // Draw on new page instead — we use pages array at the end
      }

      const currentPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];

      // Stamp background
      const stampX = 30;
      const stampW = spW - 60;
      // Calculate needed height based on fields
      let fieldCount = 3; // name, role, date are always shown
      if (signer.document || signer.birth_date) fieldCount++;
      if (signer.email) fieldCount++;
      if (signer.company_name) fieldCount++;
      if (signer.ip) fieldCount++;
      const stampH = Math.max(110, 24 + fieldCount * 12);

      currentPage.drawRectangle({
        x: stampX,
        y: sy - stampH + 12,
        width: stampW,
        height: stampH,
        color: rgb(0.96, 0.97, 1),
        borderColor: rgb(0.12, 0.25, 0.69),
        borderWidth: 0.5,
      });

      let textOffsetX = 10;

      // Photo
      if (photoData) {
        try {
          let image;
          try { image = await pdfDoc.embedJpg(photoData); } catch { image = await pdfDoc.embedPng(photoData); }
          const photoSize = Math.min(75, stampH - 10);
          currentPage.drawImage(image, {
            x: stampX + 5,
            y: sy - stampH + 12 + (stampH - photoSize) / 2,
            width: photoSize,
            height: photoSize,
          });
          textOffsetX = 90;
        } catch {
          // ignore
        }
      }

      // ICP-Brasil seal on the right side of the stamp
      const sealR = 28;
      const sealCx = stampX + stampW - sealR - 14;
      const sealCy = sy - stampH / 2 + 6;
      drawIcpSeal(currentPage, font, fontBold, sealCx, sealCy, sealR);


      const textX = stampX + textOffsetX;
      let ty = sy;

      currentPage.drawText("[OK] Assinado Digitalmente", {
        x: textX,
        y: ty,
        size: 10,
        font: fontBold,
        color: rgb(0.12, 0.25, 0.69),
      });
      ty -= 13;

      currentPage.drawText(`Nome: ${signer.name}`, { x: textX, y: ty, size: 9, font, color: rgb(0, 0, 0) });
      ty -= 12;

      if (signer.role) {
        currentPage.drawText(`Funcao: ${signer.role}`, { x: textX, y: ty, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
        ty -= 11;
      }

      if (signer.company_name) {
        currentPage.drawText(`Empresa: ${signer.company_name}`, { x: textX, y: ty, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
        ty -= 11;
      }

      const cpfText = signer.document ? `CPF: ${formatCpf(signer.document)}` : "";
      const birthText = signer.birth_date ? `Nasc: ${formatBirthDate(signer.birth_date)}` : "";
      if (cpfText || birthText) {
        currentPage.drawText([cpfText, birthText].filter(Boolean).join(" | "), { x: textX, y: ty, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
        ty -= 11;
      }

      if (signer.email) {
        currentPage.drawText(`E-mail: ${signer.email}`, { x: textX, y: ty, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
        ty -= 11;
      }

      if (signer.signed_at) {
        const signedDateText = new Date(signer.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
        currentPage.drawText(`Data: ${signedDateText}`, { x: textX, y: ty, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
        ty -= 11;
      }

      if (signer.ip) {
        currentPage.drawText(`IP: ${signer.ip}`, { x: textX, y: ty, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
      }

      sy -= stampH + 18;
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

  // ICP-Brasil seal in the top-right corner of the proof page
  if (signedSigners.length > 0) {
    drawIcpSeal(proofPage, font, fontBold, pw - 70, ph - 70, 36);
  }


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
    // Check if we need a new page
    if (y < 100) {
      const newPage = pdfDoc.addPage();
      y = newPage.getSize().height - 40;
    }

    const blockStartY = y;

    // Name + role (bold)
    proofPage.drawText(`${signer.name} (${signer.role})`, { x: 30, y, size: 10, font: fontBold, color: rgb(0, 0, 0) });
    y -= 12;

    if (signer.company_name) {
      proofPage.drawText(`Empresa: ${signer.company_name}`, { x: 30, y, size: 8, font, color: rgb(0.1, 0.1, 0.1) });
      y -= 10;
    }

    // CPF + Nascimento on same line
    const cpfText = signer.document ? `CPF: ${formatCpf(signer.document)}` : "";
    const birthText = signer.birth_date ? `Nascimento: ${formatBirthDate(signer.birth_date)}` : "";
    if (cpfText || birthText) {
      const combined = [cpfText, birthText].filter(Boolean).join(" | ");
      proofPage.drawText(combined, { x: 30, y, size: 8, font, color: rgb(0.1, 0.1, 0.1) });
      y -= 10;
    }

    if (signer.email) {
      proofPage.drawText(`E-mail: ${signer.email}`, { x: 30, y, size: 8, font, color: rgb(0.1, 0.1, 0.1) });
      y -= 10;
    }

    if (signer.signed_at) {
      const signerSignedAt = new Date(signer.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      proofPage.drawText(`Assinou em: ${signerSignedAt}`, { x: 30, y, size: 8, font, color: rgb(0.1, 0.1, 0.1) });
      y -= 10;
    }

    if (signer.ip) {
      proofPage.drawText(`IP: ${signer.ip}`, { x: 30, y, size: 8, font, color: rgb(0.1, 0.1, 0.1) });
      y -= 10;
    }

    if (data.documentHash) {
      proofPage.drawText(`Hash da assinatura: ${data.documentHash}`, { x: 30, y, size: 7, font, color: rgb(0.3, 0.3, 0.3) });
      y -= 10;
    }

    proofPage.drawText(`Emitido por ${data.companyName}.`, { x: 30, y, size: 7, font, color: rgb(0.3, 0.3, 0.3) });
    y -= 8;

    // Draw separator line
    proofPage.drawLine({
      start: { x: 25, y },
      end: { x: pw - 25, y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
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
