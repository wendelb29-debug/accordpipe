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

    const { name, email, cpf, birth_date, whatsapp, company_id, role, trial_expires_at } = await req.json();

    if (!name || !email || !cpf || !birth_date || !whatsapp || !company_id || !role) {
      return respond(false, { error: "Todos os campos são obrigatórios" });
    }

    const trialExpiresAt: string | null = trial_expires_at && typeof trial_expires_at === "string"
      ? trial_expires_at
      : null;
    const isTrialUser = !!trialExpiresAt;

    // ──────────────────────────────────────────────
    // CHECK USER LIMIT BEFORE PROCEEDING
    // ──────────────────────────────────────────────
    const { data: limitCheck } = await supabase.rpc("check_user_limit", { _tenant_id: company_id });
    if (limitCheck && !limitCheck.can_add) {
      const status = limitCheck.billing_status;
      let reason = `Limite de usuários atingido para este tenant (${limitCheck.active_users}/${limitCheck.effective_limit}).`;
      if (status === "suspended") reason = "Assinatura suspensa. Criação de usuários bloqueada.";
      if (status === "cancelled") reason = "Assinatura cancelada. Criação de usuários bloqueada.";

      await supabase.rpc("log_audit", {
        _user_id: caller.id,
        _user_name: callerProfile?.name || caller.email || "",
        _action: "user_creation_blocked_limit",
        _target_type: "user",
        _target_id: null,
        _details: JSON.stringify({
          reason,
          plan: limitCheck.plan_name,
          active_users: limitCheck.active_users,
          effective_limit: limitCheck.effective_limit,
          billing_status: status,
        }),
      });

      return respond(false, {
        error: reason,
        limit_info: {
          plan_name: limitCheck.plan_name,
          active_users: limitCheck.active_users,
          effective_limit: limitCheck.effective_limit,
          remaining: limitCheck.remaining,
          billing_status: status,
        },
      });
    }

    const cleanCpf = cpf.replace(/\D/g, "");
    const cleanWhatsapp = whatsapp.replace(/\D/g, "");

    // Generate friendly random password: Accord@XXXX
    const tempPassword = `Accord@${Math.floor(1000 + Math.random() * 9000)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;

    // ──────────────────────────────────────────────
    // STEP 1: Check if user_tenants link already exists for this email + tenant
    // ──────────────────────────────────────────────
    const { data: existingProfileSameTenant } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .eq("company_id", company_id)
      .maybeSingle();

    if (existingProfileSameTenant) {
      // Also check user_tenants
      const { data: existingLink } = await supabase
        .from("user_tenants")
        .select("id")
        .eq("user_id", existingProfileSameTenant.user_id)
        .eq("tenant_id", company_id)
        .maybeSingle();

      if (existingLink) {
        return respond(false, { error: "Este usuário já está vinculado a este tenant." });
      }
    }

    // Check for duplicate CPF in same tenant
    const { data: existingCpf } = await supabase
      .from("profiles")
      .select("id, company_id")
      .eq("cpf", cleanCpf)
      .eq("company_id", company_id)
      .maybeSingle();

    if (existingCpf) {
      return respond(false, { error: "Já existe um usuário com este CPF neste tenant." });
    }

    // ──────────────────────────────────────────────
    // STEP 2: Try to create auth user
    // ──────────────────────────────────────────────
    let userId: string;
    let isLinkedExisting = false;

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, company_id },
    });

    if (createError) {
      const isEmailConflict =
        createError.message?.toLowerCase().includes("already") ||
        createError.message?.toLowerCase().includes("duplicate") ||
        createError.message?.toLowerCase().includes("exists") ||
        (createError as any).status === 422;

      if (!isEmailConflict) {
        console.error("Create user error:", createError);
        return respond(false, { error: createError.message });
      }

      // ──────────────────────────────────────────────
      // STEP 3: User already exists in auth — find via profiles (fast path)
      // ──────────────────────────────────────────────
      const { data: existingByEmail } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      let foundUserId: string | null = existingByEmail?.user_id ?? null;

      // Fallback: paginate auth users (slow but reliable)
      if (!foundUserId) {
        let page = 1;
        const perPage = 200;
        while (!foundUserId) {
          const { data: pageData, error: pageError } = await supabase.auth.admin.listUsers({ page, perPage });
          if (pageError || !pageData?.users?.length) break;
          const match = pageData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          if (match) { foundUserId = match.id; break; }
          if (pageData.users.length < perPage) break;
          page++;
          if (page > 10) break;
        }
      }

      if (!foundUserId) {
        console.error("Could not find existing auth user for email:", email);
        return respond(false, { error: "E-mail já existe no Auth mas não foi possível localizar o usuário. Contate o suporte." });
      }

      userId = foundUserId;
      isLinkedExisting = true;
    } else {
      userId = newUser.user.id;
    }

    // ──────────────────────────────────────────────
    // STEP 4: Ensure user_tenants link doesn't already exist
    // ──────────────────────────────────────────────
    const { data: existingTenantLink } = await supabase
      .from("user_tenants")
      .select("id")
      .eq("user_id", userId)
      .eq("tenant_id", company_id)
      .maybeSingle();

    if (existingTenantLink) {
      return respond(false, { error: "Este usuário já está vinculado a este tenant." });
    }

    // ──────────────────────────────────────────────
    // STEP 5: Handle profile
    // ──────────────────────────────────────────────
    if (isLinkedExisting) {
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, company_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingProfile) {
        // Profile exists — update company_id to the new tenant (switch active tenant)
        console.log(`User ${userId} already has profile. Updating company_id to ${company_id}`);
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({
            company_id,
            name,
            cpf: cleanCpf,
            birth_date,
            whatsapp: cleanWhatsapp,
            is_active: true,
            status: "ativo",
            must_change_password: true,
            trial_expires_at: trialExpiresAt,
            is_trial_user: isTrialUser,
          })
          .eq("user_id", userId);

        // Reset password to the new temp password so admin can share it
        await supabase.auth.admin.updateUserById(userId, { password: tempPassword });

        if (updateErr) {
          console.error("Profile update error (linked user):", updateErr);
          return respond(false, { error: "Não foi possível atualizar o perfil do usuário existente." });
        }
      } else {
        // No profile yet — create one
        const { error: insertProfileError } = await supabase
          .from("profiles")
          .insert({
            user_id: userId,
            name,
            email,
            cpf: cleanCpf,
            birth_date,
            whatsapp: cleanWhatsapp,
            company_id,
            is_active: true,
            status: "ativo",
            is_master: false,
            must_change_password: true,
            trial_expires_at: trialExpiresAt,
            is_trial_user: isTrialUser,
          });

        if (insertProfileError) {
          console.error("Profile insert error (linked user):", insertProfileError);
          return respond(false, { error: "Não foi possível criar o perfil. Contate o suporte." });
        }
      }

      // Upsert role
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
          whatsapp: cleanWhatsapp,
          company_id,
          must_change_password: true,
          trial_expires_at: trialExpiresAt,
          is_trial_user: isTrialUser,
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

    // ──────────────────────────────────────────────
    // STEP 6: Create user_tenants link
    // ──────────────────────────────────────────────
    const { error: tenantLinkError } = await supabase
      .from("user_tenants")
      .insert({
        user_id: userId,
        tenant_id: company_id,
        role,
        status: "ativo",
      });

    if (tenantLinkError) {
      console.error("user_tenants insert error:", tenantLinkError);
      // Non-fatal — profile was already created/updated
    }

    // ──────────────────────────────────────────────
    // STEP 7: Audit log
    // ──────────────────────────────────────────────
    const callerName = callerProfile?.is_master ? "Master" : (callerProfile?.name || caller.email || "");
    await supabase.rpc("log_audit", {
      _user_id: caller.id,
      _user_name: callerName,
      _action: isLinkedExisting ? "user_linked_existing_auth" : "user_created",
      _target_type: "user",
      _target_id: userId,
      _details: JSON.stringify({ name, email, role, company_id, linked: isLinkedExisting }),
    });

    // ──────────────────────────────────────────────
    // STEP 8: Send WhatsApp with credentials (best-effort, direct via provider)
    // ──────────────────────────────────────────────
    const appUrl = Deno.env.get("APP_URL") || "https://accordpipe.com.br";
    let whatsappSent = false;
    let whatsappError: string | null = null;

    // Normalize phone with BR DDI (55) when missing
    const normalizePhoneBR = (raw: string): string => {
      const digits = (raw || "").replace(/\D/g, "");
      if (!digits) return "";
      if (digits.startsWith("55") && digits.length >= 12) return digits;
      if (digits.length === 10 || digits.length === 11) return `55${digits}`;
      return digits;
    };
    const targetPhone = normalizePhoneBR(cleanWhatsapp);

    try {
      const waText =
        `Olá, ${name.split(" ")[0]} 👋\n\n` +
        `Seu acesso ao *ACCORD* foi criado com sucesso.\n\n` +
        `🌐 URL: ${appUrl}\n` +
        `👤 Login: ${email}\n` +
        `🔑 Senha temporária: ${tempPassword}\n\n` +
        `No primeiro acesso você deverá definir uma nova senha permanente.`;

      if (!targetPhone || targetPhone.length < 12) {
        whatsappError = "WhatsApp inválido ou ausente.";
      } else {
        // Load tenant integration with service role (bypass RLS — auth context not available here)
        const { data: integ, error: integErr } = await supabase
          .from("tenant_whatsapp_integrations")
          .select("*")
          .eq("tenant_id", company_id)
          .order("is_active", { ascending: false })
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (integErr || !integ) {
          whatsappError = "Nenhuma integração WhatsApp ativa para este tenant.";
        } else if (!integ.server_url || !integ.instance_token) {
          whatsappError = "Credenciais incompletas na integração WhatsApp.";
        } else {
          const base = String(integ.server_url).replace(/\/$/, "");
          let res: Response;
          if (integ.provider_type === "uazapi") {
            res = await fetch(`${base}/send/text`, {
              method: "POST",
              headers: { token: integ.instance_token, "Content-Type": "application/json" },
              body: JSON.stringify({ number: targetPhone, text: waText }),
            });
          } else if (integ.provider_type === "zapi") {
            const { data: comp } = await supabase
              .from("companies")
              .select("zapi_client_token")
              .eq("id", company_id)
              .maybeSingle();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (comp?.zapi_client_token) headers["Client-Token"] = comp.zapi_client_token;
            res = await fetch(
              `${base}/instances/${integ.instance_id || ""}/token/${integ.instance_token}/send-text`,
              { method: "POST", headers, body: JSON.stringify({ phone: targetPhone, message: waText }) },
            );
          } else {
            whatsappError = `Provider '${integ.provider_type}' não suportado.`;
            res = new Response(null, { status: 0 });
          }

          if (!whatsappError) {
            const bodyText = await res.text().catch(() => "");
            if (res.ok) {
              whatsappSent = true;
            } else {
              whatsappError = `Provider HTTP ${res.status}: ${bodyText.slice(0, 200)}`;
            }
          }
        }
      }
    } catch (e: any) {
      whatsappError = e?.message || "Erro inesperado no envio WhatsApp";
    }

    // Audit WhatsApp send result
    await supabase.rpc("log_audit", {
      _user_id: caller.id,
      _user_name: callerName,
      _action: whatsappSent ? "whatsapp_access_sent" : "whatsapp_access_send_failed",
      _target_type: "user",
      _target_id: userId,
      _details: JSON.stringify({
        phone: targetPhone,
        error: whatsappError,
        tenant_id: company_id,
      }),
    });

    const successMessage = isLinkedExisting
      ? "Usuário existente vinculado a este tenant com sucesso!"
      : "Usuário criado com sucesso!";

    return respond(true, {
      user_id: userId,
      temp_password: tempPassword,
      linked_existing: isLinkedExisting,
      whatsapp_sent: whatsappSent,
      whatsapp_error: whatsappError,
      message: successMessage,
    });
  } catch (err: any) {
    console.error("Create user error:", err);
    return respond(false, { error: err.message });
  }
});
