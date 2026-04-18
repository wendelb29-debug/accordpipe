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

    // Send email via Resend (link contains our ?token= for /aceitar-convite)
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = "Accord <noreply@accordpipe.com.br>";

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY não configurada!");
    } else {
      try {
        const companyName = invite.company_name || "Accord";
        const resendHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2d1b69 0%,#4338ca 50%,#6366f1 100%);padding:48px 40px;text-align:center;">
      <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:16px;">
        <img src="https://accordpipe.com.br/logo-bimi.svg" width="36" height="36" style="border-radius:6px;" alt="Accord"/>
        <span style="color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">ACCORD</span>
      </div>
      <div style="margin-top:8px;">
        <span style="display:inline-block;border:1px solid rgba(255,255,255,0.4);color:rgba(255,255,255,0.9);font-size:11px;font-weight:600;letter-spacing:2px;padding:4px 14px;border-radius:20px;">
          ENTERPRISE
        </span>
      </div>
    </div>
    <div style="padding:48px 40px;text-align:center;">
      <div style="width:72px;height:72px;background:#4f46e5;border-radius:18px;margin:0 auto 28px;display:flex;align-items:center;justify-content:center;font-size:36px;line-height:72px;">
        🚀
      </div>
      <h1 style="color:#0f172a;font-size:26px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        Você foi convidado!
      </h1>
      <p style="color:#64748b;font-size:15px;line-height:1.7;margin:0 0 8px;">
        <strong style="color:#0f172a;">${invite.inviter_name || "Um administrador"}</strong>
        convidou você para acessar o ambiente
      </p>
      <p style="color:#4f46e5;font-size:18px;font-weight:700;margin:0 0 32px;">
        ${companyName}
      </p>
      <a href="${inviteLink}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:16px 52px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.2px;box-shadow:0 4px 16px rgba(79,70,229,0.4);">
        Aceitar convite
      </a>
      <p style="color:#94a3b8;font-size:13px;margin:28px 0 0;line-height:1.6;">
        ⏳ Este convite expira em <strong>7 dias</strong>.<br/>
        Se não esperava este convite, ignore este e-mail.
      </p>
      <p style="color:#cbd5e1;font-size:11px;margin:16px 0 0;word-break:break-all;">
        ${inviteLink}
      </p>
    </div>
    <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;line-height:1.8;margin:0;">
        © ${new Date().getFullYear()} <strong>Accord</strong> · accordpipe.com.br<br/>
        Você recebeu este e-mail pois foi convidado por um administrador.
      </p>
    </div>
  </div>
</body>
</html>`;

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            reply_to: "suporte@accordpipe.com.br",
            to: [invite.invitee_email],
            subject: `Você foi convidado para ${invite.company_name || "Accord"}`,
            headers: {
              "X-Priority": "1",
              "X-MSMail-Priority": "High",
              "Importance": "High",
            },
            html: resendHtml,
          }),
        });

        const resendResult = await emailResponse.json();
        console.log("Resend response:", resendResult);

        if (!emailResponse.ok) {
          console.error("Resend error:", resendResult);
        } else {
          console.log("Email enviado com sucesso para:", invite.invitee_email);
        }
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
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
