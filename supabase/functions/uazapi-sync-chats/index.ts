// Onda 7: sincroniza whatsapp_chats a partir de POST /chat/find (uazapiGO).
// Usa helper compartilhado (também chamado pelo auto-sync em uazapi-instance-status).
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  corsHeaders,
  getInstanceRow,
  json,
  requireCaller,
  requireTenantMember,
  syncChatsForInstance,
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
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const { saved, scanned } = await syncChatsForInstance(tenant_id, row.uazapi_token);
    return json({ ok: true, saved, scanned });
  } catch (e: any) {
    console.error("uazapi-sync-chats:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
