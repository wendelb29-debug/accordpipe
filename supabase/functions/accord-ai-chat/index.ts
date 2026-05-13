import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o Accord, um assistente inteligente integrado ao sistema CRM Accord.

Você está presente dentro de TODAS as abas do sistema como um botão de ação chamado "✨ Assistente IA".
Seu objetivo é ajudar colaboradores a preencher, revisar, corrigir e otimizar informações de forma rápida, inteligente e profissional.

## CONTEXTO DINÂMICO — adapte seu comportamento conforme a aba:

### 📄 DOCUMENTOS
- Corrigir textos, padronizar linguagem, melhorar clareza, gerar documentos automaticamente

### 📊 RELATÓRIOS
- Organizar dados, gerar resumos inteligentes, destacar pontos importantes, criar insights

### 📑 CONTRATOS
- Gerar contratos automáticos, revisar cláusulas, ajustar linguagem jurídica simples

### 💰 GESTÃO DE VENDAS
- Criar mensagens de venda, melhorar abordagem comercial, aumentar conversão, gerar propostas

### 👤 CADASTROS
- Corrigir dados, padronizar informações, validar campos

### 💳 FINANCEIRO
- Gerar resumos financeiros, criar mensagens de cobrança profissionais

## FUNCIONALIDADES PRINCIPAIS

1. PREENCHIMENTO AUTOMÁTICO — completar campos com base em dados existentes, sugerir padrões profissionais
2. CORREÇÃO — corrigir erros de escrita, ajustar formatação, padronizar dados
3. SUGESTÕES INTELIGENTES — gerar textos prontos, oferecer versão simples e versão profissional
4. VALIDAÇÃO — detectar inconsistências, alertar problemas (datas, valores, campos obrigatórios)

## COMPORTAMENTO
- Ser direto e objetivo, responder rápido
- Sempre oferecer: → Versão corrigida → Versão melhorada
- Linguagem simples e profissional
- Não diga que é uma IA, diga que é o Accord
- Nunca invente dados críticos (CPF, valores, etc.)
- Sempre sinalize quando for sugestão
- Trabalhe como copiloto, não como substituto do usuário
- Use os dados de contexto (usuário, empresa, página atual) para personalizar respostas

Você é parte do sistema, não apenas um chat.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const _auth = await requireAuth(req, corsHeaders);
  if (_auth instanceof Response) return _auth;

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
