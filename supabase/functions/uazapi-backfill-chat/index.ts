// Onda 6: sincroniza (backfill) o histórico de um chat específico usando /message/find.
// Chamado pelo botão "Sincronizar histórico" no CRM.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  callUazapi,
  corsHeaders,
  getInstanceRow,
  isMediaType,
  fetchAndStoreUazapiMedia,
  json,
  normalizePhone,
  requireCaller,
  requireTenantMember,
  serviceClient,
} from "../_shared/uazapi.ts";

const AUDIO_TYPES = new Set(["audio", "myaudio", "ptt"]);
const HARD_LIMIT = 1000;
const PAGE = 100;

function pick<T = any>(obj: any, keys: string[]): T | null {
  for (const k of keys) {
    const v = k.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;
    const { tenant_id, chat_id, lead_id } = await req.json();
    if (!tenant_id || !chat_id) return json({ error: "tenant_id and chat_id required" }, 400);
    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const inst = await getInstanceRow(tenant_id);
    if (!inst?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const svc = serviceClient();
    const phoneDigits = normalizePhone(String(chat_id).split("@")[0]);

    // Resolve/create contact once
    let contactId: string | null = null;
    {
      const { data: existing } = await svc.from("whatsapp_contacts")
        .select("id").eq("company_id", tenant_id).eq("phone", phoneDigits).maybeSingle();
      if (existing?.id) contactId = existing.id;
      else {
        const { data: created } = await svc.from("whatsapp_contacts")
          .insert({ company_id: tenant_id, phone: phoneDigits, name: phoneDigits, lead_id: lead_id ?? null })
          .select("id").single();
        contactId = created?.id ?? null;
      }
    }

    let offset = 0, saved = 0, mediaOk = 0, mediaFail = 0;
    while (offset < HARD_LIMIT) {
      const data: any = await callUazapi("/message/find", {
        method: "POST",
        token: inst.uazapi_token,
        body: { chatid: String(chat_id), limit: PAGE, offset },
      });
      const list: any[] = data?.messages ?? data?.data ?? data?.result ?? (Array.isArray(data) ? data : []);
      if (!list.length) break;

      for (const msg of list) {
        const externalId = pick<string>(msg, ["id", "messageId", "key.id"]);
        if (!externalId) continue;
        const fromMe = Boolean(pick(msg, ["fromMe", "key.fromMe"]));
        const rawType = String(pick(msg, ["messageType", "type"]) ?? "text").toLowerCase();
        const text = pick<string>(msg, [
          "text","body","caption","content","message.conversation","message.extendedTextMessage.text",
        ]);
        const isMedia = isMediaType(rawType);

        const base: any = {
          company_id: tenant_id,
          contact_id: contactId,
          lead_id: lead_id ?? null,
          phone: phoneDigits,
          chat_id: String(chat_id),
          external_message_id: externalId,
          direction: fromMe ? "outbound" : "inbound",
          origin: "backfill",
          message_type: rawType,
          message: text,
          status: fromMe ? "sent" : "received",
          media_download_status: isMedia ? "pending" : "not_applicable",
          raw_payload: msg,
        };
        const { error } = await svc.from("whatsapp_messages")
          .upsert(base, { onConflict: "company_id,external_message_id", ignoreDuplicates: false });
        if (error) { console.warn("backfill upsert:", error.message); continue; }
        saved++;

        if (isMedia) {
          try {
            const { storagePath, mimetype, transcription } = await fetchAndStoreUazapiMedia({
              tenantId: tenant_id,
              externalMessageId: externalId,
              instanceToken: inst.uazapi_token,
              isAudio: AUDIO_TYPES.has(rawType),
            });
            await svc.from("whatsapp_messages").update({
              media_url: storagePath, media_mimetype: mimetype,
              media_download_status: "done", transcription: transcription ?? null,
            }).eq("company_id", tenant_id).eq("external_message_id", externalId);
            mediaOk++;
          } catch (err: any) {
            console.warn("backfill media fail:", externalId, err?.message);
            await svc.from("whatsapp_messages").update({ media_download_status: "failed" })
              .eq("company_id", tenant_id).eq("external_message_id", externalId);
            mediaFail++;
          }
        }
      }
      if (list.length < PAGE) break;
      offset += list.length;
    }

    return json({ ok: true, saved, mediaOk, mediaFail, scanned: offset });
  } catch (e: any) {
    console.error("uazapi-backfill-chat:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
