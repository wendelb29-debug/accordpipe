// Entra em um grupo via link/código de convite (uazapi /group/join).
// Suporta preview via preview=true, que apenas retorna informações do grupo
// sem entrar (uazapi /group/inviteinfo).
import {
  callUazapi,
  corsHeaders,
  getInstanceRow,
  json,
  requireCaller,
  requireTenantMember,
  serviceClient,
} from "../_shared/uazapi.ts";

function extractInviteCode(input: string): string {
  const s = input.trim();
  const m = s.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;

    const body = await req.json().catch(() => ({}));
    const tenant_id = String(body?.tenant_id ?? "");
    const invitecodeRaw = String(body?.invitecode ?? body?.code ?? "").trim();
    const preview = Boolean(body?.preview);
    if (!tenant_id) return json({ error: "tenant_id required" }, 400);
    if (!invitecodeRaw) return json({ error: "invitecode required" }, 400);

    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const invitecode = extractInviteCode(invitecodeRaw);

    if (preview) {
      const info = await callUazapi("/group/inviteinfo", {
        method: "POST",
        token: row.uazapi_token,
        body: { invitecode },
      });
      return json({ ok: true, info });
    }

    const joined: any = await callUazapi("/group/join", {
      method: "POST",
      token: row.uazapi_token,
      body: { invitecode },
    });

    // Persistir grupo em whatsapp_chats para aparecer no inbox.
    const jid: string = String(joined?.JID ?? joined?.jid ?? "");
    if (jid) {
      const svc = serviceClient();
      const patch = {
        tenant_id,
        wa_chatid: jid,
        name: joined?.Name ?? joined?.name ?? jid,
        is_group: true,
        group_topic: joined?.Topic ?? null,
        group_owner_jid: joined?.OwnerJID ?? null,
        participant_count: Array.isArray(joined?.Participants) ? joined.Participants.length : 0,
      };
      const { data: existing } = await svc
        .from("whatsapp_chats")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("wa_chatid", jid)
        .maybeSingle();
      if (existing) {
        await svc.from("whatsapp_chats").update(patch).eq("id", existing.id);
      } else {
        await svc.from("whatsapp_chats").insert(patch);
      }
    }

    return json({ ok: true, group: joined });
  } catch (e: any) {
    console.error("uazapi-group-join:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
