import { useEffect, useRef, useState } from "react";
import {
  Search,
  Phone,
  MoreVertical,
  Paperclip,
  Image as ImageIcon,
  Smile,
  AtSign,
  Send,
  Mic,
  Download,
  FileText,
  FileSpreadsheet,
  Pin,
  Monitor,
  HardDrive,
  Loader2,
  File as FileIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";


/* ──────────────────────────  MOCK DATA  ────────────────────────── */

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  color: string;
  time: string;
  preview: string;
  unread?: number;
  pinned?: boolean;
  members?: number;
  online?: number;
}

const conversations: Conversation[] = [
  { id: "geral", name: "# Geral", avatar: "#G", color: "bg-[hsl(var(--sidebar-primary))]", time: "10:23", preview: "Wendel: Bom dia, equipe! 👋", unread: 3, pinned: true, members: 48, online: 12 },
  { id: "projetos", name: "Projetos 🚀", avatar: "🚀", color: "bg-[#D85A30]", time: "09:58", preview: "Juliana: Update pronto.", unread: 2, members: 18, online: 6 },
  { id: "vendas", name: "Vendas 📈", avatar: "📈", color: "bg-[#1D9E75]", time: "09:45", preview: "Rodrigo: Diamante arrasado", unread: 1, members: 12, online: 4 },
  { id: "suporte", name: "Suporte 🎧", avatar: "🎧", color: "bg-[#378ADD]", time: "09:12", preview: "Patrícia: Cliente respondeu", members: 9, online: 3 },
  { id: "marketing", name: "Marketing 📣", avatar: "📣", color: "bg-[#D4537E]", time: "Ontem", preview: "Beatriz: Campanha aprovada", members: 7, online: 2 },
  { id: "produto", name: "Produto 💡", avatar: "💡", color: "bg-[#BA7517]", time: "Ontem", preview: "Mariana: Wireframe v2", members: 6, online: 1 },
  { id: "admin", name: "Administração ⚙️", avatar: "⚙️", color: "bg-[#888780]", time: "Seg", preview: "Thiago: Permissão atualizada", members: 5, online: 1 },
  { id: "privado", name: "Privado - Wendel 🔒", avatar: "🔒", color: "bg-[hsl(var(--sidebar-primary))]", time: "Seg", preview: "Você: Ok! 👊", members: 2, online: 2 },
];

interface MockMessage {
  id: string;
  sender?: { name: string; initials: string; color: string; nameColor?: string };
  sent?: boolean;
  text?: React.ReactNode;
  time: string;
  reactions?: { emoji: string; count: number }[];
  quote?: { name: string; text: string };
  file?: { kind: "pdf" | "xls" | "image" | "file"; name: string; size: string; url?: string };
  system?: React.ReactNode;
  status?: "sent" | "delivered" | "read";
}

const initialMessages: Record<string, MockMessage[]> = {
  geral: [
    {
      id: "1", sent: true, time: "10:23",
      text: <>Bom dia, equipe! 👋<br />Vamos alinhar as prioridades de hoje.</>,
      reactions: [{ emoji: "👍", count: 7 }, { emoji: "🎉", count: 3 }, { emoji: "🔥", count: 2 }],
      status: "read",
    },
    {
      id: "2", time: "10:25",
      sender: { name: "Juliana Martins", initials: "JM", color: "bg-[#D4537E]", nameColor: "hsl(var(--sidebar-primary))" },
      quote: { name: "Wendel Silvério", text: "Vamos alinhar as prioridades de hoje." },
      text: "Perfeito! Já preparei o update do projeto.",
      file: { kind: "pdf", name: "Update_Projeto_Q2.pdf", size: "2.4 MB" },
      reactions: [{ emoji: "👍", count: 4 }, { emoji: "✅", count: 2 }],
    },
    {
      id: "3", time: "10:27",
      sender: { name: "Rodrigo Costa", initials: "RC", color: "bg-[#1D9E75]", nameColor: "#1D9E75" },
      text: <>Consegui ajustar os pontos levantados ontem.<br />Segue o documento com as alterações.</>,
      file: { kind: "xls", name: "Alteracoes_Escopo.xlsx", size: "1.1 MB" },
      reactions: [{ emoji: "👍", count: 3 }, { emoji: "💬", count: 1 }],
    },
    {
      id: "sys1", time: "",
      system: <>🔔 <b className="font-medium">Lembrete:</b> Reunião de alinhamento às 15:00 — Sala 3 - Accord.</>,
    },
    {
      id: "4", time: "10:32",
      sender: { name: "Beatriz Lima", initials: "BL", color: "bg-[#378ADD]", nameColor: "#378ADD" },
      text: <>Obrigada, <span style={{ color: "hsl(var(--sidebar-primary))", fontWeight: 500 }}>@rodrigo</span>! Ficou excelente. ❤️</>,
      reactions: [{ emoji: "❤️", count: 2 }],
    },
  ],
};

const EMOJIS = ["😀","😂","😍","👍","🙏","🎉","🔥","❤️","✅","💡","🚀","👏","😎","🤔","👀","💯","😅","🙌","💪","✨"];
const MENTIONS = ["wendel","juliana","rodrigo","beatriz","mariana","thiago","patricia"];

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
function nowTime() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/* ──────────────────────────  COMPONENT  ────────────────────────── */

export default function Collabs() {
  const [activeId, setActiveId] = useState("geral");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [allMessages, setAllMessages] = useState<Record<string, MockMessage[]>>(initialMessages);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const companyId = useActiveCompanyId();
  const [accordOpen, setAccordOpen] = useState(false);
  const [accordLoading, setAccordLoading] = useState(false);
  type AccordEntry = { id: string; name: string; type: "file" | "folder"; file_url: string | null; file_size: number | null; file_type: string | null };
  const [accordEntries, setAccordEntries] = useState<AccordEntry[]>([]);
  const [accordSearch, setAccordSearch] = useState("");
  const [accordPath, setAccordPath] = useState<Array<{ id: string | null; name: string }>>([{ id: null, name: "Documentos" }]);

  const loadAccordFolder = async (parentId: string | null) => {
    if (!companyId) return;
    setAccordLoading(true);
    let q = supabase
      .from("drive_files")
      .select("id,name,type,file_url,file_size,file_type")
      .eq("servidor_id", companyId)
      .order("type", { ascending: true })
      .order("name", { ascending: true });
    q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
    const { data, error } = await q;
    if (!error) setAccordEntries((data as any) || []);
    setAccordLoading(false);
  };

  const openAccordPicker = async () => {
    setAccordOpen(true);
    setAccordPath([{ id: null, name: "Documentos" }]);
    setAccordSearch("");
    await loadAccordFolder(null);
  };

  const enterFolder = async (f: AccordEntry) => {
    setAccordPath((p) => [...p, { id: f.id, name: f.name }]);
    setAccordSearch("");
    await loadAccordFolder(f.id);
  };

  const goToPathIndex = async (idx: number) => {
    const next = accordPath.slice(0, idx + 1);
    setAccordPath(next);
    setAccordSearch("");
    await loadAccordFolder(next[next.length - 1].id);
  };


  const pickAccordFile = (f: { id: string; name: string; file_url: string | null; file_size: number | null }) => {
    const lower = f.name.toLowerCase();
    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(lower);
    const kind: MockMessage["file"]["kind"] = isImage
      ? "image"
      : lower.endsWith(".pdf") ? "pdf"
      : /\.(xls|xlsx|csv)$/i.test(lower) ? "xls"
      : "file";
    pushMessage({
      id: crypto.randomUUID(),
      sent: true,
      time: nowTime(),
      text: isImage && f.file_url ? <img src={f.file_url} alt={f.name} className="rounded-lg max-w-[260px] max-h-[260px] object-cover" /> : undefined,
      file: isImage ? undefined : { kind, name: f.name, size: f.file_size ? formatBytes(f.file_size) : "—", url: f.file_url ?? undefined },
      status: "sent",
    });
    setAccordOpen(false);
  };


  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const filtered = conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const messages = allMessages[activeId] ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, messages.length]);

  const pushMessage = (msg: MockMessage) => {
    setAllMessages((prev) => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), msg] }));
  };

  const sendText = () => {
    const t = input.trim();
    if (!t) return;
    pushMessage({ id: crypto.randomUUID(), sent: true, time: nowTime(), text: t, status: "sent" });
    setInput("");
    setShowEmoji(false);
    setShowMentions(false);
  };

  const handleFiles = (files: FileList | null, asImage: boolean) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      const isImage = asImage || f.type.startsWith("image/");
      const url = URL.createObjectURL(f);
      const kind: MockMessage["file"]["kind"] = isImage
        ? "image"
        : f.name.toLowerCase().endsWith(".pdf") ? "pdf"
        : /\.(xls|xlsx|csv)$/i.test(f.name) ? "xls"
        : "file";
      pushMessage({
        id: crypto.randomUUID(),
        sent: true,
        time: nowTime(),
        text: isImage ? <img src={url} alt={f.name} className="rounded-lg max-w-[260px] max-h-[260px] object-cover" /> : undefined,
        file: isImage ? undefined : { kind, name: f.name, size: formatBytes(f.size), url },
        status: "sent",
      });
    });
  };

  const insertAtCursor = (text: string) => {
    const el = inputRef.current;
    if (!el) { setInput((v) => v + text); return; }
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    const next = input.slice(0, start) + text + input.slice(end);
    setInput(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background overflow-hidden">
      {/* ──────────  LEFT SIDEBAR  ────────── */}
      <aside className="w-[320px] min-w-[320px] flex flex-col border-r border-border bg-background">
        {/* Search */}
        <div className="h-[60px] flex items-center px-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-2 w-full">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversas..."
              className="flex-1 bg-transparent outline-none text-[13px] text-foreground placeholder:text-muted-foreground"
            />
          </div>

        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.map((c) => {
            const isActive = c.id === activeId;
            return (
              <div
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 mx-1.5 my-0.5 rounded-xl cursor-pointer transition-colors h-[64px]",
                  isActive
                    ? "bg-[hsl(var(--sidebar-primary))] text-white"
                    : "hover:bg-muted"
                )}
              >
                <div className={cn("w-12 h-12 min-w-12 rounded-full flex items-center justify-center text-white text-sm font-medium", c.color)}>
                  {c.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                      {c.pinned && <Pin className={cn("h-3 w-3 shrink-0", isActive ? "text-white/80" : "text-muted-foreground")} />}
                      <span className={cn("text-[13.5px] font-medium truncate", isActive ? "text-white" : "text-foreground")}>
                        {c.name}
                      </span>
                    </div>
                    <span className={cn("text-[11px] shrink-0", isActive ? "text-white/80" : "text-muted-foreground")}>
                      {c.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className={cn("text-xs truncate", isActive ? "text-white/70" : "text-muted-foreground")}>
                      {c.preview}
                    </span>
                    {c.unread && (
                      <span
                        className={cn(
                          "min-w-[18px] h-[18px] rounded-full px-1.5 flex items-center justify-center text-[11px] font-medium shrink-0",
                          isActive ? "bg-white text-[hsl(var(--sidebar-primary))]" : "bg-[hsl(var(--sidebar-primary))] text-white"
                        )}
                      >
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ──────────  CHAT MAIN  ────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-[60px] flex items-center gap-3 px-4 shrink-0 border-b border-white/10" style={{ background: "hsl(var(--sidebar-primary))" }}>
          <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center text-white text-xs font-medium">
            {active.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white leading-tight truncate">{active.name.replace(/^#\s?/, "")}</div>
            <div className="text-[11.5px] text-white/75">
              {active.members ?? 0} membros · {active.online ?? 0} online
            </div>
          </div>
          <div className="flex items-center gap-1">
            {[Search, Phone, MoreVertical].map((Icon, i) => (
              <button key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-white/85 hover:bg-white/15 transition-colors">
                <Icon className="h-[17px] w-[17px]" />
              </button>
            ))}
          </div>
        </header>

        {/* Messages with wallpaper */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3 relative"
          style={{
            backgroundColor: "#8fadc8",
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.18) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        >
          {/* gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, #a8c5da 0%, #7ba3c0 35%, #9eb8d0 60%, #6d98b8 100%)",
              opacity: 0.6,
            }}
          />

          <div className="relative z-10 flex flex-col gap-1">
            {/* Date divider */}
            <div className="text-center my-2">
              <span className="text-[11px] text-white bg-black/30 px-3 py-0.5 rounded-[10px]">Hoje</span>
            </div>

            {messages.map((m) => {
              if (m.system) {
                return (
                  <div key={m.id} className="text-center my-1.5">
                    <span className="text-[11.5px] text-white bg-black/30 px-3.5 py-1 rounded-xl inline-block leading-snug">
                      {m.system}
                    </span>
                  </div>
                );
              }

              const isSent = !!m.sent;
              return (
                <div key={m.id} className={cn("flex gap-2 mb-1.5", isSent && "flex-row-reverse")}>
                  {!isSent && m.sender && (
                    <div className={cn("w-8 h-8 min-w-8 rounded-full flex items-center justify-center text-[11px] font-medium text-white self-end", m.sender.color)}>
                      {m.sender.initials}
                    </div>
                  )}
                  <div className={cn("flex flex-col gap-0.5 max-w-[68%]", isSent && "items-end")}>
                    {!isSent && m.sender && (
                      <div className="text-[11.5px] font-medium pl-0.5" style={{ color: m.sender.nameColor || "hsl(var(--sidebar-primary))" }}>
                        {m.sender.name}
                      </div>
                    )}
                    <div
                      className={cn(
                        "px-3 py-2 rounded-2xl text-[13px] leading-snug shadow-sm break-words",
                        isSent ? "text-white" : "bg-white/95 text-[#1a1a2e]"
                      )}
                      style={isSent ? { background: "hsl(var(--sidebar-primary))" } : undefined}
                    >
                      {m.quote && (
                        <div
                          className="border-l-[3px] pl-2 mb-1.5"
                          style={{ borderColor: isSent ? "rgba(255,255,255,0.6)" : "hsl(var(--sidebar-primary))" }}
                        >
                          <div className="text-[11px] font-medium" style={{ color: isSent ? "rgba(255,255,255,0.9)" : "hsl(var(--sidebar-primary))" }}>
                            {m.quote.name}
                          </div>
                          <div className={cn("text-xs", isSent ? "text-white/70" : "text-muted-foreground")}>
                            {m.quote.text}
                          </div>
                        </div>
                      )}
                      <div>{m.text}</div>
                      <span className={cn("block text-right text-[10px] mt-1", isSent ? "text-white/60" : "text-black/35")}>
                        {m.time}
                        {isSent && m.status === "read" && " ✓✓"}
                      </span>
                    </div>

                    {m.file && (
                      <div className="flex items-center gap-2.5 bg-white/95 rounded-xl px-3 py-2.5 shadow-sm min-w-[240px]">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center",
                            m.file.kind === "pdf" ? "bg-[#FAECE7]" : "bg-[#EAF3DE]"
                          )}
                        >
                          {m.file.kind === "pdf" ? (
                            <FileText className="h-[18px] w-[18px] text-[#D85A30]" />
                          ) : (
                            <FileSpreadsheet className="h-[18px] w-[18px] text-[#3B6D11]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-medium text-[#1a1a2e] truncate">{m.file.name}</div>
                          <div className="text-[11px] text-muted-foreground">{m.file.size}</div>
                        </div>
                        <button className="text-muted-foreground hover:text-foreground">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {m.reactions && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {m.reactions.map((r, i) => (
                          <div
                            key={i}
                            className={cn(
                              "rounded-xl px-2 py-0.5 text-[11.5px] flex items-center gap-1 shadow-sm cursor-pointer",
                              isSent ? "bg-white/20 text-white/90" : "bg-white/85 text-gray-700"
                            )}
                          >
                            <span>{r.emoji}</span>
                            <span>{r.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing */}
            <div className="flex items-center gap-2 pt-1 pb-0.5">
              <div className="w-7 h-7 rounded-full bg-[#D4537E] flex items-center justify-center text-[10px] font-medium text-white">JM</div>
              <div className="bg-white/95 rounded-[14px] px-3.5 py-2 flex gap-1 items-center shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "200ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "400ms" }} />
              </div>
              <span className="text-[11.5px] text-white/90" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                Juliana está digitando...
              </span>
            </div>

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div
          className="px-3 py-2.5 border-t border-white/10 shrink-0 relative"
          style={{ background: "hsl(var(--sidebar-primary))" }}
        >
          {/* Emoji picker */}
          {showEmoji && (
            <div className="absolute bottom-full left-3 mb-2 bg-white rounded-2xl shadow-xl p-2 grid grid-cols-8 gap-1 z-20 border border-black/5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => { insertAtCursor(e); setShowEmoji(false); }}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 text-lg flex items-center justify-center"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          {/* Mentions */}
          {showMentions && (
            <div className="absolute bottom-full left-3 mb-2 bg-white rounded-2xl shadow-xl py-2 z-20 border border-black/5 min-w-[180px]">
              {MENTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => { insertAtCursor(`@${m} `); setShowMentions(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-[13px] text-gray-700"
                >
                  @{m}
                </button>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files, false); e.target.value = ""; }}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files, true); e.target.value = ""; }}
          />

          <div className="flex items-center gap-1.5 bg-white rounded-[24px] pl-3.5 pr-2 py-1.5">
            <div className="flex gap-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    title="Anexar"
                    className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <Paperclip className="h-[17px] w-[17px]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-64">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Monitor className="h-4 w-4 mr-2" />
                    Arquivo neste computador
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openAccordPicker}>
                    <HardDrive className="h-4 w-4 mr-2" />
                    Arquivo no Accord
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={() => imageInputRef.current?.click()}
                title="Enviar imagem"
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ImageIcon className="h-[17px] w-[17px]" />
              </button>
              <button
                onClick={() => { setShowEmoji((v) => !v); setShowMentions(false); }}
                title="Emojis"
                className={cn(
                  "w-[30px] h-[30px] rounded-full flex items-center justify-center transition-colors",
                  showEmoji ? "bg-gray-100 text-gray-700" : "text-gray-500 hover:bg-gray-100"
                )}
              >
                <Smile className="h-[17px] w-[17px]" />
              </button>
              <button
                onClick={() => { setShowMentions((v) => !v); setShowEmoji(false); }}
                title="Mencionar"
                className={cn(
                  "w-[30px] h-[30px] rounded-full flex items-center justify-center transition-colors",
                  showMentions ? "bg-gray-100 text-gray-700" : "text-gray-500 hover:bg-gray-100"
                )}
              >
                <AtSign className="h-[17px] w-[17px]" />
              </button>
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
                if (e.key === "Escape") { setShowEmoji(false); setShowMentions(false); }
              }}
              placeholder={`Mensagem ${active.name}...`}
              className="flex-1 bg-transparent outline-none text-[13.5px] text-[#1a1a2e] placeholder:text-gray-400"
            />
            <button
              onClick={sendText}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
              style={{ background: input.trim() ? "hsl(var(--sidebar-primary))" : "transparent", color: input.trim() ? "#fff" : "#888" }}
            >
              {input.trim() ? <Send className="h-4 w-4" /> : <Mic className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>

      </main>

      {/* Accord file picker */}
      <Dialog open={accordOpen} onOpenChange={setAccordOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Arquivos no Accord</DialogTitle>
          </DialogHeader>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
            {accordPath.map((p, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                <button
                  onClick={() => goToPathIndex(i)}
                  className={cn(
                    "px-1.5 py-0.5 rounded hover:bg-muted",
                    i === accordPath.length - 1 && "text-foreground font-medium"
                  )}
                >
                  {p.name}
                </button>
              </span>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={accordSearch}
              onChange={(e) => setAccordSearch(e.target.value)}
              placeholder="Buscar nesta pasta..."
              className="w-full bg-muted rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="max-h-[360px] overflow-y-auto -mx-2">
            {accordLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : accordEntries.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                Pasta vazia.
              </div>
            ) : (
              accordEntries
                .filter((f) => f.name.toLowerCase().includes(accordSearch.toLowerCase()))
                .map((f) => {
                  const isFolder = f.type === "folder";
                  return (
                    <button
                      key={f.id}
                      onClick={() => (isFolder ? enterFolder(f) : pickAccordFile(f))}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg text-left"
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        isFolder ? "bg-primary/10" : "bg-muted"
                      )}>
                        {isFolder ? (
                          <HardDrive className="h-4 w-4 text-primary" />
                        ) : (
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{f.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {isFolder ? "Pasta" : f.file_size ? formatBytes(f.file_size) : "—"}
                        </div>
                      </div>
                    </button>
                  );
                })
            )}
          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
}
