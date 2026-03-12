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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const body = await req.json();
    const { action, instance_name, number, text, media_url, caption, api_url } = body;

    const configuredApiUrl = EVOLUTION_API_URL?.trim() || "";
    const requestApiUrl = typeof api_url === "string" ? api_url.trim() : "";
    const fallbackApiUrl = "https://angry-cities-leave.loca.lt";

    const resolvedApiUrl = [requestApiUrl, configuredApiUrl, fallbackApiUrl].find((url) => /^https?:\/\//i.test(url)) || "";

    if (!resolvedApiUrl) {
      return new Response(JSON.stringify({
        success: false,
        data: {
          state: "error",
          reason: "invalid_api_url",
          details: "Configure EVOLUTION_API_URL with a full URL (http/https).",
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^https?:\/\//i.test(configuredApiUrl) && !/^https?:\/\//i.test(requestApiUrl)) {
      console.warn("EVOLUTION_API_URL is invalid, using fallback URL", { configuredApiUrl, fallbackApiUrl });
    }

    if (!EVOLUTION_API_KEY) {
      return new Response(JSON.stringify({ error: "EVOLUTION_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = resolvedApiUrl.replace(/\/+$/, "");


    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_API_KEY,
      "bypass-tunnel-reminder": "true",
    };

    const parseEvolutionResponse = async (res: Response) => {
      const raw = await res.text();
      if (!raw) return null;

      try {
        return JSON.parse(raw);
      } catch {
        return { raw };
      }
    };

    // ── CREATE INSTANCE ──
    if (action === "create_instance") {
      if (!instance_name) {
        return new Response(JSON.stringify({ error: "instance_name is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(`${baseUrl}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          instanceName: instance_name,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
        }),
      });

      const data = await parseEvolutionResponse(res);
      if (!res.ok) {
        throw new Error(`Evolution API create_instance failed [${res.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CONNECT (GET QR CODE) ──
    if (action === "connect") {
      if (!instance_name) {
        return new Response(JSON.stringify({ error: "instance_name is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const connectRequest = async () => {
        try {
          const res = await fetch(`${baseUrl}/instance/connect/${instance_name}`, {
            method: "GET",
            headers,
          });
          const data = await parseEvolutionResponse(res);
          return { res, data, fetchError: null as string | null };
        } catch (fetchErr: any) {
          return {
            res: null as Response | null,
            data: null,
            fetchError: fetchErr?.message || "unknown_fetch_error",
          };
        }
      };

      let connectResult = await connectRequest();

      if (connectResult.fetchError || !connectResult.res) {
        return new Response(JSON.stringify({
          success: false,
          data: { state: "error", reason: "fetch_failed", details: connectResult.fetchError },
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let res = connectResult.res;
      let data = connectResult.data;

      if (res.status === 404) {
        const createRes = await fetch(`${baseUrl}/instance/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            instanceName: instance_name,
            integration: "WHATSAPP-BAILEYS",
            qrcode: true,
          }),
        });

        const createData = await parseEvolutionResponse(createRes);
        if (!createRes.ok && createRes.status !== 409) {
          return new Response(JSON.stringify({
            success: false,
            data: {
              state: "error",
              reason: "instance_create_failed",
              status: createRes.status,
              details: createData,
            },
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        connectResult = await connectRequest();
        if (connectResult.fetchError || !connectResult.res) {
          return new Response(JSON.stringify({
            success: false,
            data: { state: "error", reason: "fetch_failed_after_create", details: connectResult.fetchError },
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        res = connectResult.res;
        data = connectResult.data;
      }

      if (!res.ok && res.status === 503) {
        await new Promise((resolve) => setTimeout(resolve, 1200));

        connectResult = await connectRequest();
        if (!connectResult.fetchError && connectResult.res) {
          res = connectResult.res;
          data = connectResult.data;
        }
      }

      if (!res.ok) {
        const reason = res.status === 408
          ? "upstream_timeout"
          : res.status === 503
            ? "tunnel_unavailable"
            : "upstream_error";
        return new Response(JSON.stringify({
          success: false,
          data: { state: "error", reason, status: res.status, details: data },
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CONNECTION STATE ──
    if (action === "connection_state") {
      if (!instance_name) {
        return new Response(JSON.stringify({ error: "instance_name is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(`${baseUrl}/instance/connectionState/${instance_name}`, {
        method: "GET",
        headers,
      });

      const data = await parseEvolutionResponse(res);
      if (!res.ok) {
        return new Response(JSON.stringify({
          success: false,
          data: { state: "disconnected", reason: "upstream_unavailable", details: data },
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SEND TEXT ──
    if (action === "send_text") {
      if (!instance_name || !number || !text) {
        return new Response(JSON.stringify({ error: "instance_name, number, and text are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(`${baseUrl}/message/sendText/${instance_name}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ number, text }),
      });

      const data = await parseEvolutionResponse(res);
      if (!res.ok) {
        throw new Error(`Evolution API send_text failed [${res.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SEND IMAGE ──
    if (action === "send_image") {
      if (!instance_name || !number || !media_url) {
        return new Response(JSON.stringify({ error: "instance_name, number, and media_url are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(`${baseUrl}/message/sendMedia/${instance_name}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          number,
          mediatype: "image",
          media: media_url,
          caption: caption || "",
        }),
      });

      const data = await parseEvolutionResponse(res);
      if (!res.ok) {
        throw new Error(`Evolution API send_image failed [${res.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SEND AUDIO ──
    if (action === "send_audio") {
      if (!instance_name || !number || !media_url) {
        return new Response(JSON.stringify({ error: "instance_name, number, and media_url are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(`${baseUrl}/message/sendWhatsAppAudio/${instance_name}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ number, audio: media_url }),
      });

      const data = await parseEvolutionResponse(res);
      if (!res.ok) {
        throw new Error(`Evolution API send_audio failed [${res.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LOGOUT / DISCONNECT ──
    if (action === "logout") {
      if (!instance_name) {
        return new Response(JSON.stringify({ error: "instance_name is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(`${baseUrl}/instance/logout/${instance_name}`, {
        method: "DELETE",
        headers,
      });

      const data = await parseEvolutionResponse(res);
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: create_instance, connect, connection_state, send_text, send_image, send_audio, logout" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Evolution API error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
