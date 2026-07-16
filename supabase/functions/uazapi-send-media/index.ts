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
} from "../_shared/uazapi.ts";

const ALLOWED = new Set([
  "image",
  "video",
  "videoplay",
  "document",
  "audio",
  "myaudio",
  "ptt",
  "ptv",
  "sticker",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;
    const { tenant_id, lead_id, number, type, file, caption, docName } =
      await req.json();
    if (!tenant_id || !number || !type || !file)
      return json({ error: "tenant_id, number, type, file required" }, 400);
    if (!ALLOWED.has(type)) return json({ error: "invalid media type" }, 400);

    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const settings = await getUazapiSettings(tenant_id);

    if (!settings.allow_active && !lead_id) {
      return json(
        { error: "active_messages_disabled", message: "Envio ativo desabilitado para este canal." },
        403
      );
    }
    const agentBlock = await enforceAgentRestriction(caller.userId, tenant_id, settings);
    if (agentBlock) return agentBlock;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const body: Record<string, unknown> = {
      number: normalizePhone(number),
      type,
      file,
      text: caption ?? undefined,
      docName: docName ?? undefined,
      readchat: true,
      track_source: "accord",
      track_id: lead_id ?? null,
    };
    if (settings.simulate_typing) body.delay = 3;

    const data = await callUazapi("/send/media", {
      method: "POST",
      token: row.uazapi_token,
      body,
    });

    return json({ ok: true, message: data });
  } catch (e: any) {
    console.error("uazapi-send-media:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
