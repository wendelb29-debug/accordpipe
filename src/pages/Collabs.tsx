import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Hash,
  Lock,
  Plus,
  Paperclip,
  Image as ImageIcon,
  Smile,
  AtSign,
  Send,
  Bell,
  MoreVertical,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  Pin,
  Megaphone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

/* ─────────────────────────  MOCK DATA (tenant-scoped UI)  ───────────────────────── */

type Presence = "online" | "ausente" | "ocupado" | "offline";

interface MemberMock {
  id: string;
  name: string;
  role: string;
  presence: Presence;
  group: string;
}

interface ChannelMock {
  id: string;
  name: string;
  icon: "hash" | "lock";
  emoji?: string;
  lastSnippet: string;
  lastAuthor: string;
  time: string;
  unread?: number;
  description?: string;
}

interface MessageMock {
  id: string;
  authorId: string;
  authorName: string;
  time: string;
  text?: string;
  quote?: { author: string; text: string };
  reactions?: { emoji: string; count: number }[];
  attachment?: {
    kind: "pdf" | "sheet";
    name: string;
    size: string;
  };
  system?: boolean;
  pinned?: boolean;
}

const channels: ChannelMock[] = [
  { id: "geral", name: "Geral", icon: "hash", lastSnippet: "Bom dia, equipe!", lastAuthor: "Wendel", time: "10:23", unread: 3, description: "Comunicação geral da equipe" },
  { id: "projetos", name: "Projetos", icon: "hash", emoji: "🚀", lastSnippet: "Update pronto.", lastAuthor: "Juliana", time: "09:58", unread: 2 },
  { id: "vendas", name: "Vendas", icon: "hash", emoji: "📈", lastSnippet: "Comissão atualizada", lastAuthor: "Rodrigo", time: "09:45", unread: 1 },
  { id: "suporte", name: "Suporte", icon: "hash", emoji: "🎧", lastSnippet: "Cliente respondeu", lastAuthor: "Patrícia", time: "09:12" },
  { id: "marketing", name: "Marketing", icon: "hash", emoji: "🎯", lastSnippet: "Campanha aprovada", lastAuthor: "Beatriz", time: "Ontem" },
  { id: "produto", name: "Produto", icon: "hash", emoji: "🧩", lastSnippet: "Wireframe v2", lastAuthor: "Mariana", time: "Ontem" },
  { id: "administracao", name: "Administração", icon: "hash", lastSnippet: "Permissão atualizada", lastAuthor: "Thiago", time: "Seg" },
  { id: "rh", name: "Recursos Humanos", icon: "hash", lastSnippet: "Nova política", lastAuthor: "Camila", time: "Seg" },
  { id: "privado-wendel", name: "Privado - Wendel", icon: "lock", lastSnippet: "Ok!", lastAuthor: "Você", time: "Seg" },
];

const members: MemberMock[] = [
  { id: "u1", name: "Juliana Martins", role: "Designer", presence: "online", group: "Marketing" },
  { id: "u2", name: "Beatriz Lima", role: "Coordenadora", presence: "online", group: "Marketing" },
  { id: "u3", name: "Lucas Andrade", role: "Analista", presence: "ausente", group: "Marketing" },
  { id: "u4", name: "Camila Rocha", role: "Designer", presence: "online", group: "Marketing" },

  { id: "u5", name: "Rodrigo Costa", role: "Closer", presence: "online", group: "Vendas" },
  { id: "u6", name: "Fernando Souza", role: "SDR", presence: "online", group: "Vendas" },
  { id: "u7", name: "Gabriel Ferreira", role: "Closer", presence: "ocupado", group: "Vendas" },
  { id: "u8", name: "Thais Oliveira", role: "SDR", presence: "ausente", group: "Vendas" },

  { id: "u9", name: "Patrícia Gomes", role: "Suporte", presence: "online", group: "Suporte" },
  { id: "u10", name: "Rafael Mendes", role: "Suporte", presence: "ausente", group: "Suporte" },
  { id: "u11", name: "Thiago Santos", role: "Suporte", presence: "ocupado", group: "Suporte" },

  { id: "u12", name: "Mariana Lopes", role: "PM", presence: "online", group: "Produto" },
  { id: "u13", name: "Adriana Silva", role: "Dev", presence: "online", group: "Produto" },
  { id: "u14", name: "Bruno Azevedo", role: "Dev", presence: "offline", group: "Produto" },

  { id: "ad1", name: "Wendel Silvério", role: "Administrador", presence: "online", group: "Admins" },
  { id: "ad2", name: "Diego Carvalho", role: "Admin", presence: "online", group: "Admins" },
  { id: "ad3", name: "Gabriela Nunes", role: "Admin", presence: "online", group: "Admins" },
];

const initialMessages: MessageMock[] = [
  {
    id: "m1",
    authorId: "me",
    authorName: "Wendel Silvério",
    time: "10:23",
    text: "Bom dia, equipe! 👋\nVamos alinhar as prioridades de hoje.",
    reactions: [
      { emoji: "👍", count: 7 },
      { emoji: "🎉", count: 3 },
      { emoji: "🔥", count: 2 },
      { emoji: "❤️", count: 1 },
    ],
    pinned: true,
  },
  {
    id: "m2",
    authorId: "u1",
    authorName: "Juliana Martins",
    time: "10:25",
    quote: { author: "Wendel Silvério", text: "Vamos alinhar as prioridades de hoje." },
    text: "Perfeito! Já preparei o update do projeto.",
    attachment: { kind: "pdf", name: "Update_Projeto_Q2.pdf", size: "2.4 MB" },
    reactions: [
      { emoji: "👍", count: 4 },
      { emoji: "✅", count: 2 },
    ],
  },
  {
    id: "m3",
    authorId: "u5",
    authorName: "Rodrigo Costa",
    time: "10:27",
    text: "Consegui ajustar os pontos levantados ontem.\nSegue o documento com as alterações.",
    attachment: { kind: "sheet", name: "Alteracoes_Escopo.xlsx", size: "1.1 MB" },
    reactions: [{ emoji: "👍", count: 3 }],
  },
  {
    id: "m4",
    authorId: "system",
    authorName: "Sistema",
    time: "10:30",
    system: true,
    text: "Lembrete: Reunião de alinhamento às 15:00 hoje na sala Sala 3 - Accord.",
  },
  {
    id: "m5",
    authorId: "u2",
    authorName: "Beatriz Lima",
    time: "10:32",
    text: "Obrigada, @rodrigo! Ficou excelente.",
    reactions: [{ emoji: "❤️", count: 2 }],
  },
];

/* ─────────────────────────  HELPERS  ───────────────────────── */

const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const avatarPalette = [
  "bg-violet-500", "bg-fuchsia-500", "bg-pink-500", "bg-rose-500",
  "bg-amber-500", "bg-emerald-500", "bg-teal-500", "bg-sky-500",
  "bg-indigo-500", "bg-purple-500",
];
const avatarColor = (id: string) => avatarPalette[Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarPalette.length];

const presenceDot: Record<Presence, string> = {
  online: "bg-emerald-500",
  ausente: "bg-amber-500",
  ocupado: "bg-rose-500",
  offline: "bg-muted-foreground/40",
};

const presenceLabel: Record<Presence, string> = {
  online: "Online",
  ausente: "Ausente",
  ocupado: "Ocupado",
  offline: "Offline",
};

/* ─────────────────────────  COMPONENT  ───────────────────────── */

export default function Collabs() {
  const { profile } = useAuth();
  const me = profile?.name || "Você";

  const [activeChannelId, setActiveChannelId] = useState("geral");
  const [filter, setFilter] = useState<"todas" | "nao-lidas" | "mentions">("todas");
  const [messages, setMessages] = useState<MessageMock[]>(initialMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeChannel = channels.find((c) => c.id === activeChannelId)!;
  const onlineMembers = members.filter((m) => m.presence !== "offline");

  const grouped = useMemo(() => {
    const map = new Map<string, MemberMock[]>();
    for (const m of members) {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group)!.push(m);
    }
    return Array.from(map.entries());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [input]);

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `n-${Date.now()}`,
        authorId: "me",
        authorName: me,
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        text: input.trim(),
      },
    ]);
    setInput("");
    setTyping(false);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-gradient-to-br from-background via-background to-sidebar-primary/[0.04]">
      {/* ───── Column 1 — Channels ───── */}
      <aside className="w-[300px] shrink-0 flex flex-col border-r border-border/60 bg-card/40 backdrop-blur-sm">
        {/* Search */}
        <div className="p-3 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar conversas..."
              className="w-full h-10 rounded-xl bg-background/70 border border-border/60 pl-9 pr-10 text-sm outline-none focus:border-sidebar-primary/50 focus:ring-2 focus:ring-sidebar-primary/15 transition"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-sidebar-primary/10 text-sidebar-primary flex items-center justify-center hover:bg-sidebar-primary/20 transition">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-3 pt-3 pb-2 flex items-center gap-2">
          {[
            { id: "todas", label: "Todas" },
            { id: "nao-lidas", label: "Não lidas", badge: 6 },
            { id: "mentions", label: "Mentions" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={cn(
                "h-7 px-3 rounded-full text-[12px] font-medium transition inline-flex items-center gap-1.5",
                filter === f.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/30"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              {f.label}
              {f.badge ? (
                <span className={cn(
                  "h-4 min-w-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  filter === f.id ? "bg-white/25 text-white" : "bg-sidebar-primary/15 text-sidebar-primary"
                )}>
                  {f.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {channels.map((ch) => {
            const active = ch.id === activeChannelId;
            const Icon = ch.icon === "lock" ? Lock : Hash;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannelId(ch.id)}
                className={cn(
                  "w-full text-left px-2.5 py-2.5 rounded-xl flex items-center gap-3 transition group",
                  active
                    ? "bg-sidebar-primary/10 ring-1 ring-sidebar-primary/25 shadow-sm"
                    : "hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/30"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-semibold text-foreground truncate">
                      {ch.name} {ch.emoji && <span className="ml-0.5">{ch.emoji}</span>}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{ch.time}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[12px] text-muted-foreground truncate">
                      <span className="font-medium text-foreground/70">{ch.lastAuthor}:</span> {ch.lastSnippet}
                    </span>
                    {ch.unread ? (
                      <span className="h-[18px] min-w-[18px] px-1.5 rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                        {ch.unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* New conversation */}
        <div className="p-3 border-t border-border/60">
          <button className="w-full h-10 rounded-xl border border-dashed border-sidebar-primary/40 text-sidebar-primary text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-sidebar-primary/5 transition">
            <Plus className="h-4 w-4" /> Nova conversa
          </button>
        </div>
      </aside>

      {/* ───── Column 2 — Chat ───── */}
      <main className="flex-1 min-w-0 flex flex-col bg-gradient-to-b from-background to-muted/20">
        {/* Header */}
        <header className="h-14 px-5 flex items-center justify-between border-b border-border/60 bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center shadow-md shadow-sidebar-primary/30">
              <Hash className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[15px] font-semibold text-foreground truncate">
                {activeChannel.name} <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-[11.5px] text-muted-foreground truncate">
                {activeChannel.description || "Canal interno da equipe"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button className="h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition flex items-center justify-center">
              <Search className="h-4 w-4" />
            </button>
            <button className="h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition flex items-center justify-center">
              <Pin className="h-4 w-4" />
            </button>
            <button className="h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition flex items-center justify-center relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-sidebar-primary ring-2 ring-card" />
            </button>
            <button className="h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition flex items-center justify-center">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Members presence strip */}
        <div className="h-9 px-5 flex items-center justify-end gap-2 border-b border-border/60 bg-card/30">
          <div className="flex -space-x-2">
            {onlineMembers.slice(0, 4).map((m) => (
              <Avatar key={m.id} className="h-6 w-6 ring-2 ring-card">
                <AvatarFallback className={cn("text-[9px] text-white font-semibold", avatarColor(m.id))}>
                  {initials(m.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-[11.5px] text-muted-foreground">
            <span className="font-semibold text-foreground">{members.length}</span> membros
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="max-w-[820px] mx-auto space-y-5">
            {/* Date divider */}
            <div className="flex items-center justify-center">
              <span className="px-3 py-1 rounded-full bg-card border border-border/60 text-[11px] font-medium text-muted-foreground shadow-sm">
                Hoje
              </span>
            </div>

            {messages.map((msg) => (
              <MessageRow key={msg.id} msg={msg} />
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground pl-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-card border border-border/60 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary animate-bounce" style={{ animationDelay: "240ms" }} />
                </span>
                <span>Juliana está digitando...</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="px-5 pb-5 pt-2 bg-gradient-to-t from-background via-background to-transparent">
          <div className="max-w-[820px] mx-auto rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md shadow-[0_8px_30px_-12px_rgba(122,63,242,0.18)] focus-within:border-sidebar-primary/40 focus-within:ring-2 focus-within:ring-sidebar-primary/15 transition">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={`Mensagem #${activeChannel.name}…`}
              className="w-full bg-transparent border-0 outline-none resize-none px-4 pt-3 pb-1 text-[14px] text-foreground placeholder:text-muted-foreground/70"
            />
            <div className="px-3 pb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                {[
                  { icon: Paperclip, label: "Anexar arquivo" },
                  { icon: ImageIcon, label: "Imagem" },
                  { icon: Smile, label: "Emoji" },
                  { icon: AtSign, label: "Mencionar" },
                ].map((b, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <button className="h-8 w-8 rounded-lg text-muted-foreground hover:text-sidebar-primary hover:bg-sidebar-primary/10 transition flex items-center justify-center">
                        <b.icon className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{b.label}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10.5px] text-muted-foreground hidden sm:inline">↵ Enter para enviar</span>
                <Button
                  size="icon"
                  onClick={send}
                  disabled={!input.trim()}
                  className="h-9 w-9 rounded-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/40 disabled:opacity-40 disabled:shadow-none"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ───── Column 3 — Members ───── */}
      <aside className="w-[300px] shrink-0 hidden xl:flex flex-col border-l border-border/60 bg-card/40 backdrop-blur-sm">
        <div className="h-14 px-4 flex items-center justify-between border-b border-border/60">
          <div className="text-[13.5px] font-semibold text-foreground">
            Membros <span className="text-muted-foreground font-normal">({members.length})</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="p-3 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Buscar membros..."
              className="w-full h-9 rounded-xl bg-background/70 border border-border/60 pl-9 pr-3 text-[12.5px] outline-none focus:border-sidebar-primary/50 focus:ring-2 focus:ring-sidebar-primary/15 transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {grouped.map(([group, list]) => {
            const onlineCount = list.filter((m) => m.presence === "online").length;
            return (
              <div key={group} className="mt-4 first:mt-2">
                <div className="flex items-center justify-between px-1 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                    <span className="text-[11.5px] font-semibold text-foreground">
                      {group} <span className="text-muted-foreground font-normal">({list.length})</span>
                    </span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </div>

                <div className="space-y-0.5">
                  {list.slice(0, 4).map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition cursor-pointer">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={cn("text-[10px] text-white font-semibold", avatarColor(m.id))}>
                            {initials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card", presenceDot[m.presence])} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-medium text-foreground truncate leading-tight">{m.name}</p>
                        <p className="text-[10.5px] text-muted-foreground truncate leading-tight">
                          {presenceLabel[m.presence]} · {m.role}
                        </p>
                      </div>
                    </div>
                  ))}
                  {list.length > 4 && (
                    <button className="w-full text-[11px] text-sidebar-primary font-medium px-2 py-1 hover:underline text-left">
                      +{list.length - 4} membros
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

/* ─────────────────────────  MESSAGE ROW  ───────────────────────── */

function MessageRow({ msg }: { msg: MessageMock }) {
  if (msg.system) {
    return (
      <div className="flex items-start gap-3 pl-1">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-sidebar-primary/10 text-sidebar-primary flex items-center justify-center ring-1 ring-sidebar-primary/20">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-semibold text-sidebar-primary">Sistema</span>
            <span className="text-[10.5px] text-muted-foreground">{msg.time}</span>
          </div>
          <div className="inline-block rounded-2xl px-4 py-2.5 bg-sidebar-primary/[0.06] border border-sidebar-primary/15 text-[13.5px] text-foreground/90 shadow-sm">
            <div className="flex items-start gap-2">
              <Megaphone className="h-3.5 w-3.5 text-sidebar-primary mt-0.5 shrink-0" />
              <span>{msg.text}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 group">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className={cn("text-[11px] text-white font-semibold", avatarColor(msg.authorId))}>
          {initials(msg.authorName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[13.5px] font-semibold text-foreground">{msg.authorName}</span>
          <span className="text-[10.5px] text-muted-foreground">{msg.time}</span>
          {msg.pinned && (
            <span className="inline-flex items-center gap-1 text-[10px] text-sidebar-primary bg-sidebar-primary/10 px-1.5 py-0.5 rounded-full">
              <Pin className="h-2.5 w-2.5" /> Fixado
            </span>
          )}
        </div>

        <div className="rounded-2xl bg-card border border-border/60 px-4 py-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.06)] max-w-[640px]">
          {msg.quote && (
            <div className="mb-2 pl-3 border-l-2 border-sidebar-primary/50 text-[12.5px]">
              <div className="text-sidebar-primary font-semibold">{msg.quote.author}</div>
              <div className="text-muted-foreground line-clamp-1">{msg.quote.text}</div>
            </div>
          )}

          {msg.text && (
            <p className="text-[14px] leading-[1.55] text-foreground whitespace-pre-wrap break-words">
              {renderText(msg.text)}
            </p>
          )}

          {msg.attachment && <AttachmentCard att={msg.attachment} />}
        </div>

        {/* Reactions */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {msg.reactions.map((r, i) => (
              <button
                key={i}
                className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-card border border-border/60 hover:border-sidebar-primary/40 hover:bg-sidebar-primary/5 transition text-[11.5px]"
              >
                <span>{r.emoji}</span>
                <span className="font-semibold text-foreground/80">{r.count}</span>
              </button>
            ))}
            <button className="h-6 px-2 rounded-full bg-card border border-dashed border-border text-muted-foreground hover:text-sidebar-primary hover:border-sidebar-primary/40 transition text-[11.5px] inline-flex items-center">
              <Sparkles className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function renderText(text: string) {
  // simple @mention highlighting
  return text.split(/(\s+)/).map((tok, i) => {
    if (tok.startsWith("@")) {
      return (
        <span key={i} className="text-sidebar-primary font-medium bg-sidebar-primary/10 px-1 rounded">
          {tok}
        </span>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}

function AttachmentCard({ att }: { att: NonNullable<MessageMock["attachment"]> }) {
  const isPdf = att.kind === "pdf";
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 max-w-[440px]">
      <div
        className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
          isPdf ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-600"
        )}
      >
        {isPdf ? <FileText className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground truncate">{att.name}</p>
        <p className="text-[11px] text-muted-foreground">{att.size}</p>
      </div>
      <div className="flex items-center gap-0.5">
        <button className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition flex items-center justify-center">
          <Download className="h-4 w-4" />
        </button>
        <button className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition flex items-center justify-center">
          <Eye className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
