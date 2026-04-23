import { Search, Plus, Users, MessageSquare, RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  tenantId?: string | null;
  onAvatarsSynced?: () => void;
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
  onNewConversation, tenantId, onAvatarsSynced,
}: InboxSidebarProps) {
  const filterOpts = ["Todas", "Não lidas"];
  const [syncingAvatars, setSyncingAvatars] = useState(false);

  const handleSyncAvatars = async () => {
    if (!tenantId || syncingAvatars) return;
    setSyncingAvatars(true);
    const t = toast.loading("Sincronizando fotos do WhatsApp...");
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-sync-all-avatars", {
        body: { tenant_id: tenantId, limit: 200 },
      });
      if (error) throw error;
      toast.success(`Fotos atualizadas: ${data?.updated ?? 0} de ${data?.total ?? 0}`, { id: t });
      onAvatarsSynced?.();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao sincronizar fotos", { id: t });
    } finally {
      setSyncingAvatars(false);
    }
  };

  const counts = {
    fila: contacts.filter((c) => c.conversationStatus === "fila" || c.conversationStatus === "aguardando").length,
    em_atendimento: contacts.filter((c) => c.conversationStatus === "em_atendimento").length,
    encerrado: contacts.filter((c) => c.conversationStatus === "encerrado").length,
  };

  return (
    <div className="flex flex-col w-full md:w-[272px] md:min-w-[272px] md:border-r border-border/60 bg-muted/30 dark:bg-white/[0.03] h-full">
      <div className="px-3 pt-3 pb-2 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-muted/60 border border-border/50 rounded-xl px-3 py-2">
            <Search size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
              placeholder="Buscar conversa, número..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          {isAdmin && tenantId && (
            <button
              type="button"
              onClick={handleSyncAvatars}
              disabled={syncingAvatars}
              title="Atualizar fotos de perfil"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border/50 bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-all"
            >
              <RefreshCw size={14} className={cn(syncingAvatars && "animate-spin")} />
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {filterOpts.map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={cn(
                "px-3 py-1 rounded-full text-xs transition-all",
                filter === f ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex border-b border-border/60 px-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onStatusFilterChange(tab.key)}
            className={cn(
              "flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5 border-b-2 transition-all",
              statusFilter === tab.key ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            <span className={cn("rounded-full px-1.5 text-[10px] font-medium", tab.colorClass)}>
              {counts[tab.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {onNewConversation && (
        <button
          onClick={onNewConversation}
          className="mx-3 mt-2.5 mb-1 flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all"
        >
          <Plus size={15} />
          Nova conversa
        </button>
      )}

      <div className="flex-1 overflow-y-auto py-1.5 px-2">
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
