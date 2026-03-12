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
    // This endpoint is called by the external microservice
    // Validate using a shared secret instead of user JWT
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

      // Find or create contact
      let { data: contact } = await supabase
        .from("whatsapp_contacts")
        .select("id")
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
          })
          .select("id")
          .single();

        if (error) throw error;
        contact = newContact;
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
          contact_id: contact.id,
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
