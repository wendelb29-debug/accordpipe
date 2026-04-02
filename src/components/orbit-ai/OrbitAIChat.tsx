import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orbit-ai-chat`;

interface QuickAction {
  label: string;
  prompt: string;
}

function getContextForRoute(pathname: string): { pageName: string; quickActions: QuickAction[] } {
  if (pathname.startsWith("/documentos")) {
    return {
      pageName: "Documentos",
      quickActions: [
        { label: "✏️ Melhorar texto", prompt: "Melhore o seguinte texto de forma profissional:" },
        { label: "📝 Reescrever profissional", prompt: "Reescreva o texto abaixo com linguagem profissional e clara:" },
        { label: "📄 Gerar documento", prompt: "Gere um documento completo para o seguinte contexto:" },
      ],
    };
  }
  if (pathname.startsWith("/relatorios")) {
    return {
      pageName: "Relatórios",
      quickActions: [
        { label: "📊 Gerar resumo", prompt: "Gere um resumo executivo dos seguintes dados:" },
        { label: "🔍 Analisar dados", prompt: "Analise os seguintes dados e destaque os pontos mais importantes:" },
        { label: "💡 Criar insights", prompt: "Crie insights estratégicos a partir dos seguintes dados:" },
      ],
    };
  }
  if (pathname.startsWith("/contratos")) {
    return {
      pageName: "Contratos",
      quickActions: [
        { label: "📑 Gerar contrato", prompt: "Gere um modelo de contrato de adesão com as seguintes informações:" },
        { label: "🔎 Revisar contrato", prompt: "Revise o contrato abaixo, identificando problemas e sugerindo melhorias:" },
        { label: "💬 Simplificar linguagem", prompt: "Simplifique a linguagem jurídica do seguinte trecho:" },
      ],
    };
  }
  if (pathname.startsWith("/gestao-vendas") || pathname.startsWith("/atendimento")) {
    return {
      pageName: "Gestão de Vendas",
      quickActions: [
        { label: "💰 Criar proposta", prompt: "Crie uma proposta comercial para o seguinte cliente/serviço:" },
        { label: "📱 Mensagem de venda", prompt: "Gere uma mensagem de venda persuasiva para WhatsApp para o seguinte produto/serviço:" },
        { label: "🤝 Melhorar negociação", prompt: "Sugira estratégias para melhorar a negociação com o seguinte cenário:" },
      ],
    };
  }
  if (pathname.startsWith("/cadastrados") || pathname.startsWith("/clientes") || pathname.startsWith("/empresas")) {
    return {
      pageName: "Cadastros",
      quickActions: [
        { label: "✅ Corrigir cadastro", prompt: "Corrija e padronize os seguintes dados de cadastro:" },
        { label: "📋 Padronizar dados", prompt: "Padronize as seguintes informações seguindo o padrão brasileiro:" },
        { label: "🔎 Validar informações", prompt: "Valide os seguintes dados e identifique inconsistências:" },
      ],
    };
  }
  if (pathname.startsWith("/financeiro") || pathname.startsWith("/boletos")) {
    return {
      pageName: "Financeiro",
      quickActions: [
        { label: "📊 Resumo financeiro", prompt: "Gere um resumo financeiro com base nos seguintes dados:" },
        { label: "📝 Gerar cobrança", prompt: "Gere uma mensagem profissional de cobrança para o seguinte cenário:" },
      ],
    };
  }
  return {
    pageName: "Sistema",
    quickActions: [
      { label: "✏️ Melhorar texto", prompt: "Melhore o seguinte texto de forma profissional:" },
      { label: "💡 Sugestão inteligente", prompt: "Me ajude com a seguinte tarefa:" },
    ],
  };
}

export function OrbitAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { profile, activeCompany } = useAuth();
  const location = useLocation();

  const { pageName, quickActions } = getContextForRoute(location.pathname);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const getContext = () => ({
    usuario: profile?.name,
    empresa: activeCompany?.razao_social || activeCompany?.nome_fantasia,
    pagina_atual: pageName,
  });

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          context: getContext(),
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${e.message || "Erro ao conectar com o Orbit AI"}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const send = () => sendMessage(input);

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 group",
          "text-primary-foreground"
        )}
        style={{ background: 'linear-gradient(135deg, #3B3F9C, #7A3FF2)' }}
        title="✨ Assistente IA"
      >
        {open ? <X className="h-6 w-6" /> : (
          <div className="relative">
            <Bot className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-primary animate-pulse" />
          </div>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[400px] max-h-[560px] rounded-2xl shadow-2xl border border-border bg-background flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">✨ Assistente IA</p>
              <p className="text-[11px] opacity-80">Contexto: {pageName}</p>
            </div>
            <button
              onClick={() => { setMessages([]); }}
              className="text-[10px] opacity-70 hover:opacity-100 bg-white/10 rounded-full px-2 py-0.5 transition-opacity"
            >
              Limpar
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[280px] max-h-[380px]">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center text-muted-foreground text-sm py-4 space-y-2">
                  <Bot className="h-10 w-10 mx-auto opacity-40" />
                  <p className="font-medium">Olá! Sou o Orbit AI.</p>
                  <p className="text-xs">Estou aqui para ajudar com <strong>{pageName}</strong>.</p>
                </div>
                {/* Quick Actions */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1">Ações rápidas</p>
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(action.prompt)}
                      className="w-full text-left text-sm px-3 py-2 rounded-xl border border-border hover:bg-muted/60 hover:border-primary/30 transition-colors flex items-center gap-2"
                    >
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Digite sua pergunta..."
              className="flex-1 h-9 rounded-xl bg-muted border-0 px-3 text-sm outline-none placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={send}
              disabled={!input.trim() || isLoading}
              className="h-9 w-9 rounded-full shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
