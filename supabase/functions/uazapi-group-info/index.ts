// Fetches full group info from uazapi and upserts into whatsapp_chats +
// whatsapp_group_participants. Also computes instance_is_admin (is the
// connected number an admin of this group).
import {
  callUazapi,
  corsHeaders,
  getInstanceRow,
  json,
  normalizePhone,
  requireCaller,
  requireTenantMember,
  serviceClient,
} from "../_shared/uazapi.ts";

function jidNumber(jid: string | null | undefined): string {
  return String(jid ?? "").split("@")[0].replace(/\D+/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;
    const body = await req.json().catch(() => ({}));
    const tenant_id = String(body?.tenant_id ?? "");
    const groupjid = String(body?.groupjid ?? "").trim();
    const force = Boolean(body?.force);
    if (!tenant_id || !groupjid) return json({ error: "tenant_id and groupjid required" }, 400);

    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const info: any = await callUazapi("/group/info", {
      method: "POST",
      token: row.uazapi_token,
      body: { groupjid, getInviteLink: true, force },
    });

    // Detect instance-is-admin using the connected phone number.
    const myPhone = normalizePhone(String(row.phone_number ?? ""));
    const participants: any[] = Array.isArray(info?.Participants) ? info.Participants
      : Array.isArray(info?.participants) ? info.participants
      : [];
    let instanceIsAdmin = false;
    for (const p of participants) {
      const pjid = String(p?.JID ?? p?.jid ?? p?.id ?? "");
      const pAdmin = Boolean(p?.IsAdmin ?? p?.isAdmin ?? p?.admin);
      if (myPhone && jidNumber(pjid) === myPhone && pAdmin) {
        instanceIsAdmin = true;
        break;
      }
    }

    const inviteCode: string | null = info?.InviteCode ?? info?.inviteCode ?? null;
    const inviteLink: string | null =
      info?.InviteLink ?? info?.inviteLink ??
      (inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : null);

    const svc = serviceClient();
    const patch = {
      tenant_id,
      wa_chatid: groupjid,
      is_group: true,
      name: info?.Name ?? info?.name ?? undefined,
      image_url: info?.PictureURL ?? info?.pictureUrl ?? info?.image ?? undefined,
      group_topic: info?.Topic ?? info?.description ?? null,
      group_owner_jid: info?.OwnerJID ?? info?.ownerJid ?? null,
      participant_count: participants.length,
      group_is_announce: Boolean(info?.IsAnnounce ?? info?.announce),
      group_join_approval_required: Boolean(info?.IsJoinApprovalRequired ?? info?.joinApprovalRequired),
      group_member_add_mode: (info?.MemberAddMode ?? info?.memberAddMode ?? "all_member_add") === "admin_add"
        ? "admin_add" : "all_member_add",
      group_invite_link: inviteLink,
      instance_is_admin: instanceIsAdmin,
    };

    const { data: existing } = await svc
      .from("whatsapp_chats")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("wa_chatid", groupjid)
      .maybeSingle();
    let chatId: string;
    if (existing?.id) {
      await svc.from("whatsapp_chats").update(patch).eq("id", existing.id);
      chatId = existing.id;
    } else {
      const { data: inserted } = await svc
        .from("whatsapp_chats").insert(patch).select("id").single();
      chatId = inserted!.id;
    }

    // Sync participants
    if (participants.length) {
      const rows = participants
        .map((p: any) => {
          const pjid = String(p?.JID ?? p?.jid ?? p?.id ?? "").trim();
          if (!pjid) return null;
          return {
            tenant_id,
            chat_id: chatId,
            participant_jid: pjid,
            participant_name: p?.Name ?? p?.name ?? p?.pushName ?? null,
            is_admin: Boolean(p?.IsAdmin ?? p?.isAdmin ?? p?.admin),
          };
        })
        .filter(Boolean);
      if (rows.length) {
        await svc
          .from("whatsapp_group_participants")
          .upsert(rows as any, { onConflict: "chat_id,participant_jid" });
      }
      // Remove participants no longer in the group
      const jids = rows.map((r: any) => r.participant_jid);
      await svc
        .from("whatsapp_group_participants")
        .delete()
        .eq("chat_id", chatId)
        .not("participant_jid", "in", `(${jids.map((j) => `"${j}"`).join(",")})`);
    }

    // Pending join requests (if any)
    const pending: any[] = Array.isArray(info?.PendingApprovals) ? info.PendingApprovals
      : Array.isArray(info?.pendingApprovals) ? info.pendingApprovals : [];

    return json({
      ok: true,
      chat_id: chatId,
      instance_is_admin: instanceIsAdmin,
      invite_link: inviteLink,
      pending_approvals: pending.map((p: any) => ({
        jid: p?.JID ?? p?.jid ?? p?.id ?? "",
        name: p?.Name ?? p?.name ?? null,
      })),
      info,
    });
  } catch (e: any) {
    console.error("uazapi-group-info:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
