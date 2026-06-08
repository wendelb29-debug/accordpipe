// Edge Function: generate-email-template
// Gera HTML de e-mail via Lovable AI Gateway (sem necessidade de chave Anthropic).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SYSTEM_PROMPT = `Você é um especialista em design de e-mail marketing HTML.

Sua tarefa é gerar um e-mail HTML completo e profissional baseado no briefing do usuário.

REGRAS OBRIGATÓRIAS:
1. HTML compatível com clientes de e-mail (Gmail, Outlook, Apple Mail). Use tabelas (<table>) pra layout — não use flex/grid/CSS Grid.
2. Largura máxima do conteúdo: 600px (centralizado).
3. CSS SEMPRE inline (style="..."). Não use <style> tags nem classes externas.
4. Imagens devem ser <img> com src absoluto (https://). Use placeholders do Unsplash se o usuário não fornecer URLs: https://images.unsplash.com/photo-{ID}?w=600
5. Fontes: font-family: Arial, Helvetica, sans-serif;
6. Cores acessíveis (contraste WCAG AA).
7. Use {{variavel}} pra placeholders dinâmicos (ex: {{nome}}, {{empresa}}).
8. Inclua sempre: header com título, conteúdo principal, CTA com botão estilizado, footer com "cancelar inscrição".
9. Botões = <a> com display:inline-block, padding, border-radius, background-color.
10. NÃO inclua <html>, <head>, <body> — retorne SÓ o conteúdo a partir do <table> wrapper.

RETORNE APENAS JSON cru (sem markdown, sem \`\`\`):
{
  "subject": "Linha de assunto curta e atrativa (<=50 chars)",
  "preview_text": "Texto preheader (<=90 chars)",
  "body_html": "<table>...</table>",
  "variables_used": ["nome", "empresa"]
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { briefing, brand_color, brand_name, tone, language } = await req.json();

    if (!briefing || typeof briefing !== "string" || briefing.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Briefing muito curto. Descreva o objetivo do e-mail." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userPrompt = `BRIEFING:
${briefing.trim()}

CONFIGURAÇÕES:
- Cor da marca (botões/destaques): ${brand_color || "#10b981"}
- Nome da marca: ${brand_name || "Accord"}
- Tom: ${tone || "profissional e amigável"}
- Idioma: ${language || "português brasileiro"}

Gere o e-mail HTML conforme as regras. Retorne SOMENTE o JSON.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[generate-email-template] AI gateway error:", resp.status, errText);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos em Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ error: `IA indisponível: ${errText.slice(0, 200)}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const data = await resp.json();
    const rawText: string = data.choices?.[0]?.message?.content || "";

    let parsed: { subject: string; preview_text?: string; body_html: string; variables_used?: string[] };
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("[generate-email-template] JSON parse failed. Raw:", rawText.slice(0, 500));
      return new Response(JSON.stringify({
        error: "IA retornou formato inválido. Tente novamente com briefing mais claro."
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!parsed.body_html || !parsed.subject) {
      return new Response(JSON.stringify({ error: "Resposta da IA incompleta. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("[generate-email-template] ERRO:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
