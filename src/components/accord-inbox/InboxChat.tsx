import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Send, Paperclip, Smile, Mic, MoreVertical, Bot, Loader2,
  Check, CheckCheck, Clock, AlertCircle, UserPlus, ArrowRightLeft,
  Phone, Info, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { InboxContact, InboxMessage } from "@/hooks/useWhatsAppInbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InboxChatProps {
  contact: InboxContact | null;
  messages: InboxMessage[];
  onSendMessage: (text: string) => void;
  onTransfer: (contactId: string) => void;
  onAssignToMe: (contactId: string) => void;
  isAdmin: boolean;
  companyId: string | null | undefined;
}

function MessageStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "sent": return <Check className="h-3 w-3 text-white/60" />;
    case "delivered": return <CheckCheck className="h-3 w-3 text-white/60" />;
    case "read": return <CheckCheck className="h-3 w-3 text-[#53bdeb]" />;
    case "failed": return <AlertCircle className="h-3 w-3 text-red-400" />;
    default: return <Clock className="h-3 w-3 text-white/60" />;
  }
}

export function InboxChat({ contact, messages, onSendMessage, onTransfer, onAssignToMe, isAdmin, companyId }: InboxChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [accordLoading, setAccordLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !contact) return;
    onSendMessage(inputValue.trim());
    setInputValue("");
  };

  const handleAccordAI = async () => {
    if (!contact) return;
    const lastInbound = [...messages].reverse().find(m => m.direction === "inbound");
    if (!lastInbound) {
      toast.error("Nenhuma mensagem recebida para responder.");
      return;
    }
    setAccordLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("orbit-ai-chat", {
        body: {
          message: `O cliente enviou: "${lastInbound.message}". Gere uma resposta profissional e direta para essa mensagem, como se fosse um atendente.`,
        },
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

  // Empty state
  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-5 max-w-sm px-6">
          <div className="h-28 w-28 mx-auto rounded-full bg-gradient-to-br from-emerald-500/10 to-primary/10 flex items-center justify-center">
            <Send className="h-10 w-10 text-emerald-500/40" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-foreground">Inbox Inteligente</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Selecione uma conversa ao lado para iniciar o atendimento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Chat header */}
      <div className="h-14 flex items-center justify-between px-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-emerald-500 text-white text-xs font-medium">
                {getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">{contact.name}</p>
            <p className="text-[11px] text-emerald-600 font-medium">online</p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Phone className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ligar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Tag className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tags</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Informações</TooltipContent>
          </Tooltip>

          {!contact.assigned_to && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onAssignToMe(contact.id)}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Assumir conversa</TooltipContent>
            </Tooltip>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onAssignToMe(contact.id)}>
                <UserPlus className="h-4 w-4 mr-2" /> Assumir conversa
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => onTransfer(contact.id)}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" /> Transferir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: "hsl(var(--muted) / 0.3)",
        }}
      >
        <div className="max-w-[860px] mx-auto px-4 md:px-[5%] py-4 space-y-1">
          {messages.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-xs">
              Nenhuma mensagem ainda. Inicie a conversa!
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  "flex mb-0.5",
                  msg.direction === "outbound" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "relative max-w-[70%] rounded-2xl px-3 pt-2 pb-1.5 text-sm shadow-sm transition-all",
                    msg.direction === "outbound"
                      ? "bg-emerald-500 text-white rounded-br-md"
                      : "bg-card text-foreground border border-border/50 rounded-bl-md"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words leading-[1.4]">
                    {msg.message}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className={cn(
                      "text-[10px]",
                      msg.direction === "outbound" ? "text-white/60" : "text-muted-foreground"
                    )}>
                      {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                    </span>
                    {msg.direction === "outbound" && <MessageStatusIcon status={msg.status} />}
                  </div>
                  {msg.status === "failed" && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <AlertCircle className="h-3 w-3 text-red-400" />
                      <span className="text-[10px] text-red-400">Não entregue</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-card border-t border-border">
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
          <Smile className="h-[18px] w-[18px]" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
          <Paperclip className="h-[18px] w-[18px]" />
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon" variant="ghost"
              className="h-8 w-8 shrink-0 text-emerald-600 hover:bg-emerald-500/10"
              onClick={handleAccordAI}
              disabled={accordLoading}
            >
              {accordLoading ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Bot className="h-[18px] w-[18px]" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Responder com Accord AI</TooltipContent>
        </Tooltip>

        <div className="flex-1 mx-1">
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Digite uma mensagem…"
            className="w-full h-9 rounded-xl bg-muted/60 border-0 px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30 transition-all"
          />
        </div>

        {inputValue.trim() ? (
          <Button
            size="icon" onClick={handleSend}
            className="h-9 w-9 shrink-0 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-sm transition-all"
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
            <Mic className="h-[18px] w-[18px]" />
          </Button>
        )}
      </div>
    </div>
  );
}
