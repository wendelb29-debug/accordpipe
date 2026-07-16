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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;
    const body = await req.json().catch(() => ({}));
    const tenant_id = body?.tenant_id;
    if (!tenant_id) return json({ error: "tenant_id required" }, 400);
    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ status: "no_instance" });

    const data = await callUazapi("/instance/status", {
      method: "GET",
      token: row.uazapi_token,
    });

    const inst = data?.instance ?? {};
    const st = data?.status ?? {};
    const connected: boolean = Boolean(st?.connected ?? inst?.connected);
    const loggedIn: boolean = Boolean(st?.loggedIn ?? inst?.loggedIn);
    let status: string = row.status;
    if (connected && loggedIn) status = "connected";
    else if (inst?.status === "hibernated") status = "hibernated";
    else if (connected || inst?.status === "connecting") status = "connecting";
    else status = "disconnected";

    const jidUser =
      st?.jid?.user ?? inst?.jid?.user ?? inst?.phoneConnected ?? null;
    const profileName = inst?.profileName ?? inst?.pushname ?? null;
    const profilePicUrl = inst?.profilePicUrl ?? inst?.picture ?? null;

    const svc = serviceClient();
    const updates: Record<string, unknown> = { status };
    if (jidUser) updates.phone_number = String(jidUser);
    if (profileName) updates.profile_name = profileName;
    if (profilePicUrl) updates.profile_pic_url = profilePicUrl;
    if (inst?.id) updates.uazapi_instance_id = inst.id;

    await svc.from("whatsapp_instances").update(updates).eq("id", row.id);

    // Auto-setup webhook on first connection detection.
    if (status === "connected" && row.status !== "connected") {
      try {
        const base = Deno.env.get("SUPABASE_URL") ?? "";
        const webhookUrl = `${base}/functions/v1/uazapi-webhook`;
        await callUazapi("/webhook", {
          method: "POST",
          token: row.uazapi_token,
          body: {
            url: webhookUrl,
            events: ["messages", "messages_update", "connection"],
            excludeMessages: ["wasSentByApi"],
            enabled: true,
          },
        });
      } catch (err) {
        console.warn("auto webhook setup failed:", err);
      }
    }

    return json({ ok: true, status, phone_number: jidUser, profile_name: profileName, profile_pic_url: profilePicUrl });
  } catch (e: any) {
    console.error("uazapi-instance-status:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
