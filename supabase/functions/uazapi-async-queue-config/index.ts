// Onda 22 — Configura o intervalo (min/máx em segundos) entre envios assíncronos.
// Endpoint: POST /instance/updatemsgdelay com { msg_delay_min, msg_delay_max }.
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
    const msg_delay_min = Number(body?.msg_delay_min);
    const msg_delay_max = Number(body?.msg_delay_max);
    if (!tenant_id) return json({ error: "tenant_id required" }, 400);
    if (!Number.isFinite(msg_delay_min) || msg_delay_min < 0) {
      return json({ error: "msg_delay_min must be >= 0" }, 400);
    }
    if (!Number.isFinite(msg_delay_max) || msg_delay_max < 0) {
      return json({ error: "msg_delay_max must be >= 0" }, 400);
    }
    if (msg_delay_max < msg_delay_min) {
      return json({ error: "msg_delay_max must be >= msg_delay_min" }, 400);
    }
    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;
    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);
    const result = await callUazapi("/instance/updatemsgdelay", {
      method: "POST", token: row.uazapi_token,
      body: { msg_delay_min, msg_delay_max },
    });
    return json({ ok: true, result });
  } catch (e: any) {
    console.error("uazapi-async-queue-config:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
