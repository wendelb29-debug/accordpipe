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
  if (!e || !e.includes("@")) return e || "—";
  const [user, domain] = e.split("@");
  return user.slice(0, 2) + "***@" + domain;
}
function maskDoc(d: string | null) {
  if (!d) return "—";
  const clean = d.replace(/\D/g, "");
  if (clean.length <= 4) return "***";
  return "***." + clean.slice(-4);
}
function maskIp(ip: string | null) {
  if (!ip) return "—";
  const parts = ip.split(".");
  if (parts.length === 4) return parts[0] + ".xxx.xxx." + parts[3];
  return ip;
}

const PAPEL_LABELS: Record<string, string> = {
  proprietario_proposta: "Representante da empresa",
  cliente: "Cliente",
  vendedor: "Vendedor",
  signatario: "Signatario",
  testemunha: "Testemunha",
};

const EVENT_LABELS: Record<string, string> = {
  documento_gerado: "Documento gerado",
  envelope_configurado: "Envelope configurado",
  link_gerado: "Link de assinatura gerado",
  link_acessado: "Link acessado",
  validacao_iniciada: "Validacao de identidade",
  codigo_enviado: "Codigo de confirmacao enviado",
  codigo_confirmado: "Codigo confirmado",
  assinatura_vendedor_concluida: "Assinatura do vendedor concluida",
  assinatura_cliente_concluida: "Assinatura do cliente concluida",
  documento_assinado_finalizado: "Documento finalizado",
  documento_validacao_gerada: "Validacao gerada",
  assinatura_recusada: "Assinatura recusada",
};

// Helper to draw wrapped text and return new Y position
function drawWrapped(page: any, text: string, x: number, y: number, font: any, size: number, maxWidth: number, color = rgb(0.2, 0.2, 0.2)): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    const w = font.widthOfTextAtSize(test, size);
    if (w > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size, font, color });
      currentY -= size + 3;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    page.drawText(line, { x, y: currentY, size, font, color });
    currentY -= size + 3;
  }
  return currentY;
}

async function buildAuditPage(
  pdfDoc: any,
  doc: any,
  signersList: any[],
  events: any[],
  validationCode: string,
  documentHash: string,
  publicUrl: string,
) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28; // A4
  const H = 841.89;
  const margin = 50;
  const maxW = W - margin * 2;
  const darkBlue = rgb(0.11, 0.16, 0.32);
  const gray = rgb(0.3, 0.3, 0.3);
  const lightGray = rgb(0.6, 0.6, 0.6);
  const green = rgb(0.06, 0.5, 0.28);

  let page = pdfDoc.addPage([W, H]);
  let y = H - margin;

  function ensureSpace(needed: number) {
    if (y - needed < margin) {
      page = pdfDoc.addPage([W, H]);
      y = H - margin;
    }
  }

  // Title
  page.drawText("CERTIFICADO DE AUDITORIA DA ASSINATURA", { x: margin, y, size: 14, font: fontBold, color: darkBlue });
  y -= 6;
  page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 1.5, color: darkBlue });
  y -= 22;

  // Document identification
  page.drawText("IDENTIFICACAO DO DOCUMENTO", { x: margin, y, size: 10, font: fontBold, color: darkBlue });
  y -= 16;

  const docFields = [
    ["Nome", doc.nome || "—"],
    ["Tipo", doc.tipo || "contrato"],
    ["Status", "Assinado"],
    ["Data de geracao", doc.created_at ? fmtDateTimeBR(doc.created_at) : "—"],
    ["Data de assinatura final", doc.signed_at ? fmtDateTimeBR(doc.signed_at) : "—"],
    ["Codigo de validacao", validationCode],
    ["Hash SHA-256", documentHash.slice(0, 32) + "..."],
  ];

  for (const [label, value] of docFields) {
    ensureSpace(14);
    page.drawText(`${label}:`, { x: margin, y, size: 8, font: fontBold, color: gray });
    page.drawText(value, { x: margin + 140, y, size: 8, font, color: gray });
    y -= 13;
  }

  y -= 8;
  ensureSpace(16);
  page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: W - margin, y: y + 4 }, thickness: 0.5, color: lightGray });
  y -= 8;

  // Validation block
  page.drawText("VALIDACAO", { x: margin, y, size: 10, font: fontBold, color: darkBlue });
  y -= 16;

  const valFields = [
    ["Codigo", validationCode],
    ["Hash", documentHash],
    ["URL de validacao", publicUrl],
  ];
  for (const [label, value] of valFields) {
    ensureSpace(14);
    page.drawText(`${label}:`, { x: margin, y, size: 8, font: fontBold, color: gray });
    y = drawWrapped(page, value, margin + 100, y, font, 7, maxW - 100, gray);
    y -= 4;
  }

  y -= 8;
  ensureSpace(16);
  page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: W - margin, y: y + 4 }, thickness: 0.5, color: lightGray });
  y -= 8;

  // Signers block
  page.drawText("SIGNATARIOS", { x: margin, y, size: 10, font: fontBold, color: darkBlue });
  y -= 18;

  for (let i = 0; i < signersList.length; i++) {
    const s = signersList[i];
    ensureSpace(100);

    const papelLabel = PAPEL_LABELS[s.papel] || s.papel;
    page.drawText(`Signatario ${i + 1} - ${papelLabel}`, { x: margin, y, size: 9, font: fontBold, color: darkBlue });
    y -= 14;

    const signerFields = [
      ["Nome", s.nome_completo || "—"],
      ["E-mail", maskEmail(s.email)],
      ["Documento", maskDoc(s.cpf)],
      ["Status", s.status === "signed" ? "Assinado" : s.status],
      ["Data/Hora", s.signed_at ? fmtDateTimeBR(s.signed_at) : "—"],
      ["IP", maskIp(s.ip_address)],
      ["Localizacao", s.location_text || (s.location_lat ? `${s.location_lat}, ${s.location_lng}` : "—")],
      ["Selfie", s.selfie_url ? "Capturada" : "Nao capturada"],
    ];

    for (const [label, value] of signerFields) {
      ensureSpace(14);
      page.drawText(`${label}:`, { x: margin + 10, y, size: 8, font: fontBold, color: gray });
      page.drawText(String(value), { x: margin + 100, y, size: 8, font, color: gray });
      y -= 12;
    }

    y -= 8;
  }

  ensureSpace(16);
  page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: W - margin, y: y + 4 }, thickness: 0.5, color: lightGray });
  y -= 8;

  // Timeline
  ensureSpace(20);
  page.drawText("LINHA DO TEMPO", { x: margin, y, size: 10, font: fontBold, color: darkBlue });
  y -= 16;

  for (const evt of events) {
    ensureSpace(28);
    const label = EVENT_LABELS[evt.evento] || evt.evento;
    const time = evt.created_at ? fmtDateTimeBR(evt.created_at) : "—";

    page.drawText(time, { x: margin, y, size: 7, font, color: lightGray });
    page.drawText(label, { x: margin + 110, y, size: 8, font: fontBold, color: gray });
    y -= 11;
    if (evt.descricao) {
      y = drawWrapped(page, evt.descricao, margin + 110, y, font, 7, maxW - 110, lightGray);
      y -= 2;
    }
    y -= 4;
  }

  // Footer
  ensureSpace(30);
  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 0.5, color: lightGray });
  y -= 14;
  page.drawText("Este documento foi assinado eletronicamente e possui validade juridica.", { x: margin, y, size: 7, font, color: lightGray });
  y -= 10;
  page.drawText(`Valide em: ${publicUrl}`, { x: margin, y, size: 7, font, color: lightGray });
}

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
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get signer by token
    const { data: signerRows } = await supabase
      .from("document_signers")
      .select("*")
      .eq("auth_token", token)
      .limit(1);

    if (!signerRows || signerRows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Token invalido" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signer = signerRows[0];

    // ACTION: VIEW
    if (action === "view") {
      if (!signer.viewed_at) {
        await supabase.from("document_signers").update({ viewed_at: new Date().toISOString() }).eq("id", signer.id);
      }
      await supabase.from("document_events").insert({
        document_id: signer.document_id,
        signer_id: signer.id,
        evento: "link_acessado",
        descricao: `${signer.nome_completo} acessou o link de assinatura`,
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: VALIDATE
    if (action === "validate") {
      const { cpf, data_nascimento } = body;
      const storedCpf = (signer.cpf || "").replace(/\D/g, "");
      const inputCpf = (cpf || "").replace(/\D/g, "");

      if (!storedCpf || !signer.data_nascimento) {
        await supabase.from("document_signers")
          .update({ status: "validated", validated_at: new Date().toISOString() })
          .eq("id", signer.id);
        await supabase.from("document_events").insert({
          document_id: signer.document_id,
          signer_id: signer.id,
          evento: "validacao_iniciada",
          descricao: "Validacao ignorada (dados nao cadastrados)",
        });
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (storedCpf !== inputCpf || signer.data_nascimento !== data_nascimento) {
        await supabase.from("document_events").insert({
          document_id: signer.document_id,
          signer_id: signer.id,
          evento: "validacao_iniciada",
          descricao: "Validacao falhou: dados nao conferem",
        });
        return new Response(JSON.stringify({ success: false, error: "CPF ou data de nascimento nao conferem" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("document_signers")
        .update({ status: "validation_started", validated_at: new Date().toISOString() })
        .eq("id", signer.id);

      await supabase.from("document_events").insert({
        document_id: signer.document_id,
        signer_id: signer.id,
        evento: "validacao_iniciada",
        descricao: "CPF e data de nascimento validados",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: SEND_CODE
    if (action === "send_code") {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supabase.from("document_signers")
        .update({ validation_code: code, validation_code_expires_at: expiresAt, status: "code_sent" })
        .eq("id", signer.id);

      await supabase.from("document_events").insert({
        document_id: signer.document_id,
        signer_id: signer.id,
        evento: "codigo_enviado",
        descricao: `Codigo de confirmacao enviado para ${signer.email || "e-mail nao cadastrado"}`,
      });

      console.log(`[SIGN-DOCUMENT] Code for ${signer.nome_completo}: ${code}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: VERIFY_CODE
    if (action === "verify_code") {
      const { code } = body;
      if (signer.validation_code !== code) {
        return new Response(JSON.stringify({ success: false, error: "Codigo invalido" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (signer.validation_code_expires_at && new Date(signer.validation_code_expires_at) < new Date()) {
        return new Response(JSON.stringify({ success: false, error: "Codigo expirado. Solicite um novo." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("document_signers")
        .update({ status: "validated", validation_code: null, validation_code_expires_at: null })
        .eq("id", signer.id);

      await supabase.from("document_events").insert({
        document_id: signer.document_id,
        signer_id: signer.id,
        evento: "codigo_confirmado",
        descricao: "Codigo de confirmacao verificado com sucesso",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: SIGN
    if (action === "sign") {
      const { selfie_url, ip_address, user_agent, location_lat, location_lng, location_text } = body;
      const now = new Date();
      const signedAt = now.toISOString();

      // 1. Update signer record
      await supabase.from("document_signers")
        .update({
          status: "signed",
          signed_at: signedAt,
          selfie_url: selfie_url || null,
          ip_address: ip_address || null,
          user_agent: user_agent || null,
          location_lat: location_lat || null,
          location_lng: location_lng || null,
          location_text: location_text || null,
        })
        .eq("id", signer.id);

      // 2. Determine which placeholders to fill
      const varPrefix = PAPEL_VAR_MAP[signer.papel] || "cliente";
      const geoText = location_text || (location_lat && location_lng ? `${location_lat}, ${location_lng}` : "Nao disponivel");

      const signatureValues: Record<string, string> = {
        [`data_assinatura_${varPrefix}`]: fmtDateBR(now),
        [`hora_assinatura_${varPrefix}`]: fmtTimeBR(now),
        [`geolocalizacao_${varPrefix}`]: geoText,
        [`selfie_${varPrefix}`]: selfie_url || "Capturada",
      };

      // 3. Get current document
      const { data: docData } = await supabase
        .from("generated_documents")
        .select("html_content, rendered_variables_json")
        .eq("id", signer.document_id)
        .single();

      let updatedHtml = docData?.html_content || "";
      const snapshot = (docData?.rendered_variables_json as Record<string, any>) || {};

      for (const [varName, value] of Object.entries(signatureValues)) {
        const placeholder = `{{${varName}}}`;
        updatedHtml = updatedHtml.replaceAll(placeholder, value);
        snapshot[varName] = {
          value,
          source: "signature",
          status: "filled",
          filled_at: signedAt,
          signer_id: signer.id,
          signer_name: signer.nome_completo,
        };
      }

      // 4. Log signature event
      const eventName = varPrefix === "vendedor" ? "assinatura_vendedor_concluida" : "assinatura_cliente_concluida";
      await supabase.from("document_events").insert({
        document_id: signer.document_id,
        signer_id: signer.id,
        evento: eventName,
        descricao: `${signer.nome_completo} (${signer.papel}) assinou o documento`,
        metadata_json: {
          ip_address, user_agent, location_lat, location_lng, location_text,
          selfie_url, signed_at: signedAt,
        },
      });

      // 5. Check if all required signers have signed
      const { data: allSigners } = await supabase
        .from("document_signers")
        .select("*")
        .eq("document_id", signer.document_id);

      const required = (allSigners || []).filter((s: any) => s.obrigatorio);
      const signedRequired = required.filter((s: any) => s.status === "signed" || s.id === signer.id);
      const allRequiredSigned = signedRequired.length >= required.length;

      let newDocStatus = "partially_signed";
      if (allRequiredSigned) {
        newDocStatus = "signed";
      }

      const docUpdate: Record<string, any> = {
        status: newDocStatus,
        html_content: updatedHtml,
        rendered_variables_json: snapshot,
      };

      if (allRequiredSigned) {
        docUpdate.signed_at = signedAt;

        const validationCode = `ACD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        docUpdate.validation_code = validationCode;

        // Log final event
        await supabase.from("document_events").insert({
          document_id: signer.document_id,
          evento: "documento_assinado_finalizado",
          descricao: "Todas as assinaturas obrigatorias foram concluidas. Documento finalizado.",
          metadata_json: {
            total_signers: (allSigners || []).length,
            required_signers: required.length,
            finalized_at: signedAt,
          },
        });

        // 7. Generate final signed PDF with audit page
        const { data: fullDoc } = await supabase
          .from("generated_documents")
          .select("*")
          .eq("id", signer.document_id)
          .single();

        if (fullDoc?.pdf_url) {
          try {
            const pdfResp = await fetch(fullDoc.pdf_url);
            if (pdfResp.ok) {
              const pdfBytes = await pdfResp.arrayBuffer();

              // Load PDF and append audit page
              const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

              // Fetch events for audit page
              const { data: eventsData } = await supabase
                .from("document_events")
                .select("*")
                .eq("document_id", signer.document_id)
                .order("created_at", { ascending: true });

              const siteUrl = Deno.env.get("SITE_URL") || supabaseUrl.replace("supabase.co", "lovable.app").replace("/rest/v1", "");
              const publicUrl = `${siteUrl}/validar-documento/${validationCode}`;

              // Compute hash before adding audit page (hash of original signed content)
              const hashBuffer = await crypto.subtle.digest("SHA-256", pdfBytes);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
              docUpdate.document_hash = hashHex;

              // Build audit page
              await buildAuditPage(
                pdfDoc,
                { ...fullDoc, signed_at: signedAt },
                allSigners || [],
                eventsData || [],
                validationCode,
                hashHex,
                publicUrl,
              );

              const finalPdfBytes = await pdfDoc.save();

              const signedPath = `signed/${signer.document_id}_${Date.now()}.pdf`;
              const { error: upErr } = await supabase.storage
                .from("contract-pdfs")
                .upload(signedPath, finalPdfBytes, { contentType: "application/pdf" });

              if (!upErr) {
                const { data: urlData } = supabase.storage.from("contract-pdfs").getPublicUrl(signedPath);
                docUpdate.signed_pdf_url = urlData.publicUrl;
              }
            }
          } catch (pdfErr) {
            console.error("[sign-document] Failed to generate signed PDF with audit page:", pdfErr);
          }
        }

        // Log validation event
        await supabase.from("document_events").insert({
          document_id: signer.document_id,
          evento: "documento_validacao_gerada",
          descricao: `Codigo de validacao e hash gerados: ${validationCode}`,
          metadata_json: {
            validation_code: validationCode,
            document_hash: docUpdate.document_hash || null,
            generated_at: signedAt,
          },
        });
      }

      await supabase.from("generated_documents")
        .update(docUpdate)
        .eq("id", signer.document_id);

      return new Response(JSON.stringify({ success: true, document_status: newDocStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: REJECT
    if (action === "reject") {
      const { reason } = body;

      await supabase.from("document_signers")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          reject_reason: reason || null,
        })
        .eq("id", signer.id);

      await supabase.from("document_events").insert({
        document_id: signer.document_id,
        signer_id: signer.id,
        evento: "assinatura_recusada",
        descricao: `${signer.nome_completo} recusou a assinatura${reason ? `: ${reason}` : ""}`,
      });

      await supabase.from("generated_documents")
        .update({ status: "rejected" })
        .eq("id", signer.document_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Acao invalida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[sign-document]", error);
    return new Response(JSON.stringify({ success: false, error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
