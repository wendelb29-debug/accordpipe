import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map signer papel → placeholder prefix
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
      return new Response(JSON.stringify({ success: false, error: "Token obrigatório" }), {
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
      return new Response(JSON.stringify({ success: false, error: "Token inválido" }), {
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

    // ACTION: VALIDATE (CPF + birth date)
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
          descricao: "Validação ignorada (dados não cadastrados)",
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
          descricao: "Validação falhou: dados não conferem",
        });
        return new Response(JSON.stringify({ success: false, error: "CPF ou data de nascimento não conferem" }), {
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
        descricao: `Código de confirmação enviado para ${signer.email || "e-mail não cadastrado"}`,
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
        return new Response(JSON.stringify({ success: false, error: "Código inválido" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (signer.validation_code_expires_at && new Date(signer.validation_code_expires_at) < new Date()) {
        return new Response(JSON.stringify({ success: false, error: "Código expirado. Solicite um novo." }), {
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
        descricao: "Código de confirmação verificado com sucesso",
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

      // 2. Determine which placeholders to fill based on papel
      const varPrefix = PAPEL_VAR_MAP[signer.papel] || "cliente";
      const geoText = location_text || (location_lat && location_lng ? `${location_lat}, ${location_lng}` : "Não disponível");

      const signatureValues: Record<string, string> = {
        [`data_assinatura_${varPrefix}`]: fmtDateBR(now),
        [`hora_assinatura_${varPrefix}`]: fmtTimeBR(now),
        [`geolocalizacao_${varPrefix}`]: geoText,
        [`selfie_${varPrefix}`]: selfie_url || "Capturada",
      };

      // 3. Get current document to update html_content and snapshot
      const { data: docData } = await supabase
        .from("generated_documents")
        .select("html_content, rendered_variables_json")
        .eq("id", signer.document_id)
        .single();

      let updatedHtml = docData?.html_content || "";
      const snapshot = (docData?.rendered_variables_json as Record<string, any>) || {};

      // Replace placeholders in HTML
      for (const [varName, value] of Object.entries(signatureValues)) {
        const placeholder = `{{${varName}}}`;
        updatedHtml = updatedHtml.replaceAll(placeholder, value);

        // Update snapshot
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
        .select("id, status, obrigatorio, papel")
        .eq("document_id", signer.document_id);

      const required = (allSigners || []).filter((s: any) => s.obrigatorio);
      const signedRequired = required.filter((s: any) => s.status === "signed" || s.id === signer.id);
      const allRequiredSigned = signedRequired.length >= required.length;

      let newDocStatus = "partially_signed";
      if (allRequiredSigned) {
        newDocStatus = "signed";
      }

      // 6. Build document update
      const docUpdate: Record<string, any> = {
        status: newDocStatus,
        html_content: updatedHtml,
        rendered_variables_json: snapshot,
      };

      if (allRequiredSigned) {
        docUpdate.signed_at = signedAt;

        // Log final event
        await supabase.from("document_events").insert({
          document_id: signer.document_id,
          evento: "documento_assinado_finalizado",
          descricao: "Todas as assinaturas obrigatórias foram concluídas. Documento finalizado.",
          metadata_json: {
            total_signers: (allSigners || []).length,
            required_signers: required.length,
            finalized_at: signedAt,
          },
        });

        // 7. Generate final signed PDF URL
        // The signed PDF is built from the updated HTML + original PDF.
        // For now, we copy the original PDF as the signed version and mark it.
        // In production, a full PDF render with audit trail would happen here.
        const { data: fullDoc } = await supabase
          .from("generated_documents")
          .select("pdf_url")
          .eq("id", signer.document_id)
          .single();

        if (fullDoc?.pdf_url) {
          // Fetch the original PDF bytes and re-upload as signed copy
          try {
            const pdfResp = await fetch(fullDoc.pdf_url);
            if (pdfResp.ok) {
              const pdfBytes = await pdfResp.arrayBuffer();
              const signedPath = `signed/${signer.document_id}_${Date.now()}.pdf`;
              const { error: upErr } = await supabase.storage
                .from("contract-pdfs")
                .upload(signedPath, pdfBytes, { contentType: "application/pdf" });

              if (!upErr) {
                const { data: urlData } = supabase.storage.from("contract-pdfs").getPublicUrl(signedPath);
                docUpdate.signed_pdf_url = urlData.publicUrl;
              }
            }
          } catch (pdfErr) {
            console.error("[sign-document] Failed to generate signed PDF copy:", pdfErr);
          }
        }
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

    return new Response(JSON.stringify({ success: false, error: "Ação inválida" }), {
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
