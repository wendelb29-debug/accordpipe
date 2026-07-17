import { corsHeaders } from "../_shared/uazapi.ts";
import { callUazapi, json, loadGroupContext, patchChat } from "../_shared/uazapi-group.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await loadGroupContext(req);
    if (ctx instanceof Response) return ctx;
    const announce = Boolean(ctx.body?.announce);
    const result = await callUazapi("/group/updateAnnounce", {
      method: "POST", token: ctx.token,
      body: { groupjid: ctx.groupjid, announce },
    });
    await patchChat(ctx.tenantId, ctx.groupjid, { group_is_announce: announce });
    return json({ ok: true, result });
  } catch (e: any) {
    console.error("uazapi-group-update-announce:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
