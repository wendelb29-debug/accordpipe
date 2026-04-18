// Provider-agnostic outbound message sender (Uazapi + Z-API)
// Loads the active integration of the tenant and dispatches via the proper adapter.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendResult {
  success: boolean;
  message: string;
  external_id?: string;
  raw?: unknown;
}

function normalizePhone(p: string): string {
  return p.replace(/\D/g, "");
}

async function sendUazapi(
  serverUrl: string,
  token: string,
  phone: string,
  text: string,
): Promise<SendResult> {
  const base = serverUrl.replace(/\/$/, "");
  // Uazapi text endpoint
  const url = `${base}/send/text`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { token, "Content-Type": "application/json" },
      body: JSON.stringify({ number: normalizePhone(phone), text }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, message: `Uazapi HTTP ${res.status}: ${JSON.stringify(body).slice(0, 200)}`, raw: body };
    }
    const externalId =
      (body as any)?.id ||
      (body as any)?.messageId ||
      (body as any)?.message?.id ||
      undefined;
    return { success: true, message: "Mensagem enviada via Uazapi", external_id: externalId, raw: body };
  } catch (err) {
    return { success: false, message: `Falha Uazapi: ${(err as Error).message}` };
  }
}

async function sendZapi(
  serverUrl: string,
  instanceId: string,
  token: string,
  clientToken: string | null,
  phone: string,
  text: string,
): Promise<SendResult> {
  const base = serverUrl.replace(/\/$/, "");
  const url = `${base}/instances/${instanceId}/token/${token}/send-text`;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (clientToken) headers["Client-Token"] = clientToken;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: normalizePhone(phone), message: text }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, message: `Z-API HTTP ${res.status}`, raw: body };
    }
    return { success: true, message: "Mensagem enviada via Z-API", external_id: (body as any)?.messageId, raw: body };
  } catch (err) {
    return { success: false, message: `Falha Z-API: ${(err as Error).message}` };
  }
}

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
      { global: { headers: { Authorization: authHeader } } },
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

    const { tenant_id, phone, text, message_id } = await req.json();
    if (!tenant_id || !phone || !text) {
      return new Response(
        JSON.stringify({ error: "tenant_id, phone and text are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Service-role client for status updates regardless of RLS context
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load the ACTIVE integration for this tenant (RLS-respected via user client)
    const { data: integ, error: loadErr } = await supabase
      .from("tenant_whatsapp_integrations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .maybeSingle();

    if (loadErr || !integ) {
      return new Response(
        JSON.stringify({ success: false, message: "Nenhuma integração WhatsApp ativa para este tenant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!integ.server_url || !integ.instance_token) {
      return new Response(
        JSON.stringify({ success: false, message: "Credenciais incompletas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let result: SendResult;
    if (integ.provider_type === "uazapi") {
      result = await sendUazapi(integ.server_url, integ.instance_token, phone, text);
    } else if (integ.provider_type === "zapi") {
      // Z-API also needs client token from companies (legacy field)
      const { data: comp } = await admin
        .from("companies")
        .select("zapi_client_token")
        .eq("id", tenant_id)
        .maybeSingle();
      result = await sendZapi(
        integ.server_url,
        integ.instance_id || "",
        integ.instance_token,
        comp?.zapi_client_token ?? null,
        phone,
        text,
      );
    } else {
      result = { success: false, message: `Provider ${integ.provider_type} não suportado` };
    }

    // Update message status if a message_id was provided
    if (message_id) {
      await admin
        .from("whatsapp_messages")
        .update({
          status: result.success ? "sent" : "failed",
          metadata: { external_id: result.external_id ?? null, provider: integ.provider_type },
        })
        .eq("id", message_id);
    }

    // Audit
    await admin.from("audit_logs").insert({
      user_id: userId,
      action: result.success ? "whatsapp_message_sent" : "whatsapp_message_send_failed",
      target_type: "tenant_whatsapp_integration",
      target_id: integ.id,
      servidor_id: tenant_id,
      details: {
        provider_type: integ.provider_type,
        phone: normalizePhone(phone),
        success: result.success,
        message: result.message,
      },
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
