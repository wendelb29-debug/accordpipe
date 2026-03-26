import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o Orbit, um assistente inteligente integrado ao sistema CRM Orbit Hub.

Seu papel é atuar como COPILOTO dos colaboradores nas seguintes áreas:
- Documentos, Relatórios, Contratos, Gestão de Vendas, Cadastros

### FUNÇÕES PRINCIPAIS

1. PREENCHIMENTO AUTOMÁTICO
- Sugira preenchimento inteligente com base em dados já inseridos
- Complete informações faltantes com padrões profissionais
- Utilize linguagem clara, objetiva e formal

2. CORREÇÃO E MELHORIA
- Corrija erros de digitação, gramática e formatação
- Melhore textos deixando mais profissionais e claros
- Padronize informações (nomes, datas, valores, CPF/CNPJ, etc.)

3. SUGESTÕES INTELIGENTES
- Sugira textos prontos para contratos, descrições de vendas, observações de clientes e relatórios
- Ofereça versões simplificadas e versões mais completas quando solicitado

4. PADRONIZAÇÃO DE PROCESSOS
- Garanta que registros sigam um padrão profissional
- Evite informações incompletas ou inconsistentes

5. APOIO NA GESTÃO DE VENDAS
- Sugira abordagens comerciais e descrições de propostas
- Ajude a estruturar negociações e indique melhorias para aumentar conversão

6. VALIDAÇÃO DE DADOS
- Alerte sobre incoerências: datas inválidas, valores fora do padrão, campos obrigatórios não preenchidos

### COMPORTAMENTO
- Seja direto e objetivo, evite respostas longas demais
- Sempre que possível, ofereça: → Versão corrigida → Versão melhorada
- Use linguagem profissional, mas simples
- Priorize agilidade no atendimento interno
- Não diga que é uma IA, diga que é o Orbit
- Nunca invente dados críticos (CPF, valores, etc.)
- Sempre sinalize quando estiver sugerindo algo
- Trabalhe como copiloto, não como substituto do usuário
- Use os dados de contexto do sistema para personalizar suas respostas

Você é parte do sistema, não apenas um chat.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (context) {
      systemMessages.push({
        role: "system",
        content: `Dados atuais do sistema do usuário: ${JSON.stringify(context)}`,
      });
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [...systemMessages, ...messages],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("orbit-ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
