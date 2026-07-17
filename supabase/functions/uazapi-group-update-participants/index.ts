// Handles add/remove/promote/demote/approve/reject on group participants.
// After a successful call, applies the change locally in whatsapp_group_participants.
import { corsHeaders, normalizePhone, serviceClient } from "../_shared/uazapi.ts";
import { callUazapi, json, loadGroupContext } from "../_shared/uazapi-group.ts";

const ACTIONS = new Set(["add","remove","promote","demote","approve","reject"]);

function toJid(numOrJid: string): string {
  const s = String(numOrJid ?? "").trim();
  if (s.includes("@")) return s;
  const digits = normalizePhone(s);
  return digits ? `${digits}@s.whatsapp.net` : s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await loadGroupContext(req);
    if (ctx instanceof Response) return ctx;
    const action = String(ctx.body?.action ?? "");
    if (!ACTIONS.has(action)) return json({ error: `action must be one of ${[...ACTIONS].join(",")}` }, 400);
    const raw = ctx.body?.participants;
    const arr: string[] = Array.isArray(raw) ? raw.map(String) : [];
    if (arr.length === 0) return json({ error: "participants required (array)" }, 400);

    // For add/remove/promote/demote, uazapi accepts phone digits;
    // for approve/reject, it expects the JID from pending list.
    const participants = (action === "approve" || action === "reject")
      ? arr.map((x) => x.trim()).filter(Boolean)
      : arr.map((x) => normalizePhone(x)).filter((x) => x.length >= 10);
    if (participants.length === 0) return json({ error: "no_valid_participants" }, 400);

    const result = await callUazapi("/group/updateParticipants", {
      method: "POST", token: ctx.token,
      body: { groupjid: ctx.groupjid, action, participants },
    });

    // Apply changes locally.
    const svc = serviceClient();
    const { data: chat } = await svc
      .from("whatsapp_chats")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .eq("wa_chatid", ctx.groupjid)
      .maybeSingle();
    if (chat?.id) {
      const chatId = chat.id;
      if (action === "add" || action === "approve") {
        const rows = participants.map((p) => ({
          tenant_id: ctx.tenantId,
          chat_id: chatId,
          participant_jid: toJid(p),
          is_admin: false,
        }));
        await svc.from("whatsapp_group_participants")
          .upsert(rows, { onConflict: "chat_id,participant_jid" });
      } else if (action === "remove" || action === "reject") {
        const jids = participants.map(toJid);
        await svc.from("whatsapp_group_participants")
          .delete()
          .eq("chat_id", chatId)
          .in("participant_jid", jids);
      } else if (action === "promote" || action === "demote") {
        const jids = participants.map(toJid);
        await svc.from("whatsapp_group_participants")
          .update({ is_admin: action === "promote" })
          .eq("chat_id", chatId)
          .in("participant_jid", jids);
      }
    }

    return json({ ok: true, result });
  } catch (e: any) {
    console.error("uazapi-group-update-participants:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
