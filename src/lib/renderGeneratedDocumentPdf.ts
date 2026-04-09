import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const MARGIN = 50;
const FONT_SIZE = 10;
const HEADING1_SIZE = 16;
const HEADING2_SIZE = 14;
const HEADING3_SIZE = 12;
const LINE_HEIGHT_FACTOR = 1.5;

export interface PdfBrandingOptions {
  logoUrl?: string;
  primaryColor?: string;
  tenantName?: string;
  tenantCnpj?: string;
  footerText?: string;
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
  primaryColor: { r: number; g: number; b: number };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return { r: ((num >> 16) & 255) / 255, g: ((num >> 8) & 255) / 255, b: (num & 255) / 255 };
}

function newPage(ctx: RenderContext, branding?: PdfBrandingOptions): void {
  ctx.page = ctx.pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  ctx.y = A4_HEIGHT - MARGIN;
  ctx.pageNumber++;

  // Draw footer on each page
  const footerY = 25;
  const footerText = branding?.footerText || branding?.tenantName || "";
  if (footerText) {
    ctx.page.drawText(footerText, {
      x: MARGIN,
      y: footerY,
      font: ctx.italicFont,
      size: 7,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
  // Page number
  const pageStr = `Página ${ctx.pageNumber}`;
  const pageW = ctx.italicFont.widthOfTextAtSize(pageStr, 7);
  ctx.page.drawText(pageStr, {
    x: A4_WIDTH - MARGIN - pageW,
    y: footerY,
    font: ctx.italicFont,
    size: 7,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Footer line
  ctx.page.drawLine({
    start: { x: MARGIN, y: footerY + 10 },
    end: { x: A4_WIDTH - MARGIN, y: footerY + 10 },
    thickness: 0.3,
    color: rgb(0.8, 0.8, 0.8),
  });
}

function ensureSpace(ctx: RenderContext, needed: number, branding?: PdfBrandingOptions): void {
  if (ctx.y - needed < MARGIN + 20) {
    newPage(ctx, branding);
  }
}

function drawWrappedText(
  ctx: RenderContext,
  text: string,
  fontSize: number,
  useBold: boolean,
  indent: number = 0,
  bulletPrefix: string = "",
  align: "left" | "center" | "right" | "justify" = "left",
  branding?: PdfBrandingOptions,
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
    ensureSpace(ctx, lineHeight, branding);
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

function processHtmlBlocks(html: string): Array<{
  type: "heading1" | "heading2" | "heading3" | "paragraph" | "listItem" | "orderedItem" | "hr" | "spacing";
  text: string;
  bold?: boolean;
  align?: "left" | "center" | "right" | "justify";
  index?: number;
}> {
  const blocks: ReturnType<typeof processHtmlBlocks> = [];

  let cleaned = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const blockRegex = /<(h[1-3]|p|li|hr|ul|ol|\/ul|\/ol|table|\/table|tr|\/tr|td|th|\/td|\/th|br)\b([^>]*)>/gi;
  let match;
  let orderedCounter = 0;
  let inOrderedList = false;

  const segments: Array<{ tag: string; attrs: string; content: string }> = [];
  const boundaries: Array<{ tag: string; attrs: string; pos: number }> = [];
  while ((match = blockRegex.exec(cleaned)) !== null) {
    boundaries.push({ tag: match[1].toLowerCase(), attrs: match[2], pos: match.index });
  }

  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    const tagEnd = cleaned.indexOf(">", b.pos) + 1;
    const nextPos = i + 1 < boundaries.length ? boundaries[i + 1].pos : cleaned.length;
    const content = cleaned.slice(tagEnd, nextPos);
    segments.push({ tag: b.tag, attrs: b.attrs, content });
  }

  if (segments.length === 0 && cleaned.trim()) {
    blocks.push({ type: "paragraph", text: stripTags(cleaned), align: "left" });
    return blocks;
  }

  for (const seg of segments) {
    const align = getAlignment(seg.attrs);
    const text = stripTags(seg.content);
    const isBold = /<(strong|b)\b/i.test(seg.content);

    switch (seg.tag) {
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
      case "td": case "th":
        if (text) blocks.push({ type: "paragraph", text, bold: seg.tag === "th" || isBold, align });
        break;
      default: break;
    }
  }

  return blocks;
}

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
    const maxH = 50;
    const scale = Math.min(maxW / image.width, maxH / image.height, 1);
    return { image, width: image.width * scale, height: image.height * scale };
  } catch {
    return null;
  }
}

export async function renderGeneratedDocumentPdf(
  title: string,
  htmlContent: string,
  branding?: PdfBrandingOptions,
) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const maxWidth = A4_WIDTH - MARGIN * 2;

  const pc = branding?.primaryColor ? hexToRgb(branding.primaryColor) : { r: 0.12, g: 0.16, b: 0.32 };

  const ctx: RenderContext = {
    pdfDoc, font, boldFont, italicFont,
    page: pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]),
    y: A4_HEIGHT - MARGIN,
    maxWidth,
    pageNumber: 1,
    primaryColor: pc,
  };

  // Footer on first page
  const footerY = 25;
  const footerText = branding?.footerText || branding?.tenantName || "";
  if (footerText) {
    ctx.page.drawText(footerText, { x: MARGIN, y: footerY, font: italicFont, size: 7, color: rgb(0.5, 0.5, 0.5) });
  }
  ctx.page.drawText("Página 1", {
    x: A4_WIDTH - MARGIN - italicFont.widthOfTextAtSize("Página 1", 7),
    y: footerY, font: italicFont, size: 7, color: rgb(0.5, 0.5, 0.5),
  });
  ctx.page.drawLine({
    start: { x: MARGIN, y: footerY + 10 }, end: { x: A4_WIDTH - MARGIN, y: footerY + 10 },
    thickness: 0.3, color: rgb(0.8, 0.8, 0.8),
  });

  // --- HEADER WITH LOGO ---
  let logoEmbed: Awaited<ReturnType<typeof embedLogoIfAvailable>> = null;
  if (branding?.logoUrl) {
    logoEmbed = await embedLogoIfAvailable(pdfDoc, branding.logoUrl);
  }

  if (logoEmbed) {
    const logoX = (A4_WIDTH - logoEmbed.width) / 2;
    ctx.page.drawImage(logoEmbed.image, {
      x: logoX,
      y: ctx.y - logoEmbed.height,
      width: logoEmbed.width,
      height: logoEmbed.height,
    });
    ctx.y -= logoEmbed.height + 12;
  }

  // Branded line under header
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: A4_WIDTH - MARGIN, y: ctx.y },
    thickness: 1.5,
    color: rgb(pc.r, pc.g, pc.b),
  });
  ctx.y -= 16;

  // Document title
  drawWrappedText(ctx, title.substring(0, 120), HEADING1_SIZE, true, 0, "", "center", branding, pc);
  ctx.y -= 8;

  // Thin separator
  ctx.page.drawLine({
    start: { x: MARGIN + 60, y: ctx.y },
    end: { x: A4_WIDTH - MARGIN - 60, y: ctx.y },
    thickness: 0.5,
    color: rgb(0.75, 0.75, 0.75),
  });
  ctx.y -= 16;

  // --- BODY ---
  const blocks = processHtmlBlocks(htmlContent);

  for (const block of blocks) {
    switch (block.type) {
      case "heading1":
        ensureSpace(ctx, HEADING1_SIZE * 2, branding);
        ctx.y -= 6;
        drawWrappedText(ctx, block.text, HEADING1_SIZE, true, 0, "", block.align || "left", branding, pc);
        ctx.y -= 4;
        break;
      case "heading2":
        ensureSpace(ctx, HEADING2_SIZE * 2, branding);
        ctx.y -= 4;
        drawWrappedText(ctx, block.text, HEADING2_SIZE, true, 0, "", block.align || "left", branding, pc);
        ctx.y -= 3;
        break;
      case "heading3":
        ensureSpace(ctx, HEADING3_SIZE * 2, branding);
        ctx.y -= 3;
        drawWrappedText(ctx, block.text, HEADING3_SIZE, true, 0, "", block.align || "left", branding);
        ctx.y -= 2;
        break;
      case "paragraph":
        drawWrappedText(ctx, block.text, FONT_SIZE, !!block.bold, 0, "", block.align || "left", branding);
        ctx.y -= 3;
        break;
      case "listItem":
        drawWrappedText(ctx, block.text, FONT_SIZE, !!block.bold, 16, "• ", block.align || "left", branding);
        break;
      case "orderedItem":
        drawWrappedText(ctx, block.text, FONT_SIZE, !!block.bold, 16, `${block.index}. `, block.align || "left", branding);
        break;
      case "hr":
        ensureSpace(ctx, 12, branding);
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

  return pdfDoc.save();
}
