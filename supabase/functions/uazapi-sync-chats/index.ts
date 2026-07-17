// Onda 7 + Onda 19: sincroniza whatsapp_chats a partir de POST /chat/find.
// - Chamada manual: caller autenticado do tenant.
// - Chamada por cron (service-role): itera todos os tenants com instância ativa.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  corsHeaders,
  getInstanceRow,
  json,
  requireCaller,
  requireTenantMember,
  serviceClient,
  syncChatsForInstance,
} from "../_shared/uazapi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isServiceRole = !!serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;

    if (isServiceRole) {
      const svc = serviceClient();
      const { data: instances } = await svc
        .from("whatsapp_instances")
        .select("tenant_id, uazapi_token")
        .not("uazapi_token", "is", null);
      const results: any[] = [];
      for (const inst of instances ?? []) {
        try {
          const r = await syncChatsForInstance(inst.tenant_id, inst.uazapi_token);
          results.push({ tenant_id: inst.tenant_id, ...r });
        } catch (e: any) {
          results.push({ tenant_id: inst.tenant_id, error: e?.message ?? String(e) });
        }
      }
      return json({ ok: true, results });
    }

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
