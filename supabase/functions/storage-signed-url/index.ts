import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIVATE_BUCKETS = ["contract-pdfs", "signatures", "user-signatures"];

function parseStorageUrl(url: string): { bucket: string; path: string } | null {
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

async function createSignedUrlFromStorageUrl(
  supabase: ReturnType<typeof createClient>,
  storageUrl: string,
  expiresIn = 3600,
): Promise<string | null> {
  const parsed = parseStorageUrl(storageUrl);
  if (!parsed) return storageUrl; // Not a private bucket URL, return as-is
  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { token, context, bucket, path } = body;

    // Authenticated flow: bucket + path with JWT validation
    if (bucket && path) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const jwt = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Public token-based flow
    if (!token || !context) {
      return new Response(JSON.stringify({ error: "Missing token or context" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fileUrl: string | null = null;

    if (context === "pdf_contract") {
      const { data } = await supabase.rpc("get_pdf_signer_by_token", { p_token: token });
      const signerData = (data as any[])?.[0];
      if (signerData) {
        const { data: contract } = await supabase
          .from("pdf_contracts")
          .select("pdf_url, pdf_path, pdf_assinado_url, pdf_assinado_path")
          .eq("id", signerData.contract_id)
          .single();
        fileUrl = contract?.pdf_url || null;
      }
    } else if (context === "contract") {
      // Check contract_signatures first
      const { data: sigData } = await supabase
        .from("contract_signatures")
        .select("contract_id")
        .eq("signing_token", token)
        .maybeSingle();

      if (sigData) {
        const { data: contract } = await supabase
          .from("contracts")
          .select("pdf_url")
          .eq("id", sigData.contract_id)
          .maybeSingle();
        fileUrl = contract?.pdf_url || null;
      }

      // Fallback: contracts table signing_token
      if (!fileUrl) {
        const { data: contract } = await supabase
          .from("contracts")
          .select("pdf_url")
          .eq("signing_token", token)
          .maybeSingle();
        fileUrl = contract?.pdf_url || null;
      }
    } else if (context === "document") {
      const { data } = await supabase.rpc("get_document_by_signer_token", { p_token: token });
      const docData = (data as any[])?.[0];
      if (docData) {
        fileUrl = docData.pdf_url || null;
      }
    }

    if (!fileUrl) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signedUrl = await createSignedUrlFromStorageUrl(supabase, fileUrl, 3600);
    if (!signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to generate signed URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
