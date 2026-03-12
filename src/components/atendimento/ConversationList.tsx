import { useState } from "react";
import { Search, Filter, Plus, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { WhatsAppContact, Channel, channelMeta } from "./mock-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChannelIcon } from "./ChannelIcon";

interface ConversationListProps {
  contacts: WhatsAppContact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const avatarColors = [
  "bg-emerald-600", "bg-sky-600", "bg-violet-600", "bg-amber-600",
  "bg-rose-600", "bg-teal-600", "bg-indigo-600", "bg-pink-600",
];

const allChannels: Channel[] = ["whatsapp", "messenger", "instagram", "telegram"];

export function ConversationList({ contacts, selectedId, onSelect, searchTerm, onSearchChange }: ConversationListProps) {
  const [channelFilter, setChannelFilter] = useState<Channel | null>(null);

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm);
    const matchesChannel = !channelFilter || c.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const getAvatarColor = (id: string) => {
    const idx = parseInt(id, 10) % avatarColors.length || 0;
    return avatarColors[idx];
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111b21]">
      {/* Header */}
      <div className="h-[56px] flex items-center justify-between px-4 border-b border-[#e9edef] dark:border-[#222d34]">
        <h2 className="text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef]">
          Conversas
        </h2>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-[#54656f] dark:text-[#aebac1]">
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-[#54656f] dark:text-[#aebac1]">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#54656f] dark:text-[#8696a0]" />
          <Input
            placeholder="Pesquisar contatos ou canais"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-[36px] text-sm bg-[#f0f2f5] dark:bg-[#202c33] border-0 rounded-lg text-[#111b21] dark:text-[#e9edef] placeholder:text-[#667781] dark:placeholder:text-[#8696a0] focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Channel filters */}
      <div className="flex items-center gap-1.5 px-3 pb-2">
        <button
          onClick={() => setChannelFilter(null)}
          className={cn(
            "text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors",
            !channelFilter
              ? "bg-[#25D366] text-white"
              : "bg-[#f0f2f5] dark:bg-[#202c33] text-[#667781] dark:text-[#8696a0] hover:bg-[#e5e7eb]"
          )}
        >
          Todos
        </button>
        {allChannels.map((ch) => (
          <button
            key={ch}
            onClick={() => setChannelFilter(channelFilter === ch ? null : ch)}
            className={cn(
              "flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors",
              channelFilter === ch
                ? "text-white"
                : "bg-[#f0f2f5] dark:bg-[#202c33] text-[#667781] dark:text-[#8696a0] hover:bg-[#e5e7eb]"
            )}
            style={channelFilter === ch ? { backgroundColor: channelMeta[ch].color } : undefined}
          >
            <ChannelIcon channel={ch} size={12} />
          </button>
        ))}
      </div>

      {/* Contact List */}
      <ScrollArea className="flex-1">
        <div>
          {filtered.map((contact) => (
            <button
              key={contact.id}
              onClick={() => onSelect(contact.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]",
                selectedId === contact.id && "bg-[#f0f2f5] dark:bg-[#2a3942]"
              )}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar className="h-[46px] w-[46px]">
                  <AvatarFallback className={cn("text-white text-base font-medium", getAvatarColor(contact.id))}>
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                {contact.status === "online" && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-[#111b21] bg-[#25d366]" />
                )}
                {/* Channel badge on avatar */}
                <span
                  className="absolute -top-0.5 -right-0.5 h-[18px] w-[18px] rounded-full flex items-center justify-center border-2 border-white dark:border-[#111b21]"
                  style={{ backgroundColor: channelMeta[contact.channel].color }}
                >
                  <ChannelIcon channel={contact.channel} size={10} className="[&_svg]:!text-white" />
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 border-b border-[#e9edef]/60 dark:border-[#222d34] pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-normal text-[#111b21] dark:text-[#e9edef] truncate">
                    {contact.name}
                  </span>
                  <span className={cn(
                    "text-[11px] shrink-0 ml-2",
                    contact.unreadCount > 0
                      ? "text-[#25d366] font-medium"
                      : "text-[#667781] dark:text-[#8696a0]"
                  )}>
                    {contact.lastMessageTime}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[13px] text-[#667781] dark:text-[#8696a0] truncate pr-2">
                    {contact.status === "typing" ? (
                      <span className="text-[#25d366] italic">digitando...</span>
                    ) : (
                      contact.lastMessage
                    )}
                  </p>
                  {contact.unreadCount > 0 && (
                    <span className="shrink-0 bg-[#25d366] text-white rounded-full h-[18px] min-w-[18px] flex items-center justify-center text-[10px] font-bold px-1">
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-[#667781] text-sm">
              Nenhuma conversa encontrada
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
