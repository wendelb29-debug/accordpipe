// Cria um novo grupo WhatsApp via uazapi (/group/create) e sincroniza em whatsapp_chats.
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

    const body = await req.json().catch(() => ({}));
    const tenant_id = String(body?.tenant_id ?? "");
    const name = String(body?.name ?? "").trim();
    const participantsRaw: unknown = body?.participants;
    if (!tenant_id) return json({ error: "tenant_id required" }, 400);
    if (!name) return json({ error: "name required" }, 400);
    if (!Array.isArray(participantsRaw) || participantsRaw.length < 1) {
      return json({ error: "participants must contain at least 1 phone" }, 400);
    }

    const participants = (participantsRaw as unknown[])
      .map((p) => normalizePhone(String(p)))
      .filter((p) => p.length >= 10);
    if (participants.length < 1) {
      return json({ error: "no valid participants after normalization" }, 400);
    }

    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const created: any = await callUazapi("/group/create", {
      method: "POST",
      token: row.uazapi_token,
      body: { name, participants },
    });

    // Persistir grupo em whatsapp_chats para aparecer imediatamente no inbox.
    const jid: string = String(created?.JID ?? created?.jid ?? "");
    if (jid) {
      const svc = serviceClient();
      const patch = {
        tenant_id,
        wa_chatid: jid,
        name: created?.Name ?? name,
        is_group: true,
        group_topic: created?.Topic ?? null,
        group_owner_jid: created?.OwnerJID ?? null,
        participant_count: Array.isArray(created?.Participants) ? created.Participants.length : participants.length + 1,
      };
      const { data: existing } = await svc
        .from("whatsapp_chats")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("wa_chatid", jid)
        .maybeSingle();
      if (existing) {
        await svc.from("whatsapp_chats").update(patch).eq("id", existing.id);
      } else {
        await svc.from("whatsapp_chats").insert(patch);
      }
    }

    return json({ ok: true, group: created });
  } catch (e: any) {
    console.error("uazapi-group-create:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
