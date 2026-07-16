// Onda 7: proxy autenticado para GET {base}/webhook — inspeção da config atual.
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

    const data = await callUazapi("/webhook", {
      method: "GET",
      token: row.uazapi_token,
    });
    return json({ ok: true, config: data });
  } catch (e: any) {
    console.error("uazapi-verify-webhook:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
