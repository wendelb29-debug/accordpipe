import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Loader2, MessageSquare, Bot, Clock, Check, CheckCheck, AlertCircle, ArrowLeft, RefreshCw, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CrmLead } from "@/hooks/useCrmLeads";

interface LeadWhatsAppTabProps {
  lead: CrmLead;
  onBack?: () => void;
}

function MessageStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "sent": return <Check className="h-3 w-3 text-muted-foreground" />;
    case "delivered": return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case "read": return <CheckCheck className="h-3 w-3 text-emerald-500" />;
    case "failed": return <AlertCircle className="h-3 w-3 text-destructive" />;
    default: return <Clock className="h-3 w-3 text-muted-foreground" />;
  }
}

export function LeadWhatsAppTab({ lead, onBack }: LeadWhatsAppTabProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [contactId, setContactId] = useState<string | null>(null);
  const [accordLoading, setAccordLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const companyId = lead.servidor_id;

  const fetchContact = useCallback(async () => {
    if (!lead.phone) {
      setLoading(false);
      return;
    }

    // Try to find contact by lead_id first, then by phone
    let query = supabase
      .from("whatsapp_contacts")
      .select("id")
      .eq("company_id", companyId);

    const { data: byLead } = await query.eq("lead_id", lead.id).maybeSingle();
    if (byLead) {
      setContactId(byLead.id);
      return byLead.id;
    }

    // Fallback: match by phone
    const phoneClean = lead.phone.replace(/\D/g, "");
    const { data: byPhone } = await supabase
      .from("whatsapp_contacts")
      .select("id")
      .eq("company_id", companyId)
      .or(`phone.eq.${phoneClean},phone.eq.+${phoneClean},phone.like.%${phoneClean.slice(-9)}%`)
      .maybeSingle();

    if (byPhone) {
      setContactId(byPhone.id);
      // Link contact to lead
      await supabase
        .from("whatsapp_contacts")
        .update({ lead_id: lead.id } as any)
        .eq("id", byPhone.id);
      return byPhone.id;
    }

    setLoading(false);
    return null;
  }, [lead.id, lead.phone, companyId]);

  const fetchMessages = useCallback(async (cId: string) => {
    const { data } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("contact_id", cId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchContact().then(cId => {
      if (cId) fetchMessages(cId);
    });
  }, [fetchContact, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime
  useEffect(() => {
    if (!contactId) return;
    const channel = supabase
      .channel(`lead-chat-${contactId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "whatsapp_messages",
        filter: `contact_id=eq.${contactId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [contactId]);

  const handleSend = async () => {
    if (!inputValue.trim() || !contactId || sending) return;
    const text = inputValue.trim();
    setInputValue("");
    setSending(true);

    try {
      const { data: contact } = await supabase
        .from("whatsapp_contacts")
        .select("phone")
        .eq("id", contactId)
        .single();
      if (!contact) throw new Error("Contato não encontrado");

      const { data: msgData, error: msgError } = await supabase
        .from("whatsapp_messages")
        .insert({
          company_id: companyId,
          contact_id: contactId,
          phone: contact.phone,
          message: text,
          direction: "outbound",
          status: "sending",
          message_type: "text",
        })
        .select()
        .single();
      if (msgError) throw msgError;

      const { data, error } = await supabase.functions.invoke("zapi", {
        body: { action: "send-text", phone: contact.phone, message: text, company_id: companyId },
      });

      const newStatus = error || !data?.success ? "failed" : "sent";
      await supabase.from("whatsapp_messages").update({ status: newStatus }).eq("id", msgData.id);

      if (newStatus === "failed") toast.error("Falha ao enviar mensagem");
    } catch {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleAccordAI = async () => {
    const lastInbound = [...messages].reverse().find(m => m.direction === "inbound");
    if (!lastInbound) {
      toast.error("Nenhuma mensagem recebida para responder.");
      return;
    }
    setAccordLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("orbit-ai-chat", {
        body: { message: `O cliente enviou: "${lastInbound.message}". Gere uma resposta profissional e direta.` },
      });
      if (error) throw error;
      const reply = data?.reply || data?.message || "";
      if (reply) {
        setInputValue(reply);
        toast.success("Resposta do Accord AI preenchida!");
      }
    } catch {
      toast.error("Erro ao gerar resposta com Accord AI");
    } finally {
      setAccordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead.phone) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhum telefone cadastrado neste lead.</p>
      </div>
    );
  }

  if (!contactId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhuma conversa WhatsApp encontrada para este lead.</p>
        <p className="text-xs mt-1">O lead será vinculado automaticamente quando uma mensagem chegar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 bg-muted/20 rounded-t-lg">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            Nenhuma mensagem ainda.
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={cn("flex mb-0.5", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "relative max-w-[75%] rounded-2xl px-3 pt-2 pb-1.5 text-sm shadow-sm",
                msg.direction === "outbound"
                  ? "bg-emerald-500 text-white rounded-br-md"
                  : "bg-card text-foreground border border-border/50 rounded-bl-md"
              )}>
                <p className="whitespace-pre-wrap break-words leading-[1.4]">{msg.message}</p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className={cn("text-[10px]", msg.direction === "outbound" ? "text-white/60" : "text-muted-foreground")}>
                    {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                  </span>
                  {msg.direction === "outbound" && <MessageStatusIcon status={msg.status} />}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-1.5 px-2 py-2 bg-card border-t border-border rounded-b-lg">
        <Button
          size="icon" variant="ghost"
          className="h-8 w-8 shrink-0 text-emerald-600 hover:bg-emerald-500/10"
          onClick={handleAccordAI}
          disabled={accordLoading}
        >
          {accordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
        </Button>
        <input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Digite uma mensagem…"
          className="flex-1 h-9 rounded-xl bg-muted/60 border-0 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30"
        />
        <Button
          size="icon" onClick={handleSend} disabled={!inputValue.trim() || sending}
          className="h-9 w-9 shrink-0 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-sm"
        >
          {sending ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Send className="h-4 w-4 text-white" />}
        </Button>
      </div>
    </div>
  );
}
