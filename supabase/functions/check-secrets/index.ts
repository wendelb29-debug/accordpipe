import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
serve(async (req) => {
  const uri = Deno.env.get("URI_REDIRECIONADA_OAUTH_MICROSOFT");
  const clientId = Deno.env.get("ID_CLIENTE_OAUTH_MICROSOFT");
  console.log("SECRET CHECK:", { uri, clientId: clientId?.slice(0,5) });
  return new Response("ok");
});