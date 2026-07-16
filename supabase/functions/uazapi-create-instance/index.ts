import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  callUazapi,
  corsHeaders,
  getInstanceRow,
  json,
  requireCaller,
  requireTenantMember,
  serviceClient,
  slugifyTenant,
} from "../_shared/uazapi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;

    const { tenant_id } = await req.json();
    if (!tenant_id) return json({ error: "tenant_id required" }, 400);

    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const existing = await getInstanceRow(tenant_id);
    if (existing?.uazapi_token) {
      return json({
        ok: true,
        already_exists: true,
        instance: {
          id: existing.id,
          status: existing.status,
          uazapi_instance_id: existing.uazapi_instance_id,
        },
      });
    }

    const svc = serviceClient();
    const { data: tenant } = await svc
      .from("companies")
      .select("nome, name")
      .eq("id", tenant_id)
      .maybeSingle();
    const tenantName = (tenant as any)?.nome ?? (tenant as any)?.name ?? null;
    const name = slugifyTenant(tenant_id, tenantName);

    // uazapiGO admin endpoint to create/init an instance
    const created = await callUazapi("/instance/init", {
      method: "POST",
      useAdminToken: true,
      body: { name },
    });

    const uazapi_token: string =
      created?.token ?? created?.instance?.token ?? "";
    const uazapi_instance_id: string | null =
      created?.id ?? created?.instance?.id ?? created?.instance_id ?? null;

    if (!uazapi_token) {
      return json(
        {
          error: "uazapi did not return an instance token",
          details: created,
        },
        502
      );
    }

    const upsert = await svc
      .from("whatsapp_instances")
      .upsert(
        {
          tenant_id,
          uazapi_token,
          uazapi_instance_id,
          instance_name: name,
          status: "disconnected",
        },
        { onConflict: "tenant_id" }
      )
      .select("id, status")
      .single();

    if (upsert.error) return json({ error: upsert.error.message }, 500);
    return json({ ok: true, instance: upsert.data });
  } catch (e: any) {
    console.error("uazapi-create-instance:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
