import { Search, Inbox, Users, UserX, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { InboxFilter, InboxContact } from "@/hooks/useWhatsAppInbox";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InboxSidebarProps {
  contacts: InboxContact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filter: InboxFilter;
  onFilterChange: (f: InboxFilter) => void;
  isAdmin: boolean;
  loading: boolean;
}

const filterOptions: { value: InboxFilter; label: string; icon: any }[] = [
  { value: "mine", label: "Minhas", icon: Inbox },
  { value: "all", label: "Todas", icon: Users },
  { value: "unassigned", label: "Não atribuídas", icon: UserX },
];

export function InboxSidebar({
  contacts, selectedId, onSelect, searchTerm, onSearchChange,
  filter, onFilterChange, isAdmin, loading,
}: InboxSidebarProps) {
  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: false, locale: ptBR });
    } catch {
      return "";
    }
  };

  return (
    <div className="w-[320px] lg:w-[340px] shrink-0 border-r border-border flex flex-col bg-card">
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar conversas..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-8 text-xs rounded-lg bg-muted/50 border-transparent focus:border-border"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-0.5 px-3 pb-2">
        {filterOptions
          .filter(f => f.value !== "all" || isAdmin)
          .map(f => (
            <Button
              key={f.value}
              size="sm"
              variant="ghost"
              className={cn(
                "h-7 text-[11px] gap-1 px-2.5 rounded-lg font-medium transition-all",
                filter === f.value
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={() => onFilterChange(f.value)}
            >
              <f.icon className="h-3 w-3" />
              {f.label}
            </Button>
          ))}
      </div>

      {/* Contact list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-3 items-center p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-xs">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="px-1.5 py-1">
            {contacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => onSelect(contact.id)}
                className={cn(
                  "group w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left transition-all duration-150",
                  selectedId === contact.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50 border border-transparent"
                )}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10 shrink-0">
                    {contact.avatar_url && <AvatarImage src={contact.avatar_url} />}
                    <AvatarFallback className="bg-emerald-500 text-white text-xs font-medium">
                      {getInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium text-foreground truncate">
                      {contact.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(contact.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5 leading-4">
                    {contact.last_message || contact.phone}
                  </p>
                </div>

                {/* Hover actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0">
                  <Archive className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
