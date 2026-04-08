import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-whatsapp-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookSecret = req.headers.get("x-whatsapp-secret");
    const expectedSecret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");

    if (!expectedSecret || webhookSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { event, data } = await req.json();

    // Handle incoming message from microservice
    if (event === "message.received") {
      const { company_id, phone, message, sender_name, message_type = "text", media_url } = data;

      // --- Workspace routing ---
      let workspace_id: string | null = null;

      // 1) Check routing rules (keyword match on message)
      const { data: rules } = await supabase
        .from("whatsapp_routing_rules")
        .select("workspace_id, rule_type, rule_value")
        .eq("company_id", company_id)
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (rules && message) {
        for (const rule of rules) {
          if (rule.rule_type === "keyword" && message.toLowerCase().includes(rule.rule_value.toLowerCase())) {
            workspace_id = rule.workspace_id;
            break;
          }
          if (rule.rule_type === "ddd") {
            const phoneClean = phone.replace(/\D/g, "");
            const ddd = phoneClean.length >= 12 ? phoneClean.slice(2, 4) : phoneClean.slice(0, 2);
            if (ddd === rule.rule_value) {
              workspace_id = rule.workspace_id;
              break;
            }
          }
        }
      }

      // 2) Fallback to default workspace config
      if (!workspace_id) {
        const { data: defaultWs } = await supabase
          .from("whatsapp_workspace_config")
          .select("workspace_id")
          .eq("company_id", company_id)
          .eq("is_default", true)
          .maybeSingle();
        if (defaultWs) workspace_id = defaultWs.workspace_id;
      }

      // Find or create contact
      let { data: contact } = await supabase
        .from("whatsapp_contacts")
        .select("id, lead_id")
        .eq("company_id", company_id)
        .eq("phone", phone)
        .maybeSingle();

      if (!contact) {
        const { data: newContact, error } = await supabase
          .from("whatsapp_contacts")
          .insert({
            company_id,
            phone,
            name: sender_name || phone,
            last_message: message,
            last_message_at: new Date().toISOString(),
            workspace_id,
          })
          .select("id, lead_id")
          .single();

        if (error) throw error;
        contact = newContact;

        // --- Auto-create lead in CRM ---
        const leadInsert: any = {
          servidor_id: company_id,
          company_name: sender_name || phone,
          contact_name: sender_name || null,
          phone,
          source: "WhatsApp",
          stage: "novos",
          tags: ["WhatsApp", "Inbound"],
        };
        if (workspace_id) leadInsert.workspace_id = workspace_id;

        const { data: newLead, error: leadErr } = await supabase
          .from("crm_leads")
          .insert(leadInsert)
          .select("id")
          .single();

        if (!leadErr && newLead) {
          // Link contact to lead
          await supabase
            .from("whatsapp_contacts")
            .update({ lead_id: newLead.id })
            .eq("id", contact!.id);

          // Log activity
          await supabase.from("crm_lead_activities").insert({
            lead_id: newLead.id,
            servidor_id: company_id,
            type: "created",
            title: "Lead criado automaticamente via WhatsApp",
            description: `Contato recebeu mensagem de ${sender_name || phone}.`,
          });
        }
      } else {
        await supabase
          .from("whatsapp_contacts")
          .update({
            last_message: message,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", contact.id);
      }

      // Save message
      const { error: msgError } = await supabase
        .from("whatsapp_messages")
        .insert({
          company_id,
          contact_id: contact!.id,
          phone,
          message,
          direction: "inbound",
          status: "delivered",
          message_type,
          media_url,
        });

      if (msgError) throw msgError;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle session status updates
    if (event === "session.status") {
      const { company_id, status, phone_number } = data;

      const { error } = await supabase
        .from("whatsapp_sessions")
        .upsert(
          { company_id, status, phone_number },
          { onConflict: "company_id" }
        );

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle message status updates (sent, delivered, read)
    if (event === "message.status") {
      const { message_id, status } = data;

      const { error } = await supabase
        .from("whatsapp_messages")
        .update({ status })
        .eq("id", message_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown event type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
