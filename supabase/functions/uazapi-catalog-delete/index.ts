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

    const body = await req.json().catch(() => ({}));
    const tenant_id = body?.tenant_id;
    const id = String(body?.id ?? "").trim();
    if (!tenant_id) return json({ error: "tenant_id required" }, 400);
    if (!id) return json({ error: "product id required" }, 400);

    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "no_instance" }, 400);
    if (row.status !== "connected") return json({ error: "instance_not_connected" }, 409);

    const data = await callUazapi("/business/catalog/delete", {
      method: "POST",
      token: row.uazapi_token,
      body: { id },
    });
    return json({ ok: true, raw: data });
  } catch (e: any) {
    console.error("uazapi-catalog-delete:", e);
    return json({ error: e?.message ?? String(e), detail: (e as any)?.data ?? null }, 502);
  }
});
