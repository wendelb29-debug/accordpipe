import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  callUazapi,
  corsHeaders,
  enforceAgentRestriction,
  getInstanceRow,
  getUazapiSettings,
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
    const {
      tenant_id,
      lead_ids,
      numbers: rawNumbers,
      message_type = "text",
      text,
      file,
      docName,
      delayMin = 3,
      delayMax = 8,
      scheduled_for,
      folder,
    } = await req.json();
    if (!tenant_id || !folder) return json({ error: "tenant_id and folder required" }, 400);
    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const svc = serviceClient();
    let phones: string[] = [];
    if (Array.isArray(rawNumbers) && rawNumbers.length) {
      phones = rawNumbers.map((n: string) => normalizePhone(n)).filter(Boolean);
    } else if (Array.isArray(lead_ids) && lead_ids.length) {
      const { data: leads } = await svc
        .from("crm_leads")
        .select("id, telefone, phone, whatsapp")
        .in("id", lead_ids);
      phones = (leads ?? [])
        .map((l: any) => normalizePhone(l.whatsapp ?? l.telefone ?? l.phone ?? ""))
        .filter(Boolean);
    }
    if (phones.length === 0) return json({ error: "no valid phones" }, 400);

    const uniquePhones = Array.from(new Set(phones));
    const numbers = uniquePhones.map((p) => `${p}@s.whatsapp.net`);

    const senderPayload: Record<string, unknown> = {
      numbers,
      type: message_type,
      folder,
      delayMin: Number(delayMin),
      delayMax: Number(delayMax),
      track_source: "accord",
    };
    if (text) senderPayload.text = text;
    if (file) senderPayload.file = file;
    if (docName) senderPayload.docName = docName;
    if (scheduled_for) senderPayload.scheduled_for = Number(scheduled_for);

    const data = await callUazapi("/sender/simple", {
      method: "POST",
      token: row.uazapi_token,
      body: senderPayload,
    });

    const folder_id: string =
      data?.folder_id ?? data?.folderId ?? data?.id ?? folder;

    const inserted = await svc
      .from("whatsapp_campaigns")
      .upsert(
        {
          tenant_id,
          folder_id,
          name: folder,
          status: scheduled_for ? "scheduled" : "sending",
          scheduled_for: scheduled_for
            ? new Date(Number(scheduled_for)).toISOString()
            : null,
          total_recipients: numbers.length,
          message_type,
          created_by: caller.userId,
        },
        { onConflict: "tenant_id,folder_id" }
      )
      .select()
      .single();

    return json({ ok: true, campaign: inserted.data, uazapi: data });
  } catch (e: any) {
    console.error("uazapi-create-campaign:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
