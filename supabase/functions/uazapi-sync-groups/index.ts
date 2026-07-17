// Fetches group list/info from uazapi for a tenant and upserts into
// whatsapp_chats + whatsapp_group_participants. Can be triggered by cron
// (service-role) or manually by an authenticated tenant admin.
import {
  corsHeaders,
  json,
  getBaseUrl,
  serviceClient,
  requireCaller,
  requireTenantMember,
} from "../_shared/uazapi.ts";

interface SyncSummary {
  tenant_id: string;
  groups_processed: number;
  participants_upserted: number;
  errors: string[];
}

async function syncTenant(
  svc: ReturnType<typeof serviceClient>,
  tenantId: string,
  opts: { force?: boolean } = {},
): Promise<SyncSummary> {
  const summary: SyncSummary = {
    tenant_id: tenantId,
    groups_processed: 0,
    participants_upserted: 0,
    errors: [],
  };

  const { data: instance } = await svc
    .from("whatsapp_instances")
    .select("id, uazapi_token, status")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!instance?.uazapi_token) {
    summary.errors.push("instance-not-found");
    return summary;
  }

  const base = getBaseUrl();
  let groups: any[] = [];
  try {
    const qs = opts.force ? "?force=true" : "";
    const res = await fetch(`${base}/group/list${qs}`, {
      method: "GET",
      headers: { token: instance.uazapi_token, Accept: "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    groups = Array.isArray(body) ? body : (body?.groups ?? body?.data ?? []);
  } catch (e: any) {
    summary.errors.push(`group/list: ${e?.message ?? e}`);
    return summary;
  }


  for (const g of groups) {
    try {
      const jid: string = String(g?.JID ?? g?.jid ?? g?.id ?? "");
      if (!jid || !jid.includes("@g.us")) continue;

      let participants: any[] = g?.Participants ?? g?.participants ?? [];
      let image: string | null = g?.image ?? g?.imageUrl ?? g?.picture ?? null;
      let topic: string | null = g?.Topic ?? g?.topic ?? null;
      let owner: string | null = g?.OwnerJID ?? g?.ownerJid ?? null;
      let name: string | null = g?.Name ?? g?.name ?? g?.subject ?? null;

      // Enrich via /group/info when data missing
      if (!image || participants.length === 0) {
        try {
          const infoRes = await fetch(`${base}/group/info`, {
            method: "POST",
            headers: {
              token: instance.uazapi_token,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ groupjid: jid }),
          });
          if (infoRes.ok) {
            const info = await infoRes.json().catch(() => ({}));
            image = image ?? info?.image ?? info?.imageUrl ?? info?.picture ?? null;
            topic = topic ?? info?.Topic ?? info?.topic ?? null;
            owner = owner ?? info?.OwnerJID ?? info?.ownerJid ?? null;
            name = name ?? info?.Name ?? info?.name ?? info?.subject ?? null;
            if (participants.length === 0) {
              participants = info?.Participants ?? info?.participants ?? [];
            }
          }
        } catch { /* ignore, use what we have */ }
      }

      const patch = {
        tenant_id: tenantId,
        wa_chatid: jid,
        name: name ?? jid,
        image_url: image,
        is_group: true,
        group_topic: topic,
        group_owner_jid: owner,
        participant_count: participants.length,
      };

      const { data: existing } = await svc
        .from("whatsapp_chats")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("wa_chatid", jid)
        .maybeSingle();

      let chatRowId = existing?.id;
      if (existing) {
        await svc.from("whatsapp_chats").update(patch).eq("id", existing.id);
      } else {
        const { data: ins } = await svc
          .from("whatsapp_chats")
          .insert(patch)
          .select("id")
          .single();
        chatRowId = ins?.id;
      }

      if (chatRowId) {
        for (const p of participants) {
          const pjid = String(p?.JID ?? p?.jid ?? p?.id ?? "");
          if (!pjid) continue;
          const row = {
            tenant_id: tenantId,
            chat_id: chatRowId,
            participant_jid: pjid,
            participant_name: p?.Name ?? p?.name ?? p?.pushName ?? null,
            is_admin: Boolean(p?.IsAdmin ?? p?.isAdmin ?? p?.admin),
          };
          const { data: exP } = await svc
            .from("whatsapp_group_participants")
            .select("id")
            .eq("chat_id", chatRowId)
            .eq("participant_jid", pjid)
            .maybeSingle();
          if (exP) {
            await svc
              .from("whatsapp_group_participants")
              .update(row)
              .eq("id", exP.id);
          } else {
            await svc.from("whatsapp_group_participants").insert(row);
          }
          summary.participants_upserted++;
        }
      }
      summary.groups_processed++;
    } catch (e: any) {
      summary.errors.push(`group ${g?.JID}: ${e?.message ?? e}`);
    }
  }

  return summary;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const svc = serviceClient();

  // Cron / service-role invocation: sync all tenants that have an instance.
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const isServiceRole =
    !!serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;

  if (isServiceRole) {
    const { data: instances } = await svc
      .from("whatsapp_instances")
      .select("tenant_id")
      .not("uazapi_token", "is", null);
    const results: SyncSummary[] = [];
    for (const inst of instances ?? []) {
      results.push(await syncTenant(svc, inst.tenant_id));
    }
    return json({ ok: true, results });
  }

  // Manual invocation from UI: caller must belong to tenant.
  const caller = await requireCaller(req);
  if (caller instanceof Response) return caller;
  const body = await req.json().catch(() => ({}));
  const tenantId = String(body?.tenant_id ?? "");
  if (!tenantId) return json({ error: "tenant_id required" }, 400);
  const forbid = await requireTenantMember(caller.userId, tenantId);
  if (forbid) return forbid;

  const summary = await syncTenant(svc, tenantId);
  return json({ ok: true, summary });
});
