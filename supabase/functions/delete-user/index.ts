import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      return new Response(JSON.stringify({ ok: false, error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const actorId = userData.user.id;

    // Verify actor role: must be CEO or Master
    const { data: actorProfile } = await admin
      .from("profiles")
      .select("is_master, company_id, name, email")
      .eq("user_id", actorId)
      .maybeSingle();

    const { data: actorRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", actorId);

    const isCeo = (actorRoles || []).some((r: any) => r.role === "ceo");
    const isMaster = !!actorProfile?.is_master || (actorRoles || []).some((r: any) => r.role === "master");

    if (!isCeo && !isMaster) {
      return new Response(JSON.stringify({ ok: false, error: "Apenas CEO ou Master podem excluir usuários." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { target_user_id } = await req.json();
    if (!target_user_id) {
      return new Response(JSON.stringify({ ok: false, error: "target_user_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Self-delete protection
    if (target_user_id === actorId) {
      return new Response(JSON.stringify({ ok: false, error: "Você não pode excluir seu próprio usuário." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load target
    const { data: target } = await admin
      .from("profiles")
      .select("id, user_id, name, email, company_id, is_master, status, is_active")
      .eq("user_id", target_user_id)
      .maybeSingle();

    if (!target) {
      return new Response(JSON.stringify({ ok: false, error: "Usuário não encontrado." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Multi-tenant: non-master must operate on same tenant
    if (!isMaster && target.company_id !== actorProfile?.company_id) {
      return new Response(JSON.stringify({ ok: false, error: "Usuário fora do seu tenant." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cannot delete master profile
    if (target.is_master) {
      return new Response(JSON.stringify({ ok: false, error: "Não é possível excluir um usuário Master." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent removing last CEO/Master of tenant
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

        const otherIds = (tenantUsers || []).map((u: any) => u.user_id);
        let hasOtherCritical = (tenantUsers || []).some((u: any) => u.is_master);
        if (!hasOtherCritical && otherIds.length > 0) {
          const { data: otherRoles } = await admin
            .from("user_roles")
            .select("role,user_id")
            .in("user_id", otherIds);
          hasOtherCritical = (otherRoles || []).some((r: any) => r.role === "ceo" || r.role === "master");
        }
        if (!hasOtherCritical) {
          return new Response(
            JSON.stringify({ ok: false, error: "Não é possível remover o último CEO/Master do tenant." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    const before = { ...target };

    // Soft delete: deactivate + mark status as deleted
    const { error: updErr } = await admin
      .from("profiles")
      .update({ is_active: false, status: "deleted" })
      .eq("user_id", target_user_id);
    if (updErr) throw updErr;

    // Revoke auth access by banning the user (sign-out)
    try {
      await admin.auth.admin.updateUserById(target_user_id, { ban_duration: "876000h" });
    } catch (_e) { /* non-fatal */ }

    // Audit log
    await admin.from("audit_logs").insert({
      user_id: actorId,
      user_name: actorProfile?.name || actorProfile?.email || "system",
      action: "user_deleted",
      target_type: "user",
      target_id: target_user_id,
      details: {
        before_payload: before,
        after_payload: { is_active: false, status: "deleted" },
        soft_delete: true,
      },
      servidor_id: target.company_id,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
