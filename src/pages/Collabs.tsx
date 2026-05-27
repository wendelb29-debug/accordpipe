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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  file?: { kind: "pdf" | "xls"; name: string; size: string };
  system?: React.ReactNode;
  status?: "sent" | "delivered" | "read";
}

const messages: MockMessage[] = [
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
];

/* ──────────────────────────  COMPONENT  ────────────────────────── */

export default function Collabs() {
  const [activeId, setActiveId] = useState("geral");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const filtered = conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId]);

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
          className="px-3 py-2.5 border-t border-white/10 shrink-0"
          style={{ background: "hsl(var(--sidebar-primary))" }}

        >
          <div className="flex items-center gap-1.5 bg-white rounded-[24px] pl-3.5 pr-2 py-1.5">
            <div className="flex gap-0.5">
              {[Paperclip, ImageIcon, Smile, AtSign].map((Icon, i) => (
                <button key={i} className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                  <Icon className="h-[17px] w-[17px]" />
                </button>
              ))}
            </div>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) setInput("");
              }}
              placeholder={`Mensagem ${active.name}...`}
              className="flex-1 bg-transparent outline-none text-[13.5px] text-[#1a1a2e] placeholder:text-gray-400"
            />
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
              style={{ background: input.trim() ? "hsl(var(--sidebar-primary))" : "transparent", color: input.trim() ? "#fff" : "#888" }}
            >
              {input.trim() ? <Send className="h-4 w-4" /> : <Mic className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
