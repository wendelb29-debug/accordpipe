import { corsHeaders } from "../_shared/uazapi.ts";
import { callUazapi, json, loadGroupContext, patchChat, serviceClient } from "../_shared/uazapi-group.ts";

// Body:
//   { tenant_id, groupjid, image_base64 }   -> uploads and sends URL to uazapi
//   { tenant_id, groupjid, remove: true }   -> sends { image: "remove" }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await loadGroupContext(req);
    if (ctx instanceof Response) return ctx;
    const remove = Boolean(ctx.body?.remove);
    const image_base64: string | undefined = ctx.body?.image_base64;

    let uazapiPayload: { groupjid: string; image: string };
    let newImageUrl: string | null = null;

    if (remove) {
      uazapiPayload = { groupjid: ctx.groupjid, image: "remove" };
    } else {
      if (!image_base64) return json({ error: "image_base64 or remove required" }, 400);
      const clean = String(image_base64).replace(/^data:[^;]+;base64,/, "");
      let bytes: Uint8Array;
      try {
        const bin = atob(clean);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        bytes = arr;
      } catch { return json({ error: "invalid_base64" }, 400); }

      const svc = serviceClient();
      const safeJid = ctx.groupjid.replace(/[^A-Za-z0-9]/g, "_");
      const path = `${ctx.tenantId}/groups/${safeJid}/${Date.now()}.jpg`;
      const { error: upErr } = await svc.storage
        .from("whatsapp-media")
        .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
      if (upErr) return json({ error: "storage_upload_failed", detail: upErr.message }, 500);
      const { data: signed, error: sErr } = await svc.storage
        .from("whatsapp-media")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (sErr || !signed?.signedUrl) {
        return json({ error: "signed_url_failed", detail: sErr?.message }, 500);
      }
      newImageUrl = signed.signedUrl;
      uazapiPayload = { groupjid: ctx.groupjid, image: signed.signedUrl };
    }

    const result = await callUazapi("/group/updateImage", {
      method: "POST", token: ctx.token, body: uazapiPayload,
    });
    await patchChat(ctx.tenantId, ctx.groupjid, { image_url: remove ? null : newImageUrl });
    return json({ ok: true, result, image_url: remove ? null : newImageUrl });
  } catch (e: any) {
    console.error("uazapi-group-update-image:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
