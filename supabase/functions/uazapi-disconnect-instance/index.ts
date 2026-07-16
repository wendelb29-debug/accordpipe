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
    if (!row?.uazapi_token) return json({ ok: true, status: "no_instance" });

    try {
      await callUazapi("/instance/disconnect", {
        method: "POST",
        token: row.uazapi_token,
        body: {},
      });
    } catch (err) {
      console.warn("uazapi disconnect error (continuing):", err);
    }

    const svc = serviceClient();
    await svc
      .from("whatsapp_instances")
      .update({ status: "disconnected" })
      .eq("id", row.id);

    return json({ ok: true, status: "disconnected" });
  } catch (e: any) {
    console.error("uazapi-disconnect-instance:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
