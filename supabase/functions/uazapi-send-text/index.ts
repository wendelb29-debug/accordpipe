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
    const { tenant_id, lead_id, number, text } = await req.json();
    if (!tenant_id || !number || !text)
      return json({ error: "tenant_id, number and text required" }, 400);
    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const data = await callUazapi("/send/text", {
      method: "POST",
      token: row.uazapi_token,
      body: {
        number: normalizePhone(number),
        text,
        readchat: true,
        track_source: "accord",
        track_id: lead_id ?? null,
      },
    });

    return json({ ok: true, message: data });
  } catch (e: any) {
    console.error("uazapi-send-text:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
