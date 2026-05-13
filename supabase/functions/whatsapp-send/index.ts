// Provider-agnostic outbound message sender (Uazapi + Z-API)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendResult {
  success: boolean;
  message: string;
  external_id?: string;
  raw?: unknown;
}

async function sendUazapiReaction(
  serverUrl: string,
  instanceToken: string,
  phone: string,
  targetMessageId: string,
  reaction: string,
): Promise<SendResult> {
  const base = serverUrl.replace(/\/$/, "");
  const url = `${base}/message/react`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { token: instanceToken, "Content-Type": "application/json" },
      body: JSON.stringify({
        number: normalizePhone(phone),
        id: targetMessageId,
        text: reaction,
      }),
    });
    const rawText = await res.text();
    let body: any = {};
    try { body = JSON.parse(rawText); } catch { body = { raw: rawText }; }

    if (!res.ok) {
      return { success: false, message: `Uazapi reaction HTTP ${res.status}: ${rawText.slice(0, 250)}`, raw: body };
    }

    return {
      success: true,
      message: "Reação enviada via Uazapi",
      external_id: body?.id || body?.messageId || body?.data?.messageId || undefined,
      raw: body,
    };
  } catch (err) {
    return { success: false, message: `Falha Uazapi reaction: ${(err as Error).message}` };
  }
}

async function sendZapiReaction(
  serverUrl: string,
  instanceId: string,
  token: string,
  clientToken: string | null,
  phone: string,
  targetMessageId: string,
  reaction: string,
): Promise<SendResult> {
  const base = serverUrl.replace(/\/$/, "");
  const url = `${base}/instances/${instanceId}/token/${token}/send-reaction`;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (clientToken) headers["Client-Token"] = clientToken;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        phone: normalizePhone(phone),
        reaction,
        messageId: targetMessageId,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, message: `Z-API reaction HTTP ${res.status}`, raw: body };
    }
    return {
      success: true,
      message: "Reação enviada via Z-API",
      external_id: (body as any)?.messageId || (body as any)?.zaapId || undefined,
      raw: body,
    };
  } catch (err) {
    return { success: false, message: `Falha Z-API reaction: ${(err as Error).message}` };
  }
}

async function removeZapiReaction(
  serverUrl: string,
  instanceId: string,
  token: string,
  clientToken: string | null,
  phone: string,
  targetMessageId: string,
): Promise<SendResult> {
  const base = serverUrl.replace(/\/$/, "");
  const url = `${base}/instances/${instanceId}/token/${token}/send-remove-reaction`;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (clientToken) headers["Client-Token"] = clientToken;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        phone: normalizePhone(phone),
        messageId: targetMessageId,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, message: `Z-API remove reaction HTTP ${res.status}`, raw: body };
    }
    return {
      success: true,
      message: "Reação removida via Z-API",
      external_id: (body as any)?.messageId || (body as any)?.zaapId || undefined,
      raw: body,
    };
  } catch (err) {
    return { success: false, message: `Falha Z-API remove reaction: ${(err as Error).message}` };
  }
}

function normalizePhone(p: string): string {
  return p.replace(/\D/g, "");
}

async function sendUazapiMedia(
  serverUrl: string,
  instanceToken: string,
  phone: string,
  mediaUrl: string,
  mediaType: "image" | "audio" | "video" | "document",
  caption: string,
  fileName?: string,
  quotedExternalId?: string | null,
): Promise<SendResult> {
  const base = serverUrl.replace(/\/$/, "");
  const url = `${base}/send/media`;
  const payload: Record<string, unknown> = {
    number: normalizePhone(phone),
    type: mediaType,
    file: mediaUrl,
    text: caption || "",
  };
  if (fileName) payload.docName = fileName;
  // Send as voice note (PTT) when audio — appears as recorded-on-the-fly in WhatsApp
  if (mediaType === "audio") payload.ptt = true;
  if (quotedExternalId) payload.replyid = quotedExternalId;

  console.log("[sendUazapiMedia] POST", url, "type:", mediaType);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { token: instanceToken, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const rawText = await res.text();
    let body: any = {};
    try { body = JSON.parse(rawText); } catch { body = { raw: rawText }; }

    console.log("[sendUazapiMedia] status:", res.status, "resp:", rawText.slice(0, 400));

    if (!res.ok) {
      return { success: false, message: `Uazapi /send/media HTTP ${res.status}: ${rawText.slice(0, 250)}`, raw: body };
    }
    const externalId = body?.key?.id || body?.id || body?.messageId || body?.message?.id || undefined;
    return { success: true, message: "Mídia enviada via Uazapi", external_id: externalId, raw: body };
  } catch (err) {
    return { success: false, message: `Falha Uazapi media: ${(err as Error).message}` };
  }
}

async function sendUazapi(
  serverUrl: string,
  instanceName: string,
  instanceToken: string,
  phone: string,
  text: string,
  quotedExternalId?: string | null,
): Promise<SendResult> {
  const base = serverUrl.replace(/\/$/, "");
  // uazapi endpoint: POST /send/text with header `token` (instance token)
  const url = `${base}/send/text`;
  const payload: Record<string, unknown> = { number: normalizePhone(phone), text };
  if (quotedExternalId) payload.replyid = quotedExternalId;

  console.log("[sendUazapi] POST", url);
  console.log("[sendUazapi] instanceName:", instanceName);
  console.log("[sendUazapi] tokenPrefix:", instanceToken?.slice(0, 8));
  console.log("[sendUazapi] phone (normalized):", payload.number);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "token": instanceToken, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();
    let body: any = {};
    try { body = JSON.parse(rawText); } catch { body = { raw: rawText }; }

    console.log("[sendUazapi] status:", res.status);
    console.log("[sendUazapi] response:", rawText.slice(0, 500));

    if (!res.ok) {
      return {
        success: false,
        message: `Uazapi HTTP ${res.status}: ${rawText.slice(0, 250) || "(sem corpo)"}`,
        raw: body,
      };
    }

    const externalId =
      body?.key?.id || body?.id || body?.messageId || body?.message?.id || undefined;

    return { success: true, message: "Mensagem enviada via Uazapi", external_id: externalId, raw: body };
  } catch (err) {
    console.error("[sendUazapi] exception", err);
    return { success: false, message: `Falha Uazapi: ${(err as Error).message}` };
  }
}

async function sendZapi(
  serverUrl: string,
  instanceId: string,
  token: string,
  clientToken: string | null,
  phone: string,
  text: string,
  quotedExternalId?: string | null,
): Promise<SendResult> {
  const base = serverUrl.replace(/\/$/, "");
  const url = `${base}/instances/${instanceId}/token/${token}/send-text`;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (clientToken) headers["Client-Token"] = clientToken;
    const payload: Record<string, unknown> = { phone: normalizePhone(phone), message: text };
    // Z-API native reply — attaches the new message as a quote of the original
    if (quotedExternalId) payload.messageId = quotedExternalId;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, message: `Z-API HTTP ${res.status}`, raw: body };
    }
    return { success: true, message: "Mensagem enviada via Z-API", external_id: (body as any)?.messageId, raw: body };
  } catch (err) {
    return { success: false, message: `Falha Z-API: ${(err as Error).message}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const {
      tenant_id,
      phone,
      text,
      message_id,
      message_type,
      media_url,
      file_name,
      target_message_id,
      reaction_emoji,
      reaction_mode,
      quoted_external_id,
    } = await req.json();
    const quotedExternalId: string | null = quoted_external_id || null;
    const msgType: string = message_type || "text";
    const isMedia = msgType !== "text" && !!media_url;
    const isReaction = msgType === "reaction";
    if (!tenant_id || !phone || (!isReaction && !isMedia && !text)) {
      return new Response(
        JSON.stringify({ error: "tenant_id, phone and text/media are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (isReaction && !target_message_id) {
      return new Response(
        JSON.stringify({ error: "target_message_id is required for reactions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: integ, error: loadErr } = await supabase
      .from("tenant_whatsapp_integrations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (loadErr || !integ) {
      return new Response(
        JSON.stringify({ success: false, message: "Nenhuma integração WhatsApp ativa para este tenant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[whatsapp-send] provider_type:", integ.provider_type);
    console.log("[whatsapp-send] instance_name:", integ.instance_name);
    console.log("[whatsapp-send] server_url:", integ.server_url);
    console.log("[whatsapp-send] has token:", !!integ.instance_token);

    if (!integ.server_url || !integ.instance_token) {
      return new Response(
        JSON.stringify({ success: false, message: "Credenciais incompletas na integração" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let result: SendResult;

    if (integ.provider_type === "uazapi") {
      const instanceName = integ.instance_name || integ.instance_id || "";
      if (!instanceName) {
        return new Response(
          JSON.stringify({ success: false, message: "instance_name não configurado para Uazapi" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (isReaction) {
        if (reaction_mode === "remove") {
          result = { success: false, message: "Remover reação não é suportado para esta integração." };
        } else {
          result = await sendUazapiReaction(
            integ.server_url,
            integ.instance_token,
            phone,
            target_message_id,
            reaction_emoji,
          );
        }
      } else if (isMedia) {
        const uazType =
          msgType === "image" ? "image" :
          msgType === "audio" ? "audio" :
          msgType === "video" ? "video" : "document";
        result = await sendUazapiMedia(
          integ.server_url,
          integ.instance_token,
          phone,
          media_url,
          uazType as "image" | "audio" | "video" | "document",
          text || "",
          file_name,
          quotedExternalId,
        );
      } else {
        result = await sendUazapi(integ.server_url, instanceName, integ.instance_token, phone, text, quotedExternalId);
      }
    } else if (integ.provider_type === "zapi") {
      const { data: comp } = await admin
        .from("companies")
        .select("zapi_client_token")
        .eq("id", tenant_id)
        .maybeSingle();
      if (isReaction) {
        result = reaction_mode === "remove"
          ? await removeZapiReaction(
              integ.server_url,
              integ.instance_id || "",
              integ.instance_token,
              comp?.zapi_client_token ?? null,
              phone,
              target_message_id,
            )
          : await sendZapiReaction(
              integ.server_url,
              integ.instance_id || "",
              integ.instance_token,
              comp?.zapi_client_token ?? null,
              phone,
              target_message_id,
              reaction_emoji,
            );
      } else {
        result = await sendZapi(
          integ.server_url,
          integ.instance_id || "",
          integ.instance_token,
          comp?.zapi_client_token ?? null,
          phone,
          text,
          quotedExternalId,
        );
      }
    } else {
      result = { success: false, message: `Provider '${integ.provider_type}' não suportado.` };
    }

    if (message_id && !isReaction) {
      await admin
        .from("whatsapp_messages")
        .update({
          status: result.success ? "sent" : "failed",
          sent_at: result.success ? new Date().toISOString() : null,
          external_message_id: result.external_id ?? null,
          metadata: { external_id: result.external_id ?? null, provider: integ.provider_type },
        })
        .eq("id", message_id);
    }

    await admin.from("audit_logs").insert({
      user_id: userId,
      action: result.success ? "whatsapp_message_sent" : "whatsapp_message_send_failed",
      target_type: "tenant_whatsapp_integration",
      target_id: integ.id,
      servidor_id: tenant_id,
      details: {
        provider_type: integ.provider_type,
        phone: normalizePhone(phone),
          message_type: msgType,
          reaction_mode: reaction_mode ?? null,
          target_message_id: target_message_id ?? null,
        success: result.success,
        message: result.message,
      },
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[whatsapp-send] unhandled error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
