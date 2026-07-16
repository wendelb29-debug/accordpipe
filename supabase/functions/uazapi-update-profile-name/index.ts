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

    const body = await req.json().catch(() => ({}));
    const tenant_id = body?.tenant_id;
    const name = String(body?.name ?? "").trim();

    if (!tenant_id) return json({ error: "tenant_id required" }, 400);
    if (!name) return json({ error: "name required" }, 400);
    if (name.length > 25) return json({ error: "name must be at most 25 characters" }, 400);

    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "no_instance" }, 400);
    if (row.status !== "connected") {
      return json({ error: "instance_not_connected" }, 409);
    }

    try {
      await callUazapi("/profile/name", {
        method: "POST",
        token: row.uazapi_token,
        body: { name },
      });
    } catch (e: any) {
      return json({
        error: "uazapi_failed",
        detail: e?.data ?? e?.message ?? String(e),
      }, 502);
    }

    const svc = serviceClient();
    await svc
      .from("whatsapp_instances")
      .update({ profile_name: name })
      .eq("id", row.id);

    return json({ ok: true, profile_name: name });
  } catch (e: any) {
    console.error("uazapi-update-profile-name:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
