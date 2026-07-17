import { Search, Plus, Users, Filter, Pin, Settings, ArrowDownUp, History, Home, Inbox, Headset } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AgentPresenceMenu } from "./AgentPresenceMenu";
import { ConversationHistoryModal } from "./ConversationHistoryModal";
import { useTenantLogo } from "@/hooks/useTenantLogo";

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
  isPinned?: boolean;
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
  tenantId?: string | null;
  onAvatarsSynced?: () => void;
  sortOrder?: "newest" | "oldest";
  onSortOrderChange?: (v: "newest" | "oldest") => void;
}

const CHANNEL_STYLES = {
  zapi: { label: "Z-API", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  uazapi: { label: "Uazapi", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  cloud: { label: "Cloud", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
};

function Avatar({ contact, size = 40 }: { contact: SidebarContact; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = contact.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  if (contact.profilePicUrl && !imgError) {
    return (
      <img
        src={contact.profilePicUrl}
        alt={contact.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
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
const TOP_TABS: { key: ConversationStatusFilter; label: string }[] = [
  { key: "em_atendimento", label: "Em Atendimento" },
  { key: "fila", label: "Em Espera" },
];

export function InboxSidebar({
  contacts, selectedId, onSelect, searchTerm, onSearchChange,
  filter, onFilterChange, isAdmin, loading, statusFilter, onStatusFilterChange,
  onNewConversation, tenantId, onAvatarsSynced,
  sortOrder = "newest", onSortOrderChange,
}: InboxSidebarProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const navigate = useNavigate();

  const counts = {
    fila: contacts.filter((c) => c.conversationStatus === "fila" || c.conversationStatus === "aguardando").length,
    em_atendimento: contacts.filter((c) => c.conversationStatus === "em_atendimento").length,
    encerrado: contacts.filter((c) => c.conversationStatus === "encerrado").length,
  };

  const unreadTotal = contacts.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <div className="flex flex-col w-full md:w-[300px] md:min-w-[300px] md:border-r border-border/60 bg-muted/20 dark:bg-white/[0.02] h-full">
      <div
        className="px-3 pt-3 pb-2 space-y-3"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        }}
      >
        {/* Top brand bar: logo/Accord + home + Atendimentos pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            {tenantLogoUrl ? (
              <img src={tenantLogoUrl} alt="Logo" className="h-6 w-auto max-w-[90px] object-contain" />
            ) : (
              <span className="text-[13px] font-semibold text-foreground tracking-tight">Accord</span>
            )}
          </div>
          <button
            onClick={() => navigate("/home")}
            title="Ir para o Início"
            aria-label="Ir para o Início"
            className="ml-auto flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
          >
            <Home size={15} />
          </button>
          <div
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium bg-primary text-primary-foreground shadow-sm"
            aria-current="page"
          >
            <Headset size={13} />
            Atendimentos
          </div>
        </div>

        {/* Duas abas grandes no topo — padrão EZ Chat com cores Accord */}
        <div className="flex items-center gap-2">
          {TOP_TABS.map((tab) => {
            const active = statusFilter === tab.key;
            const count = counts[tab.key] || 0;
            return (
              <button
                key={tab.key}
                onClick={() => onStatusFilterChange(tab.key)}
                className={cn(
                  "flex-1 h-9 rounded-full text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5 transition-all border",
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full text-[10px] font-semibold",
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/15 text-primary"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Linha de busca + ações compactas */}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex items-center gap-2 bg-background border border-border/60 rounded-xl px-3 py-2">
            <Search size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
              placeholder="Pesquisar"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          {onSortOrderChange && (
            <button
              onClick={() => onSortOrderChange(sortOrder === "newest" ? "oldest" : "newest")}
              title={sortOrder === "newest" ? "Ordenar mais antigas primeiro" : "Ordenar mais recentes primeiro"}
              aria-label="Alternar ordenação"
              className={cn(
                "flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl border transition-all",
                sortOrder === "oldest"
                  ? "bg-primary/10 text-primary border-primary/40"
                  : "bg-background text-muted-foreground border-border/60 hover:text-foreground"
              )}
            >
              <ArrowDownUp size={15} />
            </button>
          )}
          <button
            onClick={() => onFilterChange(filter === "Não lidas" ? "Todas" : "Não lidas")}
            title={filter === "Não lidas" ? "Mostrar todas" : "Mostrar apenas não lidas"}
            aria-label="Filtrar não lidas"
            className={cn(
              "relative flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl border transition-all",
              filter === "Não lidas"
                ? "bg-primary/10 text-primary border-primary/40"
                : "bg-background text-muted-foreground border-border/60 hover:text-foreground"
            )}
          >
            <Filter size={15} />
            {unreadTotal > 0 && filter !== "Não lidas" && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold inline-flex items-center justify-center">
                {unreadTotal > 9 ? "9+" : unreadTotal}
              </span>
            )}
          </button>
          <button
            onClick={() => setHistoryOpen(true)}
            title="Histórico de conversas encerradas"
            aria-label="Histórico de conversas"
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-background border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <History size={15} />
          </button>
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              title="Nova conversa"
              aria-label="Nova conversa"
              className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <Plus size={15} />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("inbox:open-settings"))}
              title="Configurações do WhatsApp"
              className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-background border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/10 transition-all"
            >
              <Settings size={15} />
            </button>
          )}
          <AgentPresenceMenu />
        </div>
      </div>


      <div className="flex-1 overflow-y-auto py-1.5 px-2">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Inbox size={22} className="text-primary/70" />
            </div>
            <p className="text-[13px] font-medium text-foreground/70">Nenhuma conversa encontrada</p>
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
                  "flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl cursor-pointer mb-0.5 transition-all",
                  isSelected ? "bg-primary/10" : "hover:bg-muted/50"
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
                    {c.isPinned && (
                      <Pin size={11} className="text-primary flex-shrink-0" aria-label="Fixado" />
                    )}
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
      <ConversationHistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        tenantId={tenantId}
        onSelect={(id) => onSelect(id)}
      />
    </div>
  );
}
