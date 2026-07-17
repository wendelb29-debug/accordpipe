import { corsHeaders } from "../_shared/uazapi.ts";
import { callUazapi, json, loadGroupContext, patchChat } from "../_shared/uazapi-group.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await loadGroupContext(req);
    if (ctx instanceof Response) return ctx;
    const mode = String(ctx.body?.MemberAddMode ?? ctx.body?.mode ?? "");
    if (!["admin_add", "all_member_add"].includes(mode)) {
      return json({ error: "MemberAddMode must be admin_add or all_member_add" }, 400);
    }
    const result = await callUazapi("/group/updateMemberAddMode", {
      method: "POST", token: ctx.token,
      body: { groupjid: ctx.groupjid, MemberAddMode: mode },
    });
    await patchChat(ctx.tenantId, ctx.groupjid, { group_member_add_mode: mode });
    return json({ ok: true, result });
  } catch (e: any) {
    console.error("uazapi-group-update-member-add-mode:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
