import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { lead_id, workspace_id, tenant_id, event_type } = await req.json();

    if (!lead_id || !workspace_id || !tenant_id) {
      console.error("Missing required parameters", { lead_id, workspace_id, tenant_id });
      return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }

    // 1. Fetch Lead Details
    const { data: lead, error: leadError } = await adminClient
      .from("crm_leads")
      .select(`
        id,
        contact_name,
        company_name,
        email,
        phone,
        source,
        created_at,
        created_by_user_id,
        workspaces (name)
      `)
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      console.error("Lead not found", leadError);
      return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404 });
    }

    // 2. Fetch Eligible Recipients
    // Criteria: Linked to workspace, Same tenant, Active, Has Email, Permission to view leads, Notification enabled
    const { data: recipients, error: recError } = await adminClient
      .from("user_workspace_permissions")
      .select(`
        user_id,
        profiles!inner (
          email,
          name,
          is_active,
          notification_preferences
        )
      `)
      .eq("workspace_id", workspace_id)
      .eq("tenant_id", tenant_id)
      .eq("can_view", true);

    if (recError) {
      console.error("Error fetching recipients", recError);
      return new Response(JSON.stringify({ error: "Error fetching recipients" }), { status: 500 });
    }

    const validRecipients = recipients.filter((r: any) => {
      const p = r.profiles;
      if (!p || !p.is_active || !p.email) return false;
      
      // Default enabled if not explicitly disabled
      const prefs = p.notification_preferences || {};
      const leadsEmailEnabled = prefs.types?.leads_email ?? true;
      
      // Skip if creator
      if (r.user_id === lead.created_by_user_id) return false;

      return leadsEmailEnabled;
    });

    if (validRecipients.length === 0) {
      return new Response(JSON.stringify({ status: "no_recipients" }), { headers: corsHeaders });
    }

    const results = [];
    for (const rec of validRecipients) {
      const idempotencyKey = `${event_type}:${lead_id}:${workspace_id}:${rec.user_id}`;
      
      // Check if already sent (Idempotency)
      const { data: existing } = await adminClient
        .from("notification_logs")
        .select("id, status")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existing && (existing.status === 'sent' || existing.status === 'suppressed')) {
        continue;
      }

      // Log start
      const { data: log, error: logErr } = await adminClient
        .from("notification_logs")
        .upsert({
          tenant_id,
          workspace_id,
          lead_id,
          event_type,
          idempotency_key,
          recipient_user_id: rec.user_id,
          recipient_email: rec.profiles.email,
          status: 'pending'
        }, { onConflict: 'idempotency_key' })
        .select()
        .single();

      if (logErr) {
        console.error("Log error", logErr);
        continue;
      }

      // Send Email
      try {
        const leadLink = `${Deno.env.get("PUBLIC_APP_URL") || 'https://accordpipe.lovable.app'}/atendimento?lead=${lead_id}`;
        
        const { error: emailErr } = await adminClient.functions.invoke("send-transactional-email", {
          body: {
            template_name: "new-lead-notification",
            recipient_email: rec.profiles.email,
            template_data: {
              companyName: lead.company_name || lead.contact_name,
              contactName: lead.contact_name,
              workspaceName: (lead.workspaces as any)?.name,
              leadOrigin: lead.source,
              leadLink,
              userName: rec.profiles.name,
              leadPhone: lead.phone,
              leadEmail: lead.email,
              createdAt: new Date(lead.created_at).toLocaleString('pt-BR'),
            },
            idempotency_key: idempotencyKey
          }
        });

        if (emailErr) throw emailErr;

        await adminClient.from("notification_logs").update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts: (log.attempts || 0) + 1
        }).eq("id", log.id);

        results.push({ email: rec.profiles.email, status: 'sent' });
      } catch (err: any) {
        console.error(`Failed to send to ${rec.profiles.email}`, err);
        await adminClient.from("notification_logs").update({
          status: 'failed',
          error_message: err.message,
          attempts: (log.attempts || 0) + 1
        }).eq("id", log.id);
        
        results.push({ email: rec.profiles.email, status: 'failed', error: err.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Notification process error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
