import { Search, Plus, Users, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConversationStatusFilter = "fila" | "em_atendimento" | "encerrado";

export interface SidebarContact {
  id: string;
  name: string;
  phone: string;
  avatarColor?: string;
  avatarFg?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  isGroup?: boolean;
  channel?: "zapi" | "uazapi" | "cloud";
  channelLabel?: string;
  assignedTo?: string;
  profilePicUrl?: string;
  conversationStatus?: string;
}

interface InboxSidebarProps {
  contacts: SidebarContact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  filter: string;
  onFilterChange: (v: string) => void;
  isAdmin: boolean;
  loading: boolean;
  statusFilter: ConversationStatusFilter;
  onStatusFilterChange: (v: ConversationStatusFilter) => void;
  onNewConversation?: () => void;
}

const CHANNEL_STYLES = {
  zapi: { label: "Z-API", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  uazapi: { label: "Uazapi", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  cloud: { label: "Cloud", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
};

function Avatar({ contact, size = 40 }: { contact: SidebarContact; size?: number }) {
  const initials = contact.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  if (contact.profilePicUrl) {
    return (
      <img
        src={contact.profilePicUrl}
        alt={contact.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-medium text-sm"
      style={{
        width: size,
        height: size,
        background: contact.avatarColor || "#EEEDFE",
        color: contact.avatarFg || "#534AB7",
      }}
    >
      {contact.isGroup ? <Users size={16} style={{ color: contact.avatarFg || "#534AB7" }} /> : initials}
    </div>
  );
}

const STATUS_TABS: { key: ConversationStatusFilter; label: string; colorClass: string }[] = [
  { key: "fila", label: "Fila", colorClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  { key: "em_atendimento", label: "Atend.", colorClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  { key: "encerrado", label: "Enc.", colorClass: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
];

export function InboxSidebar({
  contacts, selectedId, onSelect, searchTerm, onSearchChange,
  filter, onFilterChange, isAdmin, loading, statusFilter, onStatusFilterChange,
  onNewConversation,
}: InboxSidebarProps) {
  const filterOpts = ["Minhas", "Todas", ...(isAdmin ? ["Não atrib."] : [])];

  const counts = {
    fila: contacts.filter((c) => c.conversationStatus === "fila" || c.conversationStatus === "aguardando").length,
    em_atendimento: contacts.filter((c) => c.conversationStatus === "em_atendimento").length,
    encerrado: contacts.filter((c) => c.conversationStatus === "encerrado").length,
  };

  return (
    <div className="flex flex-col w-full md:w-[300px] md:min-w-[300px] md:border-r border-border/60 bg-background h-full">
      {/* Top bar — search + new */}
      <div className="h-14 flex items-center gap-2 px-3 border-b border-border/60 flex-shrink-0">
        <div className="flex items-center gap-2 bg-muted/60 border border-border/50 rounded-lg px-2.5 h-9 flex-1 focus-within:border-primary/50 focus-within:bg-background transition-colors">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            className="bg-transparent outline-none text-[13px] text-foreground placeholder:text-muted-foreground w-full"
            placeholder="Buscar conversa..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {onNewConversation && (
          <button
            onClick={onNewConversation}
            title="Nova conversa"
            aria-label="Nova conversa"
            className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all flex-shrink-0 shadow-sm"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Ownership filter */}
      <div className="flex items-center gap-1 px-3 pt-2.5 pb-1.5">
        {filterOpts.map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={cn(
              "px-2.5 h-7 rounded-full text-[11px] font-medium transition-all",
              filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex border-b border-border/60 px-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onStatusFilterChange(tab.key)}
            className={cn(
              "flex-1 py-2.5 text-[11px] flex items-center justify-center gap-1.5 border-b-2 transition-all -mb-px",
              statusFilter === tab.key ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            <span className={cn("rounded-full px-1.5 min-w-[18px] text-center text-[10px] font-medium leading-4", tab.colorClass)}>
              {counts[tab.key] || 0}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto py-1 px-1.5">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
            <MessageSquare size={24} className="opacity-40" />
            <p className="text-xs">Nenhuma conversa</p>
          </div>
        ) : (
          contacts.map((c) => {
            const isSelected = c.id === selectedId;
            const chan = c.channel ? CHANNEL_STYLES[c.channel] : null;
            return (
              <div
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer mb-0.5 transition-colors relative",
                  isSelected
                    ? "bg-primary/10 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary before:rounded-r"
                    : "hover:bg-muted/50"
                )}
              >
                <div className="relative flex-shrink-0">
                  <Avatar contact={c} size={40} />
                  {c.isOnline && (
                    <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-[13px] font-medium truncate", isSelected ? "text-primary" : "text-foreground")}>
                      {c.name}
                    </span>
                    {c.isGroup && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0 rounded-full flex-shrink-0">grupo</span>
                    )}
                  </div>
                  <p className={cn("text-[11px] truncate mt-0.5", isSelected ? "text-primary/70" : "text-muted-foreground")}>
                    {c.lastMessage || c.phone}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] text-muted-foreground">{c.lastMessageTime}</span>
                  {c.unreadCount ? (
                    <span
                      className="min-w-[20px] h-[20px] inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-1.5 shadow-sm"
                      aria-label={`${c.unreadCount} mensagens não lidas`}
                    >
                      {c.unreadCount > 99 ? "99+" : c.unreadCount}
                    </span>
                  ) : chan ? (
                    <span className={cn("text-[10px] px-1.5 py-0 rounded-full", chan.cls)}>{chan.label}</span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
