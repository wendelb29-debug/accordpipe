import { useState, useRef, useEffect } from "react";
import {
  Search, ArrowLeftRight, Info, X, Paperclip, Image, Mic, Trash2,
  Send, Play, Pause, FileText,
  MoreVertical, Users, Check, CheckCheck, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiImprovePopover } from "./AiImprovePopover";
import { AudioVisualizer } from "./AudioVisualizer";

interface ChatMessage {
  id: string;
  message: string;
  direction: "inbound" | "outbound" | string;
  created_at: string;
  type?: "text" | "audio" | "image" | "file" | string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  status?: string;
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
    options?: { messageType?: "text" | "image" | "audio" | "file"; mediaUrl?: string; fileName?: string }
  ) => void;
  onTransfer?: (contactId: string) => void;
  onAssignToMe?: (contactId: string) => void;
  isAdmin?: boolean;
  companyId?: string | null;
  onToggleInfo?: () => void;
  showInfo?: boolean;
  onCreateDemand?: () => void;
  onUpdateStatus?: (contactId: string, status: string) => void;
  onBack?: () => void;
}

function ContactAvatar({ contact, size = 36 }: { contact: ChatContact; size?: number }) {
  const initials = contact.name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
  if (contact.profilePicUrl) {
    return (
      <img src={contact.profilePicUrl} alt={contact.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
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

function FileBubble({ direction, fileName, fileSize, src }: { direction: string; fileName?: string; fileSize?: string; src?: string }) {
  const isOut = direction === "outbound";
  const content = (
    <div className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-2xl",
      isOut ? "bg-primary rounded-br-sm" : "bg-muted/80 dark:bg-muted/50 rounded-bl-sm border border-border/40"
    )}>
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
        isOut ? "bg-white/15" : "bg-primary/10"
      )}>
        <FileText size={16} className={isOut ? "text-white" : "text-primary"} />
      </div>
      <div className="min-w-0">
        <p className={cn("text-[12px] font-medium truncate max-w-[180px]", isOut ? "text-white" : "text-foreground")}>{fileName || "arquivo"}</p>
        <p className={cn("text-[11px]", isOut ? "text-white/60" : "text-muted-foreground")}>{fileSize || (src ? "Baixar" : "–")}</p>
      </div>
    </div>
  );
  if (!src) return content;
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" download={fileName} className="block hover:opacity-90 transition">
      {content}
    </a>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isOut = msg.direction === "outbound";
  const time = msg.created_at
    ? new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "";
  return (
    <div className={cn("flex flex-col max-w-[68%]", isOut ? "self-end items-end" : "self-start items-start")}>
      {msg.type === "audio" ? (
        <AudioPlayer direction={msg.direction} src={msg.mediaUrl} />
      ) : msg.type === "file" || msg.type === "document" ? (
        <FileBubble direction={msg.direction} fileName={msg.fileName || msg.message} fileSize={msg.fileSize} src={msg.mediaUrl} />
      ) : msg.type === "image" ? (
        <a
          href={msg.mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("rounded-2xl overflow-hidden block", isOut ? "rounded-br-sm" : "rounded-bl-sm border border-border/40")}
        >
          {msg.mediaUrl ? (
            <img src={msg.mediaUrl} alt={msg.fileName || "imagem"} className="w-64 max-h-72 object-cover" />
          ) : (
            <div className="w-52 h-36 bg-muted/60 flex items-center justify-center text-muted-foreground text-xs gap-2">
              <Image size={16} />
              {msg.fileName || "imagem.jpg"}
            </div>
          )}
        </a>
      ) : (
        <div className={cn(
          "px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed break-words",
          isOut
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-background dark:bg-muted/50 text-foreground rounded-bl-sm border border-border/40"
        )}>
          {msg.message}
        </div>
      )}
      <div className="flex items-center gap-1 mt-1 px-0.5">
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
  contact, messages, onSendMessage, onTransfer, onToggleInfo, showInfo, onUpdateStatus, companyId,
  onBack,
}: InboxChatProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordStream, setRecordStream] = useState<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  const isClosed = contact?.conversationStatus === "encerrado" || contact?.conversationStatus === "finalizado";

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages]);

  const send = () => {
    if (!text.trim() || isClosed) return;
    onSendMessage(text.trim());
    setText("");
    if (taRef.current) taRef.current.style.height = "40px";
  };

  const uploadAndSend = async (file: File, messageType: "image" | "audio" | "file") => {
    if (!companyId || !contact) return;
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
      onSendMessage(file.name, { messageType, mediaUrl: pub.publicUrl, fileName: file.name });
    } catch (err: any) {
      const { toast } = await import("sonner");
      toast.error(err?.message || "Falha no upload do arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "audio" | "file") => {
    const f = e.target.files?.[0];
    if (f) uploadAndSend(f, type);
    e.target.value = "";
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
      <div className="flex-1 flex flex-col items-center justify-center gap-4 relative overflow-hidden bg-muted/20 dark:bg-background/60">
        <AccordWatermark />
        <div className="relative z-10 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users size={24} className="text-primary opacity-60" />
          </div>
          <p className="text-sm font-medium text-foreground/70">Selecione uma conversa</p>
          <p className="text-xs text-muted-foreground max-w-[180px] leading-relaxed">
            Escolha um atendimento ao lado para iniciar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden bg-background">
      <div className="flex items-center gap-2 px-2 sm:px-4 py-2.5 sm:py-3 border-b border-border/60 bg-background flex-shrink-0">
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
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all">
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
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:border-red-900 transition-all">
              <X size={15} />
            </button>
          )}
          <button aria-label="Mais opções" className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all">
            <MoreVertical size={15} />
          </button>
        </div>
      </div>

      <div ref={msgsRef} className="flex-1 overflow-y-auto flex flex-col gap-1.5 py-4 px-5 relative">
        <AccordWatermark />
        <div className="relative z-10 flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-[11px] text-muted-foreground/70 px-2 bg-background rounded-full border border-border/30 py-0.5">
            Hoje, {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}
          </span>
          <div className="flex-1 h-px bg-border/40" />
        </div>
        <div className="relative z-10 flex flex-col gap-1.5">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </div>
      </div>

      <div className="border-t border-border/60 px-2 sm:px-4 py-2 sm:py-3 bg-background flex-shrink-0 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
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
              <div className="flex items-end gap-1 bg-muted/50 border border-border/50 rounded-2xl px-1.5 py-1 focus-within:border-primary/50 focus-within:bg-muted/30 transition-colors">
                {/* Left actions: attachments + AI */}
                <div className="flex items-center gap-0.5 pb-0.5 flex-shrink-0">
                  <ToolBtn icon={<Paperclip size={16} />} title="Anexar arquivo" onClick={() => fileInputRef.current?.click()} className="w-9 h-9 rounded-full" />
                  <ToolBtn icon={<Image size={16} />} title="Enviar imagem" onClick={() => imageInputRef.current?.click()} className="w-9 h-9 rounded-full" />
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
    </div>
  );
}
