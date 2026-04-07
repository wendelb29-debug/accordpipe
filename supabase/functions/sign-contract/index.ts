import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

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

    const clientIp = getClientIp(req);
    const signedAt = new Date().toISOString();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Check contract_signatures table (multi-signer for contracts)
    const { data: sigRecord } = await supabase
      .from("contract_signatures")
      .select("id, contract_id, signer_role, signed_at")
      .eq("signing_token", token)
      .maybeSingle();

    if (sigRecord) {
      if (sigRecord.signed_at) {
        return new Response(
          JSON.stringify({ error: "This signature has already been completed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const contractId = sigRecord.contract_id;
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
      const signatureHash = await generateHash(
        `${contractId}|${signerName || ""}|${signerDocument || ""}|${signedAt}|${clientIp}`
      );

      const { error: updateErr } = await supabase
        .from("contract_signatures")
        .update({
          signed_at: signedAt,
          signature_photo_url: urlData.publicUrl,
          signature_latitude: latitude,
          signature_longitude: longitude,
          signature_address: address,
          signer_name: signerName || null,
          signer_document: signerDocument || null,
          signer_ip: clientIp,
        })
        .eq("id", sigRecord.id);

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: "Failed to update signature" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: allSigs } = await supabase
        .from("contract_signatures")
        .select("signed_at")
        .eq("contract_id", contractId);

      const allSigned = allSigs && allSigs.every((s: any) => s.signed_at !== null);

      if (allSigned) {
        const { data: contractData } = await supabase
          .from("contracts")
          .select("contract_content, code")
          .eq("id", contractId)
          .single();

        const documentHash = await generateHash(
          `${contractId}|${contractData?.contract_content || ""}|${signedAt}`
        );
        const validationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

        await supabase
          .from("contracts")
          .update({
            signature_status: "signed",
            signed_at: signedAt,
            document_hash: documentHash,
            validation_code: validationCode,
          })
          .eq("id", contractId);
      }

      return new Response(
        JSON.stringify({ success: true, signature_hash: signatureHash }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check pdf_contract_signers table (public PDF signing flow)
    const { data: pdfSigner } = await supabase
      .from("pdf_contract_signers")
      .select("id, contract_id, name, cpf_cnpj, status, signed_at")
      .eq("signing_token", token)
      .maybeSingle();

    if (pdfSigner) {
      if (pdfSigner.signed_at || pdfSigner.status === "assinado") {
        return new Response(
          JSON.stringify({ error: "This signature has already been completed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const contractId = pdfSigner.contract_id;
      const fileName = `pdf_signer_${pdfSigner.id}_${Date.now()}.jpg`;
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
      const signatureHash = await generateHash(
        `${contractId}|${signerName || pdfSigner.name || ""}|${signerDocument || pdfSigner.cpf_cnpj || ""}|${signedAt}|${clientIp}`
      );

      const { error: updateErr } = await supabase
        .from("pdf_contract_signers")
        .update({
          status: "assinado",
          signed_at: signedAt,
          signature_photo_url: urlData.publicUrl,
          signature_latitude: latitude,
          signature_longitude: longitude,
          signature_address: address,
          signer_ip: clientIp,
        })
        .eq("id", pdfSigner.id);

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: "Failed to update signer" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("pdf_contract_history").insert({
        contract_id: contractId,
        action: "assinado",
        description: [
          `Assinatura realizada por: ${signerName || pdfSigner.name || "—"}`,
          signerDocument || pdfSigner.cpf_cnpj ? `Documento: ${signerDocument || pdfSigner.cpf_cnpj}` : null,
          `Data: ${new Date(signedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
          `IP: ${clientIp}`,
          `Local: ${address || "—"}`,
        ].filter(Boolean).join("\n"),
        created_by_name: signerName || pdfSigner.name || "Agente Externo",
      });

      const { data: allSigners } = await supabase
        .from("pdf_contract_signers")
        .select("status")
        .eq("contract_id", contractId);

      const allSigned = allSigners && allSigners.every((s: any) => s.status === "assinado");

      if (allSigned) {
        const { data: contractData } = await supabase
          .from("pdf_contracts")
          .select("pdf_url, name")
          .eq("id", contractId)
          .single();

        const documentHash = await generateHash(
          `${contractId}|${contractData?.pdf_url || contractData?.name || ""}|${signedAt}`
        );
        const validationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

        await supabase
          .from("pdf_contracts")
          .update({
            status: "assinado",
            document_hash: documentHash,
            validation_code: validationCode,
          })
          .eq("id", contractId);

        await supabase.from("pdf_contract_history").insert({
          contract_id: contractId,
          action: "concluido",
          description: `Todas as assinaturas foram coletadas. Hash: ${documentHash.slice(0, 16)}... Código: ${validationCode}`,
          created_by_name: "Sistema",
        });
      }

      return new Response(
        JSON.stringify({ success: true, signature_hash: signatureHash, photo_url: urlData.publicUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check client_contract_signers table (multi-signer for client_contracts)
    const { data: ccSigner } = await supabase
      .from("client_contract_signers")
      .select("id, contract_id, signer_type, status, signed_at")
      .eq("signing_token", token)
      .maybeSingle();

    if (ccSigner) {
      if (ccSigner.signed_at || ccSigner.status === "assinado") {
        return new Response(
          JSON.stringify({ error: "This signature has already been completed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const contractId = ccSigner.contract_id;
      const fileName = `client_signer_${ccSigner.id}_${Date.now()}.jpg`;
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
      const signatureHash = await generateHash(
        `${contractId}|${signerName || ""}|${signerDocument || ""}|${signedAt}|${clientIp}`
      );

      // Update the signer record
      const { error: updateErr } = await supabase
        .from("client_contract_signers")
        .update({
          status: "assinado",
          signed_at: signedAt,
          signature_photo_url: urlData.publicUrl,
          signature_latitude: latitude,
          signature_longitude: longitude,
          signature_address: address,
          signer_ip: clientIp,
          signer_document: signerDocument || null,
        })
        .eq("id", ccSigner.id);

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: "Failed to update signer" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if all required signers have signed
      const { data: allSigners } = await supabase
        .from("client_contract_signers")
        .select("is_required, status")
        .eq("contract_id", contractId);

      const allRequiredSigned = allSigners &&
        allSigners.filter((s: any) => s.is_required).every((s: any) => s.status === "assinado");

      if (allRequiredSigned) {
        const documentHash = await generateHash(`${contractId}|${signedAt}`);
        const validationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

        // Update client_contracts
        await supabase
          .from("client_contracts")
          .update({
            contract_status: "assinado",
            signed_at: signedAt,
            document_hash: documentHash,
            validation_code: validationCode,
          })
          .eq("id", contractId);

        // Log history
        await supabase.from("client_contract_history").insert({
          contract_id: contractId,
          action: "assinatura_completa",
          description: `Todas as assinaturas obrigatórias foram concluídas.\nHash: ${documentHash}\nCódigo: ${validationCode}`,
          created_by_name: "Sistema",
        });
      }

      // Log individual signature
      await supabase.from("client_contract_history").insert({
        contract_id: contractId,
        action: "assinatura",
        description: [
          `Assinatura realizada por: ${signerName || "—"} (${ccSigner.signer_type})`,
          signerDocument ? `Documento: ${signerDocument}` : null,
          `Data: ${new Date(signedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
          `IP: ${clientIp}`,
          `Local: ${address || "—"}`,
        ].filter(Boolean).join("\n"),
        created_by_name: signerName || "Agente Externo",
      });

      return new Response(
        JSON.stringify({ success: true, signature_hash: signatureHash }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Check client_contracts table (legacy single-signer)
    const { data: clientContract } = await supabase
      .from("client_contracts")
      .select("id, contract_status, client_name, client_cpf, plan_name, monthly_value, servidor_id")
      .eq("signing_token", token)
      .eq("contract_status", "pendente")
      .maybeSingle();

    if (clientContract) {
      const contractId = clientContract.id;
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
      const documentHash = await generateHash(
        `${contractId}|${clientContract.client_name}|${clientContract.client_cpf || ""}|${signedAt}`
      );
      const validationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

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
          document_hash: documentHash,
          validation_code: validationCode,
        })
        .eq("id", contractId)
        .eq("contract_status", "pendente");

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: "Failed to update contract" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const historyDescription = [
        `Contrato assinado digitalmente`,
        `Cliente: ${clientContract.client_name || "—"}`,
        clientContract.client_cpf ? `CPF: ${clientContract.client_cpf}` : null,
        clientContract.plan_name ? `Plano: ${clientContract.plan_name}` : null,
        clientContract.monthly_value ? `Valor: R$ ${Number(clientContract.monthly_value).toFixed(2)}` : null,
        `Assinante: ${signerName || "—"}`,
        signerDocument ? `Documento do assinante: ${signerDocument}` : null,
        `Data da assinatura: ${new Date(signedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
        `IP: ${clientIp}`,
        `Localização: ${address || "—"}`,
        `Hash do documento: ${documentHash}`,
        `Código de validação: ${validationCode}`,
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

    // 5. Legacy single-signer flow (contracts table)
    const { data: contract, error: fetchErr } = await supabase
      .from("contracts")
      .select("id, signature_status, contract_content")
      .eq("signing_token", token)
      .eq("signature_status", "pending")
      .maybeSingle();

    if (fetchErr || !contract) {
      return new Response(
        JSON.stringify({ error: "Contract not found or already signed" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contractId2 = contract.id;
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
    const documentHash = await generateHash(
      `${contractId2}|${contract.contract_content || ""}|${signedAt}`
    );
    const validationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

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
        document_hash: documentHash,
        validation_code: validationCode,
      })
      .eq("signing_token", token)
      .eq("signature_status", "pending");

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: "Failed to update contract" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
