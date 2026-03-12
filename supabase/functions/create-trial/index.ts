import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cnpj, razao_social, nome_fantasia, responsavel, telefone, email, password, role } = await req.json();

    // Validate required fields
    if (!cnpj || !razao_social || !responsavel || !telefone || !email || !password) {
      return new Response(JSON.stringify({ error: "Todos os campos obrigatórios devem ser preenchidos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanedCnpj = cnpj.replace(/\D/g, "");
    if (cleanedCnpj.length !== 14) {
      return new Response(JSON.stringify({ error: "CNPJ inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validRole = role === "admin" || role === "operador" ? role : "admin";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if CNPJ already exists
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .eq("cnpj", cleanedCnpj)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Este CNPJ já está cadastrado no sistema." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if email already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(u => u.email === email);
    if (emailExists) {
      return new Response(JSON.stringify({ error: "Este e-mail já está cadastrado." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create the trial company (servidor)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        cnpj: cleanedCnpj,
        razao_social,
        nome_fantasia: nome_fantasia || null,
        responsavel,
        telefone,
        email,
        status: "teste",
        is_trial: true,
        trial_start: now.toISOString(),
        trial_expires_at: expiresAt.toISOString(),
        trial_extensions: 0,
      })
      .select("id")
      .single();

    if (companyError) {
      console.error("Company creation error:", companyError);
      return new Response(JSON.stringify({ error: "Erro ao criar empresa de teste." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create auth user with email auto-confirmed
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: responsavel, company_id: company.id },
    });

    if (authError) {
      // Rollback company
      await supabase.from("companies").delete().eq("id", company.id);
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Erro ao criar usuário: " + authError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Update profile to be active with correct company
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        company_id: company.id,
        is_active: true,
        status: "ativo",
        name: responsavel,
      })
      .eq("user_id", authData.user.id);

    if (profileError) console.error("Profile update error:", profileError);

    // 4. Set user role
    const { error: roleError } = await supabase
      .from("user_roles")
      .update({ role: validRole })
      .eq("user_id", authData.user.id);

    if (roleError) console.error("Role update error:", roleError);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Conta de teste criada com sucesso! Você já pode fazer login.",
      company_id: company.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
