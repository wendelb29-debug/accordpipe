import { useState } from "react";
import {
  MoreVertical, Reply, Forward, Trash2, MailOpen, Mail,
  Star, StarOff, Printer, Download, Code, Copy, Check,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailMessage {
  id: string;
  account_id: string;
  subject: string;
  from_email: string;
  from_name?: string | null;
  body_html?: string | null;
  body_text?: string | null;
  received_at: string;
  is_read: boolean;
  is_starred?: boolean;
  is_important?: boolean;
  to_emails?: any;
  raw_headers?: any;
}

interface Props {
  message: EmailMessage;
  onReply?: () => void;
  onForward?: () => void;
  onDelete?: () => void;
  onUpdated?: () => void;
}

export function EmailMessageActionsMenu({ message, onReply, onForward, onDelete, onUpdated }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [rawOpen, setRawOpen] = useState(false);

  const toggleStar = async () => {
    setLoading("star");
    const { error } = await supabase
      .from("email_messages")
      .update({ is_starred: !message.is_starred } as any)
      .eq("id", message.id);
    setLoading(null);
    if (error) return toast.error("Erro ao favoritar", { description: error.message });
    toast.success(message.is_starred ? "Removido dos favoritos" : "Adicionado aos favoritos");
    onUpdated?.();
  };

  const toggleRead = async () => {
    setLoading("read");
    const { error } = await supabase
      .from("email_messages")
      .update({ is_read: !message.is_read })
      .eq("id", message.id);
    setLoading(null);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success(message.is_read ? "Marcado como não lida" : "Marcado como lida");
    onUpdated?.();
  };

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return toast.error("Permita popups pra imprimir");
    w.document.write(`
      <!DOCTYPE html><html><head>
        <title>${escapeHtml(message.subject || "Mensagem")}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; line-height: 1.5; color: #1f2937; }
          .meta { border-bottom: 2px solid #e5e7eb; padding-bottom: 14px; margin-bottom: 20px; }
          .meta h1 { font-size: 20px; margin: 0 0 8px; }
          .meta .from { color: #6b7280; font-size: 13px; }
          .body { font-size: 14px; }
        </style>
      </head><body>
        <div class="meta">
          <h1>${escapeHtml(message.subject || "(sem assunto)")}</h1>
          <div class="from"><strong>De:</strong> ${escapeHtml(message.from_name || "")} &lt;${escapeHtml(message.from_email)}&gt;</div>
          <div class="from"><strong>Data:</strong> ${new Date(message.received_at).toLocaleString("pt-BR")}</div>
        </div>
        <div class="body">${message.body_html || `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message.body_text || "")}</pre>`}</div>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => { w.print(); }, 250);
  };

  const handleDownloadEml = () => {
    const eml = buildEml(message);
    const blob = new Blob([eml], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(message.subject || "mensagem")}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Mensagem baixada");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
            title="Mais ações"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-2xl">
          {onReply && (
            <DropdownMenuItem onClick={onReply} className="gap-2 text-[12.5px]">
              <Reply className="w-3.5 h-3.5" /> Responder
            </DropdownMenuItem>
          )}
          {onForward && (
            <DropdownMenuItem onClick={onForward} className="gap-2 text-[12.5px]">
              <Forward className="w-3.5 h-3.5" /> Encaminhar
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={toggleStar} className="gap-2 text-[12.5px]" disabled={loading === "star"}>
            {message.is_starred ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
            {message.is_starred ? "Remover estrela" : "Marcar com estrela"}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={toggleRead} className="gap-2 text-[12.5px]" disabled={loading === "read"}>
            {message.is_read ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
            Marcar como {message.is_read ? "não lida" : "lida"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handlePrint} className="gap-2 text-[12.5px]">
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleDownloadEml} className="gap-2 text-[12.5px]">
            <Download className="w-3.5 h-3.5" /> Baixar mensagem (.eml)
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setRawOpen(true)} className="gap-2 text-[12.5px]">
            <Code className="w-3.5 h-3.5" /> Mostrar original
          </DropdownMenuItem>

          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (confirm("Excluir esta mensagem?")) onDelete();
                }}
                className="gap-2 text-[12.5px] text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <RawHeadersDialog open={rawOpen} message={message} onOpenChange={setRawOpen} />
    </>
  );
}

function RawHeadersDialog({ open, message, onOpenChange }: { open: boolean; message: EmailMessage; onOpenChange: (v: boolean) => void }) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const toList = Array.isArray(message.to_emails)
    ? message.to_emails.map((t: any) => (typeof t === "string" ? t : t?.email)).filter(Boolean).join(", ")
    : "";

  const headers = message.raw_headers
    ? JSON.stringify(message.raw_headers, null, 2)
    : `From: ${message.from_name || ""} <${message.from_email}>
To: ${toList}
Subject: ${message.subject || ""}
Date: ${new Date(message.received_at).toISOString()}
Message-Id: <${message.id}@accord>
Content-Type: text/html; charset=utf-8

(Cabeçalhos completos não foram capturados — apenas resumo)`;

  const fullText = headers + "\n\n" + (message.body_text || stripHtml(message.body_html || ""));

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
    >
      <div className="bg-card rounded-2xl border border-border max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Code className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <h3 className="text-[14px] font-bold">Mensagem original</h3>
            <p className="text-[11px] text-muted-foreground">Cabeçalhos e conteúdo cru da mensagem</p>
          </div>
          <button
            onClick={handleCopy}
            className="h-9 px-3.5 rounded-lg bg-muted hover:bg-muted/80 text-[12px] font-semibold inline-flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado!" : "Copiar tudo"}
          </button>
          <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg hover:bg-muted">×</button>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-[11px] font-mono text-foreground/85 whitespace-pre-wrap bg-muted/20">
          {fullText}
        </pre>
      </div>
    </div>
  );
}

function buildEml(m: EmailMessage): string {
  const date = new Date(m.received_at).toUTCString();
  const from = m.from_name ? `"${m.from_name}" <${m.from_email}>` : m.from_email;
  return [
    `From: ${from}`,
    `Subject: ${m.subject || ""}`,
    `Date: ${date}`,
    `Message-Id: <${m.id}@accord>`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    m.body_html || m.body_text || "",
  ].join("\r\n");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9._\- ]/g, "_").slice(0, 80) || "mensagem";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
