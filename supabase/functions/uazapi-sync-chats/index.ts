// Onda 7: sincroniza whatsapp_chats a partir de POST /chat/find (uazapiGO).
// Chamado manualmente pelo botão "Sincronizar chats" e ideal para rede de segurança.
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

const PAGE = 100;
const HARD_LIMIT = 1000;

function pick<T = any>(obj: any, keys: string[]): T | null {
  for (const k of keys) {
    const v = k.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return null;
}

function normalizeTs(ts: any): string | null {
  if (!ts) return null;
  const n = Number(ts);
  if (!Number.isFinite(n)) return null;
  const ms = String(ts).length <= 10 ? n * 1000 : n;
  return new Date(ms).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;
    const { tenant_id } = await req.json();
    if (!tenant_id) return json({ error: "tenant_id required" }, 400);
    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const svc = serviceClient();
    let offset = 0;
    let saved = 0;

    while (offset < HARD_LIMIT) {
      const data: any = await callUazapi("/chat/find", {
        method: "POST",
        token: row.uazapi_token,
        body: { sort: "-wa_lastMsgTimestamp", limit: PAGE, offset },
      });
      const list: any[] =
        data?.chats ?? data?.data ?? data?.result ?? (Array.isArray(data) ? data : []);
      if (!list.length) break;

      for (const c of list) {
        const waChatId: string = String(pick(c, ["wa_chatid", "chatid", "id", "jid"]) ?? "");
        if (!waChatId) continue;
        const patch: any = {
          tenant_id,
          wa_chatid: waChatId,
          name: pick(c, ["name", "wa_name", "wa_contactName", "pushName"]) ?? waChatId,
          image_url: pick(c, ["image", "imageUrl", "wa_image"]),
          is_group: Boolean(pick(c, ["wa_isGroup", "isGroup"])) || waChatId.includes("@g.us"),
          is_pinned: Boolean(pick(c, ["wa_isPinned", "isPinned"])),
          is_archived: Boolean(pick(c, ["wa_archived", "archived"])),
          unread_count: Number(pick(c, ["wa_unreadCount", "unreadCount"]) ?? 0),
          last_message_text: pick(c, ["wa_lastMessageTextVote", "lastMessageText"]),
          last_message_type: pick(c, ["wa_lastMessageType", "lastMessageType"]),
          last_message_at: normalizeTs(pick(c, ["wa_lastMsgTimestamp", "lastMsgTimestamp"])),
        };

        const { data: existing } = await svc
          .from("whatsapp_chats")
          .select("id")
          .eq("tenant_id", tenant_id)
          .eq("wa_chatid", waChatId)
          .maybeSingle();
        if (existing) {
          await svc.from("whatsapp_chats").update(patch).eq("id", existing.id);
        } else {
          await svc.from("whatsapp_chats").insert(patch);
        }
        saved++;
      }

      if (list.length < PAGE) break;
      offset += list.length;
    }

    return json({ ok: true, saved, scanned: offset });
  } catch (e: any) {
    console.error("uazapi-sync-chats:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
