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
    if (!row?.uazapi_token) return json({ error: "instance_not_created" }, 400);

    const data = await callUazapi("/instance/connect", {
      method: "POST",
      token: row.uazapi_token,
      body: {}, // QR-only flow
    });

    // Update status to connecting
    const svc = serviceClient();
    await svc
      .from("whatsapp_instances")
      .update({ status: "connecting" })
      .eq("id", row.id);

    // uazapi returns { instance: { qrcode: 'data:image/png;base64,...' }, ... }
    const qrcode =
      data?.instance?.qrcode ??
      data?.qrcode ??
      data?.instance?.paircode ??
      null;

    return json({ ok: true, qrcode, raw: data });
  } catch (e: any) {
    console.error("uazapi-connect-instance:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
