import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Validates a Bearer JWT from the request and returns the userId.
 * Returns a Response (401) when invalid, otherwise { userId }.
 */
export async function requireAuth(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return { userId: data.user.id };
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
