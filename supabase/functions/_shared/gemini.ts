// Shared helper: call Google Gemini and return an OpenAI-compatible Response.
// Lets existing edge functions keep parsing { choices:[{ message/delta }] }.

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

interface OpenAIBody {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  response_format?: { type?: string };
  temperature?: number;
}

function mapModel(m?: string): string {
  if (!m) return "gemini-2.5-flash";
  // Strip vendor prefix
  const id = m.replace(/^google\//, "").replace(/^openai\//, "");
  if (id.includes("pro")) return "gemini-2.5-pro";
  if (id.includes("lite")) return "gemini-2.5-flash-lite";
  return "gemini-2.5-flash";
}

export async function geminiChatCompletion(
  body: OpenAIBody,
  corsHeaders: Record<string, string> = {},
): Promise<Response> {
  const key = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "GOOGLE_GEMINI_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const model = mapModel(body.model);
  const systems = body.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = body.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const generationConfig: Record<string, unknown> = {};
  if (typeof body.temperature === "number") generationConfig.temperature = body.temperature;
  if (body.response_format?.type === "json_object") {
    generationConfig.responseMimeType = "application/json";
  }

  const payload: Record<string, unknown> = { contents };
  if (systems) payload.systemInstruction = { parts: [{ text: systems }] };
  if (Object.keys(generationConfig).length) payload.generationConfig = generationConfig;

  const stream = !!body.stream;
  const endpoint = stream ? "streamGenerateContent?alt=sse&" : "generateContent?";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}key=${key}`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) {
    const txt = await upstream.text();
    console.error("Gemini error", upstream.status, txt);
    return new Response(JSON.stringify({ error: "AI service error", detail: txt }), {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!stream) {
    const data = await upstream.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
    return new Response(
      JSON.stringify({
        choices: [{ message: { role: "assistant", content: text }, finish_reason: "stop" }],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Convert Gemini SSE -> OpenAI SSE
  const out = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, idx).replace(/\r$/, "");
            buf = buf.slice(idx + 1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (!json) continue;
            try {
              const parsed = JSON.parse(json);
              const text =
                parsed?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
              if (text) {
                const chunk = { choices: [{ delta: { content: text } }] };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              }
            } catch { /* ignore parse */ }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  return new Response(out, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}
