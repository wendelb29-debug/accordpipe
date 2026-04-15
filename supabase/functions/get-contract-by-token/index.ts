import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIVATE_BUCKETS = ["contract-pdfs", "signatures", "user-signatures"];

function parsePrivateStorageUrl(url: string): { bucket: string; path: string } | null {
  if (!url) return null;
  for (const bucket of PRIVATE_BUCKETS) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const path = decodeURIComponent(url.substring(idx + marker.length).split("?")[0]);
      return { bucket, path };
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string" || token.length < 10) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let contractData = null;

    // 1. Check contract_signatures table (multi-signer flow for contracts table)
    const { data: sigData } = await supabase
      .from("contract_signatures")
      .select("contract_id, signer_role, signer_name, signer_document, signed_at")
      .eq("signing_token", token)
      .maybeSingle();

    if (sigData) {
      const { data, error } = await supabase
        .from("contracts")
        .select(
          "id, code, contract_content, pdf_url, signature_status, signed_at, companies(razao_social, nome_fantasia, cnpj, responsavel, endereco, numero, complemento, bairro, cidade, estado, cep, email, telefone)"
        )
        .eq("id", sigData.contract_id)
        .maybeSingle();

      if (!error && data) {
        contractData = {
          ...data,
          signer_role: sigData.signer_role,
          signer_signed_at: sigData.signed_at,
          signer_name: sigData.signer_name,
          signer_document: sigData.signer_document,
        };
      }
    }

    // 2. Check client_contract_signers table (multi-signer flow for client_contracts)
    if (!contractData) {
      const { data: ccSigner } = await supabase
        .from("client_contract_signers")
        .select("id, contract_id, name, email, signer_type, signer_document, status, signed_at, signature_photo_url")
        .eq("signing_token", token)
        .maybeSingle();

      if (ccSigner) {
        // The contract_id may reference contracts OR client_contracts table
        // Try client_contracts first
        const { data: clientContract } = await supabase
          .from("client_contracts")
          .select("id, client_name, client_cpf, plan_name, monthly_value, contract_content, contract_status, signed_at, servidor_id")
          .eq("id", ccSigner.contract_id)
          .maybeSingle();

        if (clientContract) {
          const { data: company } = await supabase
            .from("companies")
            .select("razao_social, nome_fantasia, cnpj, responsavel, endereco, numero, complemento, bairro, cidade, estado, cep, email, telefone")
            .eq("id", clientContract.servidor_id)
            .maybeSingle();

          // Fetch all signers for progress display
          const { data: allSigners } = await supabase
            .from("client_contract_signers")
            .select("name, signer_type, status, signed_at, signature_photo_url")
            .eq("contract_id", ccSigner.contract_id)
            .order("sign_order");

          contractData = {
            id: clientContract.id,
            code: `CC-${clientContract.id.substring(0, 8).toUpperCase()}`,
            contract_content: clientContract.contract_content,
            signature_status: clientContract.contract_status === "pendente" ? "pending" : clientContract.contract_status,
            signed_at: clientContract.signed_at,
            signer_role: ccSigner.signer_type,
            signer_name: ccSigner.name,
            signer_document: ccSigner.signer_document,
            signer_signed_at: ccSigner.signed_at,
            companies: company,
            is_client_contract: true,
            is_multi_signer: true,
            signer_id: ccSigner.id,
            client_name: clientContract.client_name,
            client_cpf: clientContract.client_cpf,
            plan_name: clientContract.plan_name,
            monthly_value: clientContract.monthly_value,
            signatures: (allSigners || []).map(s => ({
              signer_role: s.signer_type,
              signer_name: s.name,
              signed_at: s.signed_at,
              signature_photo_url: s.signature_photo_url,
              signature_address: null,
            })),
          };
        } else {
          // Try contracts table
          const { data: contract } = await supabase
            .from("contracts")
            .select(
              "id, code, contract_content, pdf_url, signature_status, signed_at, companies(razao_social, nome_fantasia, cnpj, responsavel, endereco, numero, complemento, bairro, cidade, estado, cep, email, telefone)"
            )
            .eq("id", ccSigner.contract_id)
            .maybeSingle();

          if (contract) {
            contractData = {
              ...contract,
              signer_role: ccSigner.signer_type,
              signer_name: ccSigner.name,
              signer_document: ccSigner.signer_document,
              signer_signed_at: ccSigner.signed_at,
              is_multi_signer: true,
              signer_id: ccSigner.id,
            };
          }
        }
      }
    }

    // 3. Fallback: legacy single-signer token on contracts table
    if (!contractData) {
      const { data, error } = await supabase
        .from("contracts")
        .select(
          "id, code, contract_content, pdf_url, signature_status, signing_token, signed_at, signature_photo_url, companies(razao_social, nome_fantasia, cnpj, responsavel, endereco, numero, complemento, bairro, cidade, estado, cep, email, telefone)"
        )
        .eq("signing_token", token)
        .maybeSingle();

      if (!error && data) {
        contractData = { ...data, signer_role: "revendedor" };
      }
    }

    // 4. Check client_contracts table (legacy single-signer)
    if (!contractData) {
      const { data: clientContract, error: ccErr } = await supabase
        .from("client_contracts")
        .select("id, client_name, client_cpf, plan_name, monthly_value, contract_content, contract_status, signing_token, signed_at, signature_photo_url, signer_name, signer_document, servidor_id")
        .eq("signing_token", token)
        .maybeSingle();

      if (!ccErr && clientContract) {
        const { data: company } = await supabase
          .from("companies")
          .select("razao_social, nome_fantasia, cnpj, responsavel, endereco, numero, complemento, bairro, cidade, estado, cep, email, telefone")
          .eq("id", clientContract.servidor_id)
          .maybeSingle();

        contractData = {
          id: clientContract.id,
          code: `CC-${clientContract.id.substring(0, 8).toUpperCase()}`,
          contract_content: clientContract.contract_content,
          signature_status: clientContract.contract_status === "pendente" ? "pending" : clientContract.contract_status,
          signed_at: clientContract.signed_at,
          signer_role: "cliente",
          signer_name: clientContract.signer_name,
          signer_document: clientContract.signer_document,
          signer_signed_at: clientContract.signed_at,
          companies: company,
          is_client_contract: true,
          client_name: clientContract.client_name,
          client_cpf: clientContract.client_cpf,
          plan_name: clientContract.plan_name,
          monthly_value: clientContract.monthly_value,
        };
      }
    }

    if (!contractData) {
      return new Response(
        JSON.stringify({ error: "Contract not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all signatures for contracts table (if not already loaded)
    if (!contractData.is_client_contract && !contractData.signatures) {
      const { data: allSigs } = await supabase
        .from("contract_signatures")
        .select("signer_role, signer_name, signed_at, signature_photo_url, signature_address")
        .eq("contract_id", contractData.id)
        .order("created_at");

      contractData.signatures = allSigs || [];
    }

    // Generate signed URLs for private bucket files
    if (contractData.pdf_url) {
      const parsed = parsePrivateStorageUrl(contractData.pdf_url);
      if (parsed) {
        const { data: signedData } = await supabase.storage
          .from(parsed.bucket)
          .createSignedUrl(parsed.path, 3600);
        if (signedData?.signedUrl) {
          contractData.pdf_url = signedData.signedUrl;
        }
      }
    }

    return new Response(JSON.stringify(contractData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
