// Onda 22 — Retorna o status da fila assíncrona de envio direto da instância uazapi.
// Endpoint na uazapi: GET /message/queue (retorna resumo da fila async=true).
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

    const data: any = await callUazapi("/message/queue", {
      method: "GET", token: row.uazapi_token,
    });

    // Normaliza campos com nomes variantes.
    const status: string =
      data?.status ?? data?.state ?? "idle";
    const pending = Number(data?.pending ?? data?.queued ?? data?.count ?? 0);
    const processingNow = Number(data?.processingNow ?? data?.processing ?? 0);
    const acceptingNewMessages = Boolean(
      data?.acceptingNewMessages ?? data?.accepting ?? true,
    );
    const sessionReady = Boolean(
      data?.sessionReady ?? data?.ready ?? data?.connected ?? false,
    );
    const resetting = Boolean(data?.resetting ?? false);

    return json({
      ok: true,
      status,
      pending,
      processingNow,
      acceptingNewMessages,
      sessionReady,
      resetting,
      raw: data,
    });
  } catch (e: any) {
    console.error("uazapi-async-queue-status:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
