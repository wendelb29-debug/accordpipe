// Public webhook — uazapiGO -> Accord. No JWT verification (external service).
// Onda 6: persistência total (UPSERT idempotente, origem, mídia guardada no Storage do Accord)
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  corsHeaders,
  serviceClient,
  isMediaType,
  fetchAndStoreUazapiMedia,
  normalizePhone,
} from "../_shared/uazapi.ts";

const AUDIO_TYPES = new Set(["audio", "myaudio", "ptt"]);

function pick<T = any>(obj: any, keys: string[]): T | null {
  for (const k of keys) {
    const v = k.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return null;
}

async function resolveOrCreateContact(
  svc: ReturnType<typeof serviceClient>,
  companyId: string,
  phoneDigits: string,
  name: string | null,
): Promise<string | null> {
  if (!phoneDigits) return null;
  const { data: existing } = await svc
    .from("whatsapp_contacts")
    .select("id")
    .eq("company_id", companyId)
    .eq("phone", phoneDigits)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created, error } = await svc
    .from("whatsapp_contacts")
    .insert({
      company_id: companyId,
      phone: phoneDigits,
      name: name || phoneDigits,
    })
    .select("id")
    .single();
  if (error) {
    console.warn("uazapi-webhook: contact create failed", error.message);
    return null;
  }
  return created?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("ok", { status: 200, headers: corsHeaders });

  let payload: any = null;
  try {
    payload = JSON.parse(await req.text());
  } catch {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const svc = serviceClient();
    const eventType: string = payload?.event ?? payload?.type ?? payload?.EventType ?? "";
    const instanceId: string | null =
      payload?.instance?.id ?? payload?.instanceId ?? payload?.owner ?? null;
    const instanceOwnerJid: string | null =
      payload?.instance?.jid?.user ?? payload?.owner ?? null;

    let inst: any = null;
    if (instanceId) {
      const q = await svc.from("whatsapp_instances").select("*")
        .eq("uazapi_instance_id", instanceId).maybeSingle();
      inst = q.data;
    }
    if (!inst && instanceOwnerJid) {
      const q = await svc.from("whatsapp_instances").select("*")
        .eq("phone_number", String(instanceOwnerJid)).maybeSingle();
      inst = q.data;
    }
    if (!inst) {
      console.warn("uazapi-webhook: instance not found", { eventType, instanceId });
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // ---------- Connection state ----------
    if (eventType === "connection") {
      const st = payload?.status ?? payload?.state ?? null;
      let normalized = inst.status;
      if (st === "connected" || payload?.connected === true) normalized = "connected";
      else if (st === "disconnected") normalized = "disconnected";
      else if (st === "connecting") normalized = "connecting";
      else if (st === "hibernated") normalized = "hibernated";
      await svc.from("whatsapp_instances").update({ status: normalized }).eq("id", inst.id);
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // ---------- messages_update: só atualiza status ----------
    if (eventType === "messages_update" || eventType === "message_status") {
      const upd = payload?.update ?? payload?.data ?? payload?.message ?? payload;
      const providerId = pick<string>(upd, ["id", "messageId", "key.id"]);
      const status = pick<string>(upd, ["status", "messageStatus", "ack"]);
      if (providerId && status) {
        await svc.from("whatsapp_messages")
          .update({ status: String(status).toLowerCase() })
          .eq("company_id", inst.tenant_id)
          .eq("external_message_id", String(providerId));
      }
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // ---------- messages (nova mensagem, seja inbound ou outbound native) ----------
    if (eventType === "messages" || eventType === "message" || eventType === "messages_upsert") {
      const msg = payload?.message ?? payload?.data ?? payload;
      const externalId: string | null = pick(msg, [
        "id", "messageId", "key.id", "message.id",
      ]);
      const fromMe: boolean = Boolean(pick(msg, ["fromMe", "key.fromMe"]));
      const wasSentByApi: boolean = Boolean(pick(msg, ["wasSentByApi", "sentByApi"]));
      const chatId: string = String(pick(msg, ["chatId", "chatid", "from", "key.remoteJid"]) ?? "");
      const phoneDigits = normalizePhone(chatId.split("@")[0] ?? chatId);
      const rawType: string = String(
        pick(msg, ["messageType", "type", "message.messageType"]) ?? "text",
      ).toLowerCase();
      const text: string | null = pick(msg, [
        "text", "body", "caption", "content", "message.conversation",
        "message.extendedTextMessage.text",
      ]);
      const senderName: string | null = pick(msg, ["senderName", "pushName", "chatName", "name"]);

      // Direção e origem (regras do plano)
      const direction: "inbound" | "outbound" = fromMe ? "outbound" : "inbound";
      // Se wasSentByApi=true a mensagem veio do próprio Accord — não deve nem chegar aqui
      // (filtro excludeMessages: ["wasSentByApi"]), mas se chegar tratamos como accord_api.
      const origin: "accord_api" | "whatsapp_native" =
        fromMe && wasSentByApi ? "accord_api" : "whatsapp_native";

      const isMedia = isMediaType(rawType);
      const contactId = await resolveOrCreateContact(svc, inst.tenant_id, phoneDigits, senderName);

      // Registro base — UPSERT por (company_id, external_message_id)
      const base: any = {
        company_id: inst.tenant_id,
        contact_id: contactId,
        phone: phoneDigits || chatId,
        chat_id: chatId,
        external_message_id: externalId,
        direction,
        origin,
        message_type: rawType,
        message: text,
        status: fromMe ? "sent" : "received",
        media_download_status: isMedia ? "pending" : "not_applicable",
        raw_payload: payload,
      };

      let saved: any = null;
      if (externalId) {
        const { data, error } = await svc
          .from("whatsapp_messages")
          .upsert(base, { onConflict: "company_id,external_message_id", ignoreDuplicates: false })
          .select("id")
          .maybeSingle();
        if (error) console.warn("uazapi-webhook upsert error:", error.message);
        saved = data;
      } else {
        const { data, error } = await svc.from("whatsapp_messages")
          .insert(base).select("id").maybeSingle();
        if (error) console.warn("uazapi-webhook insert error:", error.message);
        saved = data;
      }

      // Atualiza last_message do contato
      if (contactId) {
        await svc.from("whatsapp_contacts").update({
          last_message: text ?? (isMedia ? `[${rawType}]` : ""),
          last_message_at: new Date().toISOString(),
        }).eq("id", contactId);
      }

      // Baixa mídia imediatamente (uazapi só guarda ~2 dias)
      if (isMedia && externalId && inst.uazapi_token) {
        try {
          const { storagePath, mimetype, transcription } = await fetchAndStoreUazapiMedia({
            tenantId: inst.tenant_id,
            externalMessageId: externalId,
            instanceToken: inst.uazapi_token,
            isAudio: AUDIO_TYPES.has(rawType),
          });
          await svc.from("whatsapp_messages").update({
            media_url: storagePath,
            media_mimetype: mimetype,
            media_download_status: "done",
            transcription: transcription ?? null,
          })
            .eq("company_id", inst.tenant_id)
            .eq("external_message_id", externalId);
        } catch (err: any) {
          console.warn("uazapi-webhook: media download failed", err?.message);
          await svc.from("whatsapp_messages").update({
            media_download_status: "failed",
          })
            .eq("company_id", inst.tenant_id)
            .eq("external_message_id", externalId);
        }
      }

      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (e: any) {
    console.error("uazapi-webhook fatal:", e?.message ?? e);
    // Ainda tenta salvar o payload cru em uma linha órfã para auditoria
    try {
      const svc = serviceClient();
      await svc.from("whatsapp_messages").insert({
        company_id: null as any,
        phone: "unknown",
        message_type: "text",
        direction: "inbound",
        status: "received",
        origin: "whatsapp_native",
        media_download_status: "not_applicable",
        raw_payload: payload,
      });
    } catch { /* best effort */ }
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
});
