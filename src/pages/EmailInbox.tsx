import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, ChevronDown, Plus, Check, X, Search, Loader2,
  RefreshCw, PenSquare,
  Inbox, Star, Send, Trash2, MailOpen, Mail,
  Paperclip,
  Reply, Forward, Target, CheckSquare, MessagesSquare,
} from "lucide-react";
import DOMPurify from "dompurify";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { GmailLogo, OutlookLogo } from "@/components/email/ProviderLogos";

type Folder = "inbox" | "sent" | "important";
type FilterKey = "all" | "unread" | "starred" | "attach";

interface EmailMessage {
  id: string;
  account_id: string;
  provider_msg_id: string;
  thread_id: string | null;
  folder: Folder;
  from_email: string;
  from_name: string | null;
  to_emails: Array<{ email: string; name?: string }>;
  cc_emails?: Array<{ email: string; name?: string }>;
  subject: string;
  snippet: string;
  body_text: string | null;
  body_html: string | null;
  is_read: boolean;
  is_starred: boolean;
  has_attachments: boolean;
  received_at: string;
  attachments?: Array<{ filename: string; size?: number }>;
}

interface EmailAccount {
  id: string;
  email_address: string;
  display_name: string;
  provider: string;
  status: string;
  last_synced_at: string | null;
}

const FOLDERS: { id: Folder; label: string; Icon: any }[] = [
  { id: "inbox",     label: "Caixa de Entrada", Icon: Inbox },
  { id: "important", label: "Importantes",      Icon: Star },
  { id: "sent",      label: "Enviados",         Icon: Send },
];

function providerName(p: string) {
  return ({ gmail: "Gmail", outlook: "Outlook" } as Record<string, string>)[p] || p;
}
function ProviderLogo({ provider, className }: { provider: string; className?: string }) {
  if (provider === "gmail")   return <GmailLogo className={className} />;
  if (provider === "outlook") return <OutlookLogo className={className} />;
  return <Mail className={className} />;
}

function formatRelative(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1)  return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-7 px-2.5 rounded-full text-[11.5px] font-medium transition ${
        active
          ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
          : "text-muted-foreground hover:bg-muted/70"
      }`}
    >
      {children}
    </button>
  );
}

function ActionPill({ icon: Icon, label, onClick, variant }: any) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-medium transition ${
        variant === "danger" ? "text-red-600 hover:bg-red-500/10" : "text-foreground/75 hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function Avatar({ email, name, size = 36 }: { email?: string; name?: string; size?: number }) {
  const text = (name || email || "?").trim();
  const initials = text.split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
  const hue = Array.from(email || "x").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{ background: `hsl(${hue}, 65%, 55%)`, width: size, height: size, fontSize: size * 0.32 }}
    >
      {initials}
    </div>
  );
}

function EmptyMailbox({ folder }: { folder: Folder }) {
  const labels: Record<string, string> = {
    inbox: "Sua caixa de entrada está vazia",
    important: "Nenhum e-mail marcado como importante",
    sent: "Você ainda não enviou nenhum e-mail",
  };
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
        <Inbox className="w-7 h-7 text-emerald-500" />
      </div>
      <div className="text-[14px] font-semibold text-foreground">{labels[folder] || "Nada por aqui"}</div>
      <div className="text-[12px] text-muted-foreground mt-1 max-w-xs">
        Quando chegarem novas mensagens, elas aparecem aqui automaticamente.
      </div>
    </div>
  );
}

export default function EmailInbox() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [allAccounts, setAllAccounts] = useState<EmailAccount[]>([]);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [composePrefill, setComposePrefill] = useState<{ to?: string; subject?: string; threadId?: string | null } | null>(null);

  const loadAccount = async () => {
    if (!accountId) return;
    const { data } = await supabase.from("email_accounts" as any).select("*").eq("id", accountId).maybeSingle();
    setAccount(data as any);
  };
  const loadAllAccounts = async () => {
    const { data } = await supabase
      .from("email_accounts" as any).select("*").order("created_at", { ascending: false });
    setAllAccounts(((data || []) as unknown) as EmailAccount[]);
  };
  const loadMessages = async () => {
    if (!accountId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("email_messages" as any).select("*")
      .eq("account_id", accountId).eq("folder", folder)
      .order("received_at", { ascending: false }).limit(200);
    if (error) toast.error("Erro ao carregar mensagens", { description: error.message });
    setMessages(((data || []) as unknown) as EmailMessage[]);
    setLoading(false);
  };

  useEffect(() => { loadAccount(); loadAllAccounts(); /* eslint-disable-next-line */ }, [accountId]);
  useEffect(() => { loadMessages(); setSelectedId(null); setSelectedIds(new Set());
    /* eslint-disable-next-line */ }, [accountId, folder]);

  useEffect(() => {
    if (!accountId) return;
    const ch = supabase
      .channel(`email_messages:${accountId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "email_messages", filter: `account_id=eq.${accountId}` }, () => loadMessages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    /* eslint-disable-next-line */
  }, [accountId, folder]);

  const handleSync = async () => {
    if (!accountId || !account) return;
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("email-sync", { body: { accountId } });
      if (error) throw error;
      toast.success("Sincronização concluída");
      await loadMessages(); await loadAccount();
    } catch (err: any) {
      toast.error("Erro ao sincronizar", { description: err?.message });
    } finally { setSyncing(false); }
  };

  const selected = useMemo(() => messages.find(m => m.id === selectedId) || null, [messages, selectedId]);

  const filtered = useMemo(() => {
    let list = messages;
    if (filter === "unread")  list = list.filter(m => !m.is_read);
    if (filter === "starred") list = list.filter(m => m.is_starred);
    if (filter === "attach")  list = list.filter(m => m.has_attachments);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(m =>
        (m.subject || "").toLowerCase().includes(s) ||
        (m.from_email || "").toLowerCase().includes(s) ||
        (m.from_name || "").toLowerCase().includes(s) ||
        (m.snippet || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [messages, filter, search]);

  const unreadCount = useMemo(() => messages.filter(m => !m.is_read).length, [messages]);
  const countByFolder = useMemo(() => {
    // approximation: unread for current loaded folder; other folders show "—"
    const c: Record<string, number> = {};
    for (const f of FOLDERS) c[f.id] = f.id === folder ? unreadCount : 0;
    return c;
  }, [folder, unreadCount]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelectedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(m => m.id)));
  };

  const handleSelect = async (msg: EmailMessage) => {
    setSelectedId(msg.id);
    if (!msg.is_read) {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
      supabase.functions.invoke("email-gmail-modify", { body: { messageRowId: msg.id, action: "markRead" } });
    }
  };

  const markAllRead = async () => {
    const unread = messages.filter(m => !m.is_read);
    if (!unread.length) return;
    setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
    await Promise.all(unread.map(m =>
      supabase.functions.invoke("email-gmail-modify", { body: { messageRowId: m.id, action: "markRead" } })
    ));
    toast.success("Tudo marcado como lido");
  };

  const bulkAction = async (action: "read" | "delete") => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (action === "delete" && !confirm(`Mover ${ids.length} mensagem(ns) para a lixeira?`)) return;
    if (action === "read") {
      setMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, is_read: true } : m));
      await Promise.all(ids.map(id =>
        supabase.functions.invoke("email-gmail-modify", { body: { messageRowId: id, action: "markRead" } })
      ));
      toast.success(`${ids.length} marcadas como lidas`);
    } else if (action === "delete") {
      setMessages(prev => prev.filter(m => !ids.includes(m.id)));
      await Promise.all(ids.map(id =>
        supabase.functions.invoke("email-gmail-modify", { body: { messageRowId: id, action: "trash" } })
      ));
      toast.success(`${ids.length} movidas para a lixeira`);
    }
    setSelectedIds(new Set());
  };

  const handleTrash = async (msg: EmailMessage) => {
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    if (selectedId === msg.id) setSelectedId(null);
    await supabase.functions.invoke("email-gmail-modify", { body: { messageRowId: msg.id, action: "trash" } });
    toast.success("Movida para a lixeira");
  };

  const openReply = (msg: EmailMessage) => {
    setComposePrefill({
      to: msg.from_email,
      subject: msg.subject?.startsWith("Re:") ? msg.subject : `Re: ${msg.subject || ""}`,
      threadId: msg.thread_id,
    });
    setComposeOpen(true);
  };
  const openForward = (msg: EmailMessage) => {
    setComposePrefill({
      to: "",
      subject: msg.subject?.startsWith("Fwd:") ? msg.subject : `Fwd: ${msg.subject || ""}`,
      threadId: null,
    });
    setComposeOpen(true);
  };
  const handleNew = () => { setComposePrefill(null); setComposeOpen(true); };

  const handleCreateLead = (msg: EmailMessage) => {
    navigate(`/atendimento?from=email&email=${encodeURIComponent(msg.from_email)}&name=${encodeURIComponent(msg.from_name || "")}&messageId=${msg.id}`);
  };
  const handleCreateTask = (msg: EmailMessage) => {
    navigate(`/atividades?from=email&messageId=${msg.id}&title=${encodeURIComponent(msg.subject || "")}`);
  };
  const handleShareToCollab = (msg: EmailMessage) => {
    navigate(`/collabs?share=email&messageId=${msg.id}`);
    toast.info("Selecione uma collab para compartilhar este e-mail");
  };

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden"
      style={{
        background:
          "radial-gradient(900px 500px at 90% -10%, rgba(99,102,241,0.08), transparent 60%), " +
          "radial-gradient(700px 400px at -5% 110%, rgba(59,130,246,0.06), transparent 60%), " +
          "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)/0.4) 100%)",
      }}
    >
      {/* HEADER */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-card/70 backdrop-blur-md shrink-0">
        <button onClick={() => navigate("/email")} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition shrink-0" title="Voltar">
          <ArrowLeft className="w-[18px] h-[18px]" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 h-10 px-3 rounded-xl hover:bg-muted transition group">
              <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                <ProviderLogo provider={account.provider} className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-[14px] font-semibold text-foreground leading-tight">{providerName(account.provider)}</div>
                <div className="text-[11.5px] text-muted-foreground leading-tight truncate max-w-[220px]">{account.email_address}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground transition" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={6} className="w-[300px] p-1.5 rounded-2xl border-border bg-popover shadow-2xl">
            {allAccounts.map(acc => (
              <DropdownMenuItem
                key={acc.id}
                onSelect={() => navigate(`/email/${acc.id}`)}
                className={`rounded-lg px-2.5 py-2 cursor-pointer gap-2.5 ${acc.id === account.id ? "bg-emerald-500/10" : ""}`}
              >
                <div className="w-7 h-7 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
                  <ProviderLogo provider={acc.provider} className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-foreground truncate">{providerName(acc.provider)}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{acc.email_address}</div>
                </div>
                {acc.id === account.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="my-1 bg-border" />
            <DropdownMenuItem onSelect={() => navigate("/email")} className="rounded-lg px-2.5 py-2 cursor-pointer gap-2.5 text-[13px] text-emerald-600">
              <Plus className="w-4 h-4" />
              Conectar outra conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-medium border border-border bg-card hover:bg-muted transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          Sincronizar
        </button>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition shadow-sm shadow-emerald-500/20"
        >
          <PenSquare className="w-4 h-4" />
          Nova mensagem
        </button>
      </div>

      {/* 3 COLUMNS */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* FOLDERS */}
        <aside className="w-[220px] shrink-0 border-r border-border bg-card/40 backdrop-blur-sm overflow-y-auto hidden md:block">
          <nav className="p-3 space-y-0.5">
            {FOLDERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFolder(f.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition ${
                  folder === f.id
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold"
                    : "text-foreground/75 hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <f.Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left truncate">{f.label}</span>
                {countByFolder[f.id] > 0 && (
                  <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    folder === f.id ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {countByFolder[f.id]}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* LIST */}
        <section className={`${selected ? "w-full lg:w-[420px]" : "flex-1"} shrink-0 border-r border-border flex flex-col min-h-0 transition-all ${selected ? "hidden lg:flex" : "flex"}`}>
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
            <input
              type="checkbox"
              checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-border accent-emerald-500"
            />
            {selectedIds.size > 0 ? (
              <>
                <span className="text-[12px] font-semibold text-emerald-600">
                  {selectedIds.size} selecionada{selectedIds.size > 1 ? "s" : ""}
                </span>
                <div className="flex-1" />
                <ActionPill icon={MailOpen} label="Marcar lida" onClick={() => bulkAction("read")} />
                <ActionPill icon={Trash2}  label="Excluir"     onClick={() => bulkAction("delete")} variant="danger" />
              </>
            ) : (
              <>
                <FilterChip active={filter === "all"}     onClick={() => setFilter("all")}>Todos</FilterChip>
                <FilterChip active={filter === "unread"}  onClick={() => setFilter("unread")}>Não lidos · {unreadCount}</FilterChip>
                <FilterChip active={filter === "starred"} onClick={() => setFilter("starred")}>Sinalizados</FilterChip>
                <FilterChip active={filter === "attach"}  onClick={() => setFilter("attach")}>Com anexo</FilterChip>
                <div className="flex-1" />
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11.5px] font-medium text-emerald-600 hover:text-emerald-700 transition">
                    Marcar tudo como lido
                  </button>
                )}
              </>
            )}
          </div>

          {/* Search */}
          <div className="px-4 py-2.5 border-b border-border shrink-0">
            <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar nessa caixa…"
                className="flex-1 bg-transparent outline-none text-[12.5px] text-foreground placeholder:text-muted-foreground/60"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyMailbox folder={folder} />
            ) : (
              filtered.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  className={`group w-full text-left flex gap-3 px-4 py-3 border-b border-border/60 hover:bg-muted/40 transition relative ${
                    selected?.id === m.id ? "bg-emerald-500/[0.08]" : ""
                  } ${!m.is_read ? "bg-blue-500/[0.03] dark:bg-blue-500/[0.04]" : ""}`}
                >
                  {!m.is_read && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(m.id)}
                    onClick={e => e.stopPropagation()}
                    onChange={() => toggleSelect(m.id)}
                    className="w-4 h-4 rounded border-border accent-emerald-500 mt-1 shrink-0"
                  />
                  <Avatar email={m.from_email} name={m.from_name || undefined} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-[13.5px] truncate ${!m.is_read ? "font-bold text-foreground" : "font-medium text-foreground/85"}`}>
                        {m.from_name || m.from_email}
                      </span>
                      <span className="text-[10.5px] text-muted-foreground ml-auto shrink-0 tabular-nums">
                        {formatRelative(m.received_at)}
                      </span>
                    </div>
                    <div className={`text-[13px] truncate mt-0.5 ${!m.is_read ? "font-semibold text-foreground" : "text-foreground/75"}`}>
                      {m.subject || "(sem assunto)"}
                    </div>
                    <div className="text-[12px] text-muted-foreground truncate mt-0.5">{m.snippet}</div>
                    {m.has_attachments && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          <Paperclip className="w-2.5 h-2.5" />
                          anexo
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* READER */}
        {selected ? (
          <section className="flex-1 flex flex-col min-h-0 bg-card/30 backdrop-blur-sm">
            <MessageReader
              message={selected}
              onClose={() => setSelectedId(null)}
              onReply={() => openReply(selected)}
              onForward={() => openForward(selected)}
              onDelete={() => handleTrash(selected)}
              onCreateTask={() => handleCreateTask(selected)}
              onCreateLead={() => handleCreateLead(selected)}
              onShareToCollab={() => handleShareToCollab(selected)}
              recipientFallback={account.email_address}
            />
          </section>
        ) : (
          <section className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground text-[13px]">
            Selecione uma mensagem para ler
          </section>
        )}
      </div>

      {composeOpen && (
        <ComposeDialog
          accountId={account.id}
          defaultTo={composePrefill?.to || ""}
          defaultSubject={composePrefill?.subject || ""}
          threadId={composePrefill?.threadId || null}
          onClose={() => setComposeOpen(false)}
          onSent={() => { setComposeOpen(false); handleSync(); }}
        />
      )}
    </div>
  );
}

function MessageReader({ message, onClose, onReply, onForward, onDelete, onCreateTask, onCreateLead, onShareToCollab, recipientFallback }: any) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-card/60 backdrop-blur-md shrink-0">
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition" title="Fechar">
          <X className="w-4 h-4" />
        </button>
        <div className="flex-1" />

        <button onClick={onCreateLead} className="hidden xl:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11.5px] font-medium border border-border hover:bg-emerald-500/10 hover:border-emerald-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition">
          <Target className="w-3.5 h-3.5" /> Vincular ao CRM
        </button>
        <button onClick={onCreateTask} className="hidden xl:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11.5px] font-medium border border-border hover:bg-violet-500/10 hover:border-violet-300 hover:text-violet-700 dark:hover:text-violet-400 transition">
          <CheckSquare className="w-3.5 h-3.5" /> Criar tarefa
        </button>
        <button onClick={onShareToCollab} className="hidden xl:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11.5px] font-medium border border-border hover:bg-blue-500/10 hover:border-blue-300 hover:text-blue-700 dark:hover:text-blue-400 transition">
          <MessagesSquare className="w-3.5 h-3.5" /> Discutir
        </button>

        {/* compact (sub-xl) */}
        <button onClick={onCreateLead}     title="Vincular ao CRM" className="xl:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 transition"><Target className="w-4 h-4" /></button>
        <button onClick={onCreateTask}     title="Criar tarefa"    className="xl:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-violet-500/10 hover:text-violet-600 transition"><CheckSquare className="w-4 h-4" /></button>
        <button onClick={onShareToCollab}  title="Discutir"        className="xl:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600 transition"><MessagesSquare className="w-4 h-4" /></button>

        <div className="w-px h-6 bg-border mx-1" />
        <button onClick={onReply}   title="Responder"  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition"><Reply className="w-4 h-4" /></button>
        <button onClick={onForward} title="Encaminhar" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition"><Forward className="w-4 h-4" /></button>
        <button onClick={onDelete}  title="Excluir"    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
      </div>

      {/* Subject + meta */}
      <div className="px-6 pt-5 pb-3 border-b border-border shrink-0">
        <h2 className="text-[20px] font-bold text-foreground leading-tight break-words">{message.subject || "(sem assunto)"}</h2>
        <div className="flex items-start gap-3 mt-4">
          <Avatar email={message.from_email} name={message.from_name} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-foreground">{message.from_name || message.from_email}</span>
              <span className="text-[11.5px] text-muted-foreground">&lt;{message.from_email}&gt;</span>
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5 break-words">
              Para: {(message.to_emails || []).map((t: any) => t.email || t).join(", ") || recipientFallback}
              {message.cc_emails?.length > 0 && <> · Cc: {message.cc_emails.map((t: any) => t.email || t).join(", ")}</>}
            </div>
            <div className="text-[11px] text-muted-foreground/70 mt-0.5">
              {new Date(message.received_at).toLocaleString("pt-BR")}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {message.body_html ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/85 prose-a:text-emerald-600"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.body_html) }}
          />
        ) : (
          <pre className="text-[13.5px] text-foreground/85 whitespace-pre-wrap font-sans">{message.body_text || message.snippet}</pre>
        )}

        {message.attachments?.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Anexos</div>
            <div className="flex flex-wrap gap-2">
              {message.attachments.map((a: any, i: number) => (
                <button key={i} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card hover:border-emerald-300 hover:bg-emerald-500/5 transition">
                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[12px] text-foreground truncate max-w-[200px]">{a.filename}</span>
                  <span className="text-[10.5px] text-muted-foreground">{formatSize(a.size)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick reply */}
      <div className="px-6 py-3 border-t border-border shrink-0 bg-card/60 backdrop-blur-md">
        <button
          onClick={onReply}
          className="w-full flex items-center gap-2.5 h-10 px-4 rounded-xl border border-dashed border-border bg-muted/20 hover:bg-muted/40 transition text-left text-[12.5px] text-muted-foreground"
        >
          <Reply className="w-4 h-4" />
          Responder para {message.from_name || message.from_email}…
        </button>
      </div>
    </div>
  );
}

function ComposeDialog({ accountId, defaultTo, defaultSubject, threadId, onClose, onSent }:
  { accountId: string; defaultTo: string; defaultSubject: string; threadId: string | null; onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!to.trim() || !subject.trim()) { toast.error("Preencha destinatário e assunto"); return; }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("email-send", {
        body: { accountId, to, cc, subject, text: body, html: body.replace(/\n/g, "<br>"), threadId },
      });
      if (error) throw error;
      toast.success("E-mail enviado!");
      onSent();
    } catch (err: any) {
      toast.error("Erro ao enviar", { description: err?.message });
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="text-[14px] font-semibold">Nova mensagem</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 space-y-2 flex-1 overflow-y-auto">
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Para"
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-[13px] outline-none focus:border-emerald-400" />
          <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Cc (opcional)"
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-[13px] outline-none focus:border-emerald-400" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto"
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-[13px] outline-none focus:border-emerald-400" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva sua mensagem..."
            className="w-full min-h-[260px] p-3 rounded-lg border border-border bg-background text-[13.5px] outline-none focus:border-emerald-400 resize-y" />
        </div>
        <div className="flex items-center justify-end gap-2 p-3 border-t border-border">
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] font-medium text-foreground/70 hover:bg-muted">Cancelar</button>
          <button onClick={send} disabled={sending}
            className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center gap-1.5">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
