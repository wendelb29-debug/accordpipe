// Sair de um grupo via uazapi (/group/leave) e remover de whatsapp_chats local.
import {
  callUazapi,
  corsHeaders,
  getInstanceRow,
  json,
  requireCaller,
  requireTenantMember,
  serviceClient,
} from "../_shared/uazapi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;

    const body = await req.json().catch(() => ({}));
    const tenant_id = String(body?.tenant_id ?? "");
    const groupjid = String(body?.groupjid ?? body?.jid ?? "").trim();
    if (!tenant_id) return json({ error: "tenant_id required" }, 400);
    if (!groupjid || !groupjid.endsWith("@g.us")) {
      return json({ error: "groupjid must be in the form <id>@g.us" }, 400);
    }

    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const result = await callUazapi("/group/leave", {
      method: "POST",
      token: row.uazapi_token,
      body: { groupjid },
    });

    // Remove chat local + participantes.
    const svc = serviceClient();
    const { data: chat } = await svc
      .from("whatsapp_chats")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("wa_chatid", groupjid)
      .maybeSingle();
    if (chat?.id) {
      await svc.from("whatsapp_group_participants").delete().eq("chat_id", chat.id);
      await svc.from("whatsapp_chats").delete().eq("id", chat.id);
    }

    return json({ ok: true, result });
  } catch (e: any) {
    console.error("uazapi-group-leave:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
