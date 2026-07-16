import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  callUazapi,
  corsHeaders,
  getInstanceRow,
  json,
  requireCaller,
  requireTenantMember,
  serviceClient,
} from "../_shared/uazapi.ts";

/**
 * Onda 9 — Atualiza a foto de perfil real do WhatsApp via uazapi.
 * Body:
 *   { tenant_id, image_base64 }  -> base64 puro (sem prefixo data:), JPEG 640x640
 *   { tenant_id, remove: true }  -> remove a foto
 * O front já redimensiona/corta pra 640x640 antes de enviar.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;

    const body = await req.json().catch(() => ({}));
    const tenant_id: string | undefined = body?.tenant_id;
    const image_base64: string | undefined = body?.image_base64;
    const remove: boolean = Boolean(body?.remove);

    if (!tenant_id) return json({ error: "tenant_id required" }, 400);
    if (!remove && !image_base64) return json({ error: "image_base64 or remove required" }, 400);

    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "no_instance" }, 400);
    if (row.status !== "connected") {
      return json({ error: "instance_not_connected" }, 409);
    }

    const svc = serviceClient();
    let uazapiPayload: { image: string };
    let storedPath: string | null = null;
    let publicSignedUrl: string | null = null;

    if (remove) {
      uazapiPayload = { image: "remove" };
    } else {
      // Decode base64 -> bytes
      const clean = String(image_base64).replace(/^data:[^;]+;base64,/, "");
      let bytes: Uint8Array;
      try {
        const bin = atob(clean);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        bytes = arr;
      } catch {
        return json({ error: "invalid_base64" }, 400);
      }

      const ts = Date.now();
      storedPath = `${tenant_id}/profile/${ts}.jpg`;
      const { error: upErr } = await svc.storage
        .from("whatsapp-media")
        .upload(storedPath, bytes, { contentType: "image/jpeg", upsert: true });
      if (upErr) return json({ error: "storage_upload_failed", detail: upErr.message }, 500);

      // Signed URL valid 7 days — uazapi only fetches it once, but keep some window.
      const { data: signed, error: sErr } = await svc.storage
        .from("whatsapp-media")
        .createSignedUrl(storedPath, 60 * 60 * 24 * 7);
      if (sErr || !signed?.signedUrl) {
        return json({ error: "signed_url_failed", detail: sErr?.message }, 500);
      }
      publicSignedUrl = signed.signedUrl;
      uazapiPayload = { image: publicSignedUrl };
    }

    try {
      await callUazapi("/profile/image", {
        method: "POST",
        token: row.uazapi_token,
        body: uazapiPayload,
      });
    } catch (e: any) {
      return json({
        error: "uazapi_failed",
        detail: e?.data ?? e?.message ?? String(e),
      }, 502);
    }

    // Try to read the new pic URL back from uazapi status; fall back to signed URL.
    let profilePicUrl: string | null = publicSignedUrl;
    try {
      const status: any = await callUazapi("/instance/status", {
        method: "GET",
        token: row.uazapi_token,
      });
      const fresh = status?.instance?.profilePicUrl ?? status?.instance?.picture ?? null;
      if (fresh) profilePicUrl = String(fresh);
    } catch { /* ignore */ }

    if (remove) profilePicUrl = null;

    await svc
      .from("whatsapp_instances")
      .update({ profile_pic_url: profilePicUrl })
      .eq("id", row.id);

    return json({ ok: true, profile_pic_url: profilePicUrl });
  } catch (e: any) {
    console.error("uazapi-update-profile-image:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
