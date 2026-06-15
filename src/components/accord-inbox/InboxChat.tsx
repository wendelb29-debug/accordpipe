import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, ArrowLeftRight, Info, X, Paperclip, Image, Mic, Trash2,
  Send, Play, Pause, FileText, FileSpreadsheet, FileArchive, FileImage, FileVideo, FileAudio, File as FileIcon, Download, ExternalLink,
  MoreVertical, Users, Check, CheckCheck, ArrowLeft, Reply, Smile,
  MessageSquare, Plus, Filter, BarChart2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const EMOJI_LIST = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰",
  "😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥸","🤩","🥳",
  "😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤",
  "😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫",
  "🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵",
  "🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕","🤑","🤠","👍","👎","👌","🤌","🤏","✌️",
  "🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👋","🤚","🖐️","✋","🖖","👏",
  "🙌","🤲","🙏","✍️","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖",
  "💘","💝","💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈",
  "🔥","✨","🎉","🎊","🎈","🎁","🏆","🥇","🥈","🥉","⚽","🏀","🏈","⚾","🎾","🏐",
  "✅","☑️","✔️","❌","❎","➕","➖","➗","✖️","♾️","‼️","⁉️","❓","❔","❕","❗",
];
import { cn } from "@/lib/utils";
import { AiImprovePopover } from "./AiImprovePopover";
import { AudioVisualizer } from "./AudioVisualizer";
import { ImageLightbox } from "./ImageLightbox";
import { MessageActions } from "./MessageActions";
import {
  linkifyText, classifyAttachment, formatFileSize, extensionLabel,
  type AttachmentKind,
} from "@/lib/messageContent";

interface MessageReaction {
  emoji: string;
  user_id: string;
  user_name?: string | null;
  at: string;
}

interface ChatMessage {
  id: string;
  message: string;
  direction: "inbound" | "outbound" | string;
  created_at: string;
  type?: "text" | "audio" | "image" | "file" | "document" | "pdf" | "video" | string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string | number;
  mimeType?: string;
  status?: string;
  replyToMessageId?: string | null;
  reactions?: MessageReaction[];
}

interface ChatContact {
  id: string;
  name: string;
  phone: string;
  avatarColor?: string;
  avatarFg?: string;
  isOnline?: boolean;
  isGroup?: boolean;
  profilePicUrl?: string;
  conversationStatus?: string;
  channel?: "zapi" | "uazapi" | "cloud";
  assignedTo?: string;
}

interface InboxChatProps {
  contact: ChatContact | null;
  messages: ChatMessage[];
  onSendMessage: (
    text: string,
    options?: { messageType?: "text" | "image" | "audio" | "file"; mediaUrl?: string; fileName?: string; replyToMessageId?: string | null }
  ) => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  onTransfer?: (contactId: string) => void;
  onAssignToMe?: (contactId: string) => void;
  isAdmin?: boolean;
  companyId?: string | null;
  onToggleInfo?: () => void;
  showInfo?: boolean;
  onCreateDemand?: () => void;
  onUpdateStatus?: (contactId: string, status: string) => void;
  onBack?: () => void;
  queueCount?: number;
  inServiceCount?: number;
  onNewConversation?: () => void;
  onFilterQueue?: () => void;
  onViewReport?: () => void;
}

function ContactAvatar({ contact, size = 36 }: { contact: ChatContact; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = contact.name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
  if (contact.profilePicUrl && !imgError) {
    return (
      <img src={contact.profilePicUrl} alt={contact.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)} />
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-medium"
      style={{ width: size, height: size, fontSize: size * 0.35,
        background: contact.avatarColor || "hsl(var(--muted))",
        color: contact.avatarFg || "hsl(var(--primary))" }}>
      {contact.isGroup ? <Users size={size * 0.4} /> : initials}
    </div>
  );
}

function StatusPill({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, { label: string; cls: string }> = {
    em_atendimento: { label: "Em atendimento", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    fila: { label: "Na fila", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    aguardando: { label: "Na fila", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    encerrado: { label: "Encerrado", cls: "bg-red-500/15 text-red-500 dark:text-red-400" },
  };
  const s = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("text-[11px] px-2.5 py-1 rounded-full font-medium flex items-center gap-1", s.cls)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

// Single global audio ref so only one plays at a time
let CURRENT_AUDIO: HTMLAudioElement | null = null;

function AudioPlayer({ direction, src }: { direction: string; src?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      if (CURRENT_AUDIO && CURRENT_AUDIO !== el) CURRENT_AUDIO.pause();
      CURRENT_AUDIO = el;
      el.play().catch(() => {});
    }
  };

  const isOut = direction === "outbound";
  return (
    <div className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-2xl min-w-[220px]",
      isOut ? "bg-primary rounded-br-sm" : "bg-muted/80 dark:bg-muted/50 rounded-bl-sm border border-border/40"
    )}>
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setProgress(0); }}
          onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
          onTimeUpdate={(e) => {
            const a = e.target as HTMLAudioElement;
            setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
          }}
        />
      )}
      <button onClick={toggle} disabled={!src}
        className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
          isOut ? "bg-white/20 hover:bg-white/30" : "bg-primary hover:bg-primary/90"
        )}>
        {playing
          ? <Pause size={12} className={isOut ? "text-white" : "text-primary-foreground"} />
          : <Play size={12} className={isOut ? "text-white" : "text-primary-foreground"} />}
      </button>
      <div className={cn("flex-1 h-1 rounded-full overflow-hidden", isOut ? "bg-white/25" : "bg-primary/20")}>
        <div className={cn("h-full rounded-full transition-all", isOut ? "bg-white" : "bg-primary")} style={{ width: `${progress}%` }} />
      </div>
      <span className={cn("text-[11px] flex-shrink-0", isOut ? "text-white/70" : "text-muted-foreground")}>
        {fmt(duration)}
      </span>
    </div>
  );
}

function AttachmentIcon({ kind, className }: { kind: AttachmentKind; className?: string }) {
  const props = { size: 18, className };
  switch (kind) {
    case "pdf": return <FileText {...props} />;
    case "doc": return <FileText {...props} />;
    case "sheet": return <FileSpreadsheet {...props} />;
    case "archive": return <FileArchive {...props} />;
    case "image": return <FileImage {...props} />;
    case "video": return <FileVideo {...props} />;
    case "audio": return <FileAudio {...props} />;
    case "text": return <FileText {...props} />;
    default: return <FileIcon {...props} />;
  }
}

async function downloadFileViaBlob(url: string, filename: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Download failed");
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

const FILE_THEME: Record<string, { from: string; to: string; iconBg: string; iconColor: string; label: string; Icon: typeof FileIcon }> = {
  pdf:     { from: "#FFF3EE", to: "#FFE2D4", iconBg: "#FFD6BF", iconColor: "#D85A30", label: "PDF",  Icon: FileText },
  sheet:   { from: "#EEFBE2", to: "#DCF3C1", iconBg: "#C7E8A2", iconColor: "#3B6D11", label: "XLSX", Icon: FileSpreadsheet },
  doc:     { from: "#E8F1FF", to: "#D2E3FF", iconBg: "#BCD3FF", iconColor: "#2563EB", label: "DOC",  Icon: FileText },
  text:    { from: "#E8F1FF", to: "#D2E3FF", iconBg: "#BCD3FF", iconColor: "#2563EB", label: "TXT",  Icon: FileText },
  image:   { from: "#F3EBFF", to: "#E4D3FF", iconBg: "#D5BBFF", iconColor: "#7C3AED", label: "IMG",  Icon: FileImage },
  video:   { from: "#FEE2E2", to: "#FECACA", iconBg: "#FCA5A5", iconColor: "#B91C1C", label: "VÍDEO", Icon: FileVideo },
  audio:   { from: "#ECFDF5", to: "#D1FAE5", iconBg: "#A7F3D0", iconColor: "#059669", label: "ÁUDIO", Icon: FileAudio },
  archive: { from: "#FEF3C7", to: "#FDE68A", iconBg: "#FCD34D", iconColor: "#92400E", label: "ZIP",  Icon: FileArchive },
  file:    { from: "#F1F3F8", to: "#E4E8F1", iconBg: "#D1D7E3", iconColor: "#475569", label: "FILE", Icon: FileIcon },
};

function AttachmentCard({
  direction, fileName, fileSize, src, mimeType,
}: {
  direction: string;
  fileName?: string;
  fileSize?: string | number;
  src?: string;
  mimeType?: string;
}) {
  const kind = classifyAttachment({ mime: mimeType, fileName, url: src });
  const ext = extensionLabel(fileName, src);
  const sizeLabel = typeof fileSize === "number"
    ? formatFileSize(fileSize)
    : (fileSize || formatFileSize(undefined));
  const safeName = fileName || (src ? `arquivo.${ext.toLowerCase()}` : "Mídia indisponível");
  const theme = FILE_THEME[kind] || FILE_THEME.file;
  const Icon = theme.Icon;

  const handleDownload = (e: React.MouseEvent) => {
    if (!src) return;
    e.preventDefault();
    e.stopPropagation();
    downloadFileViaBlob(src, safeName);
  };

  return (
    <div
      className={cn(
        "group/file flex items-center gap-3 rounded-2xl px-3 py-2.5 min-w-[260px] max-w-[320px] border border-white/60 shadow-[0_4px_18px_-6px_rgba(15,23,42,0.18)] hover:shadow-[0_8px_24px_-6px_rgba(15,23,42,0.28)] transition-all",
        !src && "opacity-70",
      )}
      style={{ background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)` }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
        style={{ background: theme.iconBg, color: theme.iconColor }}
      >
        <Icon className="h-[19px] w-[19px]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold text-[#1a1a2e] truncate">{safeName}</div>
        <div className="text-[11px] text-gray-600 flex items-center gap-1.5">
          <span className="font-medium tracking-wide" style={{ color: theme.iconColor }}>{theme.label}</span>
          {sizeLabel && <><span className="opacity-50">·</span><span>{sizeLabel}</span></>}
        </div>
      </div>
      {src && (
        <div className="flex items-center gap-0.5 opacity-70 group-hover/file:opacity-100 transition">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir"
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-700 hover:bg-white/70"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={handleDownload}
            title="Baixar"
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-700 hover:bg-white/70"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function ReplyPreviewBlock({
  original, isOutContext, onClick,
}: { original: ChatMessage; isOutContext: boolean; onClick?: () => void }) {
  const label = (() => {
    if (original.type === "image" || (original.mediaUrl && classifyAttachment({ mime: original.mimeType, fileName: original.fileName, url: original.mediaUrl }) === "image")) return "📷 Imagem";
    if (original.type === "audio" || original.type === "voice" || original.type === "ptt") return "🎵 Áudio";
    if (original.mediaUrl) return `📎 ${original.fileName || "Arquivo"}`;
    return original.message || "Mensagem";
  })();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full text-left mb-1 pl-2 pr-2.5 py-1 rounded-md border-l-2 hover:opacity-90 transition",
        isOutContext
          ? "bg-white/10 border-white/60 text-white/90"
          : "bg-muted/60 border-primary/60 text-foreground/80",
      )}
    >
      <p className="text-[10.5px] font-medium opacity-80 mb-0.5">
        {original.direction === "outbound" ? "Você" : "Contato"}
      </p>
      <p className="text-[12px] leading-snug truncate">{label}</p>
    </button>
  );
}

function ReactionsBar({
  reactions, onToggle, currentUserId,
}: { reactions: MessageReaction[]; onToggle?: (emoji: string) => void; currentUserId?: string | null }) {
  if (!reactions?.length) return null;
  // Group by emoji
  const groups = reactions.reduce<Record<string, MessageReaction[]>>((acc, r) => {
    (acc[r.emoji] ||= []).push(r);
    return acc;
  }, {});
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(groups).map(([emoji, list]) => {
        const mine = !!currentUserId && list.some(r => r.user_id === currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle?.(emoji)}
            title={list.map(r => r.user_name || "Alguém").join(", ")}
            className={cn(
              "inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] border transition-all hover:scale-105",
              mine
                ? "bg-primary/15 border-primary/40 text-foreground"
                : "bg-muted/70 border-border/50 text-foreground/80",
            )}
          >
            <span className="text-sm leading-none">{emoji}</span>
            {list.length > 1 && <span className="font-medium">{list.length}</span>}
          </button>
        );
      })}
    </div>
  );
}

function MessageBubble({
  msg, originalForReply, currentUserId,
  onReply, onReact, onOpenImage, onJumpToOriginal,
}: {
  msg: ChatMessage;
  originalForReply?: ChatMessage | null;
  currentUserId?: string | null;
  onReply: (m: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onOpenImage: (m: ChatMessage) => void;
  onJumpToOriginal: (id: string) => void;
}) {
  const isOut = msg.direction === "outbound";
  const time = msg.created_at
    ? new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "";
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [actionsRect, setActionsRect] = useState<DOMRect | null>(null);

  const kind = (() => {
    if ((msg.type === "audio" || msg.type === "voice" || msg.type === "ptt") && msg.mediaUrl) return "audio" as const;
    if (msg.type === "image" && msg.mediaUrl) return "image" as const;
    if (msg.type === "video" && msg.mediaUrl) return "video" as const;
    const isMediaType = msg.type === "file" || msg.type === "document" || msg.type === "pdf";
    if (msg.mediaUrl) {
      const k = classifyAttachment({ mime: msg.mimeType, fileName: msg.fileName, url: msg.mediaUrl });
      if (k === "image") return "image" as const;
      if (k === "audio") return "audio" as const;
      return "attachment" as const;
    }
    if (isMediaType) return "attachment" as const;
    return "text" as const;
  })();

  const hasCaption = !!msg.message && msg.message !== msg.fileName;

  const openActions = (e: React.MouseEvent) => {
    // Don't trigger when clicking interactive children (links, audio buttons, etc.)
    const target = e.target as HTMLElement;
    if (target.closest("a, button, audio, input, textarea")) return;
    const rect = bubbleRef.current?.getBoundingClientRect();
    if (rect) setActionsRect(rect);
  };

  return (
    <div
      id={`msg-${msg.id}`}
      ref={bubbleRef}
      className={cn(
        "flex flex-col max-w-[68%] group cursor-pointer",
        isOut ? "self-end items-end" : "self-start items-start",
      )}
      onClick={openActions}
    >
      {kind === "audio" ? (
        <AudioPlayer direction={msg.direction} src={msg.mediaUrl} />
      ) : kind === "image" ? (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); if (msg.mediaUrl) onOpenImage(msg); }}
          className={cn(
            "rounded-2xl overflow-hidden block cursor-zoom-in shadow-sm hover:shadow-md transition-shadow",
            isOut ? "rounded-br-md ring-1 ring-primary/20" : "rounded-bl-md border border-border/60",
          )}
        >
          {originalForReply && (
            <div className="px-2 pt-2">
              <ReplyPreviewBlock
                original={originalForReply}
                isOutContext={isOut}
                onClick={() => onJumpToOriginal(originalForReply.id)}
              />
            </div>
          )}
          {msg.mediaUrl ? (
            <img src={msg.mediaUrl} alt={msg.fileName || "imagem"} className="w-64 max-h-72 object-cover" loading="lazy" />
          ) : (
            <div className="w-52 h-36 bg-muted/60 flex items-center justify-center text-muted-foreground text-xs gap-2">
              <Image size={16} />
              {msg.fileName || "imagem.jpg"}
            </div>
          )}
        </div>
      ) : kind === "attachment" ? (
        <div className="flex flex-col gap-1">
          {originalForReply && (
            <ReplyPreviewBlock
              original={originalForReply}
              isOutContext={isOut}
              onClick={() => onJumpToOriginal(originalForReply.id)}
            />
          )}
          <AttachmentCard
            direction={msg.direction}
            fileName={msg.fileName || msg.message}
            fileSize={msg.fileSize}
            src={msg.mediaUrl}
            mimeType={msg.mimeType}
          />
        </div>
      ) : (
        <div className={cn(
          "relative px-3.5 pt-2 pb-1.5 rounded-2xl text-[13px] leading-relaxed break-words whitespace-pre-wrap shadow-sm transition-shadow hover:shadow-md",
          isOut
            ? "bg-primary text-primary-foreground rounded-br-md ring-1 ring-primary/20"
            : "bg-card text-foreground rounded-bl-md border border-border/60",
        )}>
          {originalForReply && (
            <ReplyPreviewBlock
              original={originalForReply}
              isOutContext={isOut}
              onClick={() => onJumpToOriginal(originalForReply.id)}
            />
          )}
          <div className="pr-12">{linkifyText(msg.message)}</div>
          <div className={cn(
            "absolute bottom-1 right-2 flex items-center gap-1 text-[10px] leading-none",
            isOut ? "text-primary-foreground/70" : "text-muted-foreground",
          )}>
            <span>{time}</span>
            {isOut && (() => {
              const s = msg.status;
              if (s === "read") return <CheckCheck size={11} className="text-emerald-300" />;
              if (s === "delivered") return <CheckCheck size={11} className="opacity-80" />;
              if (s === "failed") return <span className="text-red-300">!</span>;
              if (s === "sending") return <span className="opacity-60">⋯</span>;
              return <Check size={11} className="opacity-80" />;
            })()}
          </div>
        </div>
      )}

      {(kind === "image" || kind === "attachment") && hasCaption && (
        <div className={cn(
          "mt-1 px-3 py-1.5 rounded-xl text-[12.5px] leading-relaxed break-words whitespace-pre-wrap max-w-full shadow-sm",
          isOut
            ? "bg-primary/90 text-primary-foreground ring-1 ring-primary/20"
            : "bg-card text-foreground border border-border/60",
        )}>
          {linkifyText(msg.message)}
        </div>
      )}

      <ReactionsBar
        reactions={msg.reactions || []}
        currentUserId={currentUserId}
        onToggle={(e) => onReact(msg.id, e)}
      />

      {kind !== "text" && (
        <div className="flex items-center gap-1 mt-1 px-1">
          <span className="text-[10px] text-muted-foreground">{time}</span>
          {isOut && (() => {
            const s = msg.status;
            if (s === "read") return <CheckCheck size={12} className="text-emerald-500" />;
            if (s === "delivered") return <CheckCheck size={12} className="text-muted-foreground/70" />;
            if (s === "failed") return <span className="text-[10px] text-red-500">!</span>;
            if (s === "sending") return <span className="text-[10px] text-muted-foreground/50">⋯</span>;
            return <Check size={12} className="text-muted-foreground/70" />;
          })()}
        </div>
      )}

      {actionsRect && (
        <MessageActions
          isOut={isOut}
          anchorRect={actionsRect}
          copyText={kind === "text" ? msg.message : undefined}
          onReply={() => onReply(msg)}
          onReact={(emoji) => onReact(msg.id, emoji)}
          onClose={() => setActionsRect(null)}
        />
      )}
    </div>
  );
}

function ToolBtn({ icon, title, onClick, className }: { icon: React.ReactNode; title?: string; onClick?: () => void; className?: string }) {
  return (
    <button title={title} onClick={onClick}
      className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all", className)}>
      {icon}
    </button>
  );
}

function AccordWatermark() {
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 110'%3E%3Cpath fill='%237F77DD' fill-opacity='0.06' d='M60 5L110 100H80L60 55L40 100H10Z'/%3E%3Cpath fill='%237F77DD' fill-opacity='0.04' d='M35 72L85 72L80 85L40 85Z'/%3E%3C/svg%3E")`,
        backgroundSize: "110px 100px",
        backgroundRepeat: "repeat",
      }} />
  );
}

export function InboxChat({
  contact, messages, onSendMessage, onReactToMessage, onTransfer, onToggleInfo, showInfo, onUpdateStatus, companyId,
  onBack, queueCount = 0, inServiceCount = 0, onNewConversation, onFilterQueue, onViewReport,
}: InboxChatProps) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [lightboxMsg, setLightboxMsg] = useState<ChatMessage | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Resolve current user id once for reaction ownership detection
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getUser();
      if (mounted) setCurrentUserId(data.user?.id || null);
    })();
    return () => { mounted = false; };
  }, []);


  const messagesById = (() => {
    const map: Record<string, ChatMessage> = {};
    for (const m of messages) map[m.id] = m;
    return map;
  })();

  const handleJumpToMessage = useCallback((id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary/60", "rounded-2xl");
    setTimeout(() => el.classList.remove("ring-2", "ring-primary/60", "rounded-2xl"), 1400);
  }, []);

  const handleReact = useCallback((messageId: string, emoji: string) => {
    onReactToMessage?.(messageId, emoji);
  }, [onReactToMessage]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordStream, setRecordStream] = useState<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const isAtBottomRef = useRef(true);
  const prevContactIdRef = useRef<string | null>(null);
  const prevMsgCountRef = useRef(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;
    const lerp = (a: number[], b: number[], t: number) =>
      a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const getColors = () => {
      const isDark = document.documentElement.classList.contains('dark');
      return {
        blue:       isDark ? [37, 99, 235] : [59, 130, 246],
        purple:     [122, 63, 242] as number[],
        dotAlpha:   isDark ? 0.07 : 0.13,
        lineAlpha:  isDark ? 0.18 : 0.22,
        ptAlphaMin: isDark ? 0.18 : 0.22,
        ptAlphaMax: isDark ? 0.55 : 0.60,
      };
    };
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const { width, height } = p.getBoundingClientRect();
      canvas.width  = width  * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width  = width  + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    const c = getColors();
    const pts = Array.from({ length: 65 }, () => {
      const p = canvas.parentElement;
      const W = p?.offsetWidth || 800;
      const H = p?.offsetHeight || 600;
      const t = Math.random();
      return { x: Math.random()*W, y: Math.random()*H,
        vx:(Math.random()-.5)*.28, vy:(Math.random()-.5)*.28,
        r:Math.random()*1.6+.7, t,
        a: c.ptAlphaMin + Math.random()*(c.ptAlphaMax - c.ptAlphaMin) };
    });
    const draw = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const W = p.offsetWidth, H = p.offsetHeight;
      const { blue, purple, dotAlpha, lineAlpha } = getColors();
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = `rgba(122,63,242,${dotAlpha})`;
      for (let x = 18; x < W; x += 36)
        for (let y = 18; y < H; y += 36) {
          ctx.beginPath(); ctx.arc(x, y, .85, 0, Math.PI*2); ctx.fill();
        }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i+1; j < pts.length; j++) {
          const b = pts[j];
          const dx = a.x-b.x, dy = a.y-b.y, d = Math.sqrt(dx*dx+dy*dy);
          if (d < 120) {
            const col = lerp(lerp(blue,purple,a.t), lerp(blue,purple,b.t), .5);
            ctx.strokeStyle=`rgba(${col[0]},${col[1]},${col[2]},${(1-d/120)*lineAlpha})`;
            ctx.lineWidth=.55;
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>W)p.vx*=-1; if(p.y<0||p.y>H)p.vy*=-1;
        const col=lerp(blue,purple,p.t);
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${col[0]},${col[1]},${col[2]},${p.a})`; ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    resize(); draw();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);

  const isClosed = contact?.conversationStatus === "encerrado" || contact?.conversationStatus === "finalizado";

  // Scroll only inside the message container (never scrolls the page).
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
    } else {
      const el = msgsRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
    }
    setHasNewBelow(false);
  };

  // Track if user is near the bottom of the messages list
  useEffect(() => {
    const el = msgsRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const atBottom = distance < 80;
      isAtBottomRef.current = atBottom;
      if (atBottom) setHasNewBelow(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [contact?.id]);

  // On open conversation: jump instantly to bottom (no smooth, no page scroll)
  useEffect(() => {
    if (!contact?.id) return;
    if (prevContactIdRef.current !== contact.id) {
      prevContactIdRef.current = contact.id;
      prevMsgCountRef.current = messages.length;
      requestAnimationFrame(() => scrollToBottom("auto"));
      isAtBottomRef.current = true;
      setHasNewBelow(false);
      // Clear any reply-state carried from a previous conversation
      setReplyTo(null);
    }
  }, [contact?.id, messages.length]);

  // On new messages: follow if at bottom, otherwise show "new messages" hint
  useEffect(() => {
    if (messages.length === prevMsgCountRef.current) return;
    const grew = messages.length > prevMsgCountRef.current;
    prevMsgCountRef.current = messages.length;
    if (!grew) return;
    if (isAtBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
    } else {
      const last = messages[messages.length - 1];
      if (last?.direction !== "outbound") setHasNewBelow(true);
      else requestAnimationFrame(() => scrollToBottom("smooth"));
    }
  }, [messages]);

  const send = () => {
    if (!text.trim() || isClosed) return;
    onSendMessage(text.trim(), replyTo ? { replyToMessageId: replyTo.id } : undefined);
    setText("");
    setReplyTo(null);
    if (taRef.current) taRef.current.style.height = "40px";
  };

  const insertEmoji = (emoji: string) => {
    const ta = taRef.current;
    if (!ta) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      try { ta.setSelectionRange(pos, pos); } catch {}
      ta.style.height = "40px";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    });
  };
  const [emojiOpen, setEmojiOpen] = useState(false);

  const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB

  const detectMessageType = (file: File): "image" | "audio" | "video" | "file" => {
    const mime = (file.type || "").toLowerCase();
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.startsWith("video/")) return "video";
    return "file";
  };

  const uploadAndSend = async (
    file: File,
    forcedType?: "image" | "audio" | "file",
  ) => {
    if (!companyId || !contact) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      const { toast } = await import("sonner");
      toast.error(`Arquivo muito grande (máx. ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`);
      return;
    }
    const messageType = forcedType || detectMessageType(file);
    setUploading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${companyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("whatsapp-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("whatsapp-media").getPublicUrl(path);
      // For non-image/audio types, we send 'file' to backend (uazapi treats document/audio/image distinctly)
      const sendType = messageType === "video" ? "file" : messageType;
      onSendMessage(file.name, {
        messageType: sendType,
        mediaUrl: pub.publicUrl,
        fileName: file.name,
        replyToMessageId: replyTo?.id ?? null,
      });
      setReplyTo(null);
    } catch (err: any) {
      const { toast } = await import("sonner");
      toast.error(err?.message || "Falha no upload do arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type?: "image" | "audio" | "file") => {
    const f = e.target.files?.[0];
    if (f) uploadAndSend(f, type);
    e.target.value = "";
  };

  // ===== Drag & drop on the messages area =====
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };
  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length || isClosed) return;
    // Upload files sequentially to avoid hammering the API
    (async () => {
      for (const f of files) {
        await uploadAndSend(f);
      }
    })();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setRecordStream(null);
        await uploadAndSend(file, "audio");
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecordStream(stream);
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      const { toast } = await import("sonner");
      toast.error("Não foi possível acessar o microfone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  const cancelRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr) {
      mr.ondataavailable = null as any;
      mr.onstop = null as any;
      try { mr.stop(); } catch { /* noop */ }
    }
    recordStream?.getTracks().forEach((t) => t.stop());
    setRecordStream(null);
    setIsRecording(false);
    audioChunksRef.current = [];
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  if (!contact) {
    return (
      <div
        className="relative overflow-hidden bg-background"
        style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:'1 1 0', minHeight: 0, height: '100%' }}
      >
        <canvas
          ref={canvasRef}
          style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', display:'block' }}
          aria-hidden
        />
        <div style={{ position:'relative', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'0 24px' }}>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <MessageSquare size={26} className="text-primary/70" />
          </div>
          <p className="text-[17px] font-bold text-foreground tracking-tight mb-1.5">
            Selecione uma conversa
          </p>
          <p className="text-[13px] text-muted-foreground max-w-[220px] leading-relaxed mb-7">
            Escolha um atendimento ao lado ou inicie uma nova conversa
          </p>
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-[400px] mb-7">
            {([
              { Icon: Plus,      label: 'Nova conversa' },
              { Icon: Filter,    label: 'Filtrar fila'  },
              { Icon: BarChart2, label: 'Ver relatório' },
            ]).map(({ Icon, label }) => (
              <button key={label} className="flex flex-col items-center gap-2 bg-white/[0.04] hover:bg-primary/10 border border-white/[0.07] hover:border-primary/25 rounded-xl py-3.5 px-2 transition-all duration-150 group">
                <Icon size={20} className="text-primary/70 group-hover:text-primary transition-colors" />
                <span className="text-[11.5px] font-semibold text-foreground/60 group-hover:text-foreground/80 leading-tight text-center transition-colors">{label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-muted-foreground/50">em atendimento</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="text-[11px] text-muted-foreground/50">na fila</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      <div
        className="flex items-center gap-2 px-2 sm:px-4 py-2.5 sm:py-3 border-b border-border/60 bg-background flex-shrink-0"
        style={{
          paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))',
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
        }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden -ml-1 w-10 h-10 rounded-lg flex items-center justify-center text-foreground/80 hover:bg-muted/60 active:bg-muted transition-colors flex-shrink-0"
            aria-label="Voltar para conversas"
          >
            <ArrowLeft size={22} />
          </button>
        )}
        <div className="relative flex-shrink-0">
          <ContactAvatar contact={contact} size={38} />
          {contact.isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-foreground truncate">{contact.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{contact.phone}</p>
        </div>
        <div className="hidden sm:block"><StatusPill status={contact.conversationStatus} /></div>
        <div className="flex items-center gap-1 ml-1 sm:ml-2 flex-shrink-0">
          <button className="hidden sm:flex w-8 h-8 rounded-lg border border-border/50 items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all">
            <Search size={14} />
          </button>
          {onTransfer && (
            <button onClick={() => onTransfer(contact.id)}
              aria-label="Transferir"
              className="hidden sm:flex w-9 h-9 sm:w-8 sm:h-8 rounded-lg border border-border/50 items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all">
              <ArrowLeftRight size={15} />
            </button>
          )}
          {onToggleInfo && (
            <button onClick={onToggleInfo}
              aria-label="Informações"
              className={cn("hidden sm:flex w-8 h-8 rounded-lg border items-center justify-center transition-all",
                showInfo ? "border-primary/40 bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}>
              <Info size={14} />
            </button>
          )}
          {onUpdateStatus && (
            <button onClick={() => onUpdateStatus(contact.id, "encerrado")}
              aria-label="Encerrar atendimento"
              className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:border-red-900 transition-all">
              <X size={16} />
            </button>
          )}
          <button aria-label="Mais opções" className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      <div
        ref={msgsRef}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-2 px-4 py-3 relative scroll-smooth bg-muted/20 dark:bg-background/60 overscroll-contain"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 110'%3E%3Cpath fill='%237F77DD' fill-opacity='0.06' d='M60 5L110 100H80L60 55L40 100H10Z'/%3E%3Cpath fill='%237F77DD' fill-opacity='0.04' d='M35 72L85 72L80 85L40 85Z'/%3E%3C/svg%3E")`,
          backgroundSize: "110px 100px",
          backgroundRepeat: "repeat",
        }}
      >
        <div className="relative z-10 max-w-4xl mx-auto w-full flex flex-col gap-2">
        <div className="relative z-10 max-w-4xl mx-auto w-full flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            {(() => {
              const now = new Date();
              const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
              const today = startOfDay(now);
              const yesterday = today - 86400000;
              const formatSeparator = (ts: number) => {
                const d = new Date(ts);
                const dateStr = d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
                if (ts === today) return `Hoje, ${dateStr}`;
                if (ts === yesterday) return `Ontem, ${dateStr}`;
                return dateStr;
              };
              let lastDay = -1;
              const nodes: JSX.Element[] = [];
              messages.forEach((msg) => {
                const ts = msg.created_at ? startOfDay(new Date(msg.created_at)) : today;
                if (ts !== lastDay) {
                  lastDay = ts;
                  nodes.push(
                    <div key={`sep-${ts}`} className="flex items-center gap-3 my-2 sticky top-1 z-10">
                      <div className="flex-1 h-px bg-border/40" />
                      <span className="text-[11px] font-medium text-muted-foreground/80 px-2.5 bg-background/95 backdrop-blur rounded-full border border-border/40 py-0.5 shadow-sm">
                        {formatSeparator(ts)}
                      </span>
                      <div className="flex-1 h-px bg-border/40" />
                    </div>
                  );
                }
                const originalForReply = msg.replyToMessageId ? messagesById[msg.replyToMessageId] : undefined;
                nodes.push(
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    originalForReply={originalForReply}
                    currentUserId={currentUserId || undefined}
                    onReply={(m) => {
                      setReplyTo(m);
                      requestAnimationFrame(() => taRef.current?.focus());
                    }}
                    onReact={handleReact}
                    onOpenImage={(m) => setLightboxMsg(m)}
                    onJumpToOriginal={handleJumpToMessage}
                  />
                );
              });
              return nodes;
            })()}
          </div>
        </div>
        <div ref={messagesEndRef} />
        {hasNewBelow && (
          <button
            onClick={() => scrollToBottom("smooth")}
            className="sticky bottom-2 self-center z-20 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg hover:bg-primary/90 transition-all animate-fade-in"
          >
            Novas mensagens ↓
          </button>
        )}
        {isDragging && !isClosed && (
          <div className="absolute inset-2 z-30 rounded-2xl border-2 border-dashed border-primary/60 bg-primary/10 backdrop-blur-sm flex items-center justify-center pointer-events-none animate-fade-in">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Paperclip size={28} />
              <p className="text-sm font-medium">Solte para anexar</p>
              <p className="text-[11px] text-muted-foreground">Imagens, PDFs e documentos · até 25 MB</p>
            </div>
          </div>
        )}
      </div>

      <div
        className="flex-shrink-0 p-3 border-t"
        style={{
          background: "linear-gradient(to bottom, hsl(var(--primary) / 0.06), hsl(var(--primary) / 0.10))",
          borderTopColor: "hsl(var(--primary) / 0.18)",
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileChange(e, "file")} />
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "image")} />
        <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileChange(e, "audio")} />

        {isClosed ? (
          <div className="flex items-center justify-between gap-3 py-2">
            <p className="text-sm text-muted-foreground">Atendimento encerrado</p>
            {onUpdateStatus && (
              <button
                onClick={() => onUpdateStatus(contact.id, "em_atendimento")}
                className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
              >
                Reabrir atendimento
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {uploading && (
              <div className="text-[11px] text-muted-foreground px-1 animate-fade-in">Enviando arquivo…</div>
            )}

            {replyTo && !isRecording && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-muted/60 border-l-2 border-primary animate-fade-in">
                <Reply size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-primary leading-tight">
                    Respondendo {replyTo.direction === "outbound" ? "à sua mensagem" : (contact?.name || "contato")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                    {replyTo.type === "image" ? "📷 Imagem"
                      : replyTo.type === "audio" ? "🎤 Áudio"
                      : (replyTo.type === "file" || replyTo.type === "document" || replyTo.type === "pdf" || replyTo.type === "video") ? `📎 ${replyTo.fileName || "Arquivo"}`
                      : (replyTo.message || "")}
                  </p>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  aria-label="Cancelar resposta"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {isRecording ? (
              <div className="flex items-center gap-2 h-12 rounded-2xl bg-muted/60 border border-destructive/40 px-3 animate-fade-in">
                <button
                  onClick={cancelRecording}
                  title="Cancelar gravação"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
                <span className="inline-block w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                <span className="text-xs font-mono text-foreground/80 tabular-nums flex-shrink-0">
                  {String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:
                  {String(recordSeconds % 60).padStart(2, "0")}
                </span>
                <AudioVisualizer stream={recordStream} className="flex-1 h-7" />
                <button
                  onClick={stopRecording}
                  title="Enviar gravação"
                  className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-all active:scale-95"
                >
                  <Send size={15} />
                </button>
              </div>
            ) : (
              <div
                className="flex items-end gap-1 rounded-2xl px-1.5 py-1 transition-colors focus-within:ring-2 focus-within:ring-primary/30"
                style={{
                  background: "hsl(var(--background) / 0.85)",
                  border: "1px solid hsl(var(--primary) / 0.20)",
                }}
              >
                {/* Left actions: attachments + emoji + AI */}
                <div className="flex items-center gap-0.5 pb-0.5 flex-shrink-0">
                  <ToolBtn icon={<Paperclip size={16} />} title="Anexar arquivo" onClick={() => fileInputRef.current?.click()} className="w-9 h-9 rounded-full" />
                  <ToolBtn icon={<Image size={16} />} title="Enviar imagem" onClick={() => imageInputRef.current?.click()} className="w-9 h-9 rounded-full" />
                  <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        title="Inserir emoji"
                        aria-label="Inserir emoji"
                        className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Smile size={16} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="start"
                      sideOffset={8}
                      className="p-2 w-72 z-50 bg-popover border border-border shadow-2xl"
                    >
                      <div className="grid grid-cols-8 gap-1 max-h-64 overflow-y-auto">
                        {EMOJI_LIST.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => { insertEmoji(e); }}
                            className="w-8 h-8 rounded-md flex items-center justify-center text-xl hover:bg-muted transition-colors"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <AiImprovePopover text={text} onApply={(newText) => {
                    setText(newText);
                    requestAnimationFrame(() => {
                      if (taRef.current) {
                        taRef.current.style.height = "40px";
                        taRef.current.style.height = Math.min(taRef.current.scrollHeight, 120) + "px";
                        taRef.current.focus();
                      }
                    });
                  }} />
                </div>

                {/* Textarea */}
                <textarea
                  ref={taRef}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    e.target.style.height = "40px";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Digite uma mensagem..."
                  rows={1}
                  className="flex-1 min-w-0 resize-none outline-none text-base sm:text-sm bg-transparent border-0 px-1 py-2.5 text-foreground placeholder:text-muted-foreground leading-relaxed self-center"
                  style={{ height: 40, maxHeight: 120 }}
                />

                {/* Right action: send when typing, mic when empty */}
                <div className="flex items-center pb-0.5 flex-shrink-0">
                  {text.trim() ? (
                    <button
                      onClick={send}
                      title="Enviar mensagem (Enter)"
                      aria-label="Enviar mensagem"
                      className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95 animate-scale-in"
                    >
                      <Send size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      title="Gravar áudio"
                      aria-label="Gravar áudio"
                      className="w-10 h-10 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-all active:scale-95"
                    >
                      <Mic size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {lightboxMsg && lightboxMsg.mediaUrl && (
        <ImageLightbox
          src={lightboxMsg.mediaUrl}
          fileName={lightboxMsg.fileName}
          createdAt={lightboxMsg.created_at}
          onClose={() => setLightboxMsg(null)}
        />
      )}
    </div>
  );
}
