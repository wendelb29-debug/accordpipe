// password-otp-request — public (no verify_jwt). Sends a 6-digit code via email (required) and WhatsApp (best-effort).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERIC = { ok: true, message: "Se a conta existir, enviamos um código de verificação." };

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

function genCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

function normalizePhone(p: string): string {
  return (p || "").replace(/\D/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { email } = await req.json().catch(() => ({}));
    if (!email || typeof email !== "string") return respond(GENERIC);

    const normalizedEmail = email.trim().toLowerCase();
    const pepper = Deno.env.get("OTP_PEPPER") || "";
    const ip = getClientIp(req);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find user by email
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id, full_name, whatsapp")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (!profile?.user_id) {
      // Anti-enumeration: respond identically
      return respond(GENERIC);
    }

    // Rate limit: max 3 requests per email and per IP in the last 15 minutes
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: byUser } = await admin
      .from("password_reset_otps")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.user_id)
      .gte("created_at", since);

    const { count: byIp } = await admin
      .from("password_reset_otps")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", since);

    if ((byUser ?? 0) >= 3 || (byIp ?? 0) >= 3) {
      console.log("[password-otp-request] rate-limited", { user: profile.user_id, ip });
      return respond(GENERIC);
    }

    // Generate and store
    const code = genCode();
    const codeHash = await sha256Hex(code + pepper);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await admin.from("password_reset_otps").insert({
      user_id: profile.user_id,
      code_hash: codeHash,
      expires_at: expiresAt,
      ip,
    });

    // Send email (required)
    try {
      const { error: mailErr } = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "password-reset-code",
          recipientEmail: normalizedEmail,
          idempotencyKey: `pwd-otp-${profile.user_id}-${Date.now()}`,
          templateData: { code, name: profile.full_name || undefined },
        },
      });
      if (mailErr) console.error("[password-otp-request] email error", mailErr);
    } catch (e) {
      console.error("[password-otp-request] email exception", e);
    }

    // WhatsApp (best-effort, never throws)
    const whatsappEnabled = (Deno.env.get("WHATSAPP_OTP_ENABLED") || "false").toLowerCase() === "true";
    if (whatsappEnabled) {
      try {
        const phone = normalizePhone(profile.whatsapp || "");
        if (phone) {
          // Find the user's tenant with active whatsapp integration
          const { data: tenants } = await admin
            .from("user_tenants")
            .select("tenant_id")
            .eq("user_id", profile.user_id);
          for (const t of tenants || []) {
            const { data: integ } = await admin
              .from("tenant_whatsapp_integrations")
              .select("id, provider_type, server_url, instance_token, instance_id, instance_name, is_active")
              .eq("tenant_id", t.tenant_id)
              .eq("is_active", true)
              .maybeSingle();
            if (!integ?.server_url || !integ?.instance_token) continue;

            const text = `Accord: seu codigo de verificacao e ${code}. Expira em 10 minutos. Se nao foi voce, ignore.`;
            try {
              if (integ.provider_type === "uazapi") {
                const url = `${integ.server_url.replace(/\/$/, "")}/send/text`;
                await fetch(url, {
                  method: "POST",
                  headers: { token: integ.instance_token, "Content-Type": "application/json" },
                  body: JSON.stringify({ number: phone, text }),
                });
              } else if (integ.provider_type === "zapi") {
                const { data: comp } = await admin
                  .from("companies").select("zapi_client_token").eq("id", t.tenant_id).maybeSingle();
                const url = `${integ.server_url.replace(/\/$/, "")}/instances/${integ.instance_id}/token/${integ.instance_token}/send-text`;
                const headers: Record<string, string> = { "Content-Type": "application/json" };
                if (comp?.zapi_client_token) headers["Client-Token"] = comp.zapi_client_token;
                await fetch(url, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ phone, message: text }),
                });
              }
              break;
            } catch (e) {
              console.warn("[password-otp-request] whatsapp send failed", e);
            }
          }
        }
      } catch (e) {
        console.warn("[password-otp-request] whatsapp branch failed", e);
      }
    }

    return respond(GENERIC);
  } catch (err) {
    console.error("[password-otp-request] unhandled", err);
    return respond(GENERIC);
  }
});
