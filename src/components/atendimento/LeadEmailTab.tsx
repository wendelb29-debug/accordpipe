import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Send, Loader2, ChevronDown } from "lucide-react";

interface ConnectedAccount {
  id: string;
  provider: string;
  display_name: string | null;
  email_address: string;
}

interface LeadEmailTabProps {
  lead: any;
  addActivity?: (a: any) => Promise<void> | void;
}

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  office365: "Office 365",
  exchange: "Exchange",
};

export function LeadEmailTab({ lead, addActivity }: LeadEmailTabProps) {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [fromAccountId, setFromAccountId] = useState("");
  const [to, setTo] = useState(lead?.email || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingAccounts(true);
      const { data } = await supabase
        .from("email_accounts")
        .select("id, provider, display_name, email_address")
        .eq("status", "connected")
        .in("provider", ["gmail", "outlook", "office365", "exchange"])
        .order("created_at", { ascending: false });
      const list = (data || []) as ConnectedAccount[];
      setAccounts(list);
      if (list.length > 0) setFromAccountId(list[0].id);
      setLoadingAccounts(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (lead?.email) setTo(lead.email);
  }, [lead?.email]);

  const handleSend = async () => {
    if (!fromAccountId) return toast.error("Selecione a conta de envio");
    if (!to.trim()) return toast.error("Informe o destinatário");
    if (!subject.trim()) return toast.error("Informe o assunto");
    if (!body.trim()) return toast.error("Escreva a mensagem");

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-send", {
        body: {
          accountId: fromAccountId,
          to: to.trim(),
          subject: subject.trim(),
          html: body.replace(/\n/g, "<br>"),
          text: body,
        },
      });
      if (error || (data && (data as any).error)) {
        throw new Error((data as any)?.error || error?.message || "Falha ao enviar");
      }

      await addActivity?.({
        type: "email",
        title: `E-mail enviado: ${subject.trim()}`,
        description: `Para ${to.trim()}`,
      });

      toast.success("E-mail enviado!");
      setSubject("");
      setBody("");
    } catch (err: any) {
      console.error("[lead-email-send]", err);
      toast.error("Erro ao enviar e-mail", { description: err.message });
    } finally {
      setSending(false);
    }
  };

  const selectedAccount = accounts.find((a) => a.id === fromAccountId);

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Mail className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="text-[15px] font-bold text-foreground mb-1">Nenhuma conta de e-mail conectada</h3>
        <p className="text-[12.5px] text-muted-foreground mb-4 max-w-sm">
          Conecte uma conta Gmail ou Outlook na página de E-mail para enviar mensagens diretamente daqui.
        </p>
        <a
          href="/email"
          className="h-9 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[13px] font-semibold inline-flex items-center gap-2"
        >
          <Mail className="w-4 h-4" /> Conectar conta de e-mail
        </a>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 pb-20">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <span className="text-[12px] text-muted-foreground w-14 shrink-0">De</span>
        <div className="relative flex-1">
          <select
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            className="w-full h-9 px-3 pr-8 rounded-lg border border-border bg-card text-[13px] outline-none focus:border-violet-400 appearance-none"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.email_address} ({PROVIDER_LABELS[acc.provider] || acc.provider})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border pb-2">
        <span className="text-[12px] text-muted-foreground w-14 shrink-0">Para</span>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          type="email"
          placeholder="email@cliente.com"
          className="flex-1 h-9 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:border-violet-400"
        />
      </div>

      <div className="flex items-center gap-2 border-b border-border pb-2">
        <span className="text-[12px] text-muted-foreground w-14 shrink-0">Assunto</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Assunto do e-mail"
          className="flex-1 h-9 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:border-violet-400"
        />
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={10}
        placeholder="Escreva sua mensagem..."
        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-[13px] outline-none focus:border-violet-400 resize-none"
      />

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-t border-border flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground truncate">
          Enviando de <strong>{selectedAccount?.email_address}</strong>
        </div>
        <button
          onClick={handleSend}
          disabled={sending}
          className="h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[13px] font-bold inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition shadow-md shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}
