import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(ok: boolean, payload: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the caller is authenticated and has admin/master permissions
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respond(false, { error: "Não autorizado" });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return respond(false, { error: "Não autorizado" });
    }

    // Check caller is admin/master/ceo
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("is_master")
      .eq("user_id", caller.id)
      .single();

    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    const isAllowed = callerProfile?.is_master ||
      callerRole?.role === "ceo" ||
      callerRole?.role === "master" ||
      callerRole?.role === "admin";

    // Also check has_permission in DB
    if (!isAllowed) {
      const { data: hasPerm } = await supabase.rpc("has_permission", { _user_id: caller.id, _permission: "create_user" });
      if (!hasPerm) {
        return respond(false, { error: "Sem permissão para criar usuários" });
      }
    }

    const { name, email, cpf, birth_date, whatsapp, company_id, role } = await req.json();

    if (!name || !email || !cpf || !birth_date || !whatsapp || !company_id || !role) {
      return respond(false, { error: "Todos os campos são obrigatórios" });
    }

    // Check for duplicate email in profiles
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      return respond(false, { error: "Já existe um usuário com este e-mail" });
    }

    // Check for duplicate CPF
    const cleanCpf = cpf.replace(/\D/g, "");
    const { data: existingCpf } = await supabase
      .from("profiles")
      .select("id")
      .eq("cpf", cleanCpf)
      .maybeSingle();

    if (existingCpf) {
      return respond(false, { error: "Já existe um usuário com este CPF" });
    }
    // Skip broad listUsers check — createUser will return a clear error if email exists in auth

    // Generate a temporary password
    const tempPassword = crypto.randomUUID().slice(0, 12) + "A1!";

    // Create the user via admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        company_id,
      },
    });

    if (createError) {
      console.error("Create user error:", createError);
      const msg = createError.message?.includes("already")
        ? "Já existe um usuário com este e-mail"
        : createError.message;
      return respond(false, { error: msg });
    }

    const userId = newUser.user.id;

    // Update profile with additional fields (trigger already created the profile)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        cpf: cleanCpf,
        birth_date,
        whatsapp: whatsapp.replace(/\D/g, ""),
        company_id,
      })
      .eq("user_id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // Update the role (trigger created default role, we update it)
    const { error: roleError } = await supabase
      .from("user_roles")
      .update({ role })
      .eq("user_id", userId);

    if (roleError) {
      console.error("Role update error:", roleError);
    }

    // Audit log
    await supabase.rpc("log_audit", {
      _user_id: caller.id,
      _user_name: callerProfile?.is_master ? "Master" : (caller.email || ""),
      _action: "create_user",
      _target_type: "user",
      _target_id: userId,
      _details: JSON.stringify({ name, email, role, company_id }),
    });

    return respond(true, {
      user_id: userId,
      temp_password: tempPassword,
    });
  } catch (err: any) {
    console.error("Create user error:", err);
    return respond(false, { error: err.message });
  }
});
