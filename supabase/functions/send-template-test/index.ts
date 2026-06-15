import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") || "";

    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { subject, body_html, to_email } = await req.json();
    const recipientEmail = to_email || user.email;
    if (!recipientEmail) throw new Error("Sem e-mail de destino");
    if (!body_html || !subject) throw new Error("Subject e body_html são obrigatórios");

    // Procura a primeira conta de e-mail do usuário pra enviar via email-send
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: account } = await admin
      .from("email_accounts")
      .select("id, provider, email_address")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!account) {
      throw new Error("Você precisa conectar uma conta de e-mail (Gmail/Outlook) antes de enviar testes.");
    }

    const resp = await fetch(`${SUPABASE_URL}/functions/v1/email-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        accountId: account.id,
        to: recipientEmail,
        subject: `[TESTE] ${subject}`,
        html: body_html,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Falha no envio: ${errText.slice(0, 300)}`);
    }

    return new Response(JSON.stringify({ success: true, sent_to: recipientEmail, from: account.email_address }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
