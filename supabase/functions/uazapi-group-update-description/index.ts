import { corsHeaders } from "../_shared/uazapi.ts";
import { callUazapi, json, loadGroupContext, patchChat } from "../_shared/uazapi-group.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await loadGroupContext(req);
    if (ctx instanceof Response) return ctx;
    const description = String(ctx.body?.description ?? "");
    if (description.length > 512) return json({ error: "description too long (max 512)" }, 400);
    const result = await callUazapi("/group/updateDescription", {
      method: "POST", token: ctx.token,
      body: { groupjid: ctx.groupjid, description },
    });
    await patchChat(ctx.tenantId, ctx.groupjid, { group_topic: description });
    return json({ ok: true, result });
  } catch (e: any) {
    console.error("uazapi-group-update-description:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
