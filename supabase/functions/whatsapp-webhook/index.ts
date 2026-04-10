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

    // ──────────────────────────────────────────────
    // HANDLE INCOMING MESSAGE
    // ──────────────────────────────────────────────
    if (event === "message.received") {
      const { company_id, phone, message, sender_name, message_type = "text", media_url } = data;

      // --- 1. Workspace routing ---
      let workspace_id: string | null = null;

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

      // Fallback to default workspace
      if (!workspace_id) {
        const { data: defaultWs } = await supabase
          .from("whatsapp_workspace_config")
          .select("workspace_id")
          .eq("company_id", company_id)
          .eq("is_default", true)
          .maybeSingle();
        if (defaultWs) workspace_id = defaultWs.workspace_id;
      }

      // --- 2. Find or create contact (with deduplication) ---
      let { data: contact } = await supabase
        .from("whatsapp_contacts")
        .select("id, lead_id, conversation_status")
        .eq("company_id", company_id)
        .eq("phone", phone)
        .maybeSingle();

      let isNewContact = false;

      if (!contact) {
        isNewContact = true;
        const { data: newContact, error } = await supabase
          .from("whatsapp_contacts")
          .insert({
            company_id,
            phone,
            name: sender_name || phone,
            last_message: message,
            last_message_at: new Date().toISOString(),
            workspace_id,
            conversation_status: "aguardando",
          })
          .select("id, lead_id, conversation_status")
          .single();

        if (error) throw error;
        contact = newContact;
      } else {
        // Update existing contact
        const updates: any = {
          last_message: message,
          last_message_at: new Date().toISOString(),
        };
        // If conversation was finalized, reopen it
        if (contact.conversation_status === "finalizado") {
          updates.conversation_status = "aguardando";
        }
        await supabase.from("whatsapp_contacts").update(updates).eq("id", contact.id);
      }

      // --- 3. Ensure lead exists (dedup by phone + company) ---
      if (!contact!.lead_id) {
        // Check if a lead with this phone already exists (dedup)
        const { data: existingLead } = await supabase
          .from("crm_leads")
          .select("id")
          .eq("servidor_id", company_id)
          .eq("phone", phone)
          .maybeSingle();

        let leadId: string;

        if (existingLead) {
          leadId = existingLead.id;
        } else {
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

          if (leadErr) throw leadErr;
          leadId = newLead.id;

          // Log activity
          await supabase.from("crm_lead_activities").insert({
            lead_id: leadId,
            servidor_id: company_id,
            type: "created",
            title: "Lead criado automaticamente via WhatsApp",
            description: `Contato: ${sender_name || phone}`,
          });
        }

        // Link contact to lead
        await supabase
          .from("whatsapp_contacts")
          .update({ lead_id: leadId })
          .eq("id", contact!.id);

        contact!.lead_id = leadId;
      }

      // --- 4. Auto-move lead stage on new inbound message ---
      if (contact!.lead_id) {
        const { data: lead } = await supabase
          .from("crm_leads")
          .select("stage")
          .eq("id", contact!.lead_id)
          .single();

        // If lead is in standby, move to novos on new message
        if (lead && lead.stage === "standby") {
          await supabase
            .from("crm_leads")
            .update({ stage: "novos", stage_entered_at: new Date().toISOString() })
            .eq("id", contact!.lead_id);
        }
      }

      // --- 5. Save message ---
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

      // --- 6. Create notification for assigned user or all company users ---
      const assignedTo = (contact as any)?.assigned_to;
      if (assignedTo) {
        await supabase.from("notifications").insert({
          user_id: assignedTo,
          title: "Nova mensagem WhatsApp",
          message: `${sender_name || phone}: ${(message || "").slice(0, 100)}`,
          type: "whatsapp",
          link: "/atendimento",
          servidor_id: company_id,
        });
      }

      return new Response(
        JSON.stringify({ success: true, lead_id: contact!.lead_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ──────────────────────────────────────────────
    // HANDLE OUTBOUND MESSAGE (agent replied)
    // ──────────────────────────────────────────────
    if (event === "message.sent") {
      const { company_id, phone, contact_id } = data;

      // Update conversation status to "em_atendimento"
      if (contact_id) {
        await supabase
          .from("whatsapp_contacts")
          .update({ conversation_status: "em_atendimento" })
          .eq("id", contact_id);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ──────────────────────────────────────────────
    // HANDLE SESSION STATUS
    // ──────────────────────────────────────────────
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

    // ──────────────────────────────────────────────
    // HANDLE MESSAGE STATUS UPDATES
    // ──────────────────────────────────────────────
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
