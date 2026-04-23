import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { X, Send, Loader2, ExternalLink, Check, CheckCheck, Clock, AlertCircle, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { InboxNotification } from "@/hooks/useInboxNotifications";

interface QuickWhatsAppChatProps {
  notification: InboxNotification;
  companyId: string;
  onClose: () => void;
  bottomOffset: number;
  isMobile: boolean;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "sent": return <Check className="h-3 w-3 text-white/60" />;
    case "delivered": return <CheckCheck className="h-3 w-3 text-white/60" />;
    case "read": return <CheckCheck className="h-3 w-3 text-sky-200" />;
    case "failed": return <AlertCircle className="h-3 w-3 text-red-200" />;
    default: return <Clock className="h-3 w-3 text-white/60" />;
  }
}

export function QuickWhatsAppChat({
  notification,
  companyId,
  onClose,
  bottomOffset,
  isMobile,
}: QuickWhatsAppChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("contact_id", notification.contact_id)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(30);
    setMessages((data || []).reverse());
    setLoading(false);
  }, [notification.contact_id, companyId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`quick-chat-${notification.contact_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `contact_id=eq.${notification.contact_id}`,
        },
        (payload) => setMessages((prev) => [...prev, payload.new])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [notification.contact_id]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    try {
      const { data: msgData, error: msgError } = await supabase
        .from("whatsapp_messages")
        .insert({
          company_id: companyId,
          contact_id: notification.contact_id,
          phone: notification.contact_phone,
          message: text,
          direction: "outbound",
          status: "sending",
          message_type: "text",
        })
        .select()
        .single();
      if (msgError) throw msgError;

      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          company_id: companyId,
          phone: notification.contact_phone,
          message: text,
          message_type: "text",
        },
      });

      const newStatus = error || !data?.success ? "failed" : "sent";
      await supabase.from("whatsapp_messages").update({ status: newStatus }).eq("id", msgData.id);
      if (newStatus === "failed") toast.error("Falha ao enviar");
    } catch {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed z-50 rounded-2xl shadow-2xl border border-border bg-background flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300",
        isMobile ? "inset-x-2 top-14 bottom-2" : "w-[380px] max-h-[540px]"
      )}
      style={
        !isMobile
          ? { bottom: `${bottomOffset + 60}px`, right: 24 }
          : { paddingBottom: "env(safe-area-inset-bottom, 0px)" }
      }
    >
      {/* Header — verde estilo WhatsApp */}
      <div className="flex items-center gap-3 px-3 py-2.5 text-white shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-500">
        <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
          {notification.contact_avatar ? (
            <img src={notification.contact_avatar} alt={notification.contact_name} className="h-full w-full object-cover" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{notification.contact_name}</p>
          <p className="text-[11px] opacity-80 truncate">{notification.contact_phone}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            to="/accord-stack"
            onClick={onClose}
            className="opacity-80 hover:opacity-100 bg-white/15 rounded-full p-1.5 transition"
            title="Abrir no Accord Stack"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={onClose}
            className="opacity-80 hover:opacity-100 bg-white/15 rounded-full p-1.5 transition"
            title="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 bg-muted/20">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">Sem mensagens.</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 pt-1.5 pb-1 text-sm shadow-sm",
                  msg.direction === "outbound"
                    ? "bg-emerald-500 text-white rounded-br-md"
                    : "bg-card text-foreground border border-border/50 rounded-bl-md"
                )}
              >
                <p className="whitespace-pre-wrap break-words leading-snug">
                  {msg.message_type === "image" ? "📷 " : msg.message_type === "audio" ? "🎧 " : msg.message_type === "document" ? "📄 " : ""}
                  {msg.message || (msg.message_type === "image" ? "Imagem" : msg.message_type === "audio" ? "Áudio" : msg.message_type === "document" ? "Documento" : "")}
                </p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className={cn("text-[10px]", msg.direction === "outbound" ? "text-white/60" : "text-muted-foreground")}>
                    {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                  </span>
                  {msg.direction === "outbound" && <StatusIcon status={msg.status} />}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-2 py-2 bg-card border-t border-border shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Resposta rápida…"
          className="flex-1 h-9 rounded-xl bg-muted/60 border-0 px-3 text-sm outline-none placeholder:text-muted-foreground"
          autoFocus
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="h-9 w-9 shrink-0 rounded-full bg-emerald-500 hover:bg-emerald-600"
        >
          {sending ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Send className="h-4 w-4 text-white" />}
        </Button>
      </div>
    </div>
  );
}
