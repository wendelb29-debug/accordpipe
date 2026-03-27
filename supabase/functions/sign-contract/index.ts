import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const token = formData.get("token") as string;
    const photo = formData.get("photo") as File;
    const latitude = parseFloat(formData.get("latitude") as string);
    const longitude = parseFloat(formData.get("longitude") as string);
    const address = formData.get("address") as string;
    const signerName = formData.get("signer_name") as string | null;
    const signerDocument = formData.get("signer_document") as string | null;

    if (!token || !photo || isNaN(latitude) || isNaN(longitude)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!photo.type.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "Invalid file type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (photo.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check contract_signatures table first (new multi-signer flow)
    const { data: sigRecord, error: sigErr } = await supabase
      .from("contract_signatures")
      .select("id, contract_id, signer_role, signed_at")
      .eq("signing_token", token)
      .maybeSingle();

    let contractId: string;

    if (sigRecord) {
      // New multi-signer flow
      if (sigRecord.signed_at) {
        return new Response(
          JSON.stringify({ error: "This signature has already been completed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      contractId = sigRecord.contract_id;

      // Upload photo
      const fileName = `${contractId}_${sigRecord.signer_role}_${Date.now()}.jpg`;
      const arrayBuffer = await photo.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from("signatures")
        .upload(fileName, arrayBuffer, { contentType: photo.type });

      if (uploadErr) {
        return new Response(
          JSON.stringify({ error: "Failed to upload photo" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(fileName);

      // Update the signature record
      const { error: updateErr } = await supabase
        .from("contract_signatures")
        .update({
          signed_at: new Date().toISOString(),
          signature_photo_url: urlData.publicUrl,
          signature_latitude: latitude,
          signature_longitude: longitude,
          signature_address: address,
          signer_name: signerName || null,
          signer_document: signerDocument || null,
        })
        .eq("id", sigRecord.id);

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: "Failed to update signature" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if all signatures are now complete
      const { data: allSigs } = await supabase
        .from("contract_signatures")
        .select("signed_at")
        .eq("contract_id", contractId);

      const allSigned = allSigs && allSigs.every((s: any) => s.signed_at !== null);

      if (allSigned) {
        await supabase
          .from("contracts")
          .update({
            signature_status: "signed",
            signed_at: new Date().toISOString(),
          })
          .eq("id", contractId);
      }
    } else {
      // Check client_contracts table
      const { data: clientContract } = await supabase
        .from("client_contracts")
        .select("id, contract_status, client_name, client_cpf, plan_name, monthly_value, servidor_id")
        .eq("signing_token", token)
        .eq("contract_status", "pendente")
        .maybeSingle();

      if (clientContract) {
        // Client contract signing flow
        contractId = clientContract.id;

        const fileName = `client_${contractId}_${Date.now()}.jpg`;
        const arrayBuffer = await photo.arrayBuffer();
        const { error: uploadErr } = await supabase.storage
          .from("signatures")
          .upload(fileName, arrayBuffer, { contentType: photo.type });

        if (uploadErr) {
          return new Response(
            JSON.stringify({ error: "Failed to upload photo" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(fileName);
        const signedAt = new Date().toISOString();

        const { error: updateErr } = await supabase
          .from("client_contracts")
          .update({
            contract_status: "assinado",
            signed_at: signedAt,
            signature_photo_url: urlData.publicUrl,
            signature_latitude: latitude,
            signature_longitude: longitude,
            signature_address: address,
            signer_name: signerName || null,
            signer_document: signerDocument || null,
          })
          .eq("id", contractId)
          .eq("contract_status", "pendente");

        if (updateErr) {
          return new Response(
            JSON.stringify({ error: "Failed to update contract" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Record signing in client_contract_history
        const historyDescription = [
          `Contrato assinado digitalmente`,
          `Cliente: ${clientContract.client_name || "—"}`,
          clientContract.client_cpf ? `CPF: ${clientContract.client_cpf}` : null,
          clientContract.plan_name ? `Plano: ${clientContract.plan_name}` : null,
          clientContract.monthly_value ? `Valor: R$ ${Number(clientContract.monthly_value).toFixed(2)}` : null,
          `Assinante: ${signerName || "—"}`,
          signerDocument ? `Documento do assinante: ${signerDocument}` : null,
          `Data da assinatura: ${new Date(signedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
          `Localização: ${address || "—"}`,
        ].filter(Boolean).join("\n");

        await supabase.from("client_contract_history").insert({
          contract_id: contractId,
          action: "assinatura",
          description: historyDescription,
          created_by_name: signerName || "Agente Externo",
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Legacy single-signer flow (contracts table)
      const { data: contract, error: fetchErr } = await supabase
        .from("contracts")
        .select("id, signature_status")
        .eq("signing_token", token)
        .eq("signature_status", "pending")
        .maybeSingle();

      if (fetchErr || !contract) {
        return new Response(
          JSON.stringify({ error: "Contract not found or already signed" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      contractId = contract.id;

      const fileName = `${contract.id}_${Date.now()}.jpg`;
      const arrayBuffer = await photo.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from("signatures")
        .upload(fileName, arrayBuffer, { contentType: photo.type });

      if (uploadErr) {
        return new Response(
          JSON.stringify({ error: "Failed to upload photo" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(fileName);

      const { error: updateErr } = await supabase
        .from("contracts")
        .update({
          signature_status: "signed",
          signed_at: new Date().toISOString(),
          signature_photo_url: urlData.publicUrl,
          signature_latitude: latitude,
          signature_longitude: longitude,
          signature_address: address,
          signer_name: signerName || null,
          signer_document: signerDocument || null,
        })
        .eq("signing_token", token)
        .eq("signature_status", "pending");

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: "Failed to update contract" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
