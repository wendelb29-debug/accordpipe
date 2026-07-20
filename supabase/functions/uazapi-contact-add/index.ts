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

// Adds a number to the WhatsApp phone agenda. Local upsert is done by the client.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;
    const { tenant_id, number, name } = await req.json();
    if (!tenant_id || !number || !name) return json({ error: "tenant_id, number, name required" }, 400);
    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const phone = normalizePhone(number);
    if (!phone) return json({ error: "invalid_phone" }, 400);

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const data = await callUazapi("/contact/add", {
      method: "POST",
      token: row.uazapi_token,
      body: { number: phone, name },
    });
    return json({ ok: true, data });
  } catch (e: any) {
    console.error("uazapi-contact-add:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
