import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const MARGIN = 50;
const FONT_SIZE = 10;
const TITLE_FONT_SIZE = 14;

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function renderGeneratedDocumentPdf(title: string, htmlContent: string) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const lineHeight = FONT_SIZE * 1.4;
  const maxWidth = A4_WIDTH - MARGIN * 2;
  const contentBottom = MARGIN;
  const plainText = stripHtml(htmlContent);

  const wrappedLines: string[] = [];
  for (const paragraph of plainText.split("\n")) {
    if (paragraph.trim() === "") {
      wrappedLines.push("");
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, FONT_SIZE);

      if (testWidth > maxWidth && currentLine) {
        wrappedLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) wrappedLines.push(currentLine);
  }

  let page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = A4_HEIGHT - MARGIN;

  page.drawText(title.substring(0, 80), {
    x: MARGIN,
    y,
    font: boldFont,
    size: TITLE_FONT_SIZE,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= TITLE_FONT_SIZE * 2;

  for (const line of wrappedLines) {
    if (y < contentBottom + lineHeight) {
      page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      y = A4_HEIGHT - MARGIN;
    }

    if (line.trim() === "") {
      y -= lineHeight * 0.5;
      continue;
    }

    page.drawText(line, {
      x: MARGIN,
      y,
      font,
      size: FONT_SIZE,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= lineHeight;
  }

  return pdfDoc.save();
}
