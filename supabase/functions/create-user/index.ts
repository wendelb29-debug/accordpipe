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

    // Verify caller is authenticated
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

    // Check caller permissions
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("is_master, name")
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

    if (!isAllowed) {
      const { data: hasPerm } = await supabase.rpc("has_permission", { _user_id: caller.id, _permission: "create_user" });
      if (!hasPerm) {
        await supabase.rpc("log_audit", {
          _user_id: caller.id,
          _user_name: callerProfile?.name || caller.email || "",
          _action: "user_creation_failed",
          _target_type: "user",
          _target_id: null,
          _details: JSON.stringify({ reason: "sem_permissao" }),
        });
        return respond(false, { error: "Sem permissão para criar usuários" });
      }
    }

    const { name, email, cpf, birth_date, whatsapp, company_id, role } = await req.json();

    if (!name || !email || !cpf || !birth_date || !whatsapp || !company_id || !role) {
      return respond(false, { error: "Todos os campos são obrigatórios" });
    }

    const cleanCpf = cpf.replace(/\D/g, "");

    // 1. Check profiles table for same email + same tenant
    const { data: existingProfileSameTenant } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .eq("company_id", company_id)
      .maybeSingle();

    if (existingProfileSameTenant) {
      return respond(false, { error: "Já existe um usuário com este e-mail neste tenant" });
    }

    // 2. Check for duplicate CPF in same tenant
    const { data: existingCpf } = await supabase
      .from("profiles")
      .select("id")
      .eq("cpf", cleanCpf)
      .eq("company_id", company_id)
      .maybeSingle();

    if (existingCpf) {
      return respond(false, { error: "Já existe um usuário com este CPF neste tenant" });
    }

    // 3. Try to create user in auth
    const tempPassword = crypto.randomUUID().slice(0, 12) + "A1!";
    let userId: string;
    let isLinkedExisting = false;

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, company_id },
    });

    if (createError) {
      // 4. If email already exists in auth, reuse the existing user_id
      const isEmailConflict =
        createError.message?.toLowerCase().includes("already") ||
        createError.message?.toLowerCase().includes("duplicate") ||
        createError.message?.toLowerCase().includes("exists") ||
        (createError as any).status === 422;

      if (!isEmailConflict) {
        console.error("Create user error:", createError);
        return respond(false, { error: createError.message });
      }

      // Fetch existing auth user by email
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      // listUsers doesn't support email filter directly, so we search
      let foundUser: any = null;
      
      // Try getUserByEmail if available, otherwise search through pages
      // Use a direct approach: list users and find by email
      let page = 1;
      const perPage = 50;
      while (!foundUser) {
        const { data: pageData, error: pageError } = await supabase.auth.admin.listUsers({
          page,
          perPage,
        });
        if (pageError || !pageData?.users?.length) break;
        foundUser = pageData.users.find((u: any) => u.email === email);
        if (pageData.users.length < perPage) break;
        page++;
        if (page > 20) break; // safety limit
      }

      if (!foundUser) {
        console.error("Could not find existing auth user for email:", email);
        return respond(false, { error: "E-mail já existe mas não foi possível vincular. Contate o suporte." });
      }

      userId = foundUser.id;
      isLinkedExisting = true;
    } else {
      userId = newUser.user.id;
    }

    if (isLinkedExisting) {
      // For linked users, the trigger won't fire, so we need to insert the profile
      const { error: insertProfileError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          name,
          email,
          cpf: cleanCpf,
          birth_date,
          whatsapp: whatsapp.replace(/\D/g, ""),
          company_id,
          is_active: true,
          status: "ativo",
          is_master: false,
        });

      if (insertProfileError) {
        // Profile might already exist from the trigger for the original tenant
        // In that case, the user already has a profile — we just update company_id won't work for multi-tenant
        // For now, if insert fails, it means a profile row with this user_id already exists
        console.error("Profile insert error (linked user):", insertProfileError);
        return respond(false, { error: "Não foi possível criar o perfil para este usuário. Pode já estar vinculado a outro tenant." });
      }

      // Insert role for this user
      const { error: roleInsertError } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role }, { onConflict: "user_id" });

      if (roleInsertError) {
        console.error("Role upsert error:", roleInsertError);
      }
    } else {
      // New user — trigger created profile and role, update them
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

      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (roleError) {
        console.error("Role update error:", roleError);
      }
    }

    // Audit log
    const callerName = callerProfile?.is_master ? "Master" : (callerProfile?.name || caller.email || "");
    await supabase.rpc("log_audit", {
      _user_id: caller.id,
      _user_name: callerName,
      _action: isLinkedExisting ? "user_linked_existing_auth" : "user_created",
      _target_type: "user",
      _target_id: userId,
      _details: JSON.stringify({ name, email, role, company_id, linked: isLinkedExisting }),
    });

    return respond(true, {
      user_id: userId,
      temp_password: isLinkedExisting ? undefined : tempPassword,
      linked_existing: isLinkedExisting,
    });
  } catch (err: any) {
    console.error("Create user error:", err);
    return respond(false, { error: err.message });
  }
});
