import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { company_name, contact_name, email, phone, source, notes, servidor_id, tags } = body;

    // Validation
    if (!company_name || typeof company_name !== "string" || company_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Nome da empresa é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!contact_name || typeof contact_name !== "string" || contact_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Nome do contato é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!servidor_id || typeof servidor_id !== "string") {
      return new Response(JSON.stringify({ error: "Servidor inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (email && typeof email === "string" && email.length > 255) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify servidor exists and is active
    const { data: servidor, error: srvError } = await supabaseAdmin
      .from("companies")
      .select("id, razao_social, nome_fantasia, status")
      .eq("id", servidor_id)
      .is("servidor_id", null)
      .maybeSingle();

    if (srvError || !servidor) {
      return new Response(JSON.stringify({ error: "Servidor não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["active", "teste"].includes(servidor.status)) {
      return new Response(JSON.stringify({ error: "Servidor inativo" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize tags
    const sanitizedTags = Array.isArray(tags) 
      ? tags.filter((t: any) => typeof t === "string" && t.trim().length > 0).map((t: string) => t.trim().substring(0, 50))
      : [];

    // Create the lead
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("crm_leads")
      .insert({
        servidor_id,
        source: (source || "Formulário Web").substring(0, 100),
        company_name: company_name.trim().substring(0, 200),
        contact_name: contact_name.trim().substring(0, 200),
        email: email ? email.trim().substring(0, 255) : null,
        phone: phone ? phone.trim().substring(0, 30) : null,
        notes: notes ? notes.trim().substring(0, 1000) : null,
        tags: sanitizedTags.length > 0 ? sanitizedTags : [],
        stage: "novos",
        created_by_name: contact_name.trim().substring(0, 200),
      })
      .select()
      .single();

    if (leadError) {
      console.error("Error creating lead:", leadError);
      return new Response(JSON.stringify({ error: "Erro ao criar lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notify admins of the servidor
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("company_id", servidor_id)
      .eq("is_active", true);

    if (admins && admins.length > 0) {
      // Check which ones are actually admins
      const { data: adminRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("user_id", admins.map((a) => a.user_id))
        .eq("role", "admin");

      if (adminRoles) {
        for (const admin of adminRoles) {
          await supabaseAdmin.rpc("create_notification", {
            _user_id: admin.user_id,
            _title: "Novo lead recebido",
            _message: `${contact_name.trim()} (${company_name.trim()}) preencheu o formulário de captação.`,
            _type: "lead_new",
            _link: "/atendimento",
            _servidor_id: servidor_id,
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, lead_id: lead.id }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
