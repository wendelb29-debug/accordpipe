// Public webhook — uazapiGO -> Accord. No JWT verification (external service).
// Onda 6+7: persistência total + upsert de chats + log de erros + resposta 200 rápida.
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

async function logError(
  svc: ReturnType<typeof serviceClient>,
  params: {
    tenantId: string | null;
    eventType: string | null;
    error: unknown;
    payload: unknown;
  },
) {
  try {
    await svc.from("whatsapp_webhook_errors").insert({
      tenant_id: params.tenantId,
      event_type: params.eventType,
      error_message: String((params.error as any)?.message ?? params.error).slice(0, 2000),
      payload: params.payload as any,
    });
  } catch (e) {
    console.error("failed to log webhook error:", e);
  }
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

async function upsertChat(
  svc: ReturnType<typeof serviceClient>,
  params: {
    tenantId: string;
    waChatId: string;
    name: string | null;
    lastText: string | null;
    lastType: string | null;
    lastAt: string;
    incrementUnread: boolean;
    isGroup?: boolean;
  },
) {
  try {
    const { data: existing } = await svc
      .from("whatsapp_chats")
      .select("id, unread_count")
      .eq("tenant_id", params.tenantId)
      .eq("wa_chatid", params.waChatId)
      .maybeSingle();
    const patch: any = {
      tenant_id: params.tenantId,
      wa_chatid: params.waChatId,
      name: params.name ?? existing?.["name" as any] ?? params.waChatId,
      last_message_text: params.lastText,
      last_message_type: params.lastType,
      last_message_at: params.lastAt,
      is_group: params.isGroup ?? (params.waChatId.includes("@g.us")),
    };
    if (existing) {
      patch.unread_count = params.incrementUnread
        ? (existing.unread_count ?? 0) + 1
        : existing.unread_count ?? 0;
      await svc.from("whatsapp_chats").update(patch).eq("id", existing.id);
    } else {
      patch.unread_count = params.incrementUnread ? 1 : 0;
      await svc.from("whatsapp_chats").insert(patch);
    }
  } catch (e: any) {
    console.warn("upsertChat failed:", e?.message);
  }
}

async function process(payload: any, svc: ReturnType<typeof serviceClient>) {
  const eventType: string =
    (typeof payload?.event === "string" ? payload.event : null) ??
    payload?.EventType ??
    payload?.type ??
    "";
  // "instance" pode vir como string (id) OU como objeto — priorizar string
  const instanceIdRaw =
    (typeof payload?.instance === "string" ? payload.instance : null) ??
    payload?.instance?.id ??
    payload?.instanceId ??
    payload?.owner ??
    null;
  const instanceOwnerJid: string | null =
    payload?.instance?.jid?.user ?? payload?.owner ?? null;
  const instanceToken: string | null = payload?.token ?? payload?.instance?.token ?? null;

  let inst: any = null;
  if (instanceIdRaw) {
    const q = await svc.from("whatsapp_instances").select("*")
      .eq("uazapi_instance_id", String(instanceIdRaw)).maybeSingle();
    inst = q.data;
  }
  if (!inst && instanceToken) {
    const q = await svc.from("whatsapp_instances").select("*")
      .eq("uazapi_token", String(instanceToken)).maybeSingle();
    inst = q.data;
  }
  if (!inst && instanceOwnerJid) {
    const q = await svc.from("whatsapp_instances").select("*")
      .eq("phone_number", String(instanceOwnerJid)).maybeSingle();
    inst = q.data;
  }
  if (!inst) {
    await logError(svc, {
      tenantId: null,
      eventType,
      error: new Error(`instance not found (id=${instanceIdRaw} jid=${instanceOwnerJid})`),
      payload,
    });
    return;
  }

  const identityPatch: Record<string, unknown> = {};
  if (instanceOwnerJid && !inst.phone_number) identityPatch.phone_number = String(instanceOwnerJid);
  if (payload?.instanceName && !inst.instance_name) identityPatch.instance_name = String(payload.instanceName);
  if (Object.keys(identityPatch).length > 0) {
    await svc.from("whatsapp_instances").update(identityPatch).eq("id", inst.id);
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
    return;
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
    return;
  }

  // ---------- chats: metadata upsert ----------
  if (eventType === "chats" || eventType === "chats_update" || eventType === "chats_upsert") {
    const chatData = payload?.chat ?? payload?.data ?? payload;
    const list: any[] = Array.isArray(chatData) ? chatData : [chatData];
    for (const c of list) {
      const waChatId: string = String(pick(c, ["wa_chatid", "chatid", "id", "jid"]) ?? "");
      if (!waChatId) continue;
      const patch: any = {
        tenant_id: inst.tenant_id,
        wa_chatid: waChatId,
        name: pick(c, ["name", "wa_name", "wa_contactName", "pushName"]),
        image_url: pick(c, ["image", "imageUrl", "wa_image"]),
        is_group: Boolean(pick(c, ["wa_isGroup", "isGroup"])) || waChatId.includes("@g.us"),
        is_pinned: Boolean(pick(c, ["wa_isPinned", "isPinned"])),
        is_archived: Boolean(pick(c, ["wa_archived", "archived"])),
        unread_count: Number(pick(c, ["wa_unreadCount", "unreadCount"]) ?? 0),
        last_message_text: pick(c, ["wa_lastMessageTextVote", "lastMessageText"]),
        last_message_type: pick(c, ["wa_lastMessageType", "lastMessageType"]),
      };
      const ts = pick<number>(c, ["wa_lastMsgTimestamp", "lastMsgTimestamp"]);
      if (ts) patch.last_message_at = new Date(Number(ts) * (String(ts).length <= 10 ? 1000 : 1)).toISOString();

      const { data: existing } = await svc.from("whatsapp_chats").select("id")
        .eq("tenant_id", inst.tenant_id).eq("wa_chatid", waChatId).maybeSingle();
      if (existing) {
        await svc.from("whatsapp_chats").update(patch).eq("id", existing.id);
      } else {
        await svc.from("whatsapp_chats").insert(patch);
      }
    }
    return;
  }

  // ---------- messages (nova mensagem, seja inbound ou outbound native) ----------
  if (eventType === "messages" || eventType === "message" || eventType === "messages_upsert") {
    const msg = payload?.message ?? payload?.data ?? payload;
    const externalId: string | null = pick(msg, [
      "id", "messageid", "messageId", "key.id", "message.id",
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

    const direction: "inbound" | "outbound" = fromMe ? "outbound" : "inbound";
    const origin: "accord_api" | "whatsapp_native" =
      fromMe && wasSentByApi ? "accord_api" : "whatsapp_native";

    const isMedia = isMediaType(rawType);
    const contactId = await resolveOrCreateContact(svc, inst.tenant_id, phoneDigits, senderName);

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

    if (externalId) {
      const { error } = await svc
        .from("whatsapp_messages")
        .upsert(base, { onConflict: "company_id,external_message_id", ignoreDuplicates: false });
      if (error) console.warn("uazapi-webhook upsert error:", error.message);
    } else {
      const { error } = await svc.from("whatsapp_messages").insert(base);
      if (error) console.warn("uazapi-webhook insert error:", error.message);
    }

    // Upsert do chat (agregado)
    if (chatId) {
      await upsertChat(svc, {
        tenantId: inst.tenant_id,
        waChatId: chatId,
        name: senderName,
        lastText: text ?? (isMedia ? `[${rawType}]` : null),
        lastType: rawType,
        lastAt: new Date().toISOString(),
        incrementUnread: !fromMe,
      });
    }

    if (contactId) {
      await svc.from("whatsapp_contacts").update({
        last_message: text ?? (isMedia ? `[${rawType}]` : ""),
        last_message_at: new Date().toISOString(),
      }).eq("id", contactId);
    }

    // Baixa mídia em background (não bloquear a resposta 200)
    if (isMedia && externalId && inst.uazapi_token) {
      (async () => {
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
          await svc.from("whatsapp_messages").update({
            media_download_status: "failed",
          })
            .eq("company_id", inst.tenant_id)
            .eq("external_message_id", externalId);
          await logError(svc, {
            tenantId: inst.tenant_id,
            eventType: `${eventType}:media`,
            error: err,
            payload: { external_message_id: externalId },
          });
        }
      })();
    }
    return;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("ok", { status: 200, headers: corsHeaders });

  // Sempre responder 200 rapidamente — processar depois.
  let payload: any = null;
  try {
    payload = JSON.parse(await req.text());
  } catch {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  // Fire-and-forget: nunca deixe o webhook estourar erro nem demorar.
  (async () => {
    const svc = serviceClient();
    try {
      await process(payload, svc);
    } catch (e: any) {
      console.error("uazapi-webhook fatal:", e?.message ?? e);
      await logError(svc, {
        tenantId: null,
        eventType: payload?.event ?? payload?.type ?? null,
        error: e,
        payload,
      });
    }
  })();

  return new Response("ok", { status: 200, headers: corsHeaders });
});
