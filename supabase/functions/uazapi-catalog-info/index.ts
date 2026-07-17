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

    const body = await req.json().catch(() => ({}));
    const tenant_id = body?.tenant_id;
    const id = String(body?.id ?? "").trim();
    if (!tenant_id) return json({ error: "tenant_id required" }, 400);
    if (!id) return json({ error: "product id required" }, 400);

    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "no_instance" }, 400);

    // Resolve jid
    let jid: string | null = null;
    try {
      const st = await callUazapi("/instance/status", { method: "GET", token: row.uazapi_token });
      const inst = st?.instance ?? {};
      const jidRaw = inst?.jid ?? st?.status?.jid;
      if (typeof jidRaw === "string") jid = jidRaw;
      else if (jidRaw?.user) jid = `${jidRaw.user}@${jidRaw.server ?? "s.whatsapp.net"}`;
    } catch (_) { /* ignore */ }
    if (!jid && row.phone_number) jid = `${row.phone_number}@s.whatsapp.net`;

    const data: any = await callUazapi("/business/catalog/info", {
      method: "POST",
      token: row.uazapi_token,
      body: { jid, id },
    });

    const p = data?.product ?? data ?? {};
    return json({
      ok: true,
      product: {
        id: p.id ?? id,
        name: p.name ?? p.title ?? "",
        description: p.description ?? "",
        price: p.price ?? null,
        currency: p.currency ?? "",
        price_formatted: p.priceFormatted ?? p.price_formatted ?? "",
        image_url: p.imageUrl ?? p.image_url ?? (Array.isArray(p.images) ? p.images[0]?.url : null),
        images: Array.isArray(p.images) ? p.images : [],
        availability: p.availability ?? null,
        is_hidden: Boolean(p.isHidden ?? p.hidden),
        url: p.url ?? null,
        raw: p,
      },
    });
  } catch (e: any) {
    console.error("uazapi-catalog-info:", e);
    return json({ error: e?.message ?? String(e), detail: (e as any)?.data ?? null }, 500);
  }
});
