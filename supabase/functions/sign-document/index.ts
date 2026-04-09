import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        // If no CPF/birth stored, skip validation
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

      // In production, send email here. For now, log the code.
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

      await supabase.from("document_signers")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          selfie_url: selfie_url || null,
          ip_address: ip_address || null,
          user_agent: user_agent || null,
          location_lat: location_lat || null,
          location_lng: location_lng || null,
          location_text: location_text || null,
        })
        .eq("id", signer.id);

      await supabase.from("document_events").insert({
        document_id: signer.document_id,
        signer_id: signer.id,
        evento: "assinatura_concluida",
        descricao: `${signer.nome_completo} assinou o documento`,
        metadata_json: { ip_address, user_agent, location_lat, location_lng, selfie_url },
      });

      // Check if all required signers have signed
      const { data: allSigners } = await supabase
        .from("document_signers")
        .select("status, obrigatorio")
        .eq("document_id", signer.document_id);

      const required = (allSigners || []).filter((s: any) => s.obrigatorio);
      const signedRequired = required.filter((s: any) => s.status === "signed");
      const allSigned = (allSigners || []).filter((s: any) => s.status === "signed");

      let newDocStatus = "partially_signed";
      if (signedRequired.length === required.length) {
        newDocStatus = "signed";
      }

      const updateData: any = { status: newDocStatus };
      if (newDocStatus === "signed") {
        updateData.signed_at = new Date().toISOString();
      }

      await supabase.from("generated_documents")
        .update(updateData)
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

      // Update document status to rejected
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
