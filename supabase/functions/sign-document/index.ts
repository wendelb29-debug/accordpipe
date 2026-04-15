import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

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

  // Dark bg derived from primary (very dark version)
  const darkBgC = pRgb ? darkenRgb(primary, 0.4) : { r: 0.043, g: 0.059, b: 0.098 };
  // Clamp to very dark
  const clampedDarkBg = {
    r: Math.max(0, Math.min(0.12, darkBgC.r)),
    g: Math.max(0, Math.min(0.12, darkBgC.g)),
    b: Math.max(0, Math.min(0.15, darkBgC.b)),
  };

  const cardBgC = pRgb
    ? { r: clampedDarkBg.r + 0.03, g: clampedDarkBg.g + 0.04, b: clampedDarkBg.b + 0.06 }
    : { r: 0.067, g: 0.094, b: 0.153 };

  const tenantName = tenant?.nome_fantasia || tenant?.razao_social || "Accord";
  const hasLogo = !!(tenant?.brand_logo_url);

  return {
    primary: rgb(primary.r, primary.g, primary.b),
    secondary: rgb(secondary.r, secondary.g, secondary.b),
    accent: rgb(accent.r, accent.g, accent.b),
    darkBg: rgb(clampedDarkBg.r, clampedDarkBg.g, clampedDarkBg.b),
    cardBg: rgb(cardBgC.r, cardBgC.g, cardBgC.b),
    coverAccentBar: rgb(primary.r, primary.g, primary.b),
    green: rgb(0.063, 0.725, 0.506),
    white: rgb(0.898, 0.906, 0.922),
    lightGray: rgb(0.624, 0.639, 0.667),
    midGray: rgb(0.373, 0.388, 0.427),
    dimLine: rgb(0.16, 0.18, 0.22),
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
  const words = text.split(" ");
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

// ─── Certificate Cover Page (White Label) ───
async function buildCoverPage(
  pdfDoc: any, font: any, fontBold: any,
  doc: any, validationCode: string, docHash: string, publicUrl: string,
  P: BrandPalette, logoImage: any | null,
) {
  const page = pdfDoc.addPage([W, H]);

  // Full dark background
  drawRect(page, 0, 0, W, H, P.darkBg);

  // Top decorative accent bar in tenant primary
  drawRect(page, 0, H - 6, W, 6, P.coverAccentBar);

  let y = H - 60;

  // ── Logo or tenant name ──
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
    const badgeW = font.widthOfTextAtSize("Plataforma de Assinatura Eletronica", 7);
    page.drawText("Plataforma de Assinatura Eletronica", { x: (W - badgeW) / 2, y, size: 7, font, color: P.midGray });
    y -= 20;
  }

  y -= 30;

  // Title
  centerText(page, "CERTIFICADO DE ASSINATURA", y, fontBold, 22, P.white);
  y -= 28;
  centerText(page, "ELETRONICA", y, fontBold, 22, P.white);
  y -= 18;

  // Decorative line under title in tenant primary
  const lineW = 80;
  page.drawLine({ start: { x: (W - lineW) / 2, y }, end: { x: (W + lineW) / 2, y }, thickness: 2, color: P.primary });
  y -= 30;

  // Subtitle
  centerText(page, "Este documento certifica que o contrato foi assinado eletronicamente", y, font, 9, P.lightGray);
  y -= 14;
  centerText(page, "com registro completo de auditoria, rastreabilidade e validacao.", y, font, 9, P.lightGray);
  y -= 50;

  // Document info card
  const cardH = 130;
  const cardX = M + 20;
  const cardW = CW - 40;
  drawRect(page, cardX, y - cardH, cardW, cardH, P.cardBg);
  drawRect(page, cardX, y, cardW, 2, P.primary);

  let cy = y - 22;
  const labelX = cardX + 20;
  const valueX = cardX + 160;

  const infoRows: [string, string][] = [
    ["Documento", doc.nome || "--"],
    ["Tipo", (doc.tipo || "contrato").charAt(0).toUpperCase() + (doc.tipo || "contrato").slice(1)],
    ["Status", "ASSINADO"],
    ["Data da Assinatura", doc.signed_at ? fmtDateTimeBR(doc.signed_at) : "--"],
  ];

  for (const [label, value] of infoRows) {
    page.drawText(label, { x: labelX, y: cy, size: 9, font, color: P.lightGray });
    const valColor = value === "ASSINADO" ? P.green : P.white;
    page.drawText(value, { x: valueX, y: cy, size: 9, font: fontBold, color: valColor });
    cy -= 24;
  }

  y -= cardH + 40;

  // Validation block
  const valCardH = 150;
  drawRect(page, cardX, y - valCardH, cardW, valCardH, P.cardBg);
  drawRect(page, cardX, y, cardW, 2, P.secondary);

  cy = y - 18;
  page.drawText("VALIDACAO E INTEGRIDADE", { x: labelX, y: cy, size: 10, font: fontBold, color: P.secondary });
  cy -= 24;

  const valRows: [string, string][] = [
    ["Codigo de Validacao", validationCode],
    ["Hash SHA-256", docHash.slice(0, 40) + "..."],
    ["Verificacao Publica", publicUrl.length > 55 ? publicUrl.slice(0, 55) + "..." : publicUrl],
  ];

  for (const [label, value] of valRows) {
    page.drawText(label, { x: labelX, y: cy, size: 8, font, color: P.lightGray });
    cy -= 13;
    page.drawText(value, { x: labelX, y: cy, size: 7.5, font: fontBold, color: P.white });
    cy -= 20;
  }

  y -= valCardH + 50;

  // Footer
  drawLine(page, y, P.dimLine, 0.5);
  y -= 16;
  centerText(page, "Este certificado comprova a autenticidade e integridade", y, font, 7.5, P.midGray);
  y -= 12;
  centerText(page, "do documento assinado eletronicamente.", y, font, 7.5, P.midGray);
  y -= 14;
  const footerTenant = P.tenantName !== "Accord" ? `Emitido via ${P.tenantName} em tecnologia Accord` : `Certificado gerado em ${fmtDateTimeBR(new Date().toISOString())}`;
  centerText(page, footerTenant, y, font, 7, P.midGray);
}

// ─── Audit Details Pages (White Label) ───
function buildAuditPages(
  pdfDoc: any, font: any, fontBold: any,
  doc: any, signersList: any[], events: any[],
  validationCode: string, docHash: string, publicUrl: string,
  P: BrandPalette,
) {
  let page = pdfDoc.addPage([W, H]);
  drawRect(page, 0, 0, W, H, P.darkBg);
  drawRect(page, 0, H - 4, W, 4, P.coverAccentBar);
  let y = H - 50;

  function newPage() {
    page = pdfDoc.addPage([W, H]);
    drawRect(page, 0, 0, W, H, P.darkBg);
    drawRect(page, 0, H - 4, W, 4, P.coverAccentBar);
    y = H - 50;
  }

  function ensure(needed: number) {
    if (y - needed < 60) newPage();
  }

  function sectionTitle(text: string) {
    ensure(30);
    drawRect(page, M, y - 2, CW, 20, P.cardBg);
    page.drawText(text, { x: M + 12, y: y + 2, size: 10, font: fontBold, color: P.primary });
    y -= 28;
  }

  function labelValue(label: string, value: string, valColor?: any) {
    ensure(16);
    page.drawText(label + ":", { x: M + 10, y, size: 8, font, color: P.lightGray });
    page.drawText(value, { x: M + 150, y, size: 8, font: fontBold, color: valColor || P.white });
    y -= 15;
  }

  // ── Document Identification ──
  sectionTitle("IDENTIFICACAO DO DOCUMENTO");
  const docRows: [string, string][] = [
    ["Nome", doc.nome || "--"],
    ["Tipo", (doc.tipo || "contrato").charAt(0).toUpperCase() + (doc.tipo || "contrato").slice(1)],
    ["Empresa", P.tenantName],
    ["ID do Documento", (doc.id || "").slice(0, 18) + "..."],
    ["Codigo de Validacao", validationCode],
    ["Data de Geracao", doc.created_at ? fmtDateTimeBR(doc.created_at) : "--"],
    ["Data de Assinatura Final", doc.signed_at ? fmtDateTimeBR(doc.signed_at) : "--"],
  ];
  for (const [l, v] of docRows) labelValue(l, v);
  y -= 8;

  // ── Security ──
  sectionTitle("SEGURANCA E INTEGRIDADE");
  labelValue("Hash SHA-256", docHash.slice(0, 32) + "...");
  y -= 4;
  ensure(30);
  y = drawWrapped(
    page,
    "Este documento foi protegido por hash criptografico SHA-256, garantindo que seu conteudo nao foi alterado apos a assinatura. Qualquer modificacao invalida o hash e pode ser detectada automaticamente.",
    M + 10, y, font, 7.5, CW - 20, P.lightGray
  );
  y -= 12;

  // ── Signatories ──
  sectionTitle("SIGNATARIOS");

  for (let i = 0; i < signersList.length; i++) {
    const s = signersList[i];
    const cardH = 120;
    ensure(cardH + 10);

    drawRect(page, M + 5, y - cardH + 14, CW - 10, cardH, P.cardBg);
    // Left accent stripe uses tenant primary for signed, secondary otherwise
    const stripeColor = s.status === "signed" ? P.green : P.primary;
    drawRect(page, M + 5, y - cardH + 14, 3, cardH, stripeColor);

    let cy = y + 4;
    const lx = M + 20;

    const papelLabel = PAPEL_LABELS[s.papel] || s.papel;
    page.drawText(`Signatario ${i + 1} - ${papelLabel}`, { x: lx, y: cy, size: 9, font: fontBold, color: P.white });
    cy -= 18;

    const sFields: [string, string, any?][] = [
      ["Nome Completo", s.nome_completo || "--"],
      ["Status", s.status === "signed" ? "Assinado" : (s.status || "--"), s.status === "signed" ? P.green : P.white],
      ["Data/Hora", s.signed_at ? fmtDateTimeBR(s.signed_at) : "--"],
      ["IP", maskIp(s.ip_address)],
      ["Localizacao", s.location_text || (s.location_lat ? `${s.location_lat}, ${s.location_lng}` : "--")],
      ["E-mail", maskEmail(s.email)],
      ["Documento", maskDoc(s.cpf)],
      ["Selfie", s.selfie_url ? "[OK] Capturada e armazenada" : "Nao capturada"],
    ];

    for (const [label, value, col] of sFields) {
      page.drawText(label + ":", { x: lx, y: cy, size: 7.5, font, color: P.lightGray });
      page.drawText(String(value), { x: lx + 110, y: cy, size: 7.5, font: fontBold, color: col || P.white });
      cy -= 12;
    }

    y -= cardH + 14;
  }

  y -= 8;

  // ── Timeline ──
  sectionTitle("LINHA DO TEMPO");

  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    ensure(36);

    const label = EVENT_LABELS[evt.evento] || evt.evento;
    const time = evt.created_at ? fmtDateTimeBR(evt.created_at) : "--";

    const dotX = M + 14;
    page.drawCircle({ x: dotX, y: y + 2, size: 3, color: P.primary });
    if (i < events.length - 1) {
      page.drawLine({
        start: { x: dotX, y: y - 1 },
        end: { x: dotX, y: y - 24 },
        thickness: 1,
        color: P.dimLine,
      });
    }

    page.drawText(label, { x: M + 28, y: y + 2, size: 8, font: fontBold, color: P.white });
    page.drawText(time, { x: W - M - font.widthOfTextAtSize(time, 7), y: y + 2, size: 7, font, color: P.midGray });

    if (evt.descricao) {
      const descTrunc = evt.descricao.length > 90 ? evt.descricao.slice(0, 90) + "..." : evt.descricao;
      page.drawText(descTrunc, { x: M + 28, y: y - 10, size: 6.5, font, color: P.lightGray });
    }

    y -= 28;
  }

  y -= 12;

  // ── Validation Footer ──
  ensure(70);
  drawLine(page, y, P.dimLine, 0.5);
  y -= 20;

  centerText(page, "VALIDACAO DO DOCUMENTO", y, fontBold, 10, P.secondary);
  y -= 18;
  centerText(page, `Codigo: ${validationCode}`, y, font, 8, P.white);
  y -= 14;
  centerText(page, `Hash: ${docHash}`, y, font, 6.5, P.lightGray);
  y -= 14;
  centerText(page, `Valide em: ${publicUrl}`, y, font, 7, P.lightGray);
  y -= 30;

  // Corporate footer
  drawLine(page, y, P.dimLine, 0.5);
  y -= 14;
  const footerBrand = P.tenantName !== "Accord" ? `${P.tenantName} - Tecnologia Accord` : "Accord - Plataforma de Assinatura Eletronica";
  centerText(page, footerBrand, y, fontBold, 7.5, P.midGray);
  y -= 10;
  centerText(page, "Este certificado comprova a autenticidade e integridade do documento assinado eletronicamente.", y, font, 6.5, P.midGray);
  y -= 10;
  centerText(page, `Certificado gerado em ${fmtDateTimeBR(new Date().toISOString())}`, y, font, 6, P.midGray);
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

        const { data: fullDoc } = await supabase
          .from("generated_documents").select("*").eq("id", signer.document_id).single();

        if (fullDoc?.pdf_url) {
          try {
            // ── Fetch tenant brand data ──
            let tenantData: any = null;
            if (fullDoc.servidor_id) {
              const { data: tenantRow } = await supabase
                .from("companies")
                .select("nome_fantasia, razao_social, brand_primary_color, brand_secondary_color, brand_accent_color, brand_bg_color, brand_text_color, brand_logo_url")
                .eq("id", fullDoc.servidor_id)
                .single();
              tenantData = tenantRow;
            }

            const palette = buildPalette(tenantData);

            const pdfResp = await fetch(fullDoc.pdf_url);
            if (pdfResp.ok) {
              const pdfBytes = await pdfResp.arrayBuffer();
              const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

              const hashBuffer = await crypto.subtle.digest("SHA-256", pdfBytes);
              const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
              docUpdate.document_hash = hashHex;

              const { data: eventsData } = await supabase
                .from("document_events").select("*").eq("document_id", signer.document_id)
                .order("created_at", { ascending: true });

              const publicUrl = `https://accordpipe.lovable.app/validar-documento/${validationCode}`;

              const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
              const fontBoldEmb = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

              // ── Try to embed tenant logo ──
              let logoImage: any = null;
              if (tenantData?.brand_logo_url) {
                try {
                  const logoResp = await fetch(tenantData.brand_logo_url);
                  if (logoResp.ok) {
                    const logoBytes = await logoResp.arrayBuffer();
                    const contentType = logoResp.headers.get("content-type") || "";
                    if (contentType.includes("png")) {
                      logoImage = await pdfDoc.embedPng(logoBytes);
                    } else {
                      logoImage = await pdfDoc.embedJpg(logoBytes);
                    }
                  }
                } catch (logoErr) {
                  console.error("[sign-document] Logo embed failed:", logoErr);
                }
              }

              // Build white-label certificate pages
              await buildCoverPage(pdfDoc, fontRegular, fontBoldEmb, { ...fullDoc, signed_at: signedAt }, validationCode, hashHex, publicUrl, palette, logoImage);
              buildAuditPages(pdfDoc, fontRegular, fontBoldEmb, { ...fullDoc, signed_at: signedAt }, allSigners || [], eventsData || [], validationCode, hashHex, publicUrl, palette);

              const finalPdfBytes = await pdfDoc.save();
              const signedPath = `signed/${signer.document_id}_${Date.now()}.pdf`;
              const { error: upErr } = await supabase.storage.from("contract-pdfs").upload(signedPath, finalPdfBytes, { contentType: "application/pdf" });

              if (!upErr) {
                const { data: urlData } = await supabase.storage.from("contract-pdfs").createSignedUrl(signedPath, 2592000);
                docUpdate.signed_pdf_url = urlData?.signedUrl || "";
              }
            }
          } catch (pdfErr) {
            console.error("[sign-document] PDF generation failed:", pdfErr);
          }
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
