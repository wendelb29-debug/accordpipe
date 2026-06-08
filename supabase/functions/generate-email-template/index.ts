// Edge Function: generate-email-template
// Gera HTML de e-mail via Lovable AI Gateway (sem necessidade de chave Anthropic).
import { createClient } from "npm:@supabase/supabase-js@2";
import { withErrorHandling, jsonResponse, HttpError } from "../_shared/error-handler.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const logger = new EdgeLogger("generate-email-template");

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

Deno.serve(withErrorHandling("generate-email-template", async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new HttpError("Não autenticado", 401, { code: "UNAUTHENTICATED" });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    throw new HttpError("JSON inválido no corpo da requisição.", 400, { code: "BAD_JSON" });
  }
  const { briefing, brand_color, brand_name, tone, language } = body || {};

  if (!briefing || typeof briefing !== "string" || briefing.trim().length < 10) {
    throw new HttpError("Briefing muito curto. Descreva o objetivo do e-mail.", 400, { code: "BRIEFING_TOO_SHORT" });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    logger.error("missing_api_key", { userId: user.id }, "LOVABLE_API_KEY not configured");
    throw new HttpError("Serviço de IA indisponível (chave não configurada).", 500, { code: "NO_API_KEY" });
  }

  const userPrompt = `BRIEFING:
${briefing.trim()}

CONFIGURAÇÕES:
- Cor da marca (botões/destaques): ${brand_color || "#10b981"}
- Nome da marca: ${brand_name || "Accord"}
- Tom: ${tone || "profissional e amigável"}
- Idioma: ${language || "português brasileiro"}

Gere o e-mail HTML conforme as regras. Retorne SOMENTE o JSON.`;

  let resp: Response;
  try {
    resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
  } catch (netErr) {
    logger.error("ai_gateway_network_fail", { userId: user.id }, netErr);
    throw new HttpError("Falha de rede ao contatar a IA. Tente novamente.", 502, { code: "AI_NETWORK" });
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    logger.error("ai_gateway_error", { status: resp.status, userId: user.id }, errText);
    if (resp.status === 429) throw new HttpError("Limite de uso atingido. Tente novamente em alguns instantes.", 429, { code: "RATE_LIMIT" });
    if (resp.status === 402) throw new HttpError("Créditos esgotados. Adicione créditos em Workspace → Usage.", 402, { code: "NO_CREDITS" });
    throw new HttpError(`IA indisponível: ${errText.slice(0, 200)}`, 502, { code: "AI_UPSTREAM" });
  }

  let data: any;
  try {
    data = await resp.json();
  } catch (e) {
    logger.error("ai_gateway_invalid_json", { userId: user.id }, e);
    throw new HttpError("IA retornou resposta inválida. Tente novamente.", 502, { code: "AI_BAD_JSON" });
  }
  const rawText: string = data?.choices?.[0]?.message?.content || "";

  let parsed: { subject: string; preview_text?: string; body_html: string; variables_used?: string[] };
  try {
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    logger.warn("ai_parse_failed", { userId: user.id, preview: rawText.slice(0, 200) }, e);
    throw new HttpError("IA retornou formato inválido. Tente novamente com briefing mais claro.", 500, { code: "AI_PARSE" });
  }

  if (!parsed.body_html || !parsed.subject) {
    throw new HttpError("Resposta da IA incompleta. Tente novamente.", 500, { code: "AI_INCOMPLETE" });
  }

  return jsonResponse(parsed);
}));
