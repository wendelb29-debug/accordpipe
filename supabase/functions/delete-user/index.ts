import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json(401, { ok: false, error: "Não autenticado" });
    }
    const actorId = userData.user.id;

    // Verify actor: must be Master, CEO or Admin
    const { data: actorProfile } = await admin
      .from("profiles")
      .select("is_master, company_id, name, email")
      .eq("user_id", actorId)
      .maybeSingle();

    const { data: actorRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", actorId);

    const roles = (actorRoles || []).map((r: any) => r.role);
    const isMaster = !!actorProfile?.is_master || roles.includes("master");
    const isCeo = roles.includes("ceo");
    const isAdmin = roles.includes("admin");

    if (!isMaster && !isCeo && !isAdmin) {
      return json(403, { ok: false, error: "Apenas Master, CEO ou Admin podem excluir usuários." });
    }

    const { target_user_id } = await req.json();
    if (!target_user_id) {
      return json(400, { ok: false, error: "target_user_id obrigatório" });
    }

    // Self-delete protection
    if (target_user_id === actorId) {
      return json(400, { ok: false, error: "Você não pode excluir seu próprio usuário." });
    }

    // Load target
    const { data: target } = await admin
      .from("profiles")
      .select("id, user_id, name, email, company_id, is_master, status, is_active, avatar_url")
      .eq("user_id", target_user_id)
      .maybeSingle();

    if (!target) {
      return json(404, { ok: false, error: "Usuário não encontrado." });
    }

    // Tenant boundary: non-master must operate on same tenant
    if (!isMaster && target.company_id !== actorProfile?.company_id) {
      return json(403, { ok: false, error: "Usuário fora do seu tenant." });
    }

    // Cannot delete Master profile
    if (target.is_master) {
      return json(400, { ok: false, error: "Não é possível excluir um usuário Master." });
    }

    // Prevent removing the last critical (CEO/Master) of the tenant
    if (target.company_id) {
      const { data: targetRoles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", target_user_id);
      const targetIsCritical = (targetRoles || []).some((r: any) => r.role === "ceo" || r.role === "master");

      if (targetIsCritical) {
        const { data: tenantUsers } = await admin
          .from("profiles")
          .select("user_id, is_master")
          .eq("company_id", target.company_id)
          .eq("is_active", true)
          .neq("user_id", target_user_id);

        let hasOtherCritical = (tenantUsers || []).some((u: any) => u.is_master);
        const otherIds = (tenantUsers || []).map((u: any) => u.user_id);
        if (!hasOtherCritical && otherIds.length > 0) {
          const { data: otherRoles } = await admin
            .from("user_roles")
            .select("role,user_id")
            .in("user_id", otherIds);
          hasOtherCritical = (otherRoles || []).some((r: any) => r.role === "ceo" || r.role === "master");
        }
        if (!hasOtherCritical) {
          return json(400, { ok: false, error: "Não é possível remover o último CEO/Master do tenant." });
        }
      }
    }

    const before = { ...target };
    const errors: Record<string, string> = {};

    // ──────────────────────────────────────────────
    // HARD DELETE — purge user data from all tables
    // ──────────────────────────────────────────────
    const tableDeletes: Array<[string, string]> = [
      ["user_workspace_permissions", "user_id"],
      ["user_custom_permissions", "user_id"],
      ["user_goals", "user_id"],
      ["user_tenants", "user_id"],
      ["user_roles", "user_id"],
      ["notifications", "user_id"],
    ];

    for (const [table, col] of tableDeletes) {
      const { error } = await admin.from(table).delete().eq(col, target_user_id);
      if (error) errors[table] = error.message;
    }

    // Storage cleanup — best-effort
    const buckets = ["avatars", "user-signatures"];
    for (const bucket of buckets) {
      try {
        const { data: files } = await admin.storage.from(bucket).list(target_user_id, { limit: 1000 });
        if (files && files.length > 0) {
          const paths = files.map((f) => `${target_user_id}/${f.name}`);
          await admin.storage.from(bucket).remove(paths);
        }
      } catch (_e) { /* best-effort */ }
    }

    // Delete profile (last, before auth)
    const { error: profDelErr } = await admin
      .from("profiles")
      .delete()
      .eq("user_id", target_user_id);
    if (profDelErr) errors["profiles"] = profDelErr.message;

    // Delete from Supabase Auth
    const { error: authDelErr } = await admin.auth.admin.deleteUser(target_user_id);
    if (authDelErr) errors["auth"] = authDelErr.message;

    // Audit log (kept on purpose for compliance — references actor, target_id is text)
    await admin.from("audit_logs").insert({
      user_id: actorId,
      user_name: actorProfile?.name || actorProfile?.email || "system",
      action: "user_deleted_hard",
      target_type: "user",
      target_id: target_user_id,
      details: {
        before_payload: before,
        hard_delete: true,
        cleanup_errors: errors,
      },
      servidor_id: target.company_id,
    });

    const hadCritical = errors["profiles"] || errors["auth"];
    if (hadCritical) {
      return json(500, {
        ok: false,
        error: `Falha ao excluir: ${errors["profiles"] || errors["auth"]}`,
        partial_errors: errors,
      });
    }

    return json(200, { ok: true, partial_errors: errors });
  } catch (e: any) {
    return json(500, { ok: false, error: e.message || String(e) });
  }
});
