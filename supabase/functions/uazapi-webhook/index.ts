// Public webhook — uazapiGO -> Accord. No JWT verification (external service).
// Always returns 200 quickly; logs and swallows internal errors.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders, serviceClient } from "../_shared/uazapi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }
    const raw = await req.text();
    let payload: any = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      console.warn("uazapi-webhook: non-JSON payload", raw.slice(0, 500));
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const eventType: string = payload?.event ?? payload?.type ?? payload?.EventType ?? "";
    const instanceId: string | null =
      payload?.instance?.id ??
      payload?.instanceId ??
      payload?.owner ??
      null;
    const instanceOwnerJid: string | null =
      payload?.instance?.jid?.user ??
      payload?.owner ??
      null;

    const svc = serviceClient();
    let inst: any = null;
    if (instanceId) {
      const q = await svc
        .from("whatsapp_instances")
        .select("*")
        .eq("uazapi_instance_id", instanceId)
        .maybeSingle();
      inst = q.data;
    }
    if (!inst && instanceOwnerJid) {
      const q = await svc
        .from("whatsapp_instances")
        .select("*")
        .eq("phone_number", String(instanceOwnerJid))
        .maybeSingle();
      inst = q.data;
    }

    if (!inst) {
      console.warn(
        "uazapi-webhook: instance not found, dropping event",
        eventType,
        { instanceId, instanceOwnerJid }
      );
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    if (eventType === "connection") {
      const st = payload?.status ?? payload?.state ?? null;
      let normalized = inst.status;
      if (st === "connected" || payload?.connected === true) normalized = "connected";
      else if (st === "disconnected") normalized = "disconnected";
      else if (st === "connecting") normalized = "connecting";
      else if (st === "hibernated") normalized = "hibernated";
      await svc
        .from("whatsapp_instances")
        .update({ status: normalized })
        .eq("id", inst.id);
    } else if (eventType === "messages") {
      // Log the raw payload for the first time per instance so we can iterate
      // on parsing without guessing shape. Best-effort insert into
      // whatsapp_messages if the schema is compatible.
      try {
        const msg = payload?.message ?? payload?.data ?? payload;
        const record = {
          tenant_id: inst.tenant_id,
          direction: msg?.fromMe ? "outbound" : "inbound",
          phone: String(msg?.chatId ?? msg?.from ?? "").replace(/\D+/g, ""),
          body: msg?.text ?? msg?.body ?? msg?.caption ?? null,
          media_url: msg?.mediaUrl ?? null,
          message_type: msg?.messageType ?? msg?.type ?? "text",
          provider: "uazapi",
          provider_message_id: msg?.id ?? msg?.messageId ?? null,
          raw: payload,
        } as any;
        // Try insert into whatsapp_messages; ignore failure if columns differ.
        const { error } = await svc.from("whatsapp_messages").insert(record);
        if (error) {
          console.warn("uazapi-webhook: insert whatsapp_messages skipped:", error.message);
        }
      } catch (err) {
        console.warn("uazapi-webhook: message persist error", err);
      }
    } else if (eventType === "messages_update") {
      // Best-effort status update
      try {
        const upd = payload?.update ?? payload?.data ?? payload;
        const providerId = upd?.id ?? upd?.messageId;
        const status = upd?.status ?? upd?.messageStatus ?? null;
        if (providerId && status) {
          await svc
            .from("whatsapp_messages")
            .update({ status })
            .eq("provider_message_id", providerId)
            .eq("tenant_id", inst.tenant_id);
        }
      } catch (err) {
        console.warn("uazapi-webhook: update status error", err);
      }
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (e: any) {
    console.error("uazapi-webhook fatal:", e);
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
});
