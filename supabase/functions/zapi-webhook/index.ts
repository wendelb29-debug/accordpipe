import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const eventType = body.event || body.type || body.status || "unknown";
    const phone = body.phone || body.from || body.chatId || body.sender || null;
    const messageId = body.messageId || body.ids?.[0] || body.id || null;
    const instanceId = body.instanceId || null;
    const messageText = body.text?.message || body.body || body.message || "";
    const isFromMe = body.fromMe === true;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Log the raw event
    await supabase.from("zapi_webhook_events").insert({
      event_type: eventType,
      phone,
      message_id: messageId,
      payload: body,
    });

    // If it's a received message, map to tenant and store
    if (eventType === "ReceivedCallback" && phone && !isFromMe) {
      // Find company by zapi_instance_id
      let companyId: string | null = null;

      if (instanceId) {
        const { data: company } = await supabase
          .from("companies")
          .select("id")
          .eq("zapi_instance_id", instanceId)
          .maybeSingle();
        companyId = company?.id || null;
      }

      if (companyId && messageText) {
        // Clean phone number
        const cleanPhone = phone.replace(/\D/g, "");

        // Find or create contact
        let { data: contact } = await supabase
          .from("whatsapp_contacts")
          .select("id")
          .eq("company_id", companyId)
          .eq("phone", cleanPhone)
          .maybeSingle();

        if (!contact) {
          const { data: newContact } = await supabase
            .from("whatsapp_contacts")
            .insert({
              company_id: companyId,
              phone: cleanPhone,
              name: body.senderName || cleanPhone,
              last_message: messageText,
              last_message_at: new Date().toISOString(),
            })
            .select("id")
            .single();
          contact = newContact;
        } else {
          // Update last message
          await supabase
            .from("whatsapp_contacts")
            .update({
              last_message: messageText,
              last_message_at: new Date().toISOString(),
              name: body.senderName || undefined,
            })
            .eq("id", contact.id);
        }

        if (contact) {
          await supabase.from("whatsapp_messages").insert({
            company_id: companyId,
            contact_id: contact.id,
            phone: cleanPhone,
            message: messageText,
            direction: "inbound",
            status: "received",
            message_type: "text",
            metadata: { zapi_message_id: messageId },
          });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Z-API webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
