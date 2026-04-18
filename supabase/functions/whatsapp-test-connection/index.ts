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
  connection_status?: string; // connected | disconnected | invalid_credentials | pending | unknown
  connected_phone?: string | null;
  raw?: unknown;
}

// ============ ADAPTERS ============

async function testZapi(serverUrl: string, instanceId: string | null, token: string, clientToken?: string | null): Promise<TestResult> {
  if (!instanceId) {
    return { success: false, status: "error", message: "Z-API requer Instance ID", connection_status: "invalid_credentials" };
  }
  const base = serverUrl.replace(/\/$/, "");
  const url = `${base}/instances/${instanceId}/token/${token}/status`;
  try {
    const headers: Record<string, string> = {};
    if (clientToken) headers["Client-Token"] = clientToken;
    const res = await fetch(url, { method: "GET", headers });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        status: "error",
        message: `Z-API HTTP ${res.status}`,
        connection_status: res.status === 401 || res.status === 403 ? "invalid_credentials" : "disconnected",
        raw: body,
      };
    }
    const connected = body?.connected === true;
    return {
      success: true,
      status: "success",
      message: connected ? "Z-API conectada" : "Z-API alcançada mas sem número conectado",
      connection_status: connected ? "connected" : "disconnected",
      connected_phone: body?.session ?? null,
      raw: body,
    };
  } catch (err) {
    return { success: false, status: "error", message: `Falha ao conectar: ${(err as Error).message}`, connection_status: "disconnected" };
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
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        status: "error",
        message: `Uazapi HTTP ${res.status}`,
        connection_status: res.status === 401 || res.status === 403 ? "invalid_credentials" : "disconnected",
        raw: body,
      };
    }
    // Uazapi response shapes vary; try common fields
    const instance = body?.instance ?? body;
    const status = (instance?.status ?? instance?.state ?? "").toString().toLowerCase();
    const connected = ["connected", "online", "open"].some((s) => status.includes(s));
    const phone = instance?.owner ?? instance?.wid ?? instance?.phone ?? instance?.profileName ?? null;
    return {
      success: true,
      status: "success",
      message: connected ? "Uazapi conectada" : `Uazapi alcançada (status: ${status || "desconhecido"})`,
      connection_status: connected ? "connected" : "disconnected",
      connected_phone: typeof phone === "string" ? phone : null,
      raw: body,
    };
  } catch (err) {
    return { success: false, status: "error", message: `Falha ao conectar: ${(err as Error).message}`, connection_status: "disconnected" };
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

    const jwt = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwt);
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
      // Get optional client token from companies (legacy)
      const { data: comp } = await supabase
        .from("companies")
        .select("zapi_client_token")
        .eq("id", tenant_id)
        .maybeSingle();
      result = await testZapi(integ.server_url, integ.instance_id, integ.instance_token, comp?.zapi_client_token ?? null);
    } else if (provider_type === "uazapi") {
      result = await testUazapi(integ.server_url, integ.instance_token);
    } else {
      result = { success: false, status: "error", message: "Provider não suportado", connection_status: "unknown" };
    }

    // persist test result + connection state
    const now = new Date().toISOString();
    await supabase
      .from("tenant_whatsapp_integrations")
      .update({
        last_tested_at: now,
        last_sync_at: now,
        last_test_status: result.status,
        last_test_message: result.message,
        connection_status: result.connection_status ?? "unknown",
        connected_phone: result.connected_phone ?? null,
        last_seen_at: result.connection_status === "connected" ? now : (integ as any).last_seen_at ?? null,
        provider_metadata: result.raw ? { last_status_payload: result.raw } : (integ as any).provider_metadata ?? {},
      })
      .eq("id", integ.id);

    // audit
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "whatsapp_connection_tested",
      target_type: "tenant_whatsapp_integration",
      target_id: integ.id,
      servidor_id: tenant_id,
      details: {
        provider_type,
        status: result.status,
        connection_status: result.connection_status,
        connected_phone: result.connected_phone,
        message: result.message,
      },
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
