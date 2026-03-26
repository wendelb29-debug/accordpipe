import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Send, Paperclip, Smile, Mic, MoreVertical, Bot, Loader2,
  Check, CheckCheck, Clock, AlertCircle, UserPlus, ArrowRightLeft,
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
    case "sent": return <Check className="h-3 w-3 text-white/70" />;
    case "delivered": return <CheckCheck className="h-3 w-3 text-white/70" />;
    case "read": return <CheckCheck className="h-3 w-3 text-[#53bdeb]" />;
    case "failed": return <AlertCircle className="h-3 w-3 text-red-400" />;
    default: return <Clock className="h-3 w-3 text-white/70" />;
  }
}

export function InboxChat({ contact, messages, onSendMessage, onTransfer, onAssignToMe, isAdmin, companyId }: InboxChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [orbitLoading, setOrbitLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !contact) return;
    onSendMessage(inputValue.trim());
    setInputValue("");
  };

  const handleOrbitAI = async () => {
    if (!contact) return;
    const lastInbound = [...messages].reverse().find(m => m.direction === "inbound");
    if (!lastInbound) {
      toast.error("Nenhuma mensagem recebida para responder.");
      return;
    }
    setOrbitLoading(true);
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
        toast.success("Resposta do Orbit AI preenchida!");
      }
    } catch {
      toast.error("Erro ao gerar resposta com Orbit AI");
    } finally {
      setOrbitLoading(false);
    }
  };

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="h-32 w-32 mx-auto rounded-full bg-[#25D366]/10 flex items-center justify-center">
            <Send className="h-12 w-12 text-[#25D366]/50" />
          </div>
          <h2 className="text-xl font-light text-foreground">
            Orbit Inbox
          </h2>
          <p className="text-sm text-muted-foreground">
            Selecione uma conversa para começar o atendimento.
          </p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-[#25D366] text-white text-sm">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{contact.name}</p>
            <p className="text-xs text-muted-foreground">{contact.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!contact.assigned_to && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAssignToMe(contact.id)}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Assumir conversa</TooltipContent>
            </Tooltip>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onAssignToMe(contact.id)}>
                <UserPlus className="h-4 w-4 mr-2" /> Assumir conversa
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => onTransfer(contact.id)}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" /> Transferir conversa
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-muted/20">
        <div className="max-w-[920px] mx-auto px-[5%] py-3 space-y-1">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhuma mensagem ainda. Inicie a conversa!
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  "flex mb-1",
                  msg.direction === "outbound" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "relative max-w-[65%] rounded-2xl px-3 pt-1.5 pb-2 text-sm shadow-sm",
                    msg.direction === "outbound"
                      ? "bg-[#25D366] text-white"
                      : "bg-card text-foreground border border-border"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words leading-5">
                    {msg.message}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className={cn(
                      "text-[10px]",
                      msg.direction === "outbound" ? "text-white/70" : "text-muted-foreground"
                    )}>
                      {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                    </span>
                    {msg.direction === "outbound" && <MessageStatusIcon status={msg.status} />}
                  </div>
                  {msg.status === "failed" && (
                    <div className="flex items-center gap-1 mt-1">
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

      {/* Input */}
      <div className="h-14 flex items-center gap-2 px-3 bg-card border-t border-border">
        <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-muted-foreground">
          <Smile className="h-5 w-5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-muted-foreground">
          <Paperclip className="h-5 w-5" />
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon" variant="ghost"
              className="h-9 w-9 shrink-0 text-[#25D366] hover:bg-[#25D366]/10"
              onClick={handleOrbitAI}
              disabled={orbitLoading}
            >
              {orbitLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bot className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Responder com Orbit AI</TooltipContent>
        </Tooltip>

        <div className="flex-1 mx-1">
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Digite uma mensagem…"
            className="w-full h-10 rounded-2xl bg-muted border-0 px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        {inputValue.trim() ? (
          <Button
            size="icon" onClick={handleSend}
            className="h-9 w-9 shrink-0 rounded-full bg-[#25D366] hover:bg-[#25D366]/90"
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-muted-foreground">
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
