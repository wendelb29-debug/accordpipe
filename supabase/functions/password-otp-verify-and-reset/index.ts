// password-otp-verify-and-reset — public (no verify_jwt). Verifies the OTP and resets the user's password.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const GENERIC_BAD = { ok: false, error: "Código inválido ou expirado." };

  try {
    const { email, code, newPassword } = await req.json().catch(() => ({}));
    if (!email || !code || !newPassword) return respond({ ok: false, error: "Dados incompletos." }, 400);
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return respond({ ok: false, error: "A nova senha deve ter pelo menos 8 caracteres." }, 400);
    }
    if (typeof code !== "string" || !/^\d{4,8}$/.test(code)) return respond(GENERIC_BAD, 400);

    const ip = getClientIp(req);
    const pepper = Deno.env.get("OTP_PEPPER") || "";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify rate limit on this endpoint as well
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: ipAttempts } = await admin
      .from("password_reset_otps")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", since);
    if ((ipAttempts ?? 0) > 30) return respond(GENERIC_BAD, 429);

    const normalizedEmail = String(email).trim().toLowerCase();
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id")
      .ilike("email", normalizedEmail)
      .maybeSingle();
    if (!profile?.user_id) return respond(GENERIC_BAD, 400);

    const { data: otp } = await admin
      .from("password_reset_otps")
      .select("id, code_hash, expires_at, attempts, consumed")
      .eq("user_id", profile.user_id)
      .eq("consumed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) return respond(GENERIC_BAD, 400);
    if (new Date(otp.expires_at).getTime() < Date.now()) return respond(GENERIC_BAD, 400);
    if ((otp.attempts ?? 0) >= 5) return respond(GENERIC_BAD, 400);

    const candidateHash = await sha256Hex(code + pepper);
    const matches = timingSafeEqual(candidateHash, otp.code_hash);

    if (!matches) {
      await admin
        .from("password_reset_otps")
        .update({ attempts: (otp.attempts ?? 0) + 1 })
        .eq("id", otp.id);
      return respond(GENERIC_BAD, 400);
    }

    // Mark consumed and update password
    await admin.from("password_reset_otps").update({ consumed: true }).eq("id", otp.id);

    const { error: upErr } = await admin.auth.admin.updateUserById(profile.user_id, {
      password: newPassword,
    });
    if (upErr) {
      console.error("[password-otp-verify] updateUserById error", upErr);
      return respond({ ok: false, error: "Não foi possível atualizar a senha. Tente novamente." }, 500);
    }

    // Audit
    try {
      await admin.from("audit_logs").insert({
        user_id: profile.user_id,
        action: "password_reset_otp_success",
        target_type: "user",
        target_id: profile.user_id,
        details: { ip },
      });
    } catch (_) { /* ignore */ }

    return respond({ ok: true });
  } catch (err) {
    console.error("[password-otp-verify] unhandled", err);
    return respond({ ok: false, error: "Erro inesperado." }, 500);
  }
});
