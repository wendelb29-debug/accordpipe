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
 * Onda 23 — Lista produtos do catálogo WhatsApp Business.
 * Body: { after? }. Retorna { products, next_after }.
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

    // Resolve instance JID
    let jid: string | null = null;
    try {
      const st = await callUazapi("/instance/status", { method: "GET", token: row.uazapi_token });
      const inst = st?.instance ?? {};
      const jidRaw = inst?.jid ?? st?.status?.jid;
      if (typeof jidRaw === "string") jid = jidRaw;
      else if (jidRaw?.user) jid = `${jidRaw.user}@${jidRaw.server ?? "s.whatsapp.net"}`;
      if (!jid && row.phone_number) jid = `${row.phone_number}@s.whatsapp.net`;
    } catch (_) { /* ignore */ }
    if (!jid && row.phone_number) jid = `${row.phone_number}@s.whatsapp.net`;
    if (!jid) return json({ error: "cannot_resolve_jid" }, 400);

    const reqBody: Record<string, unknown> = { jid };
    if (typeof body.after === "string" && body.after) reqBody.after = body.after;

    let data: any;
    try {
      data = await callUazapi("/business/catalog/list", {
        method: "POST",
        token: row.uazapi_token,
        body: reqBody,
      });
    } catch (e: any) {
      const status = e?.status ?? 0;
      // 504/408/502/503: instância provavelmente sem Business/catálogo ativo. Não é erro do Accord.
      if ([408, 502, 503, 504].includes(status)) {
        return json({ ok: true, products: [], next_after: null, unavailable: true, reason: "uazapi_timeout" });
      }
      throw e;
    }

    const raw: any[] = data?.products ?? data?.data ?? data?.result ?? (Array.isArray(data) ? data : []);
    const products = raw.map((p: any) => ({
      id: p.id ?? p.productId ?? p.product_id ?? "",
      name: p.name ?? p.title ?? "(sem nome)",
      description: p.description ?? "",
      price: p.price ?? p.priceAmount ?? null,
      currency: p.currency ?? p.currencyCode ?? "",
      price_formatted: p.priceFormatted ?? p.price_formatted ?? (p.price != null ? `${p.currency ?? ""} ${p.price}` : ""),
      image_url: p.imageUrl ?? p.image_url ?? p.imageURL ?? (Array.isArray(p.images) ? p.images[0]?.url : null) ?? null,
      is_hidden: Boolean(p.isHidden ?? p.hidden ?? p.is_hidden),
      availability: p.availability ?? null,
      raw: p,
    }));

    const nextAfter: string | null =
      data?.Paging?.After ?? data?.paging?.after ?? data?.next_after ?? data?.after ?? null;

    return json({ ok: true, products, next_after: nextAfter });
  } catch (e: any) {
    console.error("uazapi-catalog-list:", e);
    return json({ error: e?.message ?? String(e), detail: (e as any)?.data ?? null }, 500);
  }
});

