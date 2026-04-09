import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const MARGIN = 50;
const FONT_SIZE = 10;
const HEADING1_SIZE = 16;
const HEADING2_SIZE = 14;
const HEADING3_SIZE = 12;
const LINE_HEIGHT_FACTOR = 1.5;
const HEADER_ZONE = 85; // reserved top zone for header
const FOOTER_ZONE = 45; // reserved bottom zone for footer

export interface PdfBrandingOptions {
  logoUrl?: string;
  primaryColor?: string;
  tenantName?: string;
  tenantCnpj?: string;
  footerText?: string;
}

export interface PdfCertificateData {
  signers?: Array<{
    name: string;
    document?: string;
    role?: string;
    signedAt?: string;
    ip?: string;
    location?: string;
    photoUrl?: string;
  }>;
  validationCode?: string;
  documentHash?: string;
  validationUrl?: string;
}

interface RenderContext {
  pdfDoc: PDFDocument;
  font: PDFFont;
  boldFont: PDFFont;
  italicFont: PDFFont;
  page: PDFPage;
  y: number;
  maxWidth: number;
  pageNumber: number;
  totalPages: number;
  primaryColor: { r: number; g: number; b: number };
  branding?: PdfBrandingOptions;
  logoEmbed: { image: any; width: number; height: number } | null;
  generatedAt: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return { r: ((num >> 16) & 255) / 255, g: ((num >> 8) & 255) / 255, b: (num & 255) / 255 };
}

// ─── HEADER ────────────────────────────────────────────────
function drawHeader(ctx: RenderContext): void {
  const { page, primaryColor: pc, branding, logoEmbed, boldFont, font } = ctx;
  const headerY = A4_HEIGHT - 30;

  // Logo on the left
  if (logoEmbed) {
    const logoH = Math.min(logoEmbed.height, 36);
    const logoW = (logoEmbed.width / logoEmbed.height) * logoH;
    page.drawImage(logoEmbed.image, {
      x: MARGIN,
      y: headerY - logoH + 5,
      width: logoW,
      height: logoH,
    });
  }

  // Tenant name + CNPJ on the right
  const rightX = A4_WIDTH - MARGIN;
  if (branding?.tenantName) {
    const nameW = boldFont.widthOfTextAtSize(branding.tenantName, 9);
    page.drawText(branding.tenantName, {
      x: rightX - nameW,
      y: headerY - 5,
      font: boldFont,
      size: 9,
      color: rgb(pc.r, pc.g, pc.b),
    });
  }
  if (branding?.tenantCnpj) {
    const cnpjW = font.widthOfTextAtSize(branding.tenantCnpj, 7);
    page.drawText(branding.tenantCnpj, {
      x: rightX - cnpjW,
      y: headerY - 17,
      font,
      size: 7,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  // Branded separator line
  const lineY = headerY - 30;
  page.drawLine({
    start: { x: MARGIN, y: lineY },
    end: { x: A4_WIDTH - MARGIN, y: lineY },
    thickness: 1.5,
    color: rgb(pc.r, pc.g, pc.b),
  });
}

// ─── FOOTER ────────────────────────────────────────────────
function drawFooter(ctx: RenderContext): void {
  const { page, italicFont, font, branding, pageNumber, generatedAt, primaryColor: pc } = ctx;
  const footerY = 25;

  // Footer line
  page.drawLine({
    start: { x: MARGIN, y: footerY + 14 },
    end: { x: A4_WIDTH - MARGIN, y: footerY + 14 },
    thickness: 0.4,
    color: rgb(0.75, 0.75, 0.75),
  });

  // Left: tenant name
  const leftText = branding?.footerText || branding?.tenantName || "";
  if (leftText) {
    page.drawText(leftText, {
      x: MARGIN,
      y: footerY,
      font: italicFont,
      size: 7,
      color: rgb(0.45, 0.45, 0.45),
    });
  }

  // Center: generation date
  const dateStr = `Gerado em ${generatedAt}`;
  const dateW = font.widthOfTextAtSize(dateStr, 6);
  page.drawText(dateStr, {
    x: (A4_WIDTH - dateW) / 2,
    y: footerY,
    font,
    size: 6,
    color: rgb(0.55, 0.55, 0.55),
  });

  // Right: page number (placeholder — will be overwritten in finalize)
  const pageStr = `Página ${pageNumber}`;
  const pageW = italicFont.widthOfTextAtSize(pageStr, 7);
  page.drawText(pageStr, {
    x: A4_WIDTH - MARGIN - pageW,
    y: footerY,
    font: italicFont,
    size: 7,
    color: rgb(0.45, 0.45, 0.45),
  });
}

// ─── PAGE MANAGEMENT ───────────────────────────────────────
function newPage(ctx: RenderContext): void {
  ctx.page = ctx.pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  ctx.pageNumber++;
  ctx.y = A4_HEIGHT - MARGIN - HEADER_ZONE;
  drawHeader(ctx);
  drawFooter(ctx);
}

function ensureSpace(ctx: RenderContext, needed: number): void {
  if (ctx.y - needed < MARGIN + FOOTER_ZONE) {
    newPage(ctx);
  }
}

// ─── TEXT RENDERING ────────────────────────────────────────
function drawWrappedText(
  ctx: RenderContext,
  text: string,
  fontSize: number,
  useBold: boolean,
  indent: number = 0,
  bulletPrefix: string = "",
  align: "left" | "center" | "right" | "justify" = "left",
  colorOverride?: { r: number; g: number; b: number },
): void {
  const f = useBold ? ctx.boldFont : ctx.font;
  const lineHeight = fontSize * LINE_HEIGHT_FACTOR;
  const availWidth = ctx.maxWidth - indent;

  if (!text.trim()) {
    ctx.y -= lineHeight * 0.5;
    return;
  }

  const fullText = bulletPrefix + text;
  const words = fullText.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (f.widthOfTextAtSize(testLine, fontSize) > availWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const c = colorOverride || { r: 0.1, g: 0.1, b: 0.1 };

  for (const line of lines) {
    ensureSpace(ctx, lineHeight);
    const textWidth = f.widthOfTextAtSize(line, fontSize);
    let x = MARGIN + indent;

    if (align === "center") {
      x = MARGIN + (ctx.maxWidth - textWidth) / 2;
    } else if (align === "right") {
      x = MARGIN + ctx.maxWidth - textWidth;
    }

    ctx.page.drawText(line, {
      x,
      y: ctx.y,
      font: f,
      size: fontSize,
      color: rgb(c.r, c.g, c.b),
    });
    ctx.y -= lineHeight;
  }
}

// ─── HTML PARSING ──────────────────────────────────────────
function stripTags(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function getAlignment(tag: string): "left" | "center" | "right" | "justify" {
  const alignMatch = tag.match(/text-align:\s*(left|center|right|justify)/i);
  return (alignMatch?.[1] as any) || "left";
}

interface HtmlBlock {
  type: "heading1" | "heading2" | "heading3" | "paragraph" | "listItem" | "orderedItem" | "hr" | "spacing" | "table";
  text: string;
  bold?: boolean;
  align?: "left" | "center" | "right" | "justify";
  index?: number;
  rows?: string[][];
}

function processHtmlBlocks(html: string): HtmlBlock[] {
  const blocks: HtmlBlock[] = [];
  let cleaned = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Extract tables first
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  let lastIndex = 0;
  const segments: Array<{ type: "html" | "table"; content: string }> = [];

  while ((tableMatch = tableRegex.exec(cleaned)) !== null) {
    if (tableMatch.index > lastIndex) {
      segments.push({ type: "html", content: cleaned.slice(lastIndex, tableMatch.index) });
    }
    segments.push({ type: "table", content: tableMatch[0] });
    lastIndex = tableMatch.index + tableMatch[0].length;
  }
  if (lastIndex < cleaned.length) {
    segments.push({ type: "html", content: cleaned.slice(lastIndex) });
  }

  for (const seg of segments) {
    if (seg.type === "table") {
      const rows: string[][] = [];
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      while ((rowMatch = rowRegex.exec(seg.content)) !== null) {
        const cells: string[] = [];
        const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
          cells.push(stripTags(cellMatch[1]));
        }
        if (cells.length) rows.push(cells);
      }
      if (rows.length) blocks.push({ type: "table", text: "", rows });
    } else {
      parseHtmlToBlocks(seg.content, blocks);
    }
  }

  return blocks;
}

function parseHtmlToBlocks(html: string, blocks: HtmlBlock[]): void {
  const blockRegex = /<(h[1-3]|p|li|hr|ul|ol|\/ul|\/ol|br)\b([^>]*)>/gi;
  let match;
  let orderedCounter = 0;
  let inOrderedList = false;

  const boundaries: Array<{ tag: string; attrs: string; pos: number }> = [];
  while ((match = blockRegex.exec(html)) !== null) {
    boundaries.push({ tag: match[1].toLowerCase(), attrs: match[2], pos: match.index });
  }

  if (boundaries.length === 0 && html.trim()) {
    const text = stripTags(html);
    if (text) blocks.push({ type: "paragraph", text, align: "left" });
    return;
  }

  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    const tagEnd = html.indexOf(">", b.pos) + 1;
    const nextPos = i + 1 < boundaries.length ? boundaries[i + 1].pos : html.length;
    const content = html.slice(tagEnd, nextPos);
    const align = getAlignment(b.attrs);
    const text = stripTags(content);
    const isBold = /<(strong|b)\b/i.test(content);

    switch (b.tag) {
      case "h1": blocks.push({ type: "heading1", text, align }); break;
      case "h2": blocks.push({ type: "heading2", text, align }); break;
      case "h3": blocks.push({ type: "heading3", text, align }); break;
      case "hr": blocks.push({ type: "hr", text: "" }); break;
      case "ol": inOrderedList = true; orderedCounter = 0; break;
      case "/ol": inOrderedList = false; break;
      case "ul": case "/ul": break;
      case "li":
        if (inOrderedList) {
          orderedCounter++;
          blocks.push({ type: "orderedItem", text, index: orderedCounter, bold: isBold, align });
        } else {
          blocks.push({ type: "listItem", text, bold: isBold, align });
        }
        break;
      case "br": blocks.push({ type: "spacing", text: "" }); break;
      case "p":
        if (text) blocks.push({ type: "paragraph", text, bold: isBold, align });
        else blocks.push({ type: "spacing", text: "" });
        break;
      default: break;
    }
  }
}

// ─── TABLE RENDERING ───────────────────────────────────────
function drawTable(ctx: RenderContext, rows: string[][]): void {
  if (!rows.length) return;
  const pc = ctx.primaryColor;
  const colCount = Math.max(...rows.map(r => r.length));
  const colWidth = ctx.maxWidth / colCount;
  const cellPadding = 4;
  const cellFontSize = 8;
  const rowHeight = 18;

  for (let ri = 0; ri < rows.length; ri++) {
    ensureSpace(ctx, rowHeight + 4);
    const isHeader = ri === 0;
    const rowY = ctx.y;

    // Row background
    if (isHeader) {
      ctx.page.drawRectangle({
        x: MARGIN,
        y: rowY - rowHeight + 4,
        width: ctx.maxWidth,
        height: rowHeight,
        color: rgb(pc.r, pc.g, pc.b),
        opacity: 0.12,
      });
    } else if (ri % 2 === 0) {
      ctx.page.drawRectangle({
        x: MARGIN,
        y: rowY - rowHeight + 4,
        width: ctx.maxWidth,
        height: rowHeight,
        color: rgb(0.96, 0.96, 0.96),
      });
    }

    // Cell borders (bottom)
    ctx.page.drawLine({
      start: { x: MARGIN, y: rowY - rowHeight + 4 },
      end: { x: MARGIN + ctx.maxWidth, y: rowY - rowHeight + 4 },
      thickness: 0.3,
      color: rgb(0.8, 0.8, 0.8),
    });

    // Cell text
    const row = rows[ri];
    for (let ci = 0; ci < colCount; ci++) {
      const cellText = (row[ci] || "").substring(0, 60);
      const f = isHeader ? ctx.boldFont : ctx.font;
      const textColor = isHeader ? rgb(pc.r, pc.g, pc.b) : rgb(0.15, 0.15, 0.15);
      ctx.page.drawText(cellText, {
        x: MARGIN + ci * colWidth + cellPadding,
        y: rowY - 10,
        font: f,
        size: cellFontSize,
        color: textColor,
      });
    }

    ctx.y -= rowHeight;
  }
  ctx.y -= 6;
}

// ─── SIGNATURE BLOCK ──────────────────────────────────────
function drawSignatureBlock(ctx: RenderContext, label: string, lines: string[]): void {
  const blockHeight = 80 + lines.length * 12;
  ensureSpace(ctx, blockHeight);
  const pc = ctx.primaryColor;

  ctx.y -= 10;

  // Signature line
  const lineWidth = 200;
  const centerX = MARGIN + ctx.maxWidth / 2;
  ctx.page.drawLine({
    start: { x: centerX - lineWidth / 2, y: ctx.y },
    end: { x: centerX + lineWidth / 2, y: ctx.y },
    thickness: 0.8,
    color: rgb(0.3, 0.3, 0.3),
  });
  ctx.y -= 14;

  // Label (centered, bold)
  const labelW = ctx.boldFont.widthOfTextAtSize(label, 10);
  ctx.page.drawText(label, {
    x: centerX - labelW / 2,
    y: ctx.y,
    font: ctx.boldFont,
    size: 10,
    color: rgb(pc.r, pc.g, pc.b),
  });
  ctx.y -= 14;

  // Detail lines
  for (const line of lines) {
    const lineW = ctx.font.widthOfTextAtSize(line, 8);
    ctx.page.drawText(line, {
      x: centerX - lineW / 2,
      y: ctx.y,
      font: ctx.font,
      size: 8,
      color: rgb(0.35, 0.35, 0.35),
    });
    ctx.y -= 12;
  }

  ctx.y -= 10;
}

// ─── CERTIFICATE PAGE ──────────────────────────────────────
function drawCertificatePage(ctx: RenderContext, certData: PdfCertificateData): void {
  newPage(ctx);
  const pc = ctx.primaryColor;

  // Title
  ctx.y -= 10;
  drawWrappedText(ctx, "CERTIFICADO DE ASSINATURA DIGITAL", HEADING1_SIZE, true, 0, "", "center", pc);
  ctx.y -= 6;

  // Subtle separator
  const centerX = A4_WIDTH / 2;
  ctx.page.drawLine({
    start: { x: centerX - 80, y: ctx.y },
    end: { x: centerX + 80, y: ctx.y },
    thickness: 1,
    color: rgb(pc.r, pc.g, pc.b),
  });
  ctx.y -= 20;

  // Document info box
  if (certData.validationCode || certData.documentHash) {
    const boxY = ctx.y;
    const boxH = 50;
    ctx.page.drawRectangle({
      x: MARGIN,
      y: boxY - boxH,
      width: ctx.maxWidth,
      height: boxH,
      color: rgb(pc.r, pc.g, pc.b),
      opacity: 0.06,
      borderColor: rgb(pc.r, pc.g, pc.b),
      borderWidth: 0.5,
    });

    let innerY = boxY - 14;
    if (certData.validationCode) {
      ctx.page.drawText(`Código de Validação: ${certData.validationCode}`, {
        x: MARGIN + 10,
        y: innerY,
        font: ctx.boldFont,
        size: 9,
        color: rgb(pc.r, pc.g, pc.b),
      });
      innerY -= 14;
    }
    if (certData.documentHash) {
      ctx.page.drawText(`Hash SHA-256: ${certData.documentHash.substring(0, 64)}`, {
        x: MARGIN + 10,
        y: innerY,
        font: ctx.font,
        size: 7,
        color: rgb(0.35, 0.35, 0.35),
      });
    }
    ctx.y -= boxH + 16;
  }

  // Signers
  if (certData.signers?.length) {
    drawWrappedText(ctx, "Signatários", HEADING2_SIZE, true, 0, "", "left", pc);
    ctx.y -= 6;

    for (const signer of certData.signers) {
      ensureSpace(ctx, 80);

      // Signer card
      const cardH = 60;
      ctx.page.drawRectangle({
        x: MARGIN,
        y: ctx.y - cardH,
        width: ctx.maxWidth,
        height: cardH,
        color: rgb(0.97, 0.97, 0.97),
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 0.4,
      });

      let cardY = ctx.y - 14;
      ctx.page.drawText(signer.name, {
        x: MARGIN + 10,
        y: cardY,
        font: ctx.boldFont,
        size: 10,
        color: rgb(0.1, 0.1, 0.1),
      });

      if (signer.role) {
        const roleW = ctx.font.widthOfTextAtSize(signer.role, 8);
        ctx.page.drawText(signer.role, {
          x: A4_WIDTH - MARGIN - 10 - roleW,
          y: cardY,
          font: ctx.italicFont,
          size: 8,
          color: rgb(pc.r, pc.g, pc.b),
        });
      }

      cardY -= 14;
      const details: string[] = [];
      if (signer.document) details.push(`Doc: ${signer.document}`);
      if (signer.signedAt) details.push(`Assinado: ${signer.signedAt}`);
      if (signer.ip) details.push(`IP: ${signer.ip}`);

      ctx.page.drawText(details.join("  •  "), {
        x: MARGIN + 10,
        y: cardY,
        font: ctx.font,
        size: 8,
        color: rgb(0.4, 0.4, 0.4),
      });

      cardY -= 13;
      if (signer.location) {
        ctx.page.drawText(`Local: ${signer.location}`, {
          x: MARGIN + 10,
          y: cardY,
          font: ctx.font,
          size: 7,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      ctx.y -= cardH + 8;
    }
  }

  // QR code placeholder
  ctx.y -= 10;
  if (certData.validationUrl || certData.validationCode) {
    ensureSpace(ctx, 60);
    const qrBoxSize = 50;
    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.y - qrBoxSize,
      width: qrBoxSize,
      height: qrBoxSize,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 0.5,
      color: rgb(0.98, 0.98, 0.98),
    });
    ctx.page.drawText("QR", {
      x: MARGIN + 18,
      y: ctx.y - 30,
      font: ctx.boldFont,
      size: 12,
      color: rgb(0.7, 0.7, 0.7),
    });

    const valUrl = certData.validationUrl || `Código: ${certData.validationCode}`;
    ctx.page.drawText("Verifique a autenticidade deste documento:", {
      x: MARGIN + qrBoxSize + 10,
      y: ctx.y - 15,
      font: ctx.font,
      size: 8,
      color: rgb(0.3, 0.3, 0.3),
    });
    ctx.page.drawText(valUrl, {
      x: MARGIN + qrBoxSize + 10,
      y: ctx.y - 28,
      font: ctx.boldFont,
      size: 8,
      color: rgb(pc.r, pc.g, pc.b),
    });
    ctx.y -= qrBoxSize + 10;
  }

  // Disclaimer
  ctx.y -= 10;
  drawWrappedText(
    ctx,
    "Este documento foi assinado digitalmente através da plataforma Accord. A integridade do conteúdo pode ser verificada através do código de validação acima.",
    7, false, 0, "", "center",
    { r: 0.5, g: 0.5, b: 0.5 },
  );
}

// ─── LOGO EMBED ────────────────────────────────────────────
async function embedLogoIfAvailable(
  pdfDoc: PDFDocument,
  logoUrl: string,
): Promise<{ image: any; width: number; height: number } | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let image;
    if (logoUrl.toLowerCase().includes(".png") || logoUrl.toLowerCase().includes("image/png")) {
      image = await pdfDoc.embedPng(bytes);
    } else {
      image = await pdfDoc.embedJpg(bytes);
    }
    const maxW = 120;
    const maxH = 40;
    const scale = Math.min(maxW / image.width, maxH / image.height, 1);
    return { image, width: image.width * scale, height: image.height * scale };
  } catch {
    return null;
  }
}

// ─── MAIN EXPORT ───────────────────────────────────────────
export async function renderGeneratedDocumentPdf(
  title: string,
  htmlContent: string,
  branding?: PdfBrandingOptions,
  certificate?: PdfCertificateData,
) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const maxWidth = A4_WIDTH - MARGIN * 2;
  const pc = branding?.primaryColor ? hexToRgb(branding.primaryColor) : { r: 0.12, g: 0.16, b: 0.32 };

  const now = new Date();
  const generatedAt = now.toLocaleDateString("pt-BR") + " " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  let logoEmbed: Awaited<ReturnType<typeof embedLogoIfAvailable>> = null;
  if (branding?.logoUrl) {
    logoEmbed = await embedLogoIfAvailable(pdfDoc, branding.logoUrl);
  }

  const ctx: RenderContext = {
    pdfDoc, font, boldFont, italicFont,
    page: pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]),
    y: A4_HEIGHT - MARGIN - HEADER_ZONE,
    maxWidth,
    pageNumber: 1,
    totalPages: 0,
    primaryColor: pc,
    branding,
    logoEmbed,
    generatedAt,
  };

  // Draw header/footer on first page
  drawHeader(ctx);
  drawFooter(ctx);

  // Document title (centered, branded)
  ctx.y -= 4;
  drawWrappedText(ctx, title.substring(0, 120), HEADING1_SIZE, true, 0, "", "center", pc);
  ctx.y -= 4;

  // Thin separator under title
  ctx.page.drawLine({
    start: { x: MARGIN + 60, y: ctx.y },
    end: { x: A4_WIDTH - MARGIN - 60, y: ctx.y },
    thickness: 0.5,
    color: rgb(0.75, 0.75, 0.75),
  });
  ctx.y -= 16;

  // ─── BODY ──────────────────────────────────────────────
  const blocks = processHtmlBlocks(htmlContent);

  for (const block of blocks) {
    switch (block.type) {
      case "heading1":
        ensureSpace(ctx, HEADING1_SIZE * 2);
        ctx.y -= 6;
        drawWrappedText(ctx, block.text, HEADING1_SIZE, true, 0, "", block.align || "left", pc);
        ctx.y -= 4;
        break;
      case "heading2":
        ensureSpace(ctx, HEADING2_SIZE * 2);
        ctx.y -= 4;
        drawWrappedText(ctx, block.text, HEADING2_SIZE, true, 0, "", block.align || "left", pc);
        ctx.y -= 3;
        break;
      case "heading3":
        ensureSpace(ctx, HEADING3_SIZE * 2);
        ctx.y -= 3;
        drawWrappedText(ctx, block.text, HEADING3_SIZE, true, 0, "", block.align || "left");
        ctx.y -= 2;
        break;
      case "paragraph":
        drawWrappedText(ctx, block.text, FONT_SIZE, !!block.bold, 0, "", block.align || "left");
        ctx.y -= 3;
        break;
      case "listItem":
        drawWrappedText(ctx, block.text, FONT_SIZE, !!block.bold, 16, "• ", block.align || "left");
        break;
      case "orderedItem":
        drawWrappedText(ctx, block.text, FONT_SIZE, !!block.bold, 16, `${block.index}. `, block.align || "left");
        break;
      case "table":
        if (block.rows) drawTable(ctx, block.rows);
        break;
      case "hr":
        ensureSpace(ctx, 12);
        ctx.y -= 4;
        ctx.page.drawLine({
          start: { x: MARGIN, y: ctx.y },
          end: { x: A4_WIDTH - MARGIN, y: ctx.y },
          thickness: 0.5,
          color: rgb(pc.r, pc.g, pc.b),
        });
        ctx.y -= 8;
        break;
      case "spacing":
        ctx.y -= FONT_SIZE * 0.7;
        break;
    }
  }

  // ─── CERTIFICATE PAGE ─────────────────────────────────
  if (certificate) {
    drawCertificatePage(ctx, certificate);
  }

  return pdfDoc.save();
}

// ─── HELPER: Build signature blocks in HTML (for template editor) ────
export function buildSignatureBlockHtml(label: string, fields: string[]): string {
  return `
    <div style="text-align:center; margin-top:40px;">
      <hr style="width:200px; margin:auto; border:none; border-top:1px solid #333;" />
      <p style="margin-top:4px;"><strong>${label}</strong></p>
      ${fields.map(f => `<p style="font-size:9px; color:#666;">${f}</p>`).join("")}
    </div>
  `;
}
