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
    const { tenant_id, folder_id, action } = await req.json();
    if (!tenant_id || !folder_id || !action)
      return json({ error: "tenant_id, folder_id, action required" }, 400);
    if (!["stop", "continue", "delete"].includes(action))
      return json({ error: "invalid action" }, 400);
    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const data = await callUazapi("/sender/edit", {
      method: "POST",
      token: row.uazapi_token,
      body: { folder_id, action },
    });

    const svc = serviceClient();
    if (action === "delete") {
      await svc
        .from("whatsapp_campaigns")
        .delete()
        .eq("tenant_id", tenant_id)
        .eq("folder_id", folder_id);
    } else {
      await svc
        .from("whatsapp_campaigns")
        .update({ status: action === "stop" ? "paused" : "sending" })
        .eq("tenant_id", tenant_id)
        .eq("folder_id", folder_id);
    }

    return json({ ok: true, result: data });
  } catch (e: any) {
    console.error("uazapi-campaign-control:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
