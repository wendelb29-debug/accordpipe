import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X, Send, Sparkles, Minimize2, MessageSquare, Trash2 } from "lucide-react";
import { useAIAssistant } from "@/contexts/AIAssistantContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInboxNotifications, type InboxNotification } from "@/hooks/useInboxNotifications";
import { QuickWhatsAppChat } from "./QuickWhatsAppChat";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accord-ai-chat`;

const STORAGE_KEY = "ai_assistant_state";

type AssistantState = "expanded" | "minimized";

function loadState(): AssistantState {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "minimized") return "minimized";
  } catch {}
  return "expanded";
}

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

/** Detect if a fixed footer / action bar is present at the bottom of the viewport */
function useBottomOffset(isMobile: boolean) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!isMobile) { setOffset(0); return; }

    const compute = () => {
      // Look for fixed/sticky elements near the bottom
      const els = document.querySelectorAll("[class*='fixed'], [class*='sticky']");
      let maxBottom = 0;
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (
          (style.position === "fixed" || style.position === "sticky") &&
          rect.bottom >= window.innerHeight - 10 &&
          rect.height < 120 &&
          rect.height > 20
        ) {
          maxBottom = Math.max(maxBottom, rect.height);
        }
      });
      setOffset(maxBottom);
    };

    compute();
    const interval = setInterval(compute, 1500);
    return () => clearInterval(interval);
  }, [isMobile]);

  return offset;
}

export function AccordAIChat() {
  const { mode: aiMode, setMode: setAiMode, position, setPosition, isDragging, setDragging } = useAIAssistant();
  const [open, setOpen] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>(loadState);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dragOverDrop, setDragOverDrop] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { profile, activeCompany, activeCompanyId } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const bottomOffset = useBottomOffset(isMobile);

  // Sync open with AI mode for the pure-AI path
  useEffect(() => {
    if (aiMode === "open") setOpen(true);
    if (aiMode === "header" || aiMode === "hidden") setOpen(false);
  }, [aiMode]);


  // Smart launcher — inbox notifications
  const { preview, pending, totalUnread, clearPreview, dismissContact } = useInboxNotifications();
  const [activeQuickChat, setActiveQuickChat] = useState<InboxNotification | null>(null);

  const { pageName, quickActions } = getContextForRoute(location.pathname);

  // Extra clearance on routes that have a bottom send button (inbox / chat)
  const needsExtraClearance =
    location.pathname.startsWith("/accord-stack") ||
    location.pathname.startsWith("/atendimento") ||
    location.pathname.startsWith("/inbox") ||
    location.pathname.startsWith("/collabs");

  // Hide on mobile when virtual keyboard is open
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    if (!isMobile || typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => {
      const diff = window.innerHeight - vv.height;
      setKeyboardOpen(diff > 150);
    };
    vv.addEventListener("resize", onResize);
    onResize();
    return () => vv.removeEventListener("resize", onResize);
  }, [isMobile]);

  // Detect if a dialog/modal/drawer is open
  const [hasOverlay, setHasOverlay] = useState(false);
  useEffect(() => {
    const check = () => {
      const overlay = document.querySelector("[data-state='open'][role='dialog'], [data-state='open'][data-vaul-drawer]");
      setHasOverlay(!!overlay);
    };
    check();
    const interval = setInterval(check, 800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const persistState = useCallback((s: AssistantState) => {
    setAssistantState(s);
    try { localStorage.setItem(STORAGE_KEY, s); } catch {}
  }, []);

  const handleMinimize = useCallback(() => {
    setOpen(false);
    persistState("minimized");
  }, [persistState]);

  const handleRestore = useCallback(() => {
    persistState("expanded");
  }, [persistState]);

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
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Não foi possível conectar. Tente novamente em alguns segundos." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const send = () => sendMessage(input);

  // Hide completely when overlay is open on mobile, or when mobile keyboard is up
  const shouldHide = (isMobile && hasOverlay) || (isMobile && keyboardOpen);
  if (shouldHide) return null;

  // Hide on settings routes (/configuracoes/*) UNLESS there's a WhatsApp notification
  const isSettingsPage = location.pathname.startsWith("/configuracoes");
  const hasWhatsAppActivity = !!preview || pending.length > 0 || totalUnread > 0;
  if (isSettingsPage && !hasWhatsAppActivity) return null;

  // Calculate safe bottom position (extra clearance on chat routes to avoid send button)
  const baseBottom = isMobile ? 20 : 24;
  const extraClearance = needsExtraClearance ? (isMobile ? 80 : 90) : 0;
  const safeBottom = baseBottom + bottomOffset + extraClearance;

  // Smart launcher mode: quick_chat > new_message_preview > ai
  const launcherMode: "ai" | "new_message_preview" | "quick_chat" =
    activeQuickChat ? "quick_chat" : (preview ? "new_message_preview" : "ai");
  const hasPending = pending.length > 0;
  const showWhatsAppLook = launcherMode !== "ai" || hasPending;

  const openQuickChat = (notif: InboxNotification) => {
    setActiveQuickChat(notif);
    setOpen(false);
    clearPreview();
  };

  const closeQuickChat = () => {
    if (activeQuickChat) dismissContact(activeQuickChat.contact_id);
    setActiveQuickChat(null);
  };

  // Quick chat takes over the floating slot
  if (activeQuickChat && activeCompanyId) {
    return (
      <QuickWhatsAppChat
        notification={activeQuickChat}
        companyId={activeCompanyId}
        onClose={closeQuickChat}
        bottomOffset={safeBottom}
        isMobile={isMobile}
      />
    );
  }

  // ── AI-only path is now controlled by the global AIAssistantContext ──
  const isPureAI = launcherMode === "ai" && !hasPending;
  if (isPureAI && aiMode !== "open") {
    // header → ícone no header abre; hidden → totalmente oculto
    return null;
  }

  // Legacy minimized pill (apenas para fluxo WhatsApp/quick_chat)
  if (!isPureAI && assistantState === "minimized") {
    return (
      <button
        onClick={handleRestore}
        className="fixed z-40 flex items-center gap-1.5 rounded-full border border-border bg-background/90 backdrop-blur-sm px-2.5 py-1.5 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 group"
        style={{ bottom: `${safeBottom}px`, right: isMobile ? 12 : 20 }}
        title="Abrir assistente IA"
      >
        <div
          className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: showWhatsAppLook
              ? "linear-gradient(135deg, #10b981, #059669)"
              : "linear-gradient(135deg, #3B3F9C, #7A3FF2)",
          }}
        >
          <MessageSquare className="h-3 w-3 text-white" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors hidden sm:inline">
          {showWhatsAppLook ? `${totalUnread}` : "IA"}
        </span>
      </button>
    );
  }

  const handleFabClick = () => {
    if (preview) { openQuickChat(preview); return; }
    if (hasPending) { openQuickChat(pending[pending.length - 1]); return; }
    setOpen((v) => !v);
  };

  // ── DRAG HANDLERS (FAB do modo AI) ──
  const FAB_SIZE = isMobile ? 44 : 56;
  const DROP_ZONE_SIZE = 80;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isPureAI || !fabRef.current) return;
    const rect = fabRef.current.getBoundingClientRect();
    dragStart.current = {
      x: e.clientX, y: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      moved: false,
    };
    fabRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = Math.abs(e.clientX - dragStart.current.x);
    const dy = Math.abs(e.clientY - dragStart.current.y);
    if (!dragStart.current.moved && (dx > 5 || dy > 5)) {
      dragStart.current.moved = true;
      setDragging(true);
      setOpen(false); // esconde painel durante drag
    }
    if (!dragStart.current.moved) return;

    const newX = e.clientX - dragStart.current.offsetX;
    const newY = e.clientY - dragStart.current.offsetY;
    const maxX = window.innerWidth - FAB_SIZE;
    const maxY = window.innerHeight - FAB_SIZE;
    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));
    setPosition({ x: clampedX, y: clampedY });

    const dropX = window.innerWidth - DROP_ZONE_SIZE - 24;
    const dropY = window.innerHeight - DROP_ZONE_SIZE - 24;
    setDragOverDrop(clampedX + FAB_SIZE > dropX && clampedY + FAB_SIZE > dropY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const wasDrag = dragStart.current.moved;
    try { fabRef.current?.releasePointerCapture(e.pointerId); } catch {}
    dragStart.current = null;

    if (!wasDrag) {
      // click puro — toggle painel
      handleFabClick();
      return;
    }
    setDragging(false);
    if (dragOverDrop) {
      setAiMode("hidden");
      setDragOverDrop(false);
      setPosition({ x: -1, y: -1 });
    } else {
      setOpen(true);
    }
  };

  // Posição computada do FAB no modo IA
  const computedPos = isPureAI && (position.x !== -1 && position.y !== -1)
    ? position
    : null;



  // ── Expanded state ──
  return (
    <>
      {/* Preview balloon (shown for ~10s on new inbound messages) */}
      {preview && !open && (
        <button
          onClick={() => openQuickChat(preview)}
          className={cn(
            "fixed z-50 flex items-start gap-2.5 rounded-2xl border border-border bg-background/95 backdrop-blur-md shadow-xl px-3 py-2.5 text-left transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] animate-in slide-in-from-bottom-2 fade-in",
            isMobile ? "max-w-[calc(100vw-32px)]" : "max-w-[300px]"
          )}
          style={{
            bottom: `${safeBottom + (isMobile ? 56 : 68)}px`,
            right: isMobile ? 16 : 24,
          }}
        >
          <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center overflow-hidden shrink-0">
            {preview.contact_avatar ? (
              <img src={preview.contact_avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <MessageSquare className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold truncate text-foreground">
                {preview.contact_name}
              </p>
              {preview.unread_count > 1 && (
                <span className="text-[10px] font-bold bg-emerald-500 text-white rounded-full px-1.5 py-0.5 shrink-0">
                  {preview.unread_count}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {preview.last_message_preview}
            </p>
          </div>
        </button>
      )}

      {/* FAB */}
      <button
        onClick={handleFabClick}
        className={cn(
          "fixed z-40 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 group",
          "text-primary-foreground",
          isMobile ? "h-11 w-11" : "h-12 w-12 sm:h-14 sm:w-14"
        )}
        style={{
          bottom: `${safeBottom}px`,
          right: isMobile ? 16 : 24,
          background: showWhatsAppLook
            ? "linear-gradient(135deg, #10b981, #059669)"
            : "linear-gradient(135deg, #3B3F9C, #7A3FF2)",
        }}
        title={showWhatsAppLook ? "Nova mensagem" : "✨ Assistente IA"}
      >
        {open ? (
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : showWhatsAppLook ? (
          <div className="relative">
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
            {totalUnread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border-2 border-background text-white text-[10px] font-bold flex items-center justify-center">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
        ) : (
          <div className="relative">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-400 border border-[#3B3F9C] animate-pulse" />
          </div>
        )}
      </button>


      {/* Chat window */}
      {open && (
        <div
          className={cn(
            "fixed z-50 rounded-2xl shadow-2xl border border-border bg-background flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300",
            isMobile
              ? "inset-x-2 top-14 bottom-2"
              : "sm:w-[400px] sm:max-h-[560px]"
          )}
          style={
            !isMobile
              ? { bottom: `${safeBottom + 60}px`, right: 24 }
              : { paddingBottom: "env(safe-area-inset-bottom, 0px)" }
          }
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 text-primary-foreground shrink-0"
            style={{ background: "linear-gradient(135deg, #3B3F9C, #7A3FF2)" }}
          >
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">✨ ACCORD IA</p>
              <p className="text-[11px] opacity-80 truncate">Contexto: {pageName}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setMessages([])}
                className="text-[10px] opacity-70 hover:opacity-100 bg-white/10 rounded-full px-2 py-0.5 transition-opacity"
              >
                Limpar
              </button>
              <button
                onClick={handleMinimize}
                className="opacity-70 hover:opacity-100 bg-white/10 rounded-full p-1 transition-opacity"
                title="Minimizar"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="opacity-70 hover:opacity-100 bg-white/10 rounded-full p-1 transition-opacity"
                title="Fechar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center text-muted-foreground text-sm py-4 space-y-2">
                  <Bot className="h-10 w-10 mx-auto opacity-40" />
                  <p className="font-medium">Olá! Sou o Accord AI.</p>
                  <p className="text-xs">
                    Estou aqui para ajudar com <strong>{pageName}</strong>.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1">
                    Ações rápidas
                  </p>
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
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border shrink-0">
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
