import { useMemo, useState } from "react";
import { ArrowLeft, Search, Star, Link as LinkIcon, ExternalLink, MessageSquare } from "lucide-react";
import { HexAvatar } from "./HexAvatar";

interface Msg {
  id: string;
  sender_id: string | null;
  content: string | null;
  created_at: string;
  attachments?: any[];
}

interface CollabMessagesPanelProps {
  mode: "favorites" | "links";
  collab: {
    id: string;
    name: string;
    color?: string | null;
    avatar_url?: string | null;
  };
  messages: Msg[];
  tenantUsers: Array<{ id: string; name: string; avatar_url?: string | null }>;
  favoriteIds: Set<string>;
  onToggleFavorite: (messageId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  onBack: () => void;
}

const URL_RE = /(https?:\/\/[^\s<>"')]+)/gi;

function extractLinks(text: string | null): string[] {
  if (!text) return [];
  const out = new Set<string>();
  const matches = text.match(URL_RE);
  if (matches) matches.forEach((m) => out.add(m.replace(/[.,;:!?)]+$/, "")));
  return Array.from(out);
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function tryHostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function CollabMessagesPanel({
  mode,
  collab,
  messages,
  tenantUsers,
  favoriteIds,
  onToggleFavorite,
  onJumpToMessage,
  onBack,
}: CollabMessagesPanelProps) {
  const [search, setSearch] = useState("");

  const data = useMemo(() => {
    const userById = new Map(tenantUsers.map((u) => [u.id, u]));
    if (mode === "favorites") {
      const items = messages
        .filter((m) => favoriteIds.has(m.id))
        .map((m) => ({ msg: m, sender: m.sender_id ? userById.get(m.sender_id) : null }))
        .sort((a, b) => (a.msg.created_at < b.msg.created_at ? 1 : -1));
      const q = search.trim().toLowerCase();
      return q
        ? items.filter((x) => (x.msg.content || "").toLowerCase().includes(q) || (x.sender?.name || "").toLowerCase().includes(q))
        : items;
    }
    // links
    const flat: Array<{ url: string; msg: Msg; sender?: { id: string; name: string; avatar_url?: string | null } | null }> = [];
    for (const m of messages) {
      for (const u of extractLinks(m.content)) {
        flat.push({ url: u, msg: m, sender: m.sender_id ? userById.get(m.sender_id) : null });
      }
    }
    flat.sort((a, b) => (a.msg.created_at < b.msg.created_at ? 1 : -1));
    const q = search.trim().toLowerCase();
    return q ? flat.filter((x) => x.url.toLowerCase().includes(q)) : flat;
  }, [messages, favoriteIds, mode, search, tenantUsers]);

  const title = mode === "favorites" ? "Mensagens favoritas" : "Todos os links";
  const Icon = mode === "favorites" ? Star : LinkIcon;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background:
          "radial-gradient(900px 500px at 85% 8%, rgba(16,185,129,0.06), transparent 60%), " +
          "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 shrink-0 bg-white/70 backdrop-blur-md">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
          title="Voltar à conversa"
        >
          <ArrowLeft className="w-[18px] h-[18px]" />
        </button>
        <HexAvatar
          size={36}
          background={
            collab.color
              ? `linear-gradient(135deg, ${collab.color} 0%, ${collab.color}cc 100%)`
              : "linear-gradient(135deg, #10b981 0%, #059669 100%)"
          }
          src={collab.avatar_url || null}
          initials={collab.name.slice(0, 2)}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-semibold text-gray-900 leading-tight truncate flex items-center gap-2">
            <Icon className="w-[16px] h-[16px] text-emerald-600" />
            {title}
          </div>
          <div className="text-[11.5px] text-gray-500 leading-tight truncate">{collab.name}</div>
        </div>
      </div>

      {/* Toolbar busca */}
      <div className="px-5 py-2.5 border-b border-gray-100 bg-white/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3.5 py-1.5 shadow-sm">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={mode === "favorites" ? "Filtrar favoritas…" : "Filtrar links…"}
            className="flex-1 bg-transparent outline-none text-[13px] text-gray-700 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 text-gray-500">
            <Icon className="w-10 h-10 mb-3 text-gray-300" />
            <div className="text-[14px] font-medium">
              {mode === "favorites" ? "Nenhuma mensagem favoritada ainda" : "Nenhum link compartilhado ainda"}
            </div>
            <div className="text-[12px] mt-1 max-w-sm">
              {mode === "favorites"
                ? "Passe o mouse sobre uma mensagem e clique no ⭐ para salvá-la aqui."
                : "Os links enviados nas conversas aparecerão aqui automaticamente."}
            </div>
          </div>
        ) : mode === "favorites" ? (
          <ul className="space-y-2">
            {(data as Array<{ msg: Msg; sender?: { id: string; name: string; avatar_url?: string | null } | null }>).map(({ msg, sender }) => (
              <li
                key={msg.id}
                className="group rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm hover:shadow-md hover:border-emerald-200 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white flex items-center justify-center shrink-0 text-[11px] font-semibold">
                    {sender?.avatar_url ? (
                      <img src={sender.avatar_url} alt={sender.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      (sender?.name || "?").split(" ").slice(0, 2).map((w) => w[0]).join("")
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[12.5px] font-semibold text-gray-800 truncate">{sender?.name || "Desconhecido"}</span>
                      <span className="text-[10.5px] text-gray-400">{fmtDate(msg.created_at)}</span>
                    </div>
                    <div className="text-[13px] text-gray-700 whitespace-pre-wrap break-words line-clamp-4">
                      {msg.content || (msg.attachments?.length ? `📎 ${msg.attachments.length} anexo(s)` : "—")}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      onClick={() => onToggleFavorite(msg.id)}
                      title="Remover dos favoritos"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-amber-500 hover:bg-amber-50 transition"
                    >
                      <Star className="w-4 h-4 fill-amber-400 stroke-amber-500" />
                    </button>
                    {onJumpToMessage && (
                      <button
                        onClick={() => onJumpToMessage(msg.id)}
                        title="Ir para mensagem"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-2">
            {(data as Array<{ url: string; msg: Msg; sender?: { id: string; name: string; avatar_url?: string | null } | null }>).map(({ url, msg, sender }, i) => (
              <li
                key={`${msg.id}-${i}`}
                className="group rounded-2xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md hover:border-emerald-200 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <LinkIcon className="w-[18px] h-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-[13.5px] font-semibold text-emerald-700 hover:underline truncate"
                    >
                      {tryHostname(url)}
                    </a>
                    <div className="text-[11.5px] text-gray-500 truncate">{url}</div>
                    <div className="text-[10.5px] text-gray-400 mt-0.5">
                      {sender?.name || "—"} · {fmtDate(msg.created_at)}
                    </div>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir link"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
