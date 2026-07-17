import { corsHeaders } from "../_shared/uazapi.ts";
import { callUazapi, json, loadGroupContext, patchChat } from "../_shared/uazapi-group.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await loadGroupContext(req);
    if (ctx instanceof Response) return ctx;
    const name = String(ctx.body?.name ?? "").trim();
    if (!name) return json({ error: "name required" }, 400);
    if (name.length > 25) return json({ error: "name too long (max 25)" }, 400);
    const result = await callUazapi("/group/updateName", {
      method: "POST", token: ctx.token,
      body: { groupjid: ctx.groupjid, name },
    });
    await patchChat(ctx.tenantId, ctx.groupjid, { name });
    return json({ ok: true, result });
  } catch (e: any) {
    console.error("uazapi-group-update-name:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
