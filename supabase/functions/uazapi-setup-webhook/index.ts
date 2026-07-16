import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  callUazapi,
  corsHeaders,
  getInstanceRow,
  json,
  requireCaller,
  requireTenantMember,
} from "../_shared/uazapi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;
    const { tenant_id } = await req.json();
    if (!tenant_id) return json({ error: "tenant_id required" }, 400);
    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_created" }, 400);

    const base = Deno.env.get("SUPABASE_URL") ?? "";
    const webhookUrl = `${base}/functions/v1/uazapi-webhook`;

    const data = await callUazapi("/webhook", {
      method: "POST",
      token: row.uazapi_token,
      body: {
        url: webhookUrl,
        events: ["messages", "messages_update", "connection"],
        excludeMessages: ["wasSentByApi"],
        enabled: true,
      },
    });

    return json({ ok: true, webhook_url: webhookUrl, result: data });
  } catch (e: any) {
    console.error("uazapi-setup-webhook:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
