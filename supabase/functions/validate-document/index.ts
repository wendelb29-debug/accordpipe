import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const hash = url.searchParams.get("hash");

    if (!code && !hash) {
      return new Response(
        JSON.stringify({ error: "Missing code or hash parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Search in contracts table
    let contract: any = null;
    let contractType = "";

    if (code) {
      const { data: c1 } = await supabase
        .from("contracts")
        .select("id, code, signature_status, signed_at, created_at, document_hash, validation_code, contract_content")
        .eq("validation_code", code)
        .maybeSingle();
      if (c1) { contract = c1; contractType = "contract"; }
    }

    if (!contract && hash) {
      const { data: c2 } = await supabase
        .from("contracts")
        .select("id, code, signature_status, signed_at, created_at, document_hash, validation_code, contract_content")
        .eq("document_hash", hash)
        .maybeSingle();
      if (c2) { contract = c2; contractType = "contract"; }
    }

    // Search client_contracts if not found
    if (!contract && code) {
      const { data: cc1 } = await supabase
        .from("client_contracts")
        .select("id, contract_status, signed_at, created_at, document_hash, validation_code, client_name, signer_name, signer_document")
        .eq("validation_code", code)
        .maybeSingle();
      if (cc1) { contract = cc1; contractType = "client_contract"; }
    }

    if (!contract && hash) {
      const { data: cc2 } = await supabase
        .from("client_contracts")
        .select("id, contract_status, signed_at, created_at, document_hash, validation_code, client_name, signer_name, signer_document")
        .eq("document_hash", hash)
        .maybeSingle();
      if (cc2) { contract = cc2; contractType = "client_contract"; }
    }

    // Search pdf_contracts if not found
    if (!contract && code) {
      const { data: pc1 } = await supabase
        .from("pdf_contracts")
        .select("id, status, created_at, document_hash, validation_code, name")
        .eq("validation_code", code)
        .maybeSingle();
      if (pc1) { contract = pc1; contractType = "pdf_contract"; }
    }

    if (!contract && hash) {
      const { data: pc2 } = await supabase
        .from("pdf_contracts")
        .select("id, status, created_at, document_hash, validation_code, name")
        .eq("document_hash", hash)
        .maybeSingle();
      if (pc2) { contract = pc2; contractType = "pdf_contract"; }
    }

    if (!contract) {
      return new Response(
        JSON.stringify({ valid: false, error: "Documento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get signers for contracts
    let signers: any[] = [];
    if (contractType === "contract") {
      const { data: sigs } = await supabase
        .from("contract_signatures")
        .select("signer_name, signer_role, signed_at, signer_document, signer_ip")
        .eq("contract_id", contract.id)
        .order("created_at", { ascending: true });
      signers = (sigs || []).map((s: any) => ({
        name: s.signer_name || "—",
        role: s.signer_role || "signatário",
        signed_at: s.signed_at,
        document_masked: s.signer_document
          ? s.signer_document.replace(/(\d{3})\.\d{3}\.\d{3}(-\d{2})/, "$1.***.***$2")
          : null,
      }));
    } else if (contractType === "pdf_contract") {
      const { data: pdfSigs } = await supabase
        .from("pdf_contract_signers")
        .select("name, signed_at, cpf_cnpj, signer_ip, status")
        .eq("contract_id", contract.id)
        .order("sign_order", { ascending: true });
      signers = (pdfSigs || []).filter((s: any) => s.status === "assinado").map((s: any) => ({
        name: s.name || "—",
        role: "signatário",
        signed_at: s.signed_at,
        document_masked: s.cpf_cnpj
          ? s.cpf_cnpj.replace(/(\d{3})\.\d{3}\.\d{3}(-\d{2})/, "$1.***.***$2")
          : null,
      }));
    } else {
      signers = [{
        name: contract.signer_name || contract.client_name || "—",
        role: "signatário",
        signed_at: contract.signed_at,
        document_masked: contract.signer_document
          ? contract.signer_document.replace(/(\d{3})\.\d{3}\.\d{3}(-\d{2})/, "$1.***.***$2")
          : null,
      }];
    }

    const isSigned = contractType === "contract"
      ? contract.signature_status === "signed"
      : contractType === "pdf_contract"
      ? contract.status === "assinado"
      : contract.contract_status === "assinado";

    return new Response(
      JSON.stringify({
        valid: true,
        status: isSigned ? "signed" : "pending",
        document_id: contract.code || contract.id,
        created_at: contract.created_at,
        signed_at: contract.signed_at,
        document_hash: contract.document_hash,
        validation_code: contract.validation_code,
        signers,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
