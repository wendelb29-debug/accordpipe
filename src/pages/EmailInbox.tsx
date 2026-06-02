import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Mail, Inbox, Send, Star, RefreshCw, Loader2, X, Reply, ArrowLeft,
  Trash2, MailOpen, MailCheck, PenSquare, Search, ChevronDown, Plus, Check,
} from "lucide-react";
import DOMPurify from "dompurify";

type Folder = "inbox" | "sent" | "important";

interface EmailMessage {
  id: string;
  account_id: string;
  provider_msg_id: string;
  thread_id: string | null;
  folder: Folder;
  from_email: string;
  from_name: string | null;
  to_emails: Array<{ email: string; name?: string }>;
  subject: string;
  snippet: string;
  body_text: string | null;
  body_html: string | null;
  is_read: boolean;
  is_starred: boolean;
  has_attachments: boolean;
  received_at: string;
}

interface EmailAccount {
  id: string;
  email_address: string;
  display_name: string;
  provider: string;
  status: string;
  last_synced_at: string | null;
}

const FOLDERS: { id: Folder; label: string; icon: any }[] = [
  { id: "inbox",     label: "Caixa de Entrada", icon: Inbox },
  { id: "important", label: "Importantes",      icon: Star },
  { id: "sent",      label: "Enviados",         icon: Send },
];

export default function EmailInbox() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [allAccounts, setAllAccounts] = useState<EmailAccount[]>([]);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);

  const loadAccount = async () => {
    if (!accountId) return;
    const { data } = await supabase.from("email_accounts" as any).select("*").eq("id", accountId).maybeSingle();
    setAccount(data as any);
  };

  const loadAllAccounts = async () => {
    const { data } = await supabase
      .from("email_accounts" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setAllAccounts(((data || []) as unknown) as EmailAccount[]);
  };

  const loadMessages = async () => {
    if (!accountId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("email_messages" as any)
      .select("*")
      .eq("account_id", accountId)
      .eq("folder", folder)
      .order("received_at", { ascending: false })
      .limit(100);
    if (error) toast.error("Erro ao carregar mensagens", { description: error.message });
    setMessages(((data || []) as unknown) as EmailMessage[]);
    setLoading(false);
  };

  useEffect(() => { loadAccount(); loadAllAccounts(); }, [accountId]);
  useEffect(() => { loadMessages(); setSelectedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, folder]);

  // realtime
  useEffect(() => {
    if (!accountId) return;
    const ch = supabase
      .channel(`email_messages:${accountId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "email_messages", filter: `account_id=eq.${accountId}` }, () => loadMessages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, folder]);

  const handleSync = async () => {
    if (!accountId) return;
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("email-gmail-sync", { body: { accountId } });
      if (error) throw error;
      toast.success("Sincronização concluída");
      await loadMessages();
      await loadAccount();
    } catch (err: any) {
      toast.error("Erro ao sincronizar", { description: err?.message });
    } finally {
      setSyncing(false);
    }
  };

  const selected = useMemo(() => messages.find(m => m.id === selectedId) || null, [messages, selectedId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return messages;
    const s = search.toLowerCase();
    return messages.filter(m =>
      (m.subject || "").toLowerCase().includes(s) ||
      (m.from_email || "").toLowerCase().includes(s) ||
      (m.from_name || "").toLowerCase().includes(s) ||
      (m.snippet || "").toLowerCase().includes(s)
    );
  }, [messages, search]);

  const handleSelect = async (msg: EmailMessage) => {
    setSelectedId(msg.id);
    if (!msg.is_read) {
      // optimistic local
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
      supabase.functions.invoke("email-gmail-modify", { body: { messageRowId: msg.id, action: "markRead" } });
    }
  };

  const handleTrash = async (msg: EmailMessage) => {
    if (!confirm("Mover para a lixeira?")) return;
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    if (selectedId === msg.id) setSelectedId(null);
    const { error } = await supabase.functions.invoke("email-gmail-modify", { body: { messageRowId: msg.id, action: "trash" } });
    if (error) { toast.error("Erro ao mover para lixeira"); loadMessages(); }
  };

  const handleToggleRead = async (msg: EmailMessage) => {
    const action = msg.is_read ? "markUnread" : "markRead";
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: !msg.is_read } : m));
    await supabase.functions.invoke("email-gmail-modify", { body: { messageRowId: msg.id, action } });
  };

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-4 py-2.5 flex items-center gap-3">
        <button onClick={() => navigate("/email")} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center" title="Voltar">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
          <Mail className="w-4.5 h-4.5 text-white" />
        </div>

        {/* Account selector */}
        <div className="relative flex-1 min-w-0">
          <button
            onClick={() => setAccountMenuOpen((v) => !v)}
            className="w-full max-w-[320px] flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-muted transition text-left"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold truncate">{account.display_name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{account.email_address}</div>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition ${accountMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {accountMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setAccountMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-1 w-[300px] z-40 rounded-xl border border-border bg-popover shadow-xl overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-150">
                <div className="px-3 pt-3 pb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Suas contas
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {allAccounts.map((acc) => {
                    const isActive = acc.id === account.id;
                    return (
                      <button
                        key={acc.id}
                        onClick={() => {
                          setAccountMenuOpen(false);
                          if (!isActive) navigate(`/email/${acc.id}`);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/60 transition ${
                          isActive ? "bg-emerald-50/60 dark:bg-emerald-500/10" : ""
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold truncate">{acc.display_name || acc.email_address}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{acc.email_address}</div>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-border">
                  <button
                    onClick={() => { setAccountMenuOpen(false); navigate("/email"); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 group-hover:bg-emerald-500/25 flex items-center justify-center shrink-0 transition">
                      <Plus className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">
                        Conectar caixa de correio…
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Adicione outra conta Gmail ou provedor
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <button onClick={() => setComposeOpen(true)}
          className="hidden sm:inline-flex h-9 px-3 rounded-lg text-[12.5px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 items-center gap-1.5">
          <PenSquare className="w-4 h-4" /> Escrever
        </button>
        <button onClick={handleSync} disabled={syncing}
          className="h-9 px-3 rounded-lg text-[12.5px] font-medium border border-border hover:bg-muted inline-flex items-center gap-1.5 disabled:opacity-50">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sincronizar
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Folders */}
        <div className="w-[180px] shrink-0 border-r border-border bg-muted/20 p-2 space-y-1 hidden md:block">
          {FOLDERS.map(f => {
            const Icon = f.icon;
            const active = folder === f.id;
            return (
              <button key={f.id} onClick={() => setFolder(f.id)}
                className={`w-full text-left px-3 h-9 rounded-lg text-[13px] font-medium flex items-center gap-2 transition ${
                  active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "text-foreground/70 hover:bg-muted"
                }`}>
                <Icon className="w-4 h-4" />
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Message list */}
        <div className={`${selected ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-[380px] xl:w-[420px] shrink-0 border-r border-border`}>
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-[13px] outline-none focus:border-emerald-400" />
            </div>
          </div>
          <div className="md:hidden flex gap-1 p-2 border-b border-border overflow-x-auto">
            {FOLDERS.map(f => (
              <button key={f.id} onClick={() => setFolder(f.id)}
                className={`px-3 h-8 rounded-full text-[12px] font-medium shrink-0 ${folder === f.id ? "bg-emerald-500 text-white" : "bg-muted text-foreground/70"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-[13px] text-muted-foreground">
                Nenhuma mensagem nesta pasta.<br/>
                <button onClick={handleSync} className="mt-2 text-emerald-600 underline text-[12px]">Sincronizar agora</button>
              </div>
            ) : filtered.map(m => (
              <button key={m.id} onClick={() => handleSelect(m)}
                className={`w-full text-left px-3 py-2.5 border-b border-border hover:bg-muted/40 transition ${
                  selectedId === m.id ? "bg-emerald-50 dark:bg-emerald-500/10" : ""
                } ${!m.is_read ? "bg-blue-50/30 dark:bg-blue-500/5" : ""}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`text-[13px] truncate flex-1 ${!m.is_read ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                    {m.from_name || m.from_email || "(sem remetente)"}
                  </div>
                  <div className="text-[10.5px] text-muted-foreground shrink-0">
                    {new Date(m.received_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </div>
                </div>
                <div className={`text-[12.5px] truncate ${!m.is_read ? "font-semibold text-foreground" : "text-foreground/70"}`}>
                  {m.subject || "(sem assunto)"}
                </div>
                <div className="text-[11.5px] text-muted-foreground truncate mt-0.5">{m.snippet}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Reader */}
        <div className={`${selected ? "flex" : "hidden lg:flex"} flex-col flex-1 min-w-0`}>
          {selected ? (
            <>
              <div className="border-b border-border p-3 flex items-start gap-2">
                <button onClick={() => setSelectedId(null)} className="lg:hidden w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-foreground mb-1 break-words">{selected.subject || "(sem assunto)"}</div>
                  <div className="text-[12px] text-foreground/70">
                    <b>{selected.from_name || selected.from_email}</b>{" "}
                    <span className="text-muted-foreground">&lt;{selected.from_email}&gt;</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    para {(selected.to_emails || []).map(t => t.email).join(", ") || account.email_address} ·{" "}
                    {new Date(selected.received_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <IconBtn title={selected.is_read ? "Marcar como não lida" : "Marcar como lida"}
                    onClick={() => handleToggleRead(selected)}>
                    {selected.is_read ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                  </IconBtn>
                  <IconBtn title="Mover para lixeira" onClick={() => handleTrash(selected)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </IconBtn>
                  <IconBtn title="Responder" onClick={() => setComposeOpen(true)}>
                    <Reply className="w-4 h-4 text-emerald-600" />
                  </IconBtn>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {selected.body_html ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selected.body_html) }} />
                ) : (
                  <pre className="whitespace-pre-wrap text-[13.5px] text-foreground/90 font-sans">
                    {selected.body_text || selected.snippet}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-[13px]">
              Selecione uma mensagem para ler
            </div>
          )}
        </div>
      </div>

      {composeOpen && (
        <ComposeDialog
          accountId={account.id}
          defaultTo={selected ? selected.from_email : ""}
          defaultSubject={selected ? (selected.subject?.startsWith("Re:") ? selected.subject : `Re: ${selected.subject || ""}`) : ""}
          threadId={selected?.thread_id || null}
          onClose={() => setComposeOpen(false)}
          onSent={() => { setComposeOpen(false); handleSync(); }}
        />
      )}
    </div>
  );
}

function IconBtn({ children, onClick, title }: { children: any; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title}
      className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition">
      {children}
    </button>
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
    if (!to.trim() || !subject.trim()) {
      toast.error("Preencha destinatário e assunto");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("email-gmail-send", {
        body: { accountId, to, cc, subject, text: body, html: body.replace(/\n/g, "<br>"), threadId },
      });
      if (error) throw error;
      toast.success("E-mail enviado!");
      onSent();
    } catch (err: any) {
      toast.error("Erro ao enviar", { description: err?.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="text-[14px] font-semibold">Nova mensagem</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
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
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] font-medium text-foreground/70 hover:bg-muted">
            Cancelar
          </button>
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
