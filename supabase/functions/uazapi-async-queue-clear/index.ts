// Onda 22 — Limpa a fila assíncrona de envio direto (marca pendentes como Canceled).
// Endpoint: POST /message/queue/clear (uazapi "Limpar fila async de envio direto").
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
    const tenant_id = String(body?.tenant_id ?? "");
    if (!tenant_id) return json({ error: "tenant_id required" }, 400);
    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;
    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);
    const result = await callUazapi("/message/queue/clear", {
      method: "POST", token: row.uazapi_token, body: {},
    });
    return json({ ok: true, result });
  } catch (e: any) {
    console.error("uazapi-async-queue-clear:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
