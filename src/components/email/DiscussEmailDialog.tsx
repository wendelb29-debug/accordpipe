import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, MessageSquare, MessagesSquare, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface EmailLike {
  id: string;
  account_id?: string;
  from_email: string;
  from_name?: string | null;
  subject: string;
  body_text?: string | null;
  body_html?: string | null;
  snippet?: string;
  received_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  message: EmailLike | null;
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}

function normalizePhone(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

export function DiscussEmailDialog({ open, onOpenChange, message }: Props) {
  const { user, profile } = useAuth();
  const companyId = useActiveCompanyId();
  const navigate = useNavigate();

  const [channel, setChannel] = useState<"collab" | "whatsapp">("collab");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailBody = useMemo(() => {
    if (!message) return "";
    if (message.body_text && message.body_text.trim()) return message.body_text.trim();
    if (message.body_html) return stripHtml(message.body_html);
    return message.snippet || "";
  }, [message]);

  const emailLink = useMemo(() => {
    if (!message) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const accId = message.account_id || "inbox";
    return `${origin}/email/${accId}?msg=${message.id}`;
  }, [message]);

  const preview = useMemo(() => {
    if (!message) return "";
    const head = `📧 ${message.subject || "(sem assunto)"}\nDe: ${message.from_name ? `${message.from_name} <${message.from_email}>` : message.from_email}\nRecebido: ${new Date(message.received_at).toLocaleString("pt-BR")}`;
    const bodyTrim = emailBody.length > 600 ? emailBody.slice(0, 600) + "…" : emailBody;
    const extra = note.trim() ? `\n\n💬 ${note.trim()}` : "";
    return `${head}\n\n${bodyTrim}\n\n🔗 Abrir e-mail: ${emailLink}${extra}`;
  }, [message, emailBody, emailLink, note]);

  useEffect(() => {
    if (open) {
      setChannel("collab");
      setSearch("");
      setSelectedUserId("");
      setNote("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || !companyId) return;
    let cancelled = false;
    (async () => {
      setLoadingUsers(true);
      let q = supabase
        .from("profiles")
        .select("user_id, name, email, whatsapp, avatar_url")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(100);
      const term = search.trim();
      if (term) q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
      const { data } = await q;
      if (!cancelled) {
        const list = (data || []).filter((p: any) => p.user_id !== user?.id);
        setUsers(list);
        setLoadingUsers(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, companyId, search, user?.id]);

  const selectedUser = users.find(u => u.user_id === selectedUserId);

  const sendCollab = async () => {
    if (!user || !companyId || !selectedUserId || !message) return;
    // Find existing direct conv
    const { data: directConvs } = await supabase
      .from("collab_conversations")
      .select("id")
      .eq("servidor_id", companyId)
      .eq("kind", "direct");
    const ids = (directConvs || []).map((c: any) => c.id);
    let convId: string | null = null;
    if (ids.length) {
      const { data: mems } = await supabase
        .from("collab_members")
        .select("conversation_id, user_id")
        .in("conversation_id", ids);
      const byConv = new Map<string, Set<string>>();
      (mems || []).forEach((m: any) => {
        if (!byConv.has(m.conversation_id)) byConv.set(m.conversation_id, new Set());
        byConv.get(m.conversation_id)!.add(m.user_id);
      });
      for (const [cid, s] of byConv) {
        if (s.size === 2 && s.has(user.id) && s.has(selectedUserId)) { convId = cid; break; }
      }
    }
    if (!convId) {
      const { data: conv, error } = await supabase
        .from("collab_conversations")
        .insert({
          servidor_id: companyId,
          kind: "direct",
          name: selectedUser?.name || "Conversa direta",
          color: "#10b981",
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error || !conv) throw error || new Error("Falha ao criar conversa");
      convId = conv.id;
      const { error: mErr } = await supabase.from("collab_members").insert([
        { conversation_id: convId, user_id: user.id, role: "owner" },
        { conversation_id: convId, user_id: selectedUserId, role: "member" },
      ]);
      if (mErr) throw mErr;
    }
    const { error: msgErr } = await supabase.from("collab_messages").insert({
      conversation_id: convId,
      servidor_id: companyId,
      sender_id: user.id,
      content: preview,
      attachments: [],
    });
    if (msgErr) throw msgErr;
    toast.success("E-mail compartilhado no Collab", { description: selectedUser?.name });
    onOpenChange(false);
    setTimeout(() => navigate(`/collabs?conversation=${convId}`), 200);
  };

  const sendWhatsApp = async () => {
    if (!companyId || !selectedUser) return;
    const phone = normalizePhone(selectedUser.whatsapp || "");
    if (phone.length < 10) {
      toast.error("Usuário sem WhatsApp cadastrado no perfil");
      return;
    }

    // Resolve / register contact in tenant whatsapp_contacts
    let contactId: string | null = null;
    const { data: existing } = await supabase
      .from("whatsapp_contacts")
      .select("id")
      .eq("company_id", companyId)
      .eq("phone", phone)
      .maybeSingle();
    if (existing?.id) {
      contactId = existing.id;
    } else {
      const { data: created } = await supabase
        .from("whatsapp_contacts")
        .insert({
          company_id: companyId,
          phone,
          name: selectedUser.name || phone,
          last_message: preview.slice(0, 200),
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      contactId = created?.id ?? null;
    }

    let messageId: string | null = null;
    if (contactId) {
      const { data: msg } = await supabase
        .from("whatsapp_messages")
        .insert({
          company_id: companyId,
          contact_id: contactId,
          phone,
          message: preview,
          direction: "outbound",
          status: "pending",
          message_type: "text",
          metadata: {
            source: "email_discussion",
            email_message_id: message?.id,
            email_subject: message?.subject,
          },
        })
        .select("id")
        .single();
      messageId = msg?.id ?? null;
      await supabase
        .from("whatsapp_contacts")
        .update({
          last_message: preview.slice(0, 200),
          last_message_at: new Date().toISOString(),
        })
        .eq("id", contactId)
        .eq("company_id", companyId);
    }

    const { data, error } = await supabase.functions.invoke("whatsapp-send", {
      body: { tenant_id: companyId, phone, text: preview, message_id: messageId },
    });
    if (error) throw new Error(error.message || "Falha no envio");
    if (data && data.success === false) throw new Error(data.message || "Falha no envio");
    toast.success("E-mail enviado por WhatsApp", { description: selectedUser.name });
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast.error("Selecione um usuário");
      return;
    }
    setSubmitting(true);
    try {
      if (channel === "collab") await sendCollab();
      else await sendWhatsApp();
    } catch (e: any) {
      toast.error("Erro ao enviar: " + (e.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-blue-500" />
            Discutir e-mail com a equipe
          </DialogTitle>
        </DialogHeader>

        {message && (
          <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
            <div className="font-medium text-foreground truncate">{message.subject || "(sem assunto)"}</div>
            <div className="text-muted-foreground truncate">De: {message.from_name || message.from_email}</div>
          </div>
        )}

        <Tabs value={channel} onValueChange={(v) => setChannel(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="collab"><MessagesSquare className="h-4 w-4 mr-1.5" />Collab</TabsTrigger>
            <TabsTrigger value="whatsapp"><MessageSquare className="h-4 w-4 mr-1.5 text-emerald-500" />WhatsApp (Accord Sales)</TabsTrigger>
          </TabsList>

          <TabsContent value={channel} className="space-y-3 pt-3">
            <div>
              <Label className="text-xs mb-1 block">Usuário do tenant</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou e-mail"
                  className="pl-8"
                />
              </div>
              <div className="border border-border rounded-md divide-y divide-border max-h-[220px] overflow-y-auto mt-2">
                {loadingUsers && (
                  <div className="p-3 flex items-center justify-center text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…
                  </div>
                )}
                {!loadingUsers && users.length === 0 && (
                  <div className="p-3 text-center text-xs text-muted-foreground">Nenhum usuário encontrado</div>
                )}
                {!loadingUsers && users.map((u) => {
                  const hasWa = !!normalizePhone(u.whatsapp || "");
                  const disabled = channel === "whatsapp" && !hasWa;
                  return (
                    <button
                      key={u.user_id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedUserId(u.user_id)}
                      className={`w-full text-left p-2.5 text-sm transition flex items-center gap-2.5 ${
                        selectedUserId === u.user_id ? "bg-blue-500/10" : "hover:bg-muted/40"
                      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground overflow-hidden shrink-0">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (u.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{u.name || u.email}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {channel === "whatsapp"
                            ? (hasWa ? u.whatsapp : "Sem WhatsApp cadastrado")
                            : u.email}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs">Comentário (opcional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Adicione um contexto para a equipe…"
              />
            </div>

            <div>
              <Label className="text-xs">Prévia da mensagem</Label>
              <pre className="text-[11.5px] whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2.5 max-h-[160px] overflow-y-auto font-sans text-foreground/80">
                {preview}
              </pre>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !selectedUserId}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
