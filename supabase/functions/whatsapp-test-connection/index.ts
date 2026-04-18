import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Provider = "zapi" | "uazapi";

interface TestResult {
  success: boolean;
  status: "success" | "error";
  message: string;
  raw?: unknown;
}

// ============ ADAPTERS ============

async function testZapi(serverUrl: string, instanceId: string | null, token: string): Promise<TestResult> {
  if (!instanceId) {
    return { success: false, status: "error", message: "Z-API requer Instance ID" };
  }
  const base = serverUrl.replace(/\/$/, "");
  const url = `${base}/instances/${instanceId}/token/${token}/status`;
  try {
    const res = await fetch(url, { method: "GET" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, status: "error", message: `Z-API HTTP ${res.status}`, raw: body };
    }
    return { success: true, status: "success", message: "Z-API conectada", raw: body };
  } catch (err) {
    return { success: false, status: "error", message: `Falha ao conectar: ${(err as Error).message}` };
  }
}

async function testUazapi(serverUrl: string, token: string): Promise<TestResult> {
  const base = serverUrl.replace(/\/$/, "");
  const url = `${base}/instance/status`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { token, "Content-Type": "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, status: "error", message: `Uazapi HTTP ${res.status}`, raw: body };
    }
    return { success: true, status: "success", message: "Uazapi conectada", raw: body };
  } catch (err) {
    return { success: false, status: "error", message: `Falha ao conectar: ${(err as Error).message}` };
  }
}

// ============ HANDLER ============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { tenant_id, provider_type } = await req.json();

    if (!tenant_id || !provider_type) {
      return new Response(JSON.stringify({ error: "tenant_id and provider_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // load credentials (RLS will restrict)
    const { data: integ, error: loadErr } = await supabase
      .from("tenant_whatsapp_integrations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("provider_type", provider_type)
      .maybeSingle();

    if (loadErr || !integ) {
      return new Response(JSON.stringify({ success: false, message: "Credenciais não encontradas" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!integ.server_url || !integ.instance_token) {
      return new Response(
        JSON.stringify({ success: false, message: "Server URL e Token obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: TestResult;
    if (provider_type === "zapi") {
      result = await testZapi(integ.server_url, integ.instance_id, integ.instance_token);
    } else if (provider_type === "uazapi") {
      result = await testUazapi(integ.server_url, integ.instance_token);
    } else {
      result = { success: false, status: "error", message: "Provider não suportado" };
    }

    // persist test result
    await supabase
      .from("tenant_whatsapp_integrations")
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_status: result.status,
        last_test_message: result.message,
      })
      .eq("id", integ.id);

    // audit
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "whatsapp_connection_tested",
      target_type: "tenant_whatsapp_integration",
      target_id: integ.id,
      servidor_id: tenant_id,
      details: { provider_type, status: result.status, message: result.message },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
