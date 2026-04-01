import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { leadName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Você é um coach de vendas motivacional. Gere UMA frase curta (máximo 2 linhas) de motivação e celebração para um vendedor que acabou de fechar uma venda. Seja entusiasmado, inspirador e use emojis. Não repita frases genéricas. Responda APENAS com a frase, sem aspas.",
          },
          {
            role: "user",
            content: `O vendedor acabou de fechar a venda do lead "${leadName || "cliente"}". Gere uma frase motivacional única para celebrar essa conquista.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ quote: "Cada venda fechada é um passo em direção ao topo! Continue brilhando! ⭐" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ quote: "Sua persistência é o combustível do sucesso. Parabéns por mais uma conquista! 🏆" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const quote = data.choices?.[0]?.message?.content?.trim() || "Você está construindo seu império, uma venda de cada vez! 💎";

    return new Response(JSON.stringify({ quote }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("won-motivation error:", e);
    return new Response(JSON.stringify({ quote: "O sucesso não é o final, é apenas o começo da próxima grande conquista! 🎯" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
