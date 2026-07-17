import { corsHeaders } from "../_shared/uazapi.ts";
import { callUazapi, json, loadGroupContext, patchChat } from "../_shared/uazapi-group.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await loadGroupContext(req);
    if (ctx instanceof Response) return ctx;
    const required = Boolean(ctx.body?.IsJoinApprovalRequired ?? ctx.body?.required);
    const result = await callUazapi("/group/updateJoinApproval", {
      method: "POST", token: ctx.token,
      body: { groupjid: ctx.groupjid, IsJoinApprovalRequired: required },
    });
    await patchChat(ctx.tenantId, ctx.groupjid, { group_join_approval_required: required });
    return json({ ok: true, result });
  } catch (e: any) {
    console.error("uazapi-group-update-join-approval:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
