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

async function rejectUazapi(serverUrl: string, token: string, phone: string) {
  const url = `${serverUrl.replace(/\/$/, "")}/call/reject`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { token, "Content-Type": "application/json" },
      body: JSON.stringify({ number: normalizePhone(phone) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, error: `Uazapi ${res.status}: ${JSON.stringify(body)}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function rejectZapi(serverUrl: string, instanceId: string, token: string, clientToken: string | null, phone: string) {
  const url = `${serverUrl.replace(/\/$/, "")}/instances/${instanceId}/token/${token}/reject-call`;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (clientToken) headers["Client-Token"] = clientToken;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: normalizePhone(phone) }),
    });
    if (!res.ok) return { success: false, error: `Z-API ${res.status}` };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { company_id, phone, call_record_id, rejection_reason } = await req.json().catch(() => ({} as any));

    if (!phone || !company_id) return json({ error: "Dados obrigatórios faltando" }, 400);

    const { data: integ } = await admin
      .from("tenant_whatsapp_integrations")
      .select("*")
      .eq("tenant_id", company_id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!integ) return json({ error: "Integração WhatsApp não configurada" }, 400);

    let result;
    if (integ.provider_type === "zapi" && integ.instance_id) {
      result = await rejectZapi(
        integ.server_url,
        integ.instance_id,
        integ.instance_token,
        (integ as any).client_token || null,
        phone,
      );
    } else {
      result = await rejectUazapi(integ.server_url, integ.instance_token, phone);
    }

    if (!result.success) return json({ error: result.error }, 502);

    if (call_record_id) {
      await admin.rpc("update_whatsapp_call_status", {
        p_call_id: call_record_id,
        p_status: "rejected",
        p_rejection_reason: rejection_reason || "Rejeitada pelo usuário",
      });
    }

    return json({ success: true });
  } catch (err) {
    console.error("whatsapp-reject-call error:", err);
    return json({ error: String(err) }, 500);
  }
});
