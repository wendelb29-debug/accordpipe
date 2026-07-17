import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, RefreshCw, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface GroupChat {
  id: string;
  wa_chatid: string;
  name: string | null;
  image_url: string | null;
  group_topic: string | null;
  participant_count: number;
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface GroupMessage {
  id: string;
  chat_id: string | null;
  message: string | null;
  message_type: string;
  media_url: string | null;
  direction: string;
  created_at: string;
  sender_name: string | null;
  sender_jid: string | null;
}

interface Participant {
  id: string;
  participant_jid: string;
  participant_name: string | null;
  is_admin: boolean;
}

interface Props {
  tenantId: string | null;
}

export function GroupsInbox({ tenantId }: Props) {
  const isMobile = useIsMobile();
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const selected = useMemo(
    () => groups.find((g) => g.id === selectedId) || null,
    [groups, selectedId],
  );

  const fetchGroups = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_chats")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_group", true)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar grupos");
    } else {
      setGroups((data as GroupChat[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Realtime updates
  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase
      .channel(`groups-inbox:${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_chats", filter: `tenant_id=eq.${tenantId}` },
        () => fetchGroups(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Load messages + participants when a group is selected
  useEffect(() => {
    if (!selected || !tenantId) {
      setMessages([]);
      setParticipants([]);
      return;
    }
    (async () => {
      const [{ data: msgs }, { data: parts }] = await Promise.all([
        supabase
          .from("whatsapp_messages")
          .select("id, chat_id, message, message_type, media_url, direction, created_at, sender_name, sender_jid")
          .eq("company_id", tenantId)
          .eq("chat_id", selected.wa_chatid)
          .order("created_at", { ascending: true })
          .limit(200),
        supabase
          .from("whatsapp_group_participants")
          .select("id, participant_jid, participant_name, is_admin")
          .eq("chat_id", selected.id)
          .order("is_admin", { ascending: false }),
      ]);
      setMessages((msgs as GroupMessage[]) || []);
      setParticipants((parts as Participant[]) || []);
    })();
  }, [selected, tenantId]);

  // Realtime messages for the selected group
  useEffect(() => {
    if (!selected || !tenantId) return;
    const ch = supabase
      .channel(`group-msgs:${selected.wa_chatid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `company_id=eq.${tenantId}`,
        },
        (payload: any) => {
          const m = payload.new as GroupMessage;
          if (m.chat_id === selected.wa_chatid) {
            setMessages((prev) => [...prev, m]);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected, tenantId]);

  const handleSync = async () => {
    if (!tenantId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("uazapi-sync-groups", {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      toast.success(
        `Sincronizado: ${data?.summary?.groups_processed ?? 0} grupos, ${data?.summary?.participants_upserted ?? 0} participantes`,
      );
      await fetchGroups();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao sincronizar grupos");
    } finally {
      setSyncing(false);
    }
  };

  const filtered = groups.filter((g) =>
    (g.name || g.wa_chatid).toLowerCase().includes(search.toLowerCase()),
  );

  const showChatOnly = isMobile && !!selectedId;
  const showListOnly = isMobile && !selectedId;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left: groups list */}
      <div
        className={cn(
          "flex flex-col w-full md:w-[300px] md:min-w-[300px] md:border-r border-border/60 bg-muted/20 dark:bg-white/[0.02] h-full",
          showChatOnly && "hidden md:flex",
        )}
      >
        <div className="px-3 pt-3 pb-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold flex items-center gap-2">
              <Users size={16} className="text-primary" />
              Grupos ({groups.length})
            </div>
            <Button size="sm" variant="ghost" onClick={handleSync} disabled={syncing} title="Sincronizar grupos">
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </Button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar grupo"
              className="w-full pl-8 pr-2 py-1.5 text-sm rounded-md bg-background border border-border/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-xs text-muted-foreground py-8">Carregando…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8 px-4">
              Nenhum grupo encontrado. Clique em sincronizar para importar da uazapi.
            </div>
          ) : (
            filtered.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedId(g.id)}
                className={cn(
                  "w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-muted/40 transition-colors",
                  selectedId === g.id && "bg-muted/60",
                )}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {g.image_url ? (
                    <img src={g.image_url} alt={g.name || ""} className="h-full w-full object-cover" />
                  ) : (
                    <Users size={16} className="text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate">{g.name || g.wa_chatid}</div>
                    {g.unread_count > 0 && (
                      <span className="text-[10px] font-semibold text-white bg-primary rounded-full px-1.5 py-0.5">
                        {g.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground truncate">
                      {g.last_message_text || `${g.participant_count} participantes`}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: chat */}
      <div className={cn("flex-1 min-w-0 min-h-0 h-full overflow-hidden flex flex-col", showListOnly && "hidden md:flex")}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Selecione um grupo para ver mensagens</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 h-14 border-b border-border/60 bg-background flex-shrink-0">
              {isMobile && (
                <Button size="icon" variant="ghost" onClick={() => setSelectedId(null)}>
                  <ArrowLeft size={16} />
                </Button>
              )}
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {selected.image_url ? (
                  <img src={selected.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Users size={16} className="text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{selected.name || selected.wa_chatid}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {selected.participant_count} participantes
                  {selected.group_topic ? ` • ${selected.group_topic}` : ""}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-muted/10">
              {messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-8">Sem mensagens.</div>
              ) : (
                messages.map((m) => {
                  const fromMe = m.direction === "outbound";
                  return (
                    <div key={m.id} className={cn("flex", fromMe ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[70%] rounded-xl px-3 py-2 text-sm",
                        fromMe ? "bg-primary text-primary-foreground" : "bg-background border border-border/60",
                      )}>
                        {!fromMe && m.sender_name && (
                          <div className="text-[11px] font-semibold text-primary mb-0.5">
                            {m.sender_name}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap break-words">
                          {m.message || (m.message_type !== "text" ? `[${m.message_type}]` : "")}
                        </div>
                        <div className={cn("text-[10px] mt-1", fromMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {participants.length > 0 && (
              <div className="border-t border-border/60 px-4 py-2 bg-background/50 text-xs text-muted-foreground max-h-24 overflow-y-auto flex-shrink-0">
                <div className="font-medium mb-1">Participantes ({participants.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {participants.slice(0, 30).map((p) => (
                    <span key={p.id} className="px-2 py-0.5 bg-muted rounded-full">
                      {p.participant_name || p.participant_jid.split("@")[0]}
                      {p.is_admin && <span className="ml-1 text-primary">★</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
