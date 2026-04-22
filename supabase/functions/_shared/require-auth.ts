import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Validates the caller's JWT from the Authorization header against Supabase Auth.
 * Returns the authenticated user, or a 401 Response if missing/invalid.
 *
 * Usage:
 *   const auth = await requireAuth(req);
 *   if (auth instanceof Response) return auth;
 *   const { user } = auth;
 */
export async function requireAuth(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Response | { user: { id: string; email?: string } }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return { user: { id: data.user.id, email: data.user.email ?? undefined } };
}
