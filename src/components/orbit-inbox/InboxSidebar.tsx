import { Search, Filter, Inbox, Users, UserX } from "lucide-react";
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
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
    } catch {
      return "";
    }
  };

  return (
    <div className="w-[340px] shrink-0 border-r border-border flex flex-col bg-card">
      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar conversas..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
        {filterOptions
          .filter(f => f.value !== "all" || isAdmin)
          .map(f => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? "default" : "ghost"}
              className="h-7 text-xs gap-1 px-2"
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
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-3 items-center">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Nenhuma conversa encontrada
          </div>
        ) : (
          contacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => onSelect(contact.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent/50",
                selectedId === contact.id && "bg-accent"
              )}
            >
              <Avatar className="h-10 w-10 shrink-0">
                {contact.avatar_url && <AvatarImage src={contact.avatar_url} />}
                <AvatarFallback className="bg-[#25D366] text-white text-sm">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground truncate">
                    {contact.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                    {formatTime(contact.last_message_at)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {contact.last_message || contact.phone}
                </p>
              </div>
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
