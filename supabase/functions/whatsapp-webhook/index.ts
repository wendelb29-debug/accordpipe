import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-whatsapp-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ───────────────────────────────────────────────────────────
// Provider adapters: normalize incoming payload into one shape
// ───────────────────────────────────────────────────────────
type NormalizedEvent =
  | {
      kind: "message_received";
      phone: string;
      message: string;
      sender_name?: string | null;
      sender_avatar?: string | null;
      message_type?: string;
      media_url?: string | null;
      external_id?: string | null;
      file_name?: string | null;
      mime_type?: string | null;
      file_size?: number | null;
      caption?: string | null;
    }
  | { kind: "message_status"; external_id: string; status: "sent" | "delivered" | "read" }
  | { kind: "instance_status"; status: string; phone?: string | null }
  | { kind: "ignore"; reason: string };

function pickAvatar(d: any): string | null {
  if (!d) return null;
  const candidates = [
    d.senderPhoto, d.profilePicture, d.profilePicUrl, d.imagePreview, d.image,
    d?.contact?.profilePicture, d?.contact?.imagePreview, d?.sender?.profilePicture,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("http")) return c;
  }
  return null;
}

function mapStatus(raw: string): "sent" | "delivered" | "read" | null {
  const s = (raw || "").toString().toLowerCase();
  if (s.includes("read") || s.includes("lida") || s === "4") return "read";
  if (s.includes("deliver") || s.includes("recebid") || s === "3") return "delivered";
  if (s.includes("sent") || s.includes("enviad") || s === "2" || s === "1") return "sent";
  return null;
}

function pickText(d: any): string {
  if (!d) return "";
  // Uazapi variants: text can be string OR object {message|body|caption}, content is also common
  const candidates: any[] = [
    d.text,
    d.body,
    d.content,
    d.caption,
    d.message,
    d?.text?.message,
    d?.text?.body,
    d?.message?.text,
    d?.message?.conversation,
    d?.message?.body,
    d?.message?.extendedTextMessage?.text,
    d?.message?.imageMessage?.caption,
    d?.message?.videoMessage?.caption,
    d?.msgContent?.conversation,
    d?.msgContent?.extendedTextMessage?.text,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return "";
}

function pickPhone(d: any): string {
  if (!d) return "";
  // Prefer real phone numbers (sender_pn, @s.whatsapp.net) over LIDs (@lid - WhatsApp internal IDs)
  const preferred = [
    d.sender_pn, d.senderPn, d?.key?.senderPn,
    d.sender, d.from, d.chatid, d.chatId, d.number, d.phone, d.remoteJid,
    d?.key?.remoteJid, d?.message?.from, d?.contact?.phone,
  ];
  // First pass: skip @lid values
  for (const c of preferred) {
    if (typeof c === "string" && c.trim() && !c.includes("@lid")) return c;
  }
  // Fallback: accept anything (last resort)
  for (const c of preferred) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return "";
}

function isFromMe(d: any, body: any): boolean {
  return d?.fromMe === true || d?.wasSentByApi === true ||
    d?.key?.fromMe === true || body?.fromMe === true;
}

// Extract media descriptor from a wide variety of provider payload shapes.
function pickMedia(d: any, body: any): {
  message_type: string;
  media_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  caption: string | null;
} {
  const sources = [d, body, d?.message, d?.msgContent, body?.message].filter(Boolean);

  // typed message containers (Baileys-style)
  const m = d?.message || body?.message || {};
  const typedContainers: Array<{ key: string; t: string }> = [
    { key: "imageMessage", t: "image" },
    { key: "videoMessage", t: "video" },
    { key: "audioMessage", t: "audio" },
    { key: "documentMessage", t: "document" },
    { key: "documentWithCaptionMessage", t: "document" },
    { key: "stickerMessage", t: "image" },
    { key: "ptvMessage", t: "video" },
  ];

  for (const { key, t } of typedContainers) {
    const c = m?.[key] || d?.[key] || body?.[key] ||
      m?.documentWithCaptionMessage?.message?.documentMessage; // nested doc+caption
    if (c && typeof c === "object") {
      const url = c.url || c.directPath || c.fileUrl || c.mediaUrl || null;
      const mime = c.mimetype || c.mimeType || null;
      const fileName = c.fileName || c.title || c.name || null;
      const sz = c.fileLength || c.fileSize || c.size || null;
      const caption = c.caption || null;
      let kind = t;
      if (mime?.startsWith("audio/") || c.ptt === true) kind = "audio";
      if (mime === "application/pdf") kind = "pdf";
      else if (kind === "document" && mime && !mime.includes("pdf")) kind = "document";
      return {
        message_type: kind,
        media_url: typeof url === "string" ? url : null,
        file_name: typeof fileName === "string" ? fileName : null,
        mime_type: typeof mime === "string" ? mime : null,
        file_size: sz != null ? Number(sz) || null : null,
        caption: typeof caption === "string" ? caption : null,
      };
    }
  }

  // flat fields used by Z-API / Uazapi simple events
  const flatType = (d?.type || d?.messageType || body?.type || body?.messageType || "")
    .toString().toLowerCase();
  const flatMime = d?.mimeType || d?.mimetype || d?.contentType || body?.mimeType || null;
  const flatUrl =
    d?.mediaUrl || d?.media || d?.fileUrl || d?.url || d?.documentUrl || d?.imageUrl ||
    d?.audioUrl || d?.videoUrl || d?.image?.imageUrl || d?.document?.documentUrl ||
    d?.audio?.audioUrl || d?.video?.videoUrl || null;
  const flatName =
    d?.fileName || d?.filename || d?.docName || d?.name || d?.document?.fileName ||
    d?.image?.caption || null;
  const flatSize = d?.fileSize || d?.size || d?.document?.fileSize || null;
  const flatCaption =
    d?.caption || d?.image?.caption || d?.video?.caption || d?.document?.caption || null;

  if (flatUrl || ["image","audio","ptt","voice","video","document","pdf","file","sticker"].includes(flatType)) {
    let kind: string = "file";
    if (flatType === "image" || flatMime?.startsWith?.("image/")) kind = "image";
    else if (flatType === "video" || flatMime?.startsWith?.("video/")) kind = "video";
    else if (flatType === "audio" || flatType === "ptt" || flatType === "voice" || flatMime?.startsWith?.("audio/")) kind = "audio";
    else if (flatMime === "application/pdf" || /\.pdf($|\?)/i.test(String(flatUrl || ""))) kind = "pdf";
    else if (flatType === "document" || flatType === "file") kind = "document";
    return {
      message_type: kind,
      media_url: typeof flatUrl === "string" ? flatUrl : null,
      file_name: typeof flatName === "string" ? flatName : null,
      mime_type: typeof flatMime === "string" ? flatMime : null,
      file_size: flatSize != null ? Number(flatSize) || null : null,
      caption: typeof flatCaption === "string" ? flatCaption : null,
    };
  }

  return {
    message_type: "text",
    media_url: null,
    file_name: null,
    mime_type: null,
    file_size: null,
    caption: null,
  };
}

function normalizeUazapi(body: any): NormalizedEvent {
  const ev = (body?.event || body?.type || body?.EventType || "").toString().toLowerCase();
  const data = body?.data ?? body?.message ?? body?.payload ?? body;

  if (ev.includes("status") || ev.includes("connection") || ev.includes("presence") || data?.connection || data?.state) {
    return {
      kind: "instance_status",
      status: (data?.status || data?.state || data?.connection || "").toString(),
      phone: data?.owner || data?.wid || data?.phone || null,
    };
  }

  const ackRaw = data?.ack ?? data?.status ?? data?.messageStatus ?? body?.ack ?? body?.status;
  const externalId = data?.id || data?.messageId || data?.key?.id || body?.messageId;
  if ((ev.includes("status") || ev.includes("ack") || ev.includes("receipt")) && externalId) {
    const mapped = mapStatus(String(ackRaw ?? ev));
    if (mapped) {
      return { kind: "message_status", external_id: String(externalId), status: mapped };
    }
  }

  if (isFromMe(data, body)) {
    return { kind: "ignore", reason: "fromMe/wasSentByApi" };
  }

  const phone = pickPhone(data) || pickPhone(body);
  const text = pickText(data) || pickText(body);
  const media = pickMedia(data, body);

  // Accept either text OR media (image/audio/doc with no caption is valid)
  if (phone && (text || media.media_url || media.message_type !== "text")) {
    return {
      kind: "message_received",
      phone: String(phone).replace(/[^\d]/g, ""),
      message: text || media.caption || "",
      sender_name: data?.senderName || data?.pushName || data?.notifyName || data?.contact?.name || null,
      sender_avatar: pickAvatar(data) || pickAvatar(body),
      message_type: media.message_type,
      media_url: media.media_url,
      file_name: media.file_name,
      mime_type: media.mime_type,
      file_size: media.file_size,
      caption: media.caption,
      external_id: externalId || null,
    };
  }

  return { kind: "ignore", reason: `no_phone_or_content (event=${ev || "none"}, dataKeys=${Object.keys(data || {}).join(",").slice(0,120)})` };
}

function normalizeZapi(body: any): NormalizedEvent {
  const status = body?.status || body?.messageStatus;
  const messageId = body?.messageId || body?.ids?.[0];
  if (status && messageId) {
    const mapped = mapStatus(String(status));
    if (mapped) return { kind: "message_status", external_id: String(messageId), status: mapped };
  }

  const phone = body?.phone || body?.data?.phone;
  const text = pickText(body) || pickText(body?.data);
  const media = pickMedia(body?.data || body, body);
  if (body?.fromMe === true) return { kind: "ignore", reason: "fromMe" };
  if (phone && (text || media.media_url || media.message_type !== "text")) {
    return {
      kind: "message_received",
      phone: String(phone).replace(/[^\d]/g, ""),
      message: text || media.caption || "",
      sender_name: body?.senderName || body?.notifyName || null,
      sender_avatar: pickAvatar(body),
      message_type: media.message_type,
      media_url: media.media_url,
      file_name: media.file_name,
      mime_type: media.mime_type,
      file_size: media.file_size,
      caption: media.caption,
      external_id: messageId || null,
    };
  }
  return { kind: "ignore", reason: "unknown_zapi_event" };
}

// ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const reqId = crypto.randomUUID().slice(0, 8);
  const log = (...args: unknown[]) => console.log(`[whatsapp-webhook ${reqId}]`, ...args);

  try {
    const url = new URL(req.url);
    const provider = (url.searchParams.get("provider") || "").toLowerCase();
    const rawToken = url.searchParams.get("token");
    // UazAPI sometimes appends the event subpath (e.g. "/messages_update", "/chats") to the
    // configured webhook URL, which lands inside the token query param. Strip anything after "/"
    // and trim whitespace so the tenant lookup matches the stored webhook_token.
    const queryToken = rawToken ? rawToken.split("/")[0].trim() : null;
    log("incoming", { method: req.method, provider, hasToken: !!queryToken, tokenPrefix: queryToken?.slice(0, 6), rawHadSuffix: rawToken !== queryToken });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let companyId: string | null = null;
    let providerType: "uazapi" | "zapi" | null = null;

    // ── AUTH PATH 1: provider+token in query (new multi-provider flow)
    if (provider && queryToken) {
      const { data: tenant, error: tenantErr } = await supabase
        .from("companies")
        .select("id")
        .eq("webhook_token", queryToken)
        .maybeSingle();
      if (tenantErr) log("tenant lookup error", tenantErr.message);
      if (!tenant) {
        log("REJECTED: invalid token");
        // Return 200 with ok:false so Uazapi doesn't keep retrying and we keep visibility
        return new Response(
          JSON.stringify({ ok: false, error: "Invalid token", reqId }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      companyId = tenant.id;
      providerType = provider === "uazapi" ? "uazapi" : "zapi";
      log("authenticated tenant", { companyId, providerType });

      // ── HEAD/GET = validation ping from provider. Mark as connected and 200.
      if (req.method === "HEAD" || req.method === "GET") {
        await supabase
          .from("tenant_whatsapp_integrations")
          .update({
            connection_status: "connected",
            last_seen_at: new Date().toISOString(),
            last_sync_at: new Date().toISOString(),
          })
          .eq("tenant_id", companyId!)
          .eq("provider_type", providerType);
        log("validation ping accepted, marked connected");
        return new Response(
          JSON.stringify({ ok: true, ping: true, reqId }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      // ── AUTH PATH 2: legacy header secret + JSON {event, data}
      const webhookSecret = req.headers.get("x-whatsapp-secret");
      const expectedSecret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");
      if (!expectedSecret || webhookSecret !== expectedSecret) {
        log("REJECTED: legacy auth failed (missing query token + bad secret)");
        return new Response(
          JSON.stringify({ ok: false, error: "Unauthorized", reqId }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const rawBody = await req.json().catch(() => ({}));
    log("payload received", { keys: Object.keys(rawBody || {}), event: (rawBody as any)?.event });

    // ── Legacy path: { event, data } structure with company_id inside payload
    if (!providerType) {
      const { event, data } = rawBody as any;
      log("legacy event path", { event });
      return await handleLegacyEvent(supabase, event, data);
    }

    // ── New multi-provider path
    const normalized =
      providerType === "uazapi" ? normalizeUazapi(rawBody) : normalizeZapi(rawBody);
    log("normalized", normalized);

    // Update last_seen_at AND mark connection as connected (we're receiving events)
    await supabase
      .from("tenant_whatsapp_integrations")
      .update({
        last_seen_at: new Date().toISOString(),
        connection_status: "connected",
      })
      .eq("tenant_id", companyId!)
      .eq("provider_type", providerType);

    if (normalized.kind === "ignore") {
      // Persist payload so we can inspect what Uazapi is actually sending
      log("IGNORED", normalized.reason, "rawKeys=", Object.keys(rawBody || {}));
      await supabase.from("system_error_logs").insert({
        tenant_id: companyId,
        module: "whatsapp-webhook",
        action: "inbound_ignored",
        severity: "warning",
        message: normalized.reason,
        metadata: { provider: providerType, payload: rawBody, reqId },
      }).then(() => {}, () => {});
      return new Response(JSON.stringify({ ok: true, ignored: normalized.reason, reqId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalized.kind === "instance_status") {
      const status = normalized.status.toLowerCase();
      const isConnected = ["connected", "online", "open"].some((s) => status.includes(s));
      await supabase
        .from("tenant_whatsapp_integrations")
        .update({
          connection_status: isConnected ? "connected" : "disconnected",
          connected_phone: normalized.phone ?? undefined,
          last_sync_at: new Date().toISOString(),
        })
        .eq("tenant_id", companyId!)
        .eq("provider_type", providerType);

      return new Response(JSON.stringify({ ok: true, reqId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalized.kind === "message_status") {
      log("STATUS UPDATE", normalized);
      const ts = new Date().toISOString();
      const updates: any = { status: normalized.status };
      if (normalized.status === "sent") updates.sent_at = ts;
      if (normalized.status === "delivered") updates.delivered_at = ts;
      if (normalized.status === "read") updates.read_at = ts;
      await supabase
        .from("whatsapp_messages")
        .update(updates)
        .eq("company_id", companyId!)
        .eq("external_message_id", normalized.external_id);
      return new Response(JSON.stringify({ ok: true, reqId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // message_received → reuse the same routing/lead logic as legacy handler
    log("PERSISTING inbound", { phone: normalized.phone, type: normalized.message_type, hasMedia: !!normalized.media_url, preview: normalized.message.slice(0, 60) });
    return await handleIncomingMessage(supabase, {
      company_id: companyId!,
      phone: normalized.phone,
      message: normalized.message,
      sender_name: normalized.sender_name ?? undefined,
      sender_avatar: (normalized as any).sender_avatar ?? undefined,
      message_type: normalized.message_type,
      media_url: normalized.media_url ?? undefined,
      external_id: normalized.external_id ?? undefined,
      file_name: (normalized as any).file_name ?? undefined,
      mime_type: (normalized as any).mime_type ?? undefined,
      file_size: (normalized as any).file_size ?? undefined,
      caption: (normalized as any).caption ?? undefined,
      provider: providerType,
    });
  } catch (err) {
    console.error(`[whatsapp-webhook ${reqId}] ERROR:`, err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message, reqId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ───────────────────────────────────────────────────────────
// Shared incoming-message handler (used by both auth paths)
// ───────────────────────────────────────────────────────────
function normalizePhoneVariants(rawPhone: string): string[] {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return [];

  const variants = new Set<string>([digits]);

  if (digits.startsWith("55") && digits.length > 11) {
    variants.add(digits.slice(2));
  } else if (!digits.startsWith("55") && digits.length >= 10) {
    variants.add(`55${digits}`);
  }

  return [...variants];
}

async function fetchUazapiAvatar(
  supabase: any,
  company_id: string,
  phone: string,
): Promise<string | null> {
  try {
    const { data: integ } = await supabase
      .from("tenant_whatsapp_integrations")
      .select("server_url, instance_token, provider_type")
      .eq("tenant_id", company_id)
      .eq("provider_type", "uazapi")
      .maybeSingle();
    if (!integ?.server_url || !integ?.instance_token) {
      console.log("[fetchUazapiAvatar] missing integration config");
      return null;
    }
    const url = `${integ.server_url.replace(/\/$/, "")}/chat/GetNameAndImageURL`;
    const res = await fetch(url, {
      method: "POST",
      headers: { token: integ.instance_token, "Content-Type": "application/json" },
      body: JSON.stringify({ number: phone, preview: false }),
    });
    if (!res.ok) {
      console.warn("[fetchUazapiAvatar] non-ok response", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json: any = await res.json().catch(() => null);
    const pic = json?.image || json?.imgUrl || json?.profilePicture || json?.url || json?.profile_picture;
    const name = json?.name || json?.pushname || json?.verifiedName || json?.shortName || null;
    console.log("[fetchUazapiAvatar] result for", phone, "=>", pic ? "img" : "no-img", name ? "name" : "no-name");
    return {
      image: typeof pic === "string" && pic.startsWith("http") ? pic : null,
      name: typeof name === "string" && name.trim() ? name.trim() : null,
    };
  } catch (e) {
    console.warn("[fetchUazapiAvatar] failed:", (e as Error).message);
    return null;
  }
}

async function handleIncomingMessage(
  supabase: any,
  data: {
    company_id: string;
    phone: string;
    message: string;
    sender_name?: string;
    sender_avatar?: string;
    message_type?: string;
    media_url?: string;
    external_id?: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
    caption?: string;
    provider?: string;
  },
) {
  const {
    company_id, phone, message,
    sender_name: payloadName, sender_avatar: payloadAvatar,
    message_type = "text", media_url, external_id,
    file_name, mime_type, file_size, caption,
    provider,
  } = data;
  let sender_avatar = payloadAvatar;
  let sender_name = payloadName;
  const normalizedPhone = String(phone || "").replace(/\D/g, "");
  const phoneVariants = normalizePhoneVariants(normalizedPhone);
  const primaryPhone = phoneVariants.find((value) => value.startsWith("55")) || normalizedPhone;

  // 1. Workspace routing
  let workspace_id: string | null = null;
  const { data: rules } = await supabase
    .from("whatsapp_routing_rules")
    .select("workspace_id, rule_type, rule_value")
    .eq("company_id", company_id)
    .eq("is_active", true)
    .order("priority", { ascending: false });

  if (rules && message) {
    for (const rule of rules) {
      if (rule.rule_type === "keyword" && message.toLowerCase().includes(rule.rule_value.toLowerCase())) {
        workspace_id = rule.workspace_id; break;
      }
      if (rule.rule_type === "ddd") {
        const phoneClean = primaryPhone;
        const ddd = phoneClean.length >= 12 ? phoneClean.slice(2, 4) : phoneClean.slice(0, 2);
        if (ddd === rule.rule_value) { workspace_id = rule.workspace_id; break; }
      }
    }
  }
  if (!workspace_id) {
    const { data: defaultWs } = await supabase
      .from("whatsapp_workspace_config")
      .select("workspace_id")
      .eq("company_id", company_id)
      .eq("is_default", true)
      .maybeSingle();
    if (defaultWs) workspace_id = defaultWs.workspace_id;
  }

  // 2. Find or create contact using normalized phone variants
  let contact: any = null;
  for (const variant of phoneVariants) {
    const { data: existingContact } = await supabase
      .from("whatsapp_contacts")
      .select("id, lead_id, conversation_status, assigned_to, phone, avatar_url")
      .eq("company_id", company_id)
      .eq("phone", variant)
      .maybeSingle();

    if (existingContact) {
      contact = existingContact;
      break;
    }
  }

  if (!contact && phoneVariants.length > 1) {
    const localSuffix = phoneVariants.map((value) => value.slice(-11)).find(Boolean);
    if (localSuffix) {
      const { data: fallbackContacts } = await supabase
        .from("whatsapp_contacts")
        .select("id, lead_id, conversation_status, assigned_to, phone, avatar_url")
        .eq("company_id", company_id)
        .like("phone", `%${localSuffix}`)
        .limit(1);
      contact = fallbackContacts?.[0] ?? null;
    }
  }

  // Fetch avatar+name via uazapi if not provided in payload, or if existing contact has no avatar
  if ((provider === "uazapi" || !provider) && (!sender_avatar || !sender_name)) {
    if (!contact || !contact.avatar_url) {
      const fetched = await fetchUazapiAvatar(supabase, company_id, primaryPhone);
      if (fetched?.image && !sender_avatar) sender_avatar = fetched.image;
      if (fetched?.name && !sender_name) sender_name = fetched.name;
    }
  }

  if (!contact) {
    const { data: newContact, error } = await supabase
      .from("whatsapp_contacts")
      .insert({
        company_id,
        phone: primaryPhone,
        name: sender_name || primaryPhone,
        avatar_url: sender_avatar || null,
        avatar_synced_at: sender_avatar ? new Date().toISOString() : null,
        last_message: message,
        last_message_at: new Date().toISOString(),
        workspace_id,
        conversation_status: "fila",
      })
      .select("id, lead_id, conversation_status, assigned_to, phone, avatar_url")
      .single();
    if (error) throw error;
    contact = newContact;
  } else {
    const updates: any = {
      phone: primaryPhone,
      last_message: message,
      last_message_at: new Date().toISOString(),
    };
    // Reabrir contatos encerrados/finalizados → volta para "fila"
    if (
      contact.conversation_status === "finalizado" ||
      contact.conversation_status === "encerrado" ||
      contact.conversation_status === "aguardando"
    ) {
      updates.conversation_status = "fila";
    }
    if (sender_avatar) {
      updates.avatar_url = sender_avatar;
      updates.avatar_synced_at = new Date().toISOString();
    }
    if (sender_name) {
      // Only overwrite if existing name is just the phone (not yet personalized)
      const { data: currentContact } = await supabase
        .from("whatsapp_contacts")
        .select("name")
        .eq("id", contact.id)
        .maybeSingle();
      const cur = String(currentContact?.name || "").replace(/\D/g, "");
      if (!currentContact?.name || cur === primaryPhone || cur === normalizedPhone) {
        updates.name = sender_name;
      }
    }
    await supabase.from("whatsapp_contacts").update(updates).eq("id", contact.id);
  }

  // 3. Ensure lead exists (dedup by normalized phone)
  if (!contact.lead_id) {
    let existingLead: any = null;
    for (const variant of phoneVariants) {
      const { data } = await supabase
        .from("crm_leads")
        .select("id")
        .eq("servidor_id", company_id)
        .eq("phone", variant)
        .maybeSingle();
      if (data) {
        existingLead = data;
        break;
      }
    }

    let leadId: string;
    if (existingLead) {
      leadId = existingLead.id;
    } else {
      const leadInsert: any = {
        servidor_id: company_id,
        company_name: sender_name || primaryPhone,
        contact_name: sender_name || null,
        phone: primaryPhone,
        source: "WhatsApp",
        stage: "novos",
        tags: ["WhatsApp", "Inbound"],
      };
      if (workspace_id) leadInsert.workspace_id = workspace_id;
      const { data: newLead, error: leadErr } = await supabase
        .from("crm_leads").insert(leadInsert).select("id").single();
      if (leadErr) throw leadErr;
      leadId = newLead.id;
      await supabase.from("crm_lead_activities").insert({
        lead_id: leadId, servidor_id: company_id, type: "created",
        title: "Lead criado automaticamente via WhatsApp",
        description: `Contato: ${sender_name || primaryPhone}`,
      });
    }
    await supabase.from("whatsapp_contacts").update({ lead_id: leadId }).eq("id", contact.id);
    contact.lead_id = leadId;
  }

  // 4. Auto-move standby → novos
  if (contact.lead_id) {
    const { data: lead } = await supabase
      .from("crm_leads").select("stage").eq("id", contact.lead_id).single();
    if (lead && lead.stage === "standby") {
      await supabase.from("crm_leads")
        .update({ stage: "novos", stage_entered_at: new Date().toISOString() })
        .eq("id", contact.lead_id);
    }
  }

  // 5. Save message
  const { error: msgError } = await supabase
    .from("whatsapp_messages")
    .insert({
      company_id,
      contact_id: contact.id,
      phone: primaryPhone,
      message,
      direction: "inbound",
      status: "delivered",
      delivered_at: new Date().toISOString(),
      external_message_id: external_id ?? null,
      message_type,
      media_url,
      metadata: { external_id: external_id ?? null, provider: provider ?? null },
    });
  if (msgError) throw msgError;

  // 6. Notification
  if (contact.assigned_to) {
    await supabase.from("notifications").insert({
      user_id: contact.assigned_to,
      title: "Nova mensagem WhatsApp",
      message: `${sender_name || primaryPhone}: ${(message || "").slice(0, 100)}`,
      type: "whatsapp", link: "/atendimento", servidor_id: company_id,
    });
  }

  return new Response(
    JSON.stringify({ success: true, lead_id: contact.lead_id }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ───────────────────────────────────────────────────────────
// Legacy { event, data } handler (preserved for backwards compat)
// ───────────────────────────────────────────────────────────
async function handleLegacyEvent(supabase: any, event: string, data: any): Promise<Response> {
  if (event === "message.received") {
    return await handleIncomingMessage(supabase, data);
  }
  if (event === "message.sent") {
    if (data?.contact_id) {
      await supabase.from("whatsapp_contacts")
        .update({ conversation_status: "em_atendimento" })
        .eq("id", data.contact_id);
    }
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (event === "session.status") {
    await supabase.from("whatsapp_sessions").upsert(
      { company_id: data.company_id, status: data.status, phone_number: data.phone_number },
      { onConflict: "company_id" },
    );
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (event === "message.status") {
    await supabase.from("whatsapp_messages").update({ status: data.status }).eq("id", data.message_id);
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ error: "Unknown event type" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
