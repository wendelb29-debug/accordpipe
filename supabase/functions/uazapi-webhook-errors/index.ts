// Onda 7: retorna erros de entrega recentes da uazapi + últimos erros locais salvos.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  callUazapi,
  corsHeaders,
  getInstanceRow,
  json,
  requireCaller,
  requireTenantMember,
  serviceClient,
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

    let remote: any = null;
    let remoteError: string | null = null;
    try {
      remote = await callUazapi("/webhook/errors", { method: "GET", token: row.uazapi_token });
    } catch (e: any) {
      remoteError = e?.message ?? String(e);
    }

    const svc = serviceClient();
    const { data: local } = await svc
      .from("whatsapp_webhook_errors")
      .select("id, event_type, error_message, created_at, payload")
      .eq("tenant_id", tenant_id)
      .order("created_at", { ascending: false })
      .limit(20);

    return json({ ok: true, remote, remote_error: remoteError, local: local ?? [] });
  } catch (e: any) {
    console.error("uazapi-webhook-errors:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
