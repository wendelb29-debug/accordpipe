import { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  MoreVertical,
  Search,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  ChevronDown,
  Bot,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  WhatsAppContact,
  WhatsAppMessage,
  Channel,
  channelMeta,
  mockMessages,
} from "./mock-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChannelIcon } from "./ChannelIcon";

interface ChatAreaProps {
  contact: WhatsAppContact | null;
  onSendMessage?: (text: string) => void;
}

const avatarColors = [
  "bg-emerald-600", "bg-sky-600", "bg-violet-600", "bg-amber-600",
  "bg-rose-600", "bg-teal-600", "bg-indigo-600", "bg-pink-600",
];

function MessageStatusIcon({ status }: { status: WhatsAppMessage["status"] }) {
  switch (status) {
    case "sent":
      return <Check className="h-3 w-3 text-[#667781]/70" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-[#667781]/70" />;
    case "read":
      return <CheckCheck className="h-3 w-3 text-[#53bdeb]" />;
    case "failed":
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    default:
      return <Clock className="h-3 w-3 text-[#667781]/70" />;
  }
}

export function ChatArea({ contact, onSendMessage }: ChatAreaProps) {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [sendChannel, setSendChannel] = useState<Channel>("whatsapp");
  const [orbitLoading, setOrbitLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contact) {
      setMessages(mockMessages[contact.id] || []);
      setSendChannel(contact.channel);
    }
  }, [contact?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !contact) return;
    const newMsg: WhatsAppMessage = {
      id: `new-${Date.now()}`,
      contactId: contact.id,
      text: inputValue.trim(),
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      direction: "outbound",
      status: "sent",
      type: "text",
      channel: sendChannel,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputValue("");
    onSendMessage?.(inputValue.trim());

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsg.id ? { ...m, status: "delivered" as const } : m))
      );
    }, 1000);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsg.id ? { ...m, status: "read" as const } : m))
      );
    }, 3000);
  };

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f9fa] dark:bg-[#222e35]">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="h-[160px] w-[160px] mx-auto rounded-full bg-gradient-to-br from-[#25d366]/10 to-[#0084FF]/10 flex items-center justify-center">
            <div className="flex gap-3">
              {(["whatsapp", "messenger", "instagram", "telegram"] as Channel[]).map((ch) => (
                <ChannelIcon key={ch} channel={ch} size={28} />
              ))}
            </div>
          </div>
          <h2 className="text-2xl font-light text-[#41525d] dark:text-[#e9edef]">
            Orbit Omnichannel
          </h2>
          <p className="text-sm text-[#667781] dark:text-[#8696a0] leading-relaxed">
            Centralize suas conversas de WhatsApp, Messenger, Instagram e Telegram.
            <br />
            Selecione uma conversa para começar.
          </p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const getAvatarColor = (id: string) => {
    const idx = parseInt(id, 10) % avatarColors.length || 0;
    return avatarColors[idx];
  };

  const meta = channelMeta[contact.channel];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="h-[56px] flex items-center justify-between px-4 bg-white dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarFallback className={cn("text-white text-sm font-medium", getAvatarColor(contact.id))}>
                {getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center border-2 border-white dark:border-[#202c33]"
              style={{ backgroundColor: meta.color }}
            >
              <ChannelIcon channel={contact.channel} size={9} className="[&_svg]:!text-white" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-medium text-[#111b21] dark:text-[#e9edef]">{contact.name}</p>
              <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ color: meta.color, backgroundColor: meta.bg }}>
                {meta.name}
              </span>
            </div>
            <p className="text-[12px] text-[#667781] dark:text-[#8696a0]">
              {contact.status === "online"
                ? "online"
                : contact.status === "typing"
                ? "digitando..."
                : `último acesso hoje às ${contact.lastMessageTime}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-[#54656f] dark:text-[#aebac1]">
            <Search className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-[#54656f] dark:text-[#aebac1]">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Dados do contato</DropdownMenuItem>
              <DropdownMenuItem>Selecionar mensagens</DropdownMenuItem>
              <DropdownMenuItem>Silenciar notificações</DropdownMenuItem>
              <DropdownMenuItem>Limpar conversa</DropdownMenuItem>
              <DropdownMenuItem>Transferir conversa</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ backgroundColor: "#F5F5F5" }}
      >
        <div className="max-w-[920px] mx-auto px-[5%] py-3 space-y-1">
          {/* Date divider */}
          <div className="flex justify-center mb-3">
            <span className="bg-white text-[#54656f] text-[12px] px-3 py-1 rounded-lg shadow-sm">
              HOJE
            </span>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex mb-1",
                msg.direction === "outbound" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "relative max-w-[65%] rounded-2xl px-3 pt-1.5 pb-2 text-[14px] shadow-sm",
                  msg.direction === "outbound"
                    ? "bg-[#25D366] text-white"
                    : "bg-white text-[#111b21]"
                )}
              >
                {/* Channel tag for unified history */}
                {msg.channel !== contact.channel && (
                  <div className="flex items-center gap-1 mb-0.5">
                    <ChannelIcon channel={msg.channel} size={10} />
                    <span className="text-[10px] opacity-70">
                      via {channelMeta[msg.channel].name}
                    </span>
                  </div>
                )}

                <p className="whitespace-pre-wrap break-words leading-[19px]">
                  {msg.text}
                </p>

                {/* Timestamp + status */}
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className={cn(
                    "text-[10px] leading-none",
                    msg.direction === "outbound" ? "text-white/70" : "text-[#667781]"
                  )}>
                    {msg.timestamp}
                  </span>
                  {msg.direction === "outbound" && (
                    <span className="ml-0.5">
                      <MessageStatusIcon status={msg.status} />
                    </span>
                  )}
                </div>

                {/* Failed indicator */}
                {msg.status === "failed" && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 text-red-400" />
                    <span className="text-[10px] text-red-400">Não entregue</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {contact.status === "typing" && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  <span className="h-2 w-2 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="h-[56px] flex items-center gap-2 px-3 bg-white dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#222d34]">
        <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-[#54656f]">
          <Smile className="h-5 w-5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-[#54656f]">
          <Paperclip className="h-5 w-5" />
        </Button>

        <div className="flex-1 mx-1">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Digite uma mensagem…"
            className="w-full h-[40px] rounded-2xl bg-[#f0f2f5] dark:bg-[#2a3942] border-0 px-4 text-[14px] text-[#111b21] dark:text-[#e9edef] placeholder:text-[#667781] outline-none"
          />
        </div>

        {/* Channel selector */}
        {contact.channels.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-[12px] shrink-0" style={{ color: channelMeta[sendChannel].color }}>
                <ChannelIcon channel={sendChannel} size={14} />
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {contact.channels.map((ch) => (
                <DropdownMenuItem key={ch} onClick={() => setSendChannel(ch)} className="gap-2">
                  <ChannelIcon channel={ch} size={14} />
                  <span className="text-sm">{channelMeta[ch].name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {inputValue.trim() ? (
          <Button
            size="icon"
            onClick={handleSend}
            className="h-9 w-9 shrink-0 rounded-full"
            style={{ backgroundColor: "#25D366" }}
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-[#54656f]">
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
