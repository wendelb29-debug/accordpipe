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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    console.log("=== SEND-INVITE CHAMADA ===");
    console.log("Body recebido:", body);
    const { invitation_id } = body;

    // Fetch the invitation
    const { data: invite, error: invErr } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("id", invitation_id)
      .single();

    if (invErr || !invite) {
      return new Response(JSON.stringify({ error: "Convite não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "https://accordpipe.lovable.app";
    const inviteLink = `${origin}/aceitar-convite?token=${invite.token}`;

    const message = `🎉 *Você foi convidado!*

${invite.inviter_name || "Alguém"} convidou você para fazer parte de *${invite.company_name || "nossa equipe"}*.

Clique no link abaixo para criar sua conta e aceitar o convite: ${inviteLink}

_Este convite expira em 7 dias._`;

    // Send WhatsApp if whatsapp number provided and company has Z-API configured
    if (invite.invitee_whatsapp && invite.company_id) {
      try {
        const { data: company } = await supabase
          .from("companies")
          .select("zapi_instance_id, zapi_token, zapi_client_token")
          .eq("id", invite.company_id)
          .single();

        if (company?.zapi_instance_id && company?.zapi_token) {
          const zapiUrl = `https://api.z-api.io/instances/${company.zapi_instance_id}/token/${company.zapi_token}/send-text`;
          const phone = invite.invitee_whatsapp.replace(/\D/g, "");
          
          await fetch(zapiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Client-Token": company.zapi_client_token || "",
            },
            body: JSON.stringify({
              phone: phone,
              message: message,
            }),
          });
        }
      } catch (whatsErr) {
        console.error("WhatsApp send error:", whatsErr);
      }
    }

    // Send email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7C3AED;">🎉 Você foi convidado!</h2>
        <p><strong>${invite.inviter_name || "Alguém"}</strong> convidou você para fazer parte de <strong>${invite.company_name || "nossa equipe"}</strong>.</p>
        <p>Clique no botão abaixo para criar sua conta e aceitar o convite:</p>
        <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #7C3AED; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">
          Aceitar Convite
        </a>
        <p style="color: #888; font-size: 14px; margin-top: 24px;"><em>Este convite expira em 7 dias.</em></p>
      </div>
    `;

    // Send custom email via internal email queue (Lovable Emails)
    // We enqueue directly so the link contains our ?token= (not Supabase auth link)
    try {
      const subject = `Você foi convidado para ${invite.company_name || "Accord"}`;
      const { error: enqErr } = await supabase.rpc("enqueue_email", {
        p_queue: "transactional_emails",
        p_payload: {
          to: invite.invitee_email,
          subject,
          html: emailHtml,
          template_name: "user_invitation",
        },
      });
      if (enqErr) {
        console.error("enqueue_email error:", enqErr);
        // Fallback: Supabase Auth invite (default template, link will not include our token)
        const { error: emailError } = await supabase.auth.admin.inviteUserByEmail(
          invite.invitee_email,
          {
            redirectTo: inviteLink,
            data: {
              name: invite.invitee_name,
              company_id: invite.company_id,
              invitation_token: invite.token,
            },
          }
        );
        if (emailError) console.error("Fallback auth invite error:", emailError);
      } else {
        console.log("Email enfileirado com sucesso para:", invite.invitee_email);
      }
    } catch (emailErr) {
      console.error("Email send error:", emailErr);
    }

    return new Response(JSON.stringify({ success: true, invite_link: inviteLink }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
