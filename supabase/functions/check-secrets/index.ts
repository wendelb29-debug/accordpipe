import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  const guri = Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI");
  const muri = Deno.env.get("MICROSOFT_OAUTH_REDIRECT_URI");
  const app = Deno.env.get("APP_BASE_URL");
  
  return new Response(JSON.stringify({
    google: guri,
    microsoft: muri,
    app: app
  }), { headers: { "Content-Type": "application/json" } });
});
