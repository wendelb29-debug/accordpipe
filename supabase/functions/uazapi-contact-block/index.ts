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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;
    const { tenant_id, number, block } = await req.json();
    if (!tenant_id || !number || typeof block !== "boolean") {
      return json({ error: "tenant_id, number, block required" }, 400);
    }
    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const phone = normalizePhone(number);
    if (!phone) return json({ error: "invalid_phone" }, 400);

    const svc = serviceClient();
    // Try to sync with uazapi (best-effort — don't fail the local update if uazapi errors)
    let remoteOk = false;
    try {
      const row = await getInstanceRow(tenant_id);
      if (row?.uazapi_token) {
        await callUazapi("/chat/block", {
          method: "POST",
          token: row.uazapi_token,
          body: { number: phone, block },
        });
        remoteOk = true;
      }
    } catch (e: any) {
      console.warn("uazapi-contact-block: remote failed", e?.message);
    }

    const { error } = await svc
      .from("whatsapp_contacts")
      .update({ status: block ? "blocked" : "active" })
      .eq("company_id", tenant_id)
      .eq("phone", phone);
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, remoteOk, phone, status: block ? "blocked" : "active" });
  } catch (e: any) {
    console.error("uazapi-contact-block:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
