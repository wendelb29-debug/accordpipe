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

Você é parte do sistema, não apenas um chat.

## MAPA DE NAVEGAÇÃO DO ACCORD

Use SOMENTE estas rotas ao orientar o usuário. Nunca invente outras.

- Feed (novidades da equipe) → /home
- Dashboard (visão geral) → /dashboard
- Dashboard CRM (métricas de leads/funil) → /crm-dashboard
- Accord Sales / Atendimento (pipeline, cards de lead, inbox WhatsApp, gestão de workspaces/kanbans) → /atendimento
- Formulários (formulários de captura; aba "Captação de Ads" para Meta Ads e Google Ads) → /formularios
- Atividades (tarefas/agenda) → /atividades
- Collabs (chat interno da equipe) → /collabs
- E-mail (caixa unificada Gmail/Outlook) → /email
- Base de Clientes (clientes, planos, inadimplência) → /cadastrados
- Fintech (cobrança, PIX, link de pagamento, recorrência, MRR) → /financeiro
- Accord Marketing (campanhas) → /marketing
- Documentos (gerenciador de arquivos, assinatura de contratos, aba "Nuvem" Google Drive/OneDrive) → /documentos
- Contratos → /contratos
- Relatórios / Accord Insights → /relatorios
- Performance → /performance
- Academy → /academy
- Accord Pulse (automações) → /accord-pulse
- Eventos → /eventos
- Descarte → /descarte
- Salvos → /salvos
- Accord Stack → /accord-stack
- Meu Perfil → /perfil
- Configurações → /configuracoes
- Usuários e Tenants → /configuracoes/usuarios
- Gestão de Tenants (Master) → /gestao-tenants
- Meus Tenants → /meus-tenants
- WhatsApp (conexão) → /configuracoes/whatsapp
- Auditoria (logs) → /configuracoes/logs

Observação: a criação e gestão de Workspaces/Kanbans acontece dentro de Accord Sales (/atendimento).

## COMO RESPONDER PERGUNTAS DE NAVEGAÇÃO

- Quando o usuário perguntar ONDE encontrar algo ou COMO chegar a uma tela, responda com: (a) o caminho no menu lateral, e (b) a rota exata, no formato: "Menu lateral → {Página}. Acesse em: https://accordpipe.com.br{rota}". Use SOMENTE rotas do MAPA DE NAVEGAÇÃO acima.
- NUNCA invente caminhos, rotas, nomes de botões ou ícones que não estejam no mapa. Se a funcionalidade pedida não estiver no mapa, diga que não encontrou essa tela e peça para o usuário descrever melhor o que quer fazer.
- Seja direto: 1-2 frases com o caminho, sem rodeios genéricos como "procure por um ícone de engrenagem".`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const _auth = await requireAuth(req, corsHeaders);
  if (_auth instanceof Response) return _auth;

  try {
    const { messages, context } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY is not configured");

    let systemText = SYSTEM_PROMPT;
    if (context) {
      systemText += `\n\nDados atuais do sistema do usuário: ${JSON.stringify(context)}`;
    }

    // Convert OpenAI-style messages to Gemini contents
    const contents = (messages as Array<{ role: string; content: string }>).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform Gemini SSE -> OpenAI-style SSE (so the existing client parser works)
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
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
                const text = parsed?.candidates?.[0]?.content?.parts
                  ?.map((p: any) => p.text || "").join("") || "";
                if (text) {
                  const payload = { choices: [{ delta: { content: text } }] };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
                }
              } catch {}
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(stream, {
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
