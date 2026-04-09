import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const MARGIN = 50;
const FONT_SIZE = 10;
const HEADING1_SIZE = 16;
const HEADING2_SIZE = 14;
const HEADING3_SIZE = 12;
const LINE_HEIGHT_FACTOR = 1.5;

interface RenderContext {
  pdfDoc: PDFDocument;
  font: PDFFont;
  boldFont: PDFFont;
  page: PDFPage;
  y: number;
  maxWidth: number;
}

function newPage(ctx: RenderContext): void {
  ctx.page = ctx.pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  ctx.y = A4_HEIGHT - MARGIN;
}

function ensureSpace(ctx: RenderContext, needed: number): void {
  if (ctx.y - needed < MARGIN) {
    newPage(ctx);
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
      color: rgb(0.1, 0.1, 0.1),
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

  // Normalize
  let cleaned = html
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Split by block-level tags
  const blockRegex = /<(h[1-3]|p|li|hr|ul|ol|\/ul|\/ol|table|\/table|tr|\/tr|td|th|\/td|\/th|br)\b([^>]*)>/gi;
  let lastIndex = 0;
  let match;
  let orderedCounter = 0;
  let inOrderedList = false;

  const segments: Array<{ tag: string; attrs: string; content: string }> = [];

  // Collect all block boundaries
  const boundaries: Array<{ tag: string; attrs: string; pos: number }> = [];
  while ((match = blockRegex.exec(cleaned)) !== null) {
    boundaries.push({ tag: match[1].toLowerCase(), attrs: match[2], pos: match.index });
  }

  // Extract segments between boundaries
  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    const tagEnd = cleaned.indexOf(">", b.pos) + 1;
    const nextPos = i + 1 < boundaries.length ? boundaries[i + 1].pos : cleaned.length;
    const content = cleaned.slice(tagEnd, nextPos);
    segments.push({ tag: b.tag, attrs: b.attrs, content });
  }

  // If no block tags found, treat entire content as a paragraph
  if (segments.length === 0 && cleaned.trim()) {
    blocks.push({ type: "paragraph", text: stripTags(cleaned), align: "left" });
    return blocks;
  }

  for (const seg of segments) {
    const align = getAlignment(seg.attrs);
    const text = stripTags(seg.content);
    const isBold = /<(strong|b)\b/i.test(seg.content);

    switch (seg.tag) {
      case "h1":
        blocks.push({ type: "heading1", text, align });
        break;
      case "h2":
        blocks.push({ type: "heading2", text, align });
        break;
      case "h3":
        blocks.push({ type: "heading3", text, align });
        break;
      case "hr":
        blocks.push({ type: "hr", text: "" });
        break;
      case "ol":
        inOrderedList = true;
        orderedCounter = 0;
        break;
      case "/ol":
        inOrderedList = false;
        break;
      case "ul":
      case "/ul":
        break;
      case "li":
        if (inOrderedList) {
          orderedCounter++;
          blocks.push({ type: "orderedItem", text, index: orderedCounter, bold: isBold, align });
        } else {
          blocks.push({ type: "listItem", text, bold: isBold, align });
        }
        break;
      case "br":
        blocks.push({ type: "spacing", text: "" });
        break;
      case "p":
        if (text) {
          blocks.push({ type: "paragraph", text, bold: isBold, align });
        } else {
          blocks.push({ type: "spacing", text: "" });
        }
        break;
      case "td":
      case "th":
        if (text) {
          blocks.push({ type: "paragraph", text, bold: seg.tag === "th" || isBold, align });
        }
        break;
      default:
        break;
    }
  }

  return blocks;
}

export async function renderGeneratedDocumentPdf(title: string, htmlContent: string) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const maxWidth = A4_WIDTH - MARGIN * 2;

  const ctx: RenderContext = {
    pdfDoc,
    font,
    boldFont,
    page: pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]),
    y: A4_HEIGHT - MARGIN,
    maxWidth,
  };

  // Draw title
  drawWrappedText(ctx, title.substring(0, 120), HEADING1_SIZE, true, 0, "", "left");
  ctx.y -= 8;

  // Draw a title separator
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: A4_WIDTH - MARGIN, y: ctx.y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  ctx.y -= 16;

  const blocks = processHtmlBlocks(htmlContent);

  for (const block of blocks) {
    switch (block.type) {
      case "heading1":
        ensureSpace(ctx, HEADING1_SIZE * 2);
        ctx.y -= 6;
        drawWrappedText(ctx, block.text, HEADING1_SIZE, true, 0, "", block.align || "left");
        ctx.y -= 4;
        break;

      case "heading2":
        ensureSpace(ctx, HEADING2_SIZE * 2);
        ctx.y -= 4;
        drawWrappedText(ctx, block.text, HEADING2_SIZE, true, 0, "", block.align || "left");
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

      case "hr":
        ensureSpace(ctx, 12);
        ctx.y -= 4;
        ctx.page.drawLine({
          start: { x: MARGIN, y: ctx.y },
          end: { x: A4_WIDTH - MARGIN, y: ctx.y },
          thickness: 0.5,
          color: rgb(0.75, 0.75, 0.75),
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
