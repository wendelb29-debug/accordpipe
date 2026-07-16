// Onda 6: reprocessa mídias com download pendente/falho antes do link da uazapi expirar (2 dias).
// Roda a cada 15 min via cron. Sem JWT (chamado pelo pg_net com service key).
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  corsHeaders,
  serviceClient,
  fetchAndStoreUazapiMedia,
} from "../_shared/uazapi.ts";

const AUDIO_TYPES = new Set(["audio", "myaudio", "ptt"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const svc = serviceClient();

  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString();
  const { data: rows, error } = await svc
    .from("whatsapp_messages")
    .select("id, company_id, external_message_id, message_type")
    .in("media_download_status", ["pending", "failed"])
    .gte("created_at", cutoff)
    .not("external_message_id", "is", null)
    .limit(100);

  if (error) {
    console.error("retry-pending-media query:", error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Agrupa instância por tenant para minimizar consultas
  const tenants = Array.from(new Set((rows ?? []).map(r => r.company_id)));
  const instMap = new Map<string, { token: string | null }>();
  for (const t of tenants) {
    const { data: inst } = await svc.from("whatsapp_instances")
      .select("uazapi_token").eq("tenant_id", t).maybeSingle();
    instMap.set(t, { token: inst?.uazapi_token ?? null });
  }

  let ok = 0, fail = 0;
  for (const r of rows ?? []) {
    const inst = instMap.get(r.company_id);
    if (!inst?.token || !r.external_message_id) { fail++; continue; }
    try {
      const { storagePath, mimetype, transcription } = await fetchAndStoreUazapiMedia({
        tenantId: r.company_id,
        externalMessageId: r.external_message_id,
        instanceToken: inst.token,
        isAudio: AUDIO_TYPES.has(String(r.message_type).toLowerCase()),
      });
      await svc.from("whatsapp_messages").update({
        media_url: storagePath,
        media_mimetype: mimetype,
        media_download_status: "done",
        transcription: transcription ?? null,
      }).eq("id", r.id);
      ok++;
    } catch (err: any) {
      console.warn("retry media failed", r.id, err?.message);
      await svc.from("whatsapp_messages").update({
        media_download_status: "failed",
      }).eq("id", r.id);
      fail++;
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: rows?.length ?? 0, done: ok, failed: fail }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
