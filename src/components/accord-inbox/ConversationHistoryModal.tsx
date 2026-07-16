import { useEffect, useMemo, useState } from "react";
import { Search, X, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null | undefined;
  onSelect?: (contactId: string) => void;
}

interface Row {
  id: string;
  name: string;
  phone: string;
  last_message: string | null;
  last_message_at: string | null;
  conversation_status: string | null;
  avatar_url: string | null;
}

export function ConversationHistoryModal({ open, onOpenChange, tenantId, onSelect }: Props) {
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !tenantId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("whatsapp_contacts")
        .select("id, name, phone, last_message, last_message_at, conversation_status, avatar_url")
        .eq("company_id", tenantId)
        .in("conversation_status", ["encerrado", "finalizado"])
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (alive) {
        setRows((data as any) || []);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, tenantId]);

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name?.toLowerCase().includes(q) || r.phone?.includes(q.replace(/\D/g, ""))
    );
  }, [rows, term]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
          <h3 className="text-[15px] font-medium text-foreground">Histórico de conversas</h3>
          <button
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground hover:bg-muted"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-border/40">
          <div className="flex items-center gap-2 bg-muted/60 border border-border/50 rounded-xl px-3 py-2">
            <Search size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar por número ou nome do contato…"
              className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Somente leitura · atendimentos já encerrados deste tenant
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <MessageSquare size={28} className="opacity-40" />
              <p className="text-sm">Nenhum atendimento encerrado encontrado</p>
            </div>
          ) : (
            filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  onSelect?.(r.id);
                  onOpenChange(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-muted/50"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {(r.name || "?").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-foreground truncate">{r.name || r.phone}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {r.phone} · {r.last_message || "Sem mensagens"}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground flex-shrink-0">
                  {r.last_message_at
                    ? new Date(r.last_message_at).toLocaleDateString("pt-BR")
                    : ""}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
