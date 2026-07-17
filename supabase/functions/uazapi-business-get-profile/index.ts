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
 * Onda 23 — Perfil comercial (WhatsApp Business).
 * Retorna { isBusiness, jid, profile: { description, address, email, ...raw } }.
 * Se a conta não for Business, isBusiness=false e não chama /business/get/profile.
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

    // Read isBusiness from instance status.
    let isBusiness = false;
    let jid: string | null = null;
    try {
      const st = await callUazapi("/instance/status", { method: "GET", token: row.uazapi_token });
      const inst = st?.instance ?? {};
      isBusiness = Boolean(inst?.isBusiness ?? inst?.is_business ?? st?.status?.isBusiness);
      const jidRaw = inst?.jid ?? st?.status?.jid;
      if (typeof jidRaw === "string") jid = jidRaw;
      else if (jidRaw?.user) jid = `${jidRaw.user}@${jidRaw.server ?? "s.whatsapp.net"}`;
    } catch (e) {
      console.warn("business-get-profile: status failed", e);
    }

    if (!isBusiness) return json({ ok: true, isBusiness: false });

    // Try without jid first; if API requires it, retry with the instance jid.
    let profile: any = null;
    try {
      profile = await callUazapi("/business/get/profile", {
        method: "POST",
        token: row.uazapi_token,
        body: {},
      });
    } catch (e: any) {
      if (jid) {
        profile = await callUazapi("/business/get/profile", {
          method: "POST",
          token: row.uazapi_token,
          body: { jid },
        });
      } else {
        return json({
          error: "uazapi_failed",
          detail: e?.data ?? e?.message ?? String(e),
        }, 502);
      }
    }

    // Normalize known fields.
    const p = profile?.profile ?? profile ?? {};
    return json({
      ok: true,
      isBusiness: true,
      jid,
      profile: {
        description: p.description ?? p.about ?? "",
        address: p.address ?? "",
        email: p.email ?? "",
        websites: Array.isArray(p.websites) ? p.websites : [],
        raw: p,
      },
    });
  } catch (e: any) {
    console.error("uazapi-business-get-profile:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
