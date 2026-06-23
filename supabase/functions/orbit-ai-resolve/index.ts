import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { geminiChatCompletion } from "../_shared/gemini.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o Accord, um assistente inteligente proativo integrado ao CRM Accord.

Ao receber os dados da página atual, você deve:

1. ANALISAR todos os dados visíveis
2. IDENTIFICAR problemas, erros, inconsistências
3. SUGERIR melhorias e otimizações

Sua resposta DEVE seguir EXATAMENTE esta estrutura com os 3 blocos:

## ✅ Versão Corrigida
Identifique e corrija todos os erros encontrados:
- Dados incorretos ou mal formatados
- Textos com erros de ortografia
- Campos vazios que deveriam estar preenchidos
- Inconsistências nos dados

Se não houver erros, diga "Nenhum erro identificado. Os dados estão corretos."

## 🚀 Versão Otimizada
Sugira como melhorar os dados e processos:
- Textos mais profissionais
- Dados mais completos
- Formatação padronizada
- Oportunidades de melhoria nos processos

## 💡 Sugestões Extras
Insights estratégicos adicionais:
- Oportunidades que o usuário pode estar perdendo
- Dicas de produtividade
- Alertas importantes
- Próximos passos recomendados

REGRAS:
- Seja direto e objetivo
- Use bullet points
- Linguagem profissional em português
- Se identifique como Accord
- Nunca invente dados críticos (CPF, valores, etc.)
- Adapte a análise ao contexto da página`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const _auth = await requireAuth(req, corsHeaders);
  if (_auth instanceof Response) return _auth;

  try {
    const { pageContext, pageData, context } = await req.json();

    const userPrompt = `Página atual: ${pageContext}

Dados da página:
${pageData}

Informações do contexto:
${JSON.stringify(context)}

Analise TUDO acima e forneça sua análise completa nos 3 blocos (Corrigido, Otimizado, Sugestões).`;

    return await geminiChatCompletion(
      {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      },
      corsHeaders,
    );

  } catch (e) {
    console.error("orbit-ai-resolve error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
