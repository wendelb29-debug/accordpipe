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

    // First try to find by contract signing_token (legacy)
    let contractData = null;
    let signerRole = null;

    // Check contract_signatures table first (new multi-signer flow)
    const { data: sigData } = await supabase
      .from("contract_signatures")
      .select("contract_id, signer_role, signer_name, signer_document, signed_at")
      .eq("signing_token", token)
      .maybeSingle();

    if (sigData) {
      signerRole = sigData.signer_role;
      const { data, error } = await supabase
        .from("contracts")
        .select(
          "id, code, contract_content, signature_status, signed_at, companies(razao_social, nome_fantasia, cnpj, responsavel, endereco, numero, complemento, bairro, cidade, estado, cep, email, telefone)"
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

    if (!contractData) {
      // Fallback: legacy single-signer token on contracts table
      const { data, error } = await supabase
        .from("contracts")
        .select(
          "id, code, contract_content, signature_status, signing_token, signed_at, signature_photo_url, companies(razao_social, nome_fantasia, cnpj, responsavel, endereco, numero, complemento, bairro, cidade, estado, cep, email, telefone)"
        )
        .eq("signing_token", token)
        .maybeSingle();

      if (!error && data) {
        contractData = { ...data, signer_role: "revendedor" };
      }
    }

    // Check client_contracts table
    if (!contractData) {
      const { data: clientContract, error: ccErr } = await supabase
        .from("client_contracts")
        .select("id, client_name, client_cpf, plan_name, monthly_value, contract_content, contract_status, signing_token, signed_at, signature_photo_url, signer_name, signer_document, servidor_id")
        .eq("signing_token", token)
        .maybeSingle();

      if (!ccErr && clientContract) {
        // Fetch company info for display
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

    // Also fetch all signatures for this contract (only for contracts table)
    if (!contractData.is_client_contract) {
      const { data: allSigs } = await supabase
        .from("contract_signatures")
        .select("signer_role, signer_name, signed_at, signature_photo_url, signature_address")
        .eq("contract_id", contractData.id)
        .order("created_at");

      contractData.signatures = allSigs || [];
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
