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
    const { nome, telefone, email, empresa, colaboradores, mensagem, origem, _honeypot, _timestamp, form_id, servidor_id: bodyServidorId, cidade } = body;

    // Anti-spam: honeypot check
    if (_honeypot) {
      // Bot detected — silently accept
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Anti-spam: timestamp check (form must take at least 2 seconds to fill)
    if (_timestamp && Date.now() - _timestamp < 2000) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validation
    if (!nome || typeof nome !== "string" || nome.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Nome é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!telefone || typeof telefone !== "string" || telefone.trim().length < 8) {
      return new Response(JSON.stringify({ error: "Telefone é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the default company (servidor) to associate the lead
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id, status")
      .is("servidor_id", null)
      .in("status", ["active", "teste"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!company) {
      console.error("No active company found for lead creation");
      return new Response(JSON.stringify({ error: "Sistema indisponível" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build notes with extra fields
    const noteParts: string[] = [];
    if (colaboradores) noteParts.push(`Colaboradores: ${String(colaboradores).substring(0, 50)}`);
    if (mensagem) noteParts.push(`Mensagem: ${String(mensagem).trim().substring(0, 500)}`);
    const fullNotes = noteParts.join("\n") || null;

    // Create the lead in CRM
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("crm_leads")
      .insert({
        servidor_id: company.id,
        source: (origem || "Landing Page").substring(0, 100),
        company_name: (empresa || nome).trim().substring(0, 200),
        contact_name: nome.trim().substring(0, 200),
        email: email ? String(email).trim().substring(0, 255) : null,
        phone: telefone.trim().substring(0, 30),
        notes: fullNotes,
        tags: ["landing-page"],
        stage: "novos",
        created_by_name: nome.trim().substring(0, 200),
      })
      .select("id")
      .single();

    if (leadError) {
      console.error("Error creating lead:", leadError);
      return new Response(JSON.stringify({ error: "Erro ao criar lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notify admins
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("company_id", company.id)
      .eq("is_active", true);

    if (admins && admins.length > 0) {
      const { data: adminRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("user_id", admins.map((a) => a.user_id))
        .eq("role", "admin");

      if (adminRoles) {
        for (const admin of adminRoles) {
          await supabaseAdmin.rpc("create_notification", {
            _user_id: admin.user_id,
            _title: "Novo lead da Landing Page",
            _message: `${nome.trim()} (${telefone.trim()}) preencheu o formulário de captação.`,
            _type: "lead_new",
            _link: "/atendimento",
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
