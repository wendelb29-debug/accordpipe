// Alias endpoint for batch checks (same logic as uazapi-check-number).
export {};
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  callUazapi,
  corsHeaders,
  getInstanceRow,
  json,
  normalizePhone,
  requireCaller,
  requireTenantMember,
} from "../_shared/uazapi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;
    const { tenant_id, numbers } = await req.json();
    if (!tenant_id || !Array.isArray(numbers))
      return json({ error: "tenant_id and numbers[] required" }, 400);
    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;
    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);
    const list = numbers.map((n: string) => normalizePhone(n)).filter(Boolean);
    const data = await callUazapi("/chat/check", {
      method: "POST",
      token: row.uazapi_token,
      body: { numbers: list },
    });
    return json({ ok: true, result: data });
  } catch (e: any) {
    console.error("uazapi-check-numbers:", e);
    return json({ error: e.message ?? String(e), ok: false }, 200);
  }
});
