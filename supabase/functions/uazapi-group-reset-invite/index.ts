import { corsHeaders } from "../_shared/uazapi.ts";
import { callUazapi, json, loadGroupContext, patchChat } from "../_shared/uazapi-group.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await loadGroupContext(req);
    if (ctx instanceof Response) return ctx;
    const result: any = await callUazapi("/group/resetInviteCode", {
      method: "POST", token: ctx.token,
      body: { groupjid: ctx.groupjid },
    });
    const code: string | null = result?.InviteCode ?? result?.inviteCode ?? null;
    const link = code
      ? `https://chat.whatsapp.com/${code}`
      : (result?.InviteLink ?? result?.inviteLink ?? null);
    if (link) await patchChat(ctx.tenantId, ctx.groupjid, { group_invite_link: link });
    return json({ ok: true, invite_link: link, result });
  } catch (e: any) {
    console.error("uazapi-group-reset-invite:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
