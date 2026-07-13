import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAPEL_VAR_MAP: Record<string, string> = {
  cliente: "cliente",
  proprietario_proposta: "vendedor",
  vendedor: "vendedor",
  signatario: "cliente",
  testemunha: "cliente",
};

function fmtDateBR(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtTimeBR(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}
function fmtDateTimeBR(iso: string) {
  const d = new Date(iso);
  return `${fmtDateBR(d)} ${fmtTimeBR(d)}`;
}
function maskEmail(e: string | null) {
  if (!e || !e.includes("@")) return e || "--";
  const [user, domain] = e.split("@");
  return user.slice(0, 2) + "***@" + domain;
}
function maskDoc(d: string | null) {
  if (!d) return "--";
  const clean = d.replace(/\D/g, "");
  if (clean.length <= 4) return "***";
  return "***." + clean.slice(-4);
}
function maskIp(ip: string | null) {
  if (!ip) return "--";
  const parts = ip.split(".");
  if (parts.length === 4) return parts[0] + ".xxx.xxx." + parts[3];
  return ip;
}

const PAPEL_LABELS: Record<string, string> = {
  proprietario_proposta: "Representante da Empresa",
  cliente: "Cliente",
  vendedor: "Vendedor",
  signatario: "Signatario",
  testemunha: "Testemunha",
};

const EVENT_LABELS: Record<string, string> = {
  documento_gerado: "Documento Gerado",
  envelope_configurado: "Envelope Configurado",
  link_gerado: "Link de Assinatura Gerado",
  link_acessado: "Link Acessado pelo Signatario",
  validacao_iniciada: "Validacao de Identidade Iniciada",
  codigo_enviado: "Codigo de Confirmacao Enviado",
  codigo_confirmado: "Codigo Confirmado com Sucesso",
  assinatura_vendedor_concluida: "Assinatura do Vendedor Concluida",
  assinatura_cliente_concluida: "Assinatura do Cliente Concluida",
  documento_assinado_finalizado: "Documento Finalizado com Todas as Assinaturas",
  documento_validacao_gerada: "Certificado de Validacao Gerado",
  assinatura_recusada: "Assinatura Recusada",
};

// ─── Hex to pdf-lib rgb ───
function hexToRgb(hex: string | null): { r: number; g: number; b: number } | null {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  };
}

function darkenRgb(c: { r: number; g: number; b: number }, amount: number) {
  return { r: Math.max(0, c.r - amount), g: Math.max(0, c.g - amount), b: Math.max(0, c.b - amount) };
}
function lightenRgb(c: { r: number; g: number; b: number }, amount: number) {
  return { r: Math.min(1, c.r + amount), g: Math.min(1, c.g + amount), b: Math.min(1, c.b + amount) };
}

// ─── Tenant brand palette ───
interface BrandPalette {
  primary: ReturnType<typeof rgb>;
  secondary: ReturnType<typeof rgb>;
  accent: ReturnType<typeof rgb>;
  darkBg: ReturnType<typeof rgb>;
  cardBg: ReturnType<typeof rgb>;
  coverAccentBar: ReturnType<typeof rgb>;
  green: ReturnType<typeof rgb>;
  white: ReturnType<typeof rgb>;
  lightGray: ReturnType<typeof rgb>;
  midGray: ReturnType<typeof rgb>;
  dimLine: ReturnType<typeof rgb>;
  tenantName: string;
  hasLogo: boolean;
}

function buildPalette(tenant: any): BrandPalette {
  const pRgb = hexToRgb(tenant?.brand_primary_color);
  const sRgb = hexToRgb(tenant?.brand_secondary_color);
  const aRgb = hexToRgb(tenant?.brand_accent_color);

  // Default Accord palette
  const defaultPrimary = { r: 0.486, g: 0.227, b: 0.929 }; // #7C3AED
  const defaultSecondary = { r: 0.145, g: 0.388, b: 0.922 }; // #2563EB

  const primary = pRgb || defaultPrimary;
  const secondary = sRgb || (pRgb ? lightenRgb(primary, 0.15) : defaultSecondary);
  const accent = aRgb || secondary;

  // White/professional background — printable, archive-friendly
  const clampedDarkBg = { r: 1, g: 1, b: 1 };
  const cardBgC = { r: 0.97, g: 0.97, b: 0.98 };

  const tenantName = tenant?.nome_fantasia || tenant?.razao_social || "Accord";
  const hasLogo = !!(tenant?.brand_logo_url);

  return {
    primary: rgb(primary.r, primary.g, primary.b),
    secondary: rgb(secondary.r, secondary.g, secondary.b),
    accent: rgb(accent.r, accent.g, accent.b),
    darkBg: rgb(clampedDarkBg.r, clampedDarkBg.g, clampedDarkBg.b),
    cardBg: rgb(cardBgC.r, cardBgC.g, cardBgC.b),
    coverAccentBar: rgb(primary.r, primary.g, primary.b),
    green: rgb(0.04, 0.55, 0.35),
    white: rgb(0.10, 0.12, 0.16),       // now used as "primary text" — dark
    lightGray: rgb(0.42, 0.45, 0.50),    // secondary text
    midGray: rgb(0.25, 0.28, 0.33),      // emphasized text
    dimLine: rgb(0.85, 0.87, 0.90),      // borders / separators
    tenantName,
    hasLogo,
  };
}


const W = 595.28;
const H = 841.89;
const M = 50;
const CW = W - M * 2;

function drawRect(page: any, x: number, y: number, w: number, h: number, color: any) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

function drawLine(page: any, y: number, color: any, thickness = 0.5) {
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness, color });
}

function centerText(page: any, text: string, y: number, font: any, size: number, color: any) {
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (W - tw) / 2, y, size, font, color });
}

function drawWrapped(page: any, text: string, x: number, y: number, font: any, size: number, maxW: number, color: any, lineH = 0): number {
  const gap = lineH || size + 4;
  const words = String(text || "").split(/\s+/);
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(test, size) > maxW && line) {
      page.drawText(line, { x, y: cy, size, font, color });
      cy -= gap;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    page.drawText(line, { x, y: cy, size, font, color });
    cy -= gap;
  }
  return cy;
}

/**
 * drawWrappedText — quebra por palavra e trunca no fim da última palavra inteira
 * com reticências quando exceder maxLines. Retorna nova coordenada y.
 */
function drawWrappedText(
  page: any,
  text: string,
  opts: { x: number; y: number; maxWidth: number; font: any; size: number; lineHeight?: number; maxLines?: number; color: any },
): number {
  const { x, y, maxWidth, font, size, color } = opts;
  const lineHeight = opts.lineHeight || size + 3;
  const maxLines = opts.maxLines || 99;
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);

  // If we still have overflow words, truncate last line with ellipsis
  const totalConsumed = lines.join(" ").split(/\s+/).filter(Boolean).length;
  if (totalConsumed < words.length && lines.length > 0) {
    let last = lines[lines.length - 1];
    const ell = "…";
    while (last.length > 0 && font.widthOfTextAtSize(last + ell, size) > maxWidth) {
      const parts = last.split(" ");
      parts.pop();
      last = parts.join(" ");
      if (!last) break;
    }
    lines[lines.length - 1] = (last || "").trim() + ell;
  }

  let cy = y;
  for (const l of lines) {
    page.drawText(l, { x, y: cy, size, font, color });
    cy -= lineHeight;
  }
  return cy;
}

/** ICP-Brasil circular seal (restored) */
function drawIcpSeal(page: any, font: any, fontBold: any, cx: number, cy: number, r: number) {
  const green = rgb(0.04, 0.42, 0.27);
  const goldBg = rgb(0.98, 0.93, 0.78);
  page.drawCircle({ x: cx, y: cy, size: r, color: goldBg, borderColor: green, borderWidth: 1.5 });
  page.drawCircle({ x: cx, y: cy, size: r - 6, borderColor: green, borderWidth: 0.6, color: rgb(1, 1, 1) });
  page.drawCircle({ x: cx, y: cy, size: r - 14, color: green });
  const tw1 = fontBold.widthOfTextAtSize("ICP", 10);
  page.drawText("ICP", { x: cx - tw1 / 2, y: cy + 2, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  const tw2 = fontBold.widthOfTextAtSize("BRASIL", 7);
  page.drawText("BRASIL", { x: cx - tw2 / 2, y: cy - 8, size: 7, font: fontBold, color: rgb(1, 1, 1) });
  const lbl = "Selo ICP-Brasil";
  const lw = fontBold.widthOfTextAtSize(lbl, 6.5);
  page.drawText(lbl, { x: cx - lw / 2, y: cy - r - 8, size: 6.5, font: fontBold, color: green });
  const lbl2 = "Carimbo do Tempo";
  const lw2 = font.widthOfTextAtSize(lbl2, 5.5);
  page.drawText(lbl2, { x: cx - lw2 / 2, y: cy - r - 15, size: 5.5, font, color: rgb(0.3, 0.3, 0.3) });
}

// ─── Certificate Cover Page (White Label) ───
async function buildCoverPage(
  pdfDoc: any, font: any, fontBold: any,
  doc: any, validationCode: string, docHash: string, publicUrl: string,
  P: BrandPalette, logoImage: any | null,
) {
  const page = pdfDoc.addPage([W, H]);

  drawRect(page, 0, 0, W, H, P.darkBg);
  drawRect(page, 0, H - 6, W, 6, P.coverAccentBar);

  // ICP-Brasil seal top-right
  drawIcpSeal(page, font, fontBold, W - 70, H - 80, 28);

  let y = H - 60;

  if (logoImage) {
    const maxLogoH = 40;
    const maxLogoW = 160;
    const dims = logoImage.scale(1);
    const scale = Math.min(maxLogoW / dims.width, maxLogoH / dims.height, 1);
    const drawW = dims.width * scale;
    const drawH = dims.height * scale;
    page.drawImage(logoImage, { x: (W - drawW) / 2, y: y - drawH, width: drawW, height: drawH });
    y -= drawH + 12;
  } else {
    centerText(page, P.tenantName.toUpperCase(), y, fontBold, 13, P.primary);
    y -= 10;
    const badge = "Plataforma de Assinatura Eletrônica";
    const badgeW = font.widthOfTextAtSize(badge, 7);
    page.drawText(badge, { x: (W - badgeW) / 2, y, size: 7, font, color: P.midGray });
    y -= 20;
  }

  y -= 30;

  centerText(page, "CERTIFICADO DE ASSINATURA", y, fontBold, 22, P.white);
  y -= 28;
  centerText(page, "ELETRÔNICA", y, fontBold, 22, P.white);
  y -= 18;

  const lineW = 80;
  page.drawLine({ start: { x: (W - lineW) / 2, y }, end: { x: (W + lineW) / 2, y }, thickness: 2, color: P.primary });
  y -= 30;

  centerText(page, "Este documento certifica que o contrato foi assinado eletronicamente", y, font, 9, P.lightGray);
  y -= 14;
  centerText(page, "com registro completo de auditoria, rastreabilidade e validação.", y, font, 9, P.lightGray);
  y -= 50;

  // Document info card
  const cardH = 138;
  const cardX = M + 20;
  const cardW = CW - 40;
  drawRect(page, cardX, y - cardH, cardW, cardH, P.cardBg);
  drawRect(page, cardX, y, cardW, 2, P.primary);

  let cy = y - 22;
  const labelX = cardX + 20;
  const valueX = cardX + 160;
  const valueMaxW = cardX + cardW - valueX - 20;

  // Documento with wrapping
  page.drawText("Documento", { x: labelX, y: cy, size: 9, font, color: P.lightGray });
  drawWrappedText(page, doc.nome || "--", {
    x: valueX, y: cy, maxWidth: valueMaxW, font: fontBold, size: 9, lineHeight: 11, maxLines: 2, color: P.white,
  });
  cy -= 30;

  const tipo = (doc.tipo || "contrato").charAt(0).toUpperCase() + (doc.tipo || "contrato").slice(1);
  page.drawText("Tipo", { x: labelX, y: cy, size: 9, font, color: P.lightGray });
  page.drawText(tipo, { x: valueX, y: cy, size: 9, font: fontBold, color: P.white });
  cy -= 22;

  page.drawText("Status", { x: labelX, y: cy, size: 9, font, color: P.lightGray });
  page.drawText("ASSINADO", { x: valueX, y: cy, size: 9, font: fontBold, color: P.green });
  cy -= 22;

  page.drawText("Data da Assinatura", { x: labelX, y: cy, size: 9, font, color: P.lightGray });
  page.drawText(doc.signed_at ? fmtDateTimeBR(doc.signed_at) : "--", { x: valueX, y: cy, size: 9, font: fontBold, color: P.white });

  y -= cardH + 40;

  // Validation block
  const valCardH = 150;
  drawRect(page, cardX, y - valCardH, cardW, valCardH, P.cardBg);
  drawRect(page, cardX, y, cardW, 2, P.secondary);

  cy = y - 18;
  page.drawText("VALIDAÇÃO E INTEGRIDADE", { x: labelX, y: cy, size: 10, font: fontBold, color: P.secondary });
  cy -= 24;

  const valRows: [string, string][] = [
    ["Código de Validação", validationCode],
    ["Hash SHA-256", docHash.slice(0, 40) + "..."],
    ["Verificação Pública", publicUrl],
  ];

  for (const [label, value] of valRows) {
    page.drawText(label, { x: labelX, y: cy, size: 8, font, color: P.lightGray });
    cy -= 13;
    drawWrappedText(page, value, {
      x: labelX, y: cy, maxWidth: cardW - 40, font: fontBold, size: 7.5, lineHeight: 10, maxLines: 1, color: P.white,
    });
    cy -= 20;
  }

  y -= valCardH + 50;

  drawLine(page, y, P.dimLine, 0.5);
  y -= 16;
  centerText(page, "Este certificado comprova a autenticidade e integridade", y, font, 7.5, P.midGray);
  y -= 12;
  centerText(page, "do documento assinado eletronicamente.", y, font, 7.5, P.midGray);
  y -= 14;
  const footerTenant = P.tenantName !== "Accord" ? `Emitido via ${P.tenantName} em tecnologia Accord` : `Certificado gerado em ${fmtDateTimeBR(new Date().toISOString())}`;
  centerText(page, footerTenant, y, font, 7, P.midGray);
}

// ─── Audit Pages (Certo Sign-inspired layout) ───
async function buildAuditPages(
  pdfDoc: any, font: any, fontBold: any,
  doc: any, signersList: any[], events: any[],
  validationCode: string, docHash: string, publicUrl: string,
  P: BrandPalette, tenantData: any,
  sb: any,
) {
  function extractSignaturesPath(url: string): string | null {
    if (!url) return null;
    try {
      const clean = url.split("?")[0];
      const markers = ["/object/sign/signatures/", "/object/public/signatures/", "/object/signatures/"];
      for (const m of markers) {
        const idx = clean.indexOf(m);
        if (idx >= 0) return decodeURIComponent(clean.slice(idx + m.length));
      }
      // Fallback: any occurrence of "signatures/"
      const generic = clean.indexOf("signatures/");
      if (generic >= 0) return decodeURIComponent(clean.slice(generic + "signatures/".length));
      return null;
    } catch (e) {
      console.error("[dossier] extractSignaturesPath failed:", (e as any)?.message);
      return null;
    }
  }

  // Build a map signer_id -> selfie_url from document_events metadata_json (fallback)
  const eventSelfieMap: Record<string, string> = {};
  for (const ev of events || []) {
    try {
      const meta = typeof ev.metadata_json === "string" ? JSON.parse(ev.metadata_json) : ev.metadata_json;
      const url = meta?.selfie_url;
      if (url && ev.signer_id && !eventSelfieMap[ev.signer_id]) {
        eventSelfieMap[ev.signer_id] = url;
      }
    } catch (e) {
      // ignore parse
    }
  }

  // Pre-load selfies
  const signerSelfies: (any | null)[] = [];
  for (const s of signersList) {
    let selfieUrl: string | null = s?.selfie_url || null;
    if (!selfieUrl && s?.id && eventSelfieMap[s.id]) {
      selfieUrl = eventSelfieMap[s.id];
      console.log("[dossier] selfie recovered from events for signer", s.id);
    }
    if (!selfieUrl) {
      console.log("[dossier] no selfie for signer", s?.id, s?.nome_completo);
      signerSelfies.push(null);
      continue;
    }
    let buf: Uint8Array | null = null;
    const path = extractSignaturesPath(selfieUrl);
    if (path) {
      try {
        const { data: blob, error } = await sb.storage.from("signatures").download(path);
        if (error) console.error("[dossier] storage.download selfie error:", error.message, "path:", path);
        if (blob) buf = new Uint8Array(await blob.arrayBuffer());
      } catch (e) {
        console.error("[dossier] storage.download selfie threw:", (e as any)?.message, "path:", path);
      }
    } else {
      console.error("[dossier] could not extract signatures path from url:", selfieUrl);
    }
    if (!buf) {
      try {
        const r = await fetch(selfieUrl);
        if (r.ok) buf = new Uint8Array(await r.arrayBuffer());
        else console.error("[dossier] fetch selfie non-ok:", r.status, selfieUrl);
      } catch (e) {
        console.error("[dossier] fetch selfie threw:", (e as any)?.message);
      }
    }
    let img: any = null;
    if (buf) {
      try { img = await pdfDoc.embedJpg(buf); }
      catch (e1) {
        try { img = await pdfDoc.embedPng(buf); }
        catch (e2) {
          console.error("[dossier] embed selfie failed:", (e1 as any)?.message, "|", (e2 as any)?.message);
          img = null;
        }
      }
    }
    signerSelfies.push(img);
  }

  function newPage() {
    const p = pdfDoc.addPage([W, H]);
    drawRect(p, 0, 0, W, H, P.darkBg);
    drawRect(p, 0, H - 4, W, 4, P.coverAccentBar);
    return { page: p, y: H - 60 };
  }

  function drawPageTitle(page: any, title: string, subtitle: string, startY: number) {
    page.drawText(title, { x: M, y: startY, size: 15, font: fontBold, color: P.primary });
    page.drawLine({ start: { x: M, y: startY - 6 }, end: { x: M + 60, y: startY - 6 }, thickness: 2, color: P.primary });
    if (subtitle) {
      page.drawText(subtitle, { x: M, y: startY - 20, size: 8.5, font, color: P.lightGray });
      return startY - 44;
    }
    return startY - 30;
  }

  // ═══════════════ PÁGINA 1: REGISTRO DE ASSINATURAS DIGITAIS ═══════════════
  {
    let { page, y } = newPage();
    y = drawPageTitle(page, "REGISTRO DE ASSINATURAS DIGITAIS", "Detalhamento individual de cada signatário e prova de identidade capturada.", y);

    for (let i = 0; i < signersList.length; i++) {
      const s = signersList[i];
      const selfieImg = signerSelfies[i];
      const cardH = 170;

      if (y - cardH < 70) {
        const np = newPage(); page = np.page; y = np.y;
      }

      drawRect(page, M, y - cardH, CW, cardH, P.cardBg);
      const stripeColor = s.status === "signed" ? P.green : P.primary;
      drawRect(page, M, y - cardH, 4, cardH, stripeColor);

      const papelLabel = PAPEL_LABELS[s.papel] || s.papel || "Signatário";
      page.drawText(`${i + 1}. ${s.nome_completo || "--"}`, { x: M + 14, y: y - 16, size: 11, font: fontBold, color: P.white });
      page.drawText(papelLabel, { x: M + 14, y: y - 30, size: 8, font, color: P.lightGray });

      const statusText = s.status === "signed" ? "ASSINADO" : (s.status || "PENDENTE").toUpperCase();
      const statusColor = s.status === "signed" ? P.green : P.midGray;
      const stw = fontBold.widthOfTextAtSize(statusText, 8);
      page.drawText(statusText, { x: M + CW - stw - 14, y: y - 16, size: 8, font: fontBold, color: statusColor });

      // Selfie block on the right (always rendered — with placeholder text when missing)
      const ps = 82;
      const px = M + CW - ps - 14;
      const py = y - 44 - ps;
      drawRect(page, px - 2, py - 2, ps + 4, ps + 4, P.dimLine);
      if (selfieImg) {
        page.drawImage(selfieImg, { x: px, y: py, width: ps, height: ps });
      } else {
        drawRect(page, px, py, ps, ps, P.cardBg);
        const msg = "Selfie não capturada";
        const mw = font.widthOfTextAtSize(msg, 7);
        page.drawText(msg, { x: px + (ps - mw) / 2, y: py + ps / 2 - 2, size: 7, font, color: P.midGray });
      }
      const cap = "SELFIE CAPTURADA NO ATO DA ASSINATURA";
      const capW = font.widthOfTextAtSize(cap, 5.5);
      page.drawText(cap, { x: px + (ps - capW) / 2, y: py - 8, size: 5.5, font: fontBold, color: P.lightGray });
      const contentRightBound = px - 12;

      // Data grid
      const detailX = M + 14;
      let dy = y - 48;
      const colW = (contentRightBound - detailX) / 2 - 8;

      const rows: [string, string][] = [
        ["CPF", maskDoc(s.cpf)],
        ["E-mail", maskEmail(s.email)],
        ["Telefone", s.telefone || "--"],
        ["IP", maskIp(s.ip_address)],
        ["Geolocalização", s.location_text || (s.location_lat ? `${s.location_lat}, ${s.location_lng}` : "Não informada")],
        ["Visualizado em", s.viewed_at ? fmtDateTimeBR(s.viewed_at) : "--"],
        ["Identidade validada", s.validated_at ? fmtDateTimeBR(s.validated_at) : "Não validada"],
        ["Assinado em", s.signed_at ? fmtDateTimeBR(s.signed_at) : "--"],
      ];

      for (let r = 0; r < rows.length; r++) {
        const col = r % 2;
        const rx = detailX + col * (colW + 16);
        const ry = dy - Math.floor(r / 2) * 14;
        page.drawText(rows[r][0] + ":", { x: rx, y: ry, size: 6.5, font, color: P.lightGray });
        drawWrappedText(page, rows[r][1], {
          x: rx, y: ry - 9, maxWidth: colW - 4, font: fontBold, size: 7.5, lineHeight: 9, maxLines: 1, color: P.white,
        });
      }

      // User-Agent (wrapped, up to 2 lines)
      if (s.user_agent) {
        drawWrappedText(page, "User-Agent: " + s.user_agent, {
          x: detailX, y: y - cardH + 22, maxWidth: contentRightBound - detailX, font, size: 5.5, lineHeight: 7, maxLines: 2, color: P.midGray,
        });
      }

      y -= cardH + 12;
    }
  }

  // ═══════════════ PÁGINA 2: ATESTADO TÉCNICO ═══════════════
  {
    let { page, y } = newPage();

    // ICP-Brasil seal top-right on Atestado
    drawIcpSeal(page, font, fontBold, W - 70, H - 80, 26);

    y = drawPageTitle(page, "ATESTADO TÉCNICO DE AUTENTICIDADE E INTEGRIDADE",
      "Este atestado descreve os mecanismos técnicos empregados para garantir a autoria e a inalterabilidade do documento.", y);

    function block(title: string, rows: [string, string][]) {
      const rowH = 20;
      const bh = 28 + rows.length * rowH;
      drawRect(page, M, y - bh, CW, bh, P.cardBg);
      drawRect(page, M, y - 2, CW, 2, P.primary);
      page.drawText(title, { x: M + 14, y: y - 18, size: 9.5, font: fontBold, color: P.primary });
      let ry = y - 40;
      const valueX = M + 180;
      const valueMaxW = M + CW - valueX - 14;
      for (const [l, v] of rows) {
        page.drawText(l, { x: M + 14, y: ry, size: 7.5, font, color: P.lightGray });
        drawWrappedText(page, v, {
          x: valueX, y: ry, maxWidth: valueMaxW, font: fontBold, size: 8, lineHeight: 10, maxLines: 1, color: P.white,
        });
        ry -= rowH;
      }
      y -= bh + 14;
    }

    block("EMITENTE", [
      ["Razão Social", tenantData?.razao_social || P.tenantName],
      ["Nome Fantasia", tenantData?.nome_fantasia || P.tenantName],
      ["CNPJ", tenantData?.cnpj || "--"],
      ["Plataforma", "Accord — Assinatura Eletrônica"],
    ]);

    block("DOCUMENTO", [
      ["Nome", doc.nome || "--"],
      ["Tipo", (doc.tipo || "contrato").charAt(0).toUpperCase() + (doc.tipo || "contrato").slice(1)],
      ["Identificador", doc.id || "--"],
      ["Código de Validação", validationCode],
      ["Data de Emissão", doc.created_at ? fmtDateTimeBR(doc.created_at) : "--"],
      ["Data da Assinatura Final", doc.signed_at ? fmtDateTimeBR(doc.signed_at) : "--"],
    ]);

    // Hash block
    const bh = 90;
    drawRect(page, M, y - bh, CW, bh, P.cardBg);
    drawRect(page, M, y - 2, CW, 2, P.secondary);
    page.drawText("HASH DE INTEGRIDADE — SHA-256", { x: M + 14, y: y - 18, size: 9.5, font: fontBold, color: P.secondary });
    page.drawText("Impressão digital criptográfica única deste documento:", { x: M + 14, y: y - 32, size: 7, font, color: P.lightGray });
    const half = Math.ceil(docHash.length / 2);
    page.drawText(docHash.slice(0, half), { x: M + 14, y: y - 50, size: 9, font: fontBold, color: P.white });
    page.drawText(docHash.slice(half), { x: M + 14, y: y - 64, size: 9, font: fontBold, color: P.white });
    page.drawText("Qualquer alteração no conteúdo invalida este hash e é detectada automaticamente.", { x: M + 14, y: y - 80, size: 6.5, font, color: P.midGray });
    y -= bh + 14;

    const lh = 78;
    drawRect(page, M, y - lh, CW, lh, P.cardBg);
    page.drawText("FUNDAMENTO LEGAL", { x: M + 14, y: y - 16, size: 9, font: fontBold, color: P.primary });
    drawWrappedText(page,
      "Documento assinado eletronicamente nos termos da Medida Provisória nº 2.200-2/2001, que instituiu a Infraestrutura de Chaves Públicas Brasileira (ICP-Brasil) e reconheceu a validade jurídica da assinatura eletrônica. As assinaturas coletadas nesta plataforma são avançadas, com prova de identidade, autoria e integridade registradas neste dossiê.",
      { x: M + 14, y: y - 32, maxWidth: CW - 28, font, size: 7.5, lineHeight: 10, maxLines: 5, color: P.lightGray });
    y -= lh + 10;
  }

  // ═══════════════ PÁGINA 3: LOG DE EVENTOS ═══════════════
  {
    let { page, y } = newPage();
    y = drawPageTitle(page, "LOG DE EVENTOS",
      "Registro cronológico e imutável de todos os eventos ocorridos no ciclo de vida deste documento.", y);

    for (let i = 0; i < events.length; i++) {
      const evt = events[i];
      if (y < 100) {
        const np = newPage(); page = np.page; y = np.y;
      }

      const label = EVENT_LABELS[evt.evento] || evt.evento;
      const time = evt.created_at ? fmtDateTimeBR(evt.created_at) : "--";

      const dotX = M + 10;
      page.drawCircle({ x: dotX, y: y - 2, size: 3.5, color: P.primary });
      if (i < events.length - 1) {
        page.drawLine({ start: { x: dotX, y: y - 6 }, end: { x: dotX, y: y - 34 }, thickness: 1, color: P.dimLine });
      }

      const textX = M + 24;
      const timeW = font.widthOfTextAtSize(time, 7.5);
      page.drawText(time, { x: W - M - timeW, y: y - 2, size: 7.5, font, color: P.midGray });
      const labelMaxW = W - M - timeW - textX - 8;
      drawWrappedText(page, label, {
        x: textX, y: y - 2, maxWidth: labelMaxW, font: fontBold, size: 9, lineHeight: 11, maxLines: 1, color: P.white,
      });

      let descBottom = y - 14;
      if (evt.descricao) {
        descBottom = drawWrappedText(page, evt.descricao, {
          x: textX, y: y - 14, maxWidth: W - M - textX - 8, font, size: 7, lineHeight: 9, maxLines: 2, color: P.lightGray,
        });
      }
      y = Math.min(y - 34, descBottom - 6);
    }
  }

  // ═══════════════ PÁGINA 4: VALIDAÇÃO DO DOCUMENTO (QR) ═══════════════
  {
    let { page, y } = newPage();
    y = drawPageTitle(page, "VALIDAÇÃO DO DOCUMENTO",
      "Utilize o QR Code ou o link abaixo para verificar publicamente a autenticidade deste documento a qualquer momento.", y);

    let qrImg: any = null;
    try {
      const dataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 512, errorCorrectionLevel: "M" });
      const b64 = dataUrl.split(",")[1];
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      qrImg = await pdfDoc.embedPng(bytes);
    } catch (e) {
      console.error("[dossier] QR generation failed:", (e as any)?.message);
    }

    // Non-overlapping vertical layout: QR on top, labels below with breathing room
    const qs = 200;
    const gap = 22; // >18pt of breathing room between QR and labels
    const labelsBlockH = 14 + 22 + 12 + 12 + 20; // "CODIGO" + code + "verify em:" + url + margin
    const cardH = 40 + qs + gap + labelsBlockH + 20;
    drawRect(page, M, y - cardH, CW, cardH, P.cardBg);
    drawRect(page, M, y - 2, CW, 2, P.primary);

    const qx = M + (CW - qs) / 2;
    const qy = y - 30 - qs;
    if (qrImg) {
      drawRect(page, qx - 6, qy - 6, qs + 12, qs + 12, P.white);
      page.drawImage(qrImg, { x: qx, y: qy, width: qs, height: qs });
    }

    let ry = qy - gap;
    centerText(page, "CÓDIGO DE VALIDAÇÃO", ry, font, 8, P.lightGray); ry -= 14;
    centerText(page, validationCode, ry, fontBold, 14, P.primary); ry -= 22;
    centerText(page, "Verifique publicamente em:", ry, font, 8, P.lightGray); ry -= 12;
    // wrap url on 1 line with ellipsis if needed
    drawWrappedText(page, publicUrl, {
      x: M + 20, y: ry, maxWidth: CW - 40, font: fontBold, size: 9, lineHeight: 11, maxLines: 1, color: P.white,
    });

    y -= cardH + 24;
    centerText(page, "Este dossiê digital tem valor probatório equivalente a documento físico com firma reconhecida", y, font, 7.5, P.midGray);
    y -= 12;
    centerText(page, "nos termos da MP 2.200-2/2001 e do Código de Processo Civil (art. 411).", y, font, 7.5, P.midGray);
  }
}

// ─── Footer painter (all pages) ───
function paintFooters(pdfDoc: any, font: any, fontBold: any, P: BrandPalette, validationCode: string, docHash: string) {
  const pages = pdfDoc.getPages();
  const total = pages.length;
  const shortHash = docHash.slice(0, 12) + "…" + docHash.slice(-8);
  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const { width } = page.getSize();
    // Divider line
    page.drawLine({ start: { x: M, y: 28 }, end: { x: width - M, y: 28 }, thickness: 0.4, color: P.dimLine });
    // Left: tenant
    page.drawText(P.tenantName, { x: M, y: 16, size: 6.5, font: fontBold, color: P.midGray });
    // Center: validation + hash
    const center = `Validação ${validationCode}  ·  SHA-256 ${shortHash}`;
    const cw = font.widthOfTextAtSize(center, 6.5);
    page.drawText(center, { x: (width - cw) / 2, y: 16, size: 6.5, font, color: P.midGray });
    // Right: page count
    const pageLabel = `Página ${i + 1} de ${total}`;
    const pw = font.widthOfTextAtSize(pageLabel, 6.5);
    page.drawText(pageLabel, { x: width - M - pw, y: 16, size: 6.5, font, color: P.midGray });
  }
}

// ─── Helpers: robust PDF fetch + certificate builder ───

function extractStoragePath(pdfUrl: string | null | undefined): string | null {
  if (!pdfUrl) return null;
  const clean = pdfUrl.split("?")[0];
  const marker = "/storage/v1/object/";
  const idx = clean.indexOf(marker);
  if (idx === -1) return null;
  const rest = clean.substring(idx + marker.length);
  const parts = rest.split("/");
  if (parts.length < 3) return null;
  if (parts[1] !== "contract-pdfs") return null;
  return decodeURIComponent(parts.slice(2).join("/"));
}

async function downloadPdfBytesFromDoc(supabase: any, doc: any): Promise<ArrayBuffer | null> {
  const path = doc.pdf_path || extractStoragePath(doc.pdf_url);
  if (path) {
    const { data, error } = await supabase.storage.from("contract-pdfs").download(path);
    if (!error && data) {
      if (!doc.pdf_path) {
        await supabase.from("generated_documents").update({ pdf_path: path }).eq("id", doc.id);
      }
      return await data.arrayBuffer();
    }
    console.error("[sign-document] storage.download failed", error?.message);
  }
  if (doc.pdf_url) {
    try {
      const r = await fetch(doc.pdf_url);
      if (r.ok) return await r.arrayBuffer();
      console.error("[sign-document] fetch pdf_url failed", r.status);
    } catch (e) {
      console.error("[sign-document] fetch pdf_url threw", e);
    }
  }
  return null;
}

async function buildAndSaveSignedPdf(
  supabase: any,
  documentId: string,
): Promise<{ ok: boolean; signed_pdf_url?: string; document_hash?: string; validation_code?: string; error?: string }> {
  const { data: fullDoc } = await supabase
    .from("generated_documents").select("*").eq("id", documentId).single();
  if (!fullDoc) return { ok: false, error: "documento nao encontrado" };

  let tenantData: any = null;
  if (fullDoc.servidor_id) {
    const { data: tenantRow } = await supabase
      .from("companies")
      .select("nome_fantasia, razao_social, cnpj, brand_primary_color, brand_secondary_color, brand_accent_color, brand_bg_color, brand_text_color, brand_logo_url")
      .eq("id", fullDoc.servidor_id)
      .single();
    tenantData = tenantRow;
  }
  const palette = buildPalette(tenantData);

  const pdfBytes = await downloadPdfBytesFromDoc(supabase, fullDoc);
  if (!pdfBytes) return { ok: false, error: "falha ao baixar PDF original" };

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  const hashBuffer = await crypto.subtle.digest("SHA-256", pdfBytes);
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const validationCode = fullDoc.validation_code ||
    `ACD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const signedAt = fullDoc.signed_at || new Date().toISOString();

  const { data: allSigners } = await supabase
    .from("document_signers").select("*").eq("document_id", documentId);
  const { data: eventsData } = await supabase
    .from("document_events").select("*").eq("document_id", documentId).order("created_at", { ascending: true });

  const publicUrl = `https://accordpipe.lovable.app/validar-documento/${validationCode}`;

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBoldEmb = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let logoImage: any = null;
  if (tenantData?.brand_logo_url) {
    try {
      const logoResp = await fetch(tenantData.brand_logo_url);
      if (logoResp.ok) {
        const logoBytes = await logoResp.arrayBuffer();
        const contentType = logoResp.headers.get("content-type") || "";
        logoImage = contentType.includes("png")
          ? await pdfDoc.embedPng(logoBytes)
          : await pdfDoc.embedJpg(logoBytes);
      }
    } catch (logoErr) {
      console.error("[sign-document] Logo embed failed:", logoErr);
    }
  }

  await buildCoverPage(pdfDoc, fontRegular, fontBoldEmb, { ...fullDoc, signed_at: signedAt }, validationCode, hashHex, publicUrl, palette, logoImage);
  await buildAuditPages(pdfDoc, fontRegular, fontBoldEmb, { ...fullDoc, signed_at: signedAt }, allSigners || [], eventsData || [], validationCode, hashHex, publicUrl, palette, tenantData, supabase);

  // Paint footer on EVERY page (including original contract pages)
  paintFooters(pdfDoc, fontRegular, fontBoldEmb, palette, validationCode, hashHex);

  const finalPdfBytes = await pdfDoc.save();
  const signedPath = `signed/${documentId}_${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage.from("contract-pdfs").upload(signedPath, finalPdfBytes, { contentType: "application/pdf", upsert: true });
  if (upErr) return { ok: false, error: `upload falhou: ${upErr.message}` };

  const { data: urlData } = await supabase.storage.from("contract-pdfs").createSignedUrl(signedPath, 2592000);
  const signedPdfUrl = urlData?.signedUrl || "";

  await supabase.from("generated_documents").update({
    status: "signed",
    signed_pdf_url: signedPdfUrl,
    document_hash: hashHex,
    validation_code: validationCode,
    signed_at: signedAt,
  }).eq("id", documentId);

  return { ok: true, signed_pdf_url: signedPdfUrl, document_hash: hashHex, validation_code: validationCode };
}

// ─── WhatsApp helpers (mirror process-whatsapp-campaign) ───
function normalizePhone(p: string): string {
  return (p || "").replace(/\D/g, "");
}
async function sendUazapi(serverUrl: string, _instanceName: string, instanceToken: string, phone: string, text: string) {
  const base = serverUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/send/text`, {
    method: "POST",
    headers: { token: instanceToken, "Content-Type": "application/json" },
    body: JSON.stringify({ number: normalizePhone(phone), text }),
  });
  return res.ok;
}
async function sendZapi(serverUrl: string, instanceId: string, token: string, clientToken: string | null, phone: string, text: string) {
  const base = serverUrl.replace(/\/$/, "");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;
  const res = await fetch(`${base}/instances/${instanceId}/token/${token}/send-text`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone: normalizePhone(phone), message: text }),
  });
  return res.ok;
}

// ─── Notify signers with signed copy (email + WhatsApp) ───
async function notifySignersOfSignedCopy(supabase: any, documentId: string) {
  try {
    const { data: doc } = await supabase
      .from("generated_documents")
      .select("id, nome, servidor_id, signed_pdf_url, validation_code")
      .eq("id", documentId)
      .maybeSingle();
    if (!doc) return;

    const { data: signers } = await supabase
      .from("document_signers")
      .select("id, nome_completo, email, telefone")
      .eq("document_id", documentId);
    if (!signers?.length) return;

    const { data: sentEvents } = await supabase
      .from("document_events")
      .select("signer_id, metadata_json")
      .eq("document_id", documentId)
      .eq("evento", "copia_assinada_enviada");

    const already = new Set<string>();
    for (const ev of sentEvents || []) {
      const meta = typeof ev.metadata_json === "string" ? JSON.parse(ev.metadata_json) : ev.metadata_json;
      already.add(`${ev.signer_id}|${meta?.channel || ""}`);
    }

    const validationCode = doc.validation_code || "";
    const publicValidationUrl = validationCode
      ? `https://accordpipe.com.br/validar-documento/${validationCode}`
      : "";
    const downloadUrl = doc.signed_pdf_url || publicValidationUrl;
    if (!downloadUrl) return;

    // Resolve tenant WhatsApp integration once
    const { data: integ } = await supabase
      .from("tenant_whatsapp_integrations")
      .select("*")
      .eq("tenant_id", doc.servidor_id)
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let zapiClientToken: string | null = null;
    if (integ?.provider_type === "zapi") {
      const { data: comp } = await supabase
        .from("companies").select("zapi_client_token").eq("id", doc.servidor_id).maybeSingle();
      zapiClientToken = comp?.zapi_client_token ?? null;
    }

    for (const s of signers) {
      // Email
      if (s.email && !already.has(`${s.id}|email`)) {
        try {
          const r = await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "contract-signed-copy",
              recipientEmail: s.email,
              idempotencyKey: `signed-copy-email-${documentId}-${s.id}`,
              templateData: {
                nome: s.nome_completo || "",
                documento: doc.nome || "",
                downloadUrl,
                validationCode,
              },
            },
          });
          if (!r.error) {
            await supabase.from("document_events").insert({
              document_id: documentId, signer_id: s.id, evento: "copia_assinada_enviada",
              descricao: `Cópia assinada enviada por e-mail para ${s.email}`,
              metadata_json: { channel: "email", recipient: s.email, download_url: downloadUrl },
            });
          } else {
            console.error("[sign-document] email signed-copy error:", r.error);
          }
        } catch (e) {
          console.error("[sign-document] email signed-copy threw:", (e as Error).message);
        }
      }

      // WhatsApp
      if (s.telefone && integ?.server_url && integ?.instance_token && !already.has(`${s.id}|whatsapp`)) {
        const msg = `Olá ${s.nome_completo || ""}! Seu contrato "${doc.nome || ""}" foi assinado com sucesso. Baixe sua via aqui: ${downloadUrl}`;
        try {
          let ok = false;
          if (integ.provider_type === "uazapi") {
            ok = await sendUazapi(integ.server_url, integ.instance_name || integ.instance_id, integ.instance_token, s.telefone, msg);
          } else if (integ.provider_type === "zapi") {
            ok = await sendZapi(integ.server_url, integ.instance_id, integ.instance_token, zapiClientToken, s.telefone, msg);
          } else {
            console.log("[sign-document] whatsapp provider unsupported:", integ.provider_type);
          }
          if (ok) {
            await supabase.from("document_events").insert({
              document_id: documentId, signer_id: s.id, evento: "copia_assinada_enviada",
              descricao: `Cópia assinada enviada por WhatsApp para ${s.telefone}`,
              metadata_json: { channel: "whatsapp", recipient: s.telefone, download_url: downloadUrl },
            });
          }
        } catch (e) {
          console.error("[sign-document] whatsapp signed-copy threw:", (e as Error).message);
        }
      } else if (s.telefone && !integ) {
        console.log("[sign-document] no active whatsapp integration for tenant", doc.servidor_id);
      }
    }
  } catch (e) {
    console.error("[sign-document] notifySignersOfSignedCopy failed:", (e as Error).message);
  }
}

// ─── Main handler ───


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, token } = body;

    // ── REGENERATE (admin, no signer token) ──
    if (action === "regenerate") {
      const { document_id } = body;
      if (!document_id) {
        return new Response(JSON.stringify({ success: false, error: "document_id obrigatorio" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Verify caller is authenticated and belongs to the tenant of the document
      const authHeader = req.headers.get("Authorization") || "";
      const jwt = authHeader.replace("Bearer ", "");
      if (!jwt) {
        return new Response(JSON.stringify({ success: false, error: "nao autenticado" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      });
      const { data: userRes } = await anonClient.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) {
        return new Response(JSON.stringify({ success: false, error: "token invalido" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: docRow } = await supabase
        .from("generated_documents").select("id, servidor_id").eq("id", document_id).maybeSingle();
      if (!docRow) {
        return new Response(JSON.stringify({ success: false, error: "documento nao encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: linkRow } = await supabase
        .from("user_tenants").select("id").eq("user_id", userId).eq("tenant_id", docRow.servidor_id).maybeSingle();
      if (!linkRow) {
        return new Response(JSON.stringify({ success: false, error: "sem acesso" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = await buildAndSaveSignedPdf(supabase, document_id);
      return new Response(JSON.stringify(res), {
        status: res.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Token obrigatorio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signerRows } = await supabase
      .from("document_signers").select("*").eq("auth_token", token).limit(1);

    if (!signerRows || signerRows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Token invalido" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signer = signerRows[0];

    // ── VIEW ──
    if (action === "view") {
      if (!signer.viewed_at) {
        await supabase.from("document_signers").update({ viewed_at: new Date().toISOString() }).eq("id", signer.id);
      }
      await supabase.from("document_events").insert({
        document_id: signer.document_id, signer_id: signer.id,
        evento: "link_acessado", descricao: `${signer.nome_completo} acessou o link de assinatura`,
      });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── VALIDATE ──
    if (action === "validate") {
      const { cpf, data_nascimento } = body;
      const storedCpf = (signer.cpf || "").replace(/\D/g, "");
      const inputCpf = (cpf || "").replace(/\D/g, "");

      if (!storedCpf || !signer.data_nascimento) {
        await supabase.from("document_signers").update({ status: "validated", validated_at: new Date().toISOString() }).eq("id", signer.id);
        await supabase.from("document_events").insert({ document_id: signer.document_id, signer_id: signer.id, evento: "validacao_iniciada", descricao: "Validacao ignorada (dados nao cadastrados)" });
        return new Response(JSON.stringify({ success: true, skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (storedCpf !== inputCpf || signer.data_nascimento !== data_nascimento) {
        await supabase.from("document_events").insert({ document_id: signer.document_id, signer_id: signer.id, evento: "validacao_iniciada", descricao: "Validacao falhou: dados nao conferem" });
        return new Response(JSON.stringify({ success: false, error: "CPF ou data de nascimento nao conferem" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabase.from("document_signers").update({ status: "validated", validated_at: new Date().toISOString() }).eq("id", signer.id);
      await supabase.from("document_events").insert({ document_id: signer.document_id, signer_id: signer.id, evento: "validacao_iniciada", descricao: "CPF e data de nascimento validados - identidade confirmada" });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── SIGN ──
    if (action === "sign") {
      const { selfie_url, ip_address, user_agent, location_lat, location_lng, location_text } = body;
      const now = new Date();
      const signedAt = now.toISOString();

      await supabase.from("document_signers").update({
        status: "signed", signed_at: signedAt,
        selfie_url: selfie_url || null, ip_address: ip_address || null,
        user_agent: user_agent || null, location_lat: location_lat || null,
        location_lng: location_lng || null, location_text: location_text || null,
      }).eq("id", signer.id);

      const varPrefix = PAPEL_VAR_MAP[signer.papel] || "cliente";
      const geoText = location_text || (location_lat && location_lng ? `${location_lat}, ${location_lng}` : "Nao informada");

      const signatureValues: Record<string, string> = {
        [`data_assinatura_${varPrefix}`]: fmtDateBR(now),
        [`hora_assinatura_${varPrefix}`]: fmtTimeBR(now),
        [`geolocalizacao_${varPrefix}`]: geoText,
        [`selfie_${varPrefix}`]: selfie_url
          ? `<img src="${selfie_url}" data-selfie="true" width="120" height="120" />`
          : "Imagem nao disponivel",
      };

      const { data: docData } = await supabase
        .from("generated_documents").select("html_content, rendered_variables_json")
        .eq("id", signer.document_id).single();

      let updatedHtml = docData?.html_content || "";
      const snapshot = (docData?.rendered_variables_json as Record<string, any>) || {};

      for (const [varName, value] of Object.entries(signatureValues)) {
        updatedHtml = updatedHtml.replaceAll(`{{${varName}}}`, value);
        snapshot[varName] = { value, source: "signature", status: "filled", filled_at: signedAt, signer_id: signer.id, signer_name: signer.nome_completo };
      }

      const eventName = varPrefix === "vendedor" ? "assinatura_vendedor_concluida" : "assinatura_cliente_concluida";
      await supabase.from("document_events").insert({
        document_id: signer.document_id, signer_id: signer.id, evento: eventName,
        descricao: `${signer.nome_completo} (${signer.papel}) assinou o documento`,
        metadata_json: { ip_address, user_agent, location_lat, location_lng, location_text, selfie_url, signed_at: signedAt },
      });

      const { data: allSigners } = await supabase
        .from("document_signers").select("*").eq("document_id", signer.document_id);

      const required = (allSigners || []).filter((s: any) => s.obrigatorio);
      const signedRequired = required.filter((s: any) => s.status === "signed" || s.id === signer.id);
      const allRequiredSigned = signedRequired.length >= required.length;

      let newDocStatus = "partially_signed";
      if (allRequiredSigned) newDocStatus = "signed";

      const docUpdate: Record<string, any> = {
        status: newDocStatus, html_content: updatedHtml, rendered_variables_json: snapshot,
      };

      if (allRequiredSigned) {
        docUpdate.signed_at = signedAt;
        const validationCode = `ACD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        docUpdate.validation_code = validationCode;

        await supabase.from("document_events").insert({
          document_id: signer.document_id, evento: "documento_assinado_finalizado",
          descricao: "Todas as assinaturas obrigatorias concluidas. Documento finalizado.",
          metadata_json: { total_signers: (allSigners || []).length, required_signers: required.length, finalized_at: signedAt },
        });

        // Persist signed_at + validation_code up-front so the helper sees them
        await supabase.from("generated_documents").update({
          status: "signed",
          signed_at: signedAt,
          validation_code: validationCode,
          html_content: updatedHtml,
          rendered_variables_json: snapshot,
        }).eq("id", signer.document_id);

        // Build signed PDF with cover/audit pages using storage path (never expires)
        const buildRes = await buildAndSaveSignedPdf(supabase, signer.document_id);
        if (buildRes.ok) {
          docUpdate.signed_pdf_url = buildRes.signed_pdf_url;
          docUpdate.document_hash = buildRes.document_hash;
        } else {
          console.error("[sign-document] buildAndSaveSignedPdf failed:", buildRes.error);
        }

        await supabase.from("document_events").insert({
          document_id: signer.document_id, evento: "documento_validacao_gerada",
          descricao: `Codigo de validacao e hash gerados: ${validationCode}`,
          metadata_json: { validation_code: validationCode, document_hash: docUpdate.document_hash || null, generated_at: signedAt },
        });
      }

      await supabase.from("generated_documents").update(docUpdate).eq("id", signer.document_id);

      return new Response(JSON.stringify({ success: true, document_status: newDocStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── REJECT ──
    if (action === "reject") {
      const { reason } = body;
      await supabase.from("document_signers").update({ status: "rejected", rejected_at: new Date().toISOString(), reject_reason: reason || null }).eq("id", signer.id);
      await supabase.from("document_events").insert({ document_id: signer.document_id, signer_id: signer.id, evento: "assinatura_recusada", descricao: `${signer.nome_completo} recusou${reason ? `: ${reason}` : ""}` });
      await supabase.from("generated_documents").update({ status: "rejected" }).eq("id", signer.document_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: false, error: "Acao invalida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[sign-document]", error);
    return new Response(JSON.stringify({ success: false, error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
