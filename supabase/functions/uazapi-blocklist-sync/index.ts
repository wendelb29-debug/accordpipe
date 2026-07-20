import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  callUazapi,
  corsHeaders,
  getInstanceRow,
  json,
  normalizePhone,
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
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const data: any = await callUazapi("/chat/blocklist", {
      method: "GET",
      token: row.uazapi_token,
    });
    const list: string[] = (data?.blocklist ?? data?.blocked ?? data?.numbers ?? data ?? [])
      .map((n: any) => normalizePhone(typeof n === "string" ? n : n?.number ?? n?.jid ?? ""))
      .filter(Boolean);

    const svc = serviceClient();
    // Set blocked
    if (list.length > 0) {
      await svc
        .from("whatsapp_contacts")
        .update({ status: "blocked" })
        .eq("company_id", tenant_id)
        .in("phone", list);
    }
    // Unblock any that are no longer in the remote list
    const { data: locallyBlocked } = await svc
      .from("whatsapp_contacts")
      .select("id, phone")
      .eq("company_id", tenant_id)
      .eq("status", "blocked");
    const toUnblock = (locallyBlocked ?? [])
      .filter((c: any) => !list.includes(c.phone))
      .map((c: any) => c.id);
    if (toUnblock.length > 0) {
      await svc.from("whatsapp_contacts").update({ status: "active" }).in("id", toUnblock);
    }

    return json({ ok: true, blockedCount: list.length, unblockedCount: toUnblock.length });
  } catch (e: any) {
    console.error("uazapi-blocklist-sync:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
