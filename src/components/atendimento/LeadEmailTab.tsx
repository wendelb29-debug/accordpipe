import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Mail, Send, Loader2, ChevronDown, Sparkles, Bold, Italic, Underline,
  List, ListOrdered, Link2, Trash2, Paperclip, FileText, AtSign, Wand2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ConnectedAccount {
  id: string;
  provider: string;
  display_name: string | null;
  email_address: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string | null;
  body_html: string | null;
  category: string | null;
}

interface LeadEmailTabProps {
  lead: any;
  addActivity?: (a: any) => any;
}

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Gmail", outlook: "Outlook", office365: "Office 365", exchange: "Exchange",
};

// Lead variables for "Insert field"
const LEAD_FIELDS: Array<{ label: string; key: string }> = [
  { label: "Nome", key: "name" },
  { label: "Primeiro nome", key: "first_name" },
  { label: "E-mail", key: "email" },
  { label: "Telefone", key: "phone" },
  { label: "Empresa", key: "empresa" },
  { label: "CNPJ", key: "cnpj" },
  { label: "Valor", key: "value" },
  { label: "Origem", key: "origem" },
];

function resolveField(lead: any, key: string): string {
  if (!lead) return "";
  if (key === "first_name") return String(lead.name || "").split(" ")[0] || "";
  return String(lead[key] ?? lead[key === "phone" ? "whatsapp" : key] ?? "");
}

export function LeadEmailTab({ lead, addActivity }: LeadEmailTabProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [fromAccountId, setFromAccountId] = useState("");
  const [to, setTo] = useState(lead?.email || "");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sending, setSending] = useState(false);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingAccounts(true);
      // RLS filtra por user_id -> só as próprias contas do usuário logado
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

      const { data: tpls } = await supabase
        .from("email_templates")
        .select("id, name, subject, body_html, category")
        .order("name", { ascending: true });
      setTemplates((tpls || []) as EmailTemplate[]);
    })();
  }, []);

  useEffect(() => {
    if (lead?.email) setTo(lead.email);
  }, [lead?.email]);

  // Set the initial editor html only when account changes / mount, not on every keystroke
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== bodyHtml) {
      editorRef.current.innerHTML = bodyHtml;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyHtml === ""]);

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    setBodyHtml(editorRef.current?.innerHTML || "");
  };

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    setBodyHtml(editorRef.current?.innerHTML || "");
  };

  const applyTemplate = (tpl: EmailTemplate) => {
    let body = tpl.body_html || "";
    let subj = tpl.subject || "";
    // Replace common {{var}} placeholders with lead fields
    LEAD_FIELDS.forEach((f) => {
      const val = resolveField(lead, f.key);
      const re = new RegExp(`\\{\\{\\s*${f.key}\\s*\\}\\}`, "gi");
      body = body.replace(re, val);
      subj = subj.replace(re, val);
    });
    if (subj) setSubject(subj);
    setBodyHtml(body);
    if (editorRef.current) editorRef.current.innerHTML = body;
    toast.success(`Modelo "${tpl.name}" aplicado`);
  };

  const handleAiWrite = async () => {
    setAiLoading(true);
    try {
      const acc = accounts.find((a) => a.id === fromAccountId);
      const { data, error } = await supabase.functions.invoke("lead-email-ai", {
        body: {
          lead,
          instruction: aiInstruction || "Escreva um e-mail apropriado para este contato.",
          currentSubject: subject,
          currentBody: editorRef.current?.innerText || "",
          senderName: acc?.display_name || acc?.email_address,
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      if ((data as any).subject) setSubject((data as any).subject);
      const html = (data as any).body_html || "";
      setBodyHtml(html);
      if (editorRef.current) editorRef.current.innerHTML = html;
      setAiOpen(false);
      setAiInstruction("");
      toast.success("E-mail gerado pela IA");
    } catch (err: any) {
      toast.error("Erro ao gerar e-mail", { description: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSend = async () => {
    if (!fromAccountId) return toast.error("Selecione a conta de envio");
    if (!to.trim()) return toast.error("Informe o destinatário");
    if (!subject.trim()) return toast.error("Informe o assunto");
    const html = editorRef.current?.innerHTML || bodyHtml;
    if (!html.replace(/<[^>]+>/g, "").trim()) return toast.error("Escreva a mensagem");

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-send", {
        body: {
          accountId: fromAccountId,
          to: to.trim(),
          subject: subject.trim(),
          html,
          text: editorRef.current?.innerText || "",
        },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Falha ao enviar");
      }

      await addActivity?.({
        type: "email",
        title: `E-mail enviado: ${subject.trim()}`,
        description: `Para ${to.trim()}`,
      });

      toast.success("E-mail enviado!");
      setSubject("");
      setBodyHtml("");
      if (editorRef.current) editorRef.current.innerHTML = "";
    } catch (err: any) {
      console.error("[lead-email-send]", err);
      toast.error("Erro ao enviar e-mail", { description: err.message });
    } finally {
      setSending(false);
    }
  };

  const handleClear = () => {
    setSubject("");
    setBodyHtml("");
    if (editorRef.current) editorRef.current.innerHTML = "";
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
          Conecte sua conta Gmail ou Outlook na página de E-mail para enviar mensagens daqui.
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
    <div className="p-4 space-y-2 pb-24">
      {/* De - mostra apenas a(s) conta(s) do usuário logado */}
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

      {/* Helpers: modelo | inserir campo | escrever com IA */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Escolher modelo <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-72 overflow-y-auto">
            <DropdownMenuLabel>Modelos de e-mail</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {templates.length === 0 && (
              <div className="px-2 py-3 text-[12px] text-muted-foreground">Nenhum modelo cadastrado.</div>
            )}
            {templates.map((t) => (
              <DropdownMenuItem key={t.id} onClick={() => applyTemplate(t)} className="text-[12.5px]">
                <span className="truncate">{t.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1.5">
              <AtSign className="w-3.5 h-3.5" /> Inserir campo <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Dados do lead</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LEAD_FIELDS.map((f) => {
              const val = resolveField(lead, f.key);
              return (
                <DropdownMenuItem
                  key={f.key}
                  onClick={() => insertHtml(val || `{{${f.key}}}`)}
                  className="text-[12.5px] flex justify-between gap-4"
                >
                  <span>{f.label}</span>
                  <span className="text-muted-foreground truncate max-w-[140px]">{val || "—"}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto">
          <Popover open={aiOpen} onOpenChange={setAiOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                className="h-8 text-[12px] gap-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 dark:bg-violet-500/15 dark:hover:bg-violet-500/25 dark:text-violet-300 border-0"
              >
                <Sparkles className="w-3.5 h-3.5" /> Escrever com IA
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-3 space-y-2">
              <div className="text-[12px] font-semibold flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-violet-600" /> Assistente de e-mail
              </div>
              <Textarea
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                placeholder="Ex.: Apresente-se e proponha uma reunião de 15 min essa semana."
                rows={4}
                className="text-[12.5px]"
              />
              <Button
                onClick={handleAiWrite}
                disabled={aiLoading}
                className="w-full h-9 gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiLoading ? "Gerando..." : "Gerar e-mail"}
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Editor toolbar */}
      <div className="flex items-center gap-0.5 border border-border rounded-t-xl bg-muted/40 px-2 py-1.5 mt-2">
        <ToolBtn onClick={() => exec("bold")} title="Negrito"><Bold className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec("italic")} title="Itálico"><Italic className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec("underline")} title="Sublinhado"><Underline className="w-3.5 h-3.5" /></ToolBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolBtn onClick={() => exec("insertUnorderedList")} title="Lista"><List className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec("insertOrderedList")} title="Lista numerada"><ListOrdered className="w-3.5 h-3.5" /></ToolBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolBtn
          onClick={() => {
            const url = prompt("URL do link:");
            if (url) exec("createLink", url);
          }}
          title="Link"
        >
          <Link2 className="w-3.5 h-3.5" />
        </ToolBtn>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => setBodyHtml(editorRef.current?.innerHTML || "")}
        data-placeholder="Escreva sua mensagem..."
        className="min-h-[200px] px-3 py-3 rounded-b-xl border border-t-0 border-border bg-card text-[13px] outline-none focus:border-violet-400 prose prose-sm max-w-none dark:prose-invert empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
      />

      {/* Footer */}
      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-t border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-muted-foreground">
          <button
            onClick={handleClear}
            title="Descartar"
            className="h-9 w-9 rounded-lg hover:bg-muted inline-flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            disabled
            title="Anexos (em breve)"
            className="h-9 w-9 rounded-lg hover:bg-muted inline-flex items-center justify-center disabled:opacity-50"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <span className="text-[11px] ml-2 truncate">
            Enviando de <strong className="text-foreground">{selectedAccount?.email_address}</strong>
          </span>
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

function ToolBtn({
  children, onClick, title,
}: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-background text-muted-foreground hover:text-foreground"
    >
      {children}
    </button>
  );
}
