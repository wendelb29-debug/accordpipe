import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizePhone = (p: string) => (p || "").replace(/\D/g, "");

async function callUazapi(serverUrl: string, instanceToken: string, phone: string) {
  const url = `${serverUrl.replace(/\/$/, "")}/call/make`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { token: instanceToken, "Content-Type": "application/json" },
      body: JSON.stringify({ number: normalizePhone(phone) }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: `Uazapi ${res.status}: ${JSON.stringify(body)}` };
    return { success: true, callId: body?.id || body?.callId };
  } catch (err) {
    return { success: false, error: `Uazapi connect error: ${String(err)}` };
  }
}

async function callZapi(serverUrl: string, instanceId: string, token: string, clientToken: string | null, phone: string) {
  const url = `${serverUrl.replace(/\/$/, "")}/instances/${instanceId}/token/${token}/send-call`;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (clientToken) headers["Client-Token"] = clientToken;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: normalizePhone(phone) }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: `Z-API ${res.status}: ${JSON.stringify(body)}` };
    return { success: true, callId: body?.callId || body?.id };
  } catch (err) {
    return { success: false, error: `Z-API connect error: ${String(err)}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    // Auth check
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const { contact_id, company_id, workspace_id, phone, contact_name } = body || {};

    if (!phone || !contact_id || !company_id) {
      return json({ error: "Dados obrigatórios faltando (phone, contact_id, company_id)" }, 400);
    }

    const { data: integ, error: integErr } = await admin
      .from("tenant_whatsapp_integrations")
      .select("*")
      .eq("tenant_id", company_id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (integErr || !integ) {
      return json({ error: "Integração WhatsApp não configurada para este tenant" }, 400);
    }

    let result;
    if (integ.provider_type === "zapi" && integ.instance_id) {
      result = await callZapi(
        integ.server_url,
        integ.instance_id,
        integ.instance_token,
        (integ as any).client_token || null,
        phone,
      );
    } else {
      result = await callUazapi(integ.server_url, integ.instance_token, phone);
    }

    if (!result.success) return json({ error: result.error }, 502);

    const { data: callId, error: regErr } = await admin.rpc("register_whatsapp_call", {
      p_contact_id: contact_id,
      p_company_id: company_id,
      p_workspace_id: workspace_id ?? null,
      p_user_id: userData.user.id,
      p_phone: normalizePhone(phone),
      p_name: contact_name ?? null,
      p_call_type: "outgoing",
      p_uazapi_call_id: result.callId ?? null,
    });

    if (regErr) {
      console.error("register_whatsapp_call error:", regErr);
      return json({ success: true, message: "Chamada iniciada (registro falhou)", callId: result.callId });
    }

    return json({ success: true, callId: result.callId, recordId: callId });
  } catch (err) {
    console.error("whatsapp-make-call error:", err);
    return json({ error: String(err) }, 500);
  }
});
