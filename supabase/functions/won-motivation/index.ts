import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { geminiChatCompletion } from "../_shared/gemini.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const _auth = await requireAuth(req, corsHeaders);
  if (_auth instanceof Response) return _auth;

  try {
    const { leadName } = await req.json();
    const response = await geminiChatCompletion({
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
