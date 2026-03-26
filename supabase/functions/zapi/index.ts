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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, phone, message, imageUrl, caption, company_id } = body;

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Z-API credentials from the company record
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("zapi_instance_id, zapi_token, zapi_client_token")
      .eq("id", company_id)
      .maybeSingle();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: "Company not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const INSTANCE_ID = company.zapi_instance_id;
    const TOKEN = company.zapi_token;
    const CLIENT_TOKEN = company.zapi_client_token;

    if (!INSTANCE_ID || !TOKEN || !CLIENT_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Z-API não configurada para esta empresa. Configure em Configurações." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Client-Token": CLIENT_TOKEN,
    };

    // ── GET QR CODE ──
    if (action === "get-qrcode") {
      const res = await fetch(`${baseUrl}/qr-code/image`, { method: "GET", headers });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return new Response(JSON.stringify({ success: false, error: "Failed to get QR code", details: data }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CONNECTION STATUS ──
    if (action === "status") {
      const res = await fetch(`${baseUrl}/status`, { method: "GET", headers });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return new Response(
          JSON.stringify({ success: false, error: `Z-API status failed [${res.status}]`, details: data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SEND TEXT ──
    if (action === "send-text") {
      if (!phone || !message) {
        return new Response(JSON.stringify({ error: "phone and message are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = await fetch(`${baseUrl}/send-text`, {
        method: "POST", headers,
        body: JSON.stringify({ phone, message }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return new Response(
          JSON.stringify({ success: false, error: `Z-API send-text failed [${res.status}]`, details: data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SEND IMAGE ──
    if (action === "send-image") {
      if (!phone || !imageUrl) {
        return new Response(JSON.stringify({ error: "phone and imageUrl are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = await fetch(`${baseUrl}/send-image`, {
        method: "POST", headers,
        body: JSON.stringify({ phone, image: imageUrl, caption: caption || "" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return new Response(
          JSON.stringify({ success: false, error: `Z-API send-image failed [${res.status}]`, details: data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DISCONNECT ──
    if (action === "disconnect") {
      const res = await fetch(`${baseUrl}/disconnect`, { method: "GET", headers });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        return new Response(
          JSON.stringify({ success: false, error: `Z-API disconnect failed [${res.status}]`, details: data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: get-qrcode, status, send-text, send-image, disconnect" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Z-API error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
