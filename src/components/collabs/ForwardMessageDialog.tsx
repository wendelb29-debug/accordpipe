import { useMemo, useState } from "react";
import { Search, X, Check, Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HexAvatar } from "@/components/collabs/HexAvatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ForwardableConversation {
  id: string;
  name: string;
  kind: string;
  emoji?: string | null;
  color?: string | null;
  avatar_url?: string | null;
}

export interface ForwardableMessage {
  id: string;
  content: string | null;
  attachments?: any[] | null;
  reply_to_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: ForwardableMessage | null;
  conversations: ForwardableConversation[];
  currentUserId: string;
  companyId: string;
}

function kindLabel(kind: string) {
  switch (kind) {
    case "collab":
      return "Collab";
    case "channel":
      return "Canal público";
    case "dm":
      return "Usuário";
    case "notes":
      return "Visível apenas para você";
    default:
      return kind;
  }
}

export function ForwardMessageDialog({
  open,
  onOpenChange,
  message,
  conversations,
  currentUserId,
  companyId,
}: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.name.toLowerCase().includes(q));
  }, [conversations, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!message || selected.size === 0) return;
    setSending(true);
    const rows = Array.from(selected).map((convId) => ({
      conversation_id: convId,
      servidor_id: companyId,
      sender_id: currentUserId,
      content: message.content,
      attachments: (message.attachments as any) || [],
    }));
    const { error } = await supabase.from("collab_messages").insert(rows);
    setSending(false);
    if (error) {
      toast.error("Erro ao encaminhar", { description: error.message });
      return;
    }
    toast.success(
      selected.size === 1
        ? "Mensagem encaminhada"
        : `Mensagem encaminhada para ${selected.size} conversas`
    );
    setSelected(new Set());
    setQuery("");
    onOpenChange(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setSelected(new Set());
      setQuery("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="p-0 gap-0 max-w-md rounded-2xl overflow-hidden">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border">
          <DialogTitle className="text-[15px] font-semibold">
            Encaminhar mensagem
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full h-10 pl-9 pr-9 rounded-full border border-border bg-muted/40 text-[13.5px] text-foreground placeholder:text-muted-foreground outline-none focus:bg-background focus:border-emerald-400 transition"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted hover:bg-accent flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 pb-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Conversas recentes
          </p>
        </div>

        <div className="max-h-[420px] overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <div className="text-center text-[13px] text-muted-foreground py-10">
              Nenhuma conversa encontrada
            </div>
          ) : (
            filtered.map((c) => {
              const isSel = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left",
                    isSel
                      ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                      : "hover:bg-accent"
                  )}
                >
                  <HexAvatar
                    name={c.name}
                    emoji={c.emoji || undefined}
                    color={c.color || undefined}
                    src={c.avatar_url || undefined}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-foreground truncate">
                      {c.name}
                    </div>
                    <div className="text-[12px] text-muted-foreground truncate">
                      {kindLabel(c.kind)}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition",
                      isSel
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-border"
                    )}
                  >
                    {isSel && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2 bg-muted/30">
          <span className="text-[12.5px] text-muted-foreground">
            {selected.size === 0
              ? "Selecione uma ou mais conversas"
              : `${selected.size} selecionada${selected.size > 1 ? "s" : ""}`}
          </span>
          <button
            onClick={handleSend}
            disabled={selected.size === 0 || sending}
            className="h-9 px-4 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-medium flex items-center gap-1.5 transition"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Encaminhar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
