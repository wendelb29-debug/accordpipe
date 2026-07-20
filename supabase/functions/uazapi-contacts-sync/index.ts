import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  callUazapi,
  corsHeaders,
  getInstanceRow,
  json,
  normalizePhone,
  requireCaller,
  requireTenantMember,
  serviceClient,
} from "../_shared/uazapi.ts";

// Sync all contacts from uazapi agenda into whatsapp_contacts (upsert only new ones)
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
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const svc = serviceClient();
    const PAGE = 1000;
    const HARD_LIMIT = 20000;
    let offset = 0;
    let scanned = 0;
    let inserted = 0;
    let updated = 0;

    while (offset < HARD_LIMIT) {
      const data: any = await callUazapi("/contacts/list", {
        method: "POST",
        token: row.uazapi_token,
        body: { limit: PAGE, offset, contactScope: "all" },
      });
      const list: any[] = data?.contacts ?? data?.data ?? (Array.isArray(data) ? data : []);
      if (!list.length) break;

      for (const c of list) {
        const rawNum: string = c?.number ?? c?.phone ?? c?.jid ?? c?.id ?? "";
        const phone = normalizePhone(String(rawNum).split("@")[0] ?? "");
        if (!phone) continue;
        if (String(rawNum).includes("@g.us")) continue;
        const name: string = c?.name ?? c?.pushName ?? c?.notify ?? phone;

        const { data: existing } = await svc
          .from("whatsapp_contacts")
          .select("id, name_manually_edited")
          .eq("company_id", tenant_id)
          .eq("phone", phone)
          .maybeSingle();

        if (existing) {
          if (!existing.name_manually_edited && name && name !== phone) {
            await svc.from("whatsapp_contacts").update({ name }).eq("id", existing.id);
            updated++;
          }
        } else {
          const { error: insErr } = await svc.from("whatsapp_contacts").insert({
            company_id: tenant_id,
            phone,
            name,
            source: "import",
            status: "active",
          });
          if (!insErr) inserted++;
        }
        scanned++;
      }

      if (list.length < PAGE) break;
      offset += list.length;
    }

    return json({ ok: true, scanned, inserted, updated });
  } catch (e: any) {
    console.error("uazapi-contacts-sync:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
