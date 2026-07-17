import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  callUazapi,
  corsHeaders,
  getInstanceRow,
  json,
  requireCaller,
  requireTenantMember,
} from "../_shared/uazapi.ts";

/**
 * Onda 23 — Atualiza perfil comercial (partial PATCH-like).
 * Aceita { description?, address?, email? } — só envia os fornecidos.
 * Trata resposta 207 (multi-status) reportando quais campos falharam.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;

    const body = await req.json().catch(() => ({}));
    const tenant_id = body?.tenant_id;
    if (!tenant_id) return json({ error: "tenant_id required" }, 400);

    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "no_instance" }, 400);
    if (row.status !== "connected") return json({ error: "instance_not_connected" }, 409);

    const payload: Record<string, unknown> = {};
    if (typeof body.description === "string") payload.description = body.description;
    if (typeof body.address === "string") payload.address = body.address;
    if (typeof body.email === "string") {
      const email = body.email.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ error: "invalid_email" }, 400);
      }
      payload.email = email;
    }
    if (!Object.keys(payload).length) {
      return json({ error: "no_fields_to_update" }, 400);
    }

    // Call uazapi directly to inspect status codes (207 = partial success).
    const base = (Deno.env.get("UAZAPI_BASE_URL") ?? "").replace(/\/$/, "");
    if (!base) return json({ error: "UAZAPI_BASE_URL not configured" }, 500);

    const res = await fetch(`${base}/business/update/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: row.uazapi_token },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

    if (res.status === 207) {
      // Partial success — inspect per-field result.
      const results: any = data?.results ?? data ?? {};
      const saved: string[] = [];
      const failed: { field: string; error: string }[] = [];
      for (const field of Object.keys(payload)) {
        const r = results?.[field];
        if (r && (r.success === true || r.ok === true || r.status === "ok" || r.status === 200)) {
          saved.push(field);
        } else if (r && (r.success === false || r.error || r.message)) {
          failed.push({ field, error: r.error ?? r.message ?? "unknown" });
        } else {
          // Ambiguous — treat as saved if request didn't fail catastrophically.
          saved.push(field);
        }
      }
      return json({ ok: failed.length === 0, partial: true, saved, failed, raw: data });
    }

    if (!res.ok) {
      return json({
        error: "uazapi_failed",
        detail: data ?? text,
        status: res.status,
      }, 502);
    }

    return json({ ok: true, saved: Object.keys(payload), raw: data });
  } catch (e: any) {
    console.error("uazapi-business-update-profile:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
