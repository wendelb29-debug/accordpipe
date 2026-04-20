import { useState, useRef, useEffect } from "react";
import {
  Search, ArrowLeftRight, Info, X, Paperclip, Image, Mic,
  Square, Send, Bold, Italic, Zap, FileText, Play, Pause,
  MoreVertical, Users, Check, CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiImprovePopover } from "./AiImprovePopover";

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

function AudioPlayer({ direction }: { direction: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toggle = () => {
    if (playing) {
      setPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) { setPlaying(false); if (intervalRef.current) clearInterval(intervalRef.current); return 0; }
          return p + 2;
        });
      }, 120);
    }
  };
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);
  const isOut = direction === "outbound";
  return (
    <div className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-2xl min-w-[190px]",
      isOut ? "bg-primary rounded-br-sm" : "bg-muted/80 dark:bg-muted/50 rounded-bl-sm border border-border/40"
    )}>
      <button onClick={toggle}
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
      <span className={cn("text-[11px] flex-shrink-0", isOut ? "text-white/70" : "text-muted-foreground")}>0:24</span>
    </div>
  );
}

function FileBubble({ direction, fileName, fileSize }: { direction: string; fileName?: string; fileSize?: string }) {
  const isOut = direction === "outbound";
  return (
    <div className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-2xl",
      isOut ? "bg-primary rounded-br-sm" : "bg-muted/80 dark:bg-muted/50 rounded-bl-sm border border-border/40"
    )}>
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
        isOut ? "bg-white/15" : "bg-primary/10"
      )}>
        <FileText size={16} className={isOut ? "text-white" : "text-primary"} />
      </div>
      <div>
        <p className={cn("text-[12px] font-medium", isOut ? "text-white" : "text-foreground")}>{fileName || "arquivo.pdf"}</p>
        <p className={cn("text-[11px]", isOut ? "text-white/60" : "text-muted-foreground")}>{fileSize || "–"}</p>
      </div>
    </div>
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
        <AudioPlayer direction={msg.direction} />
      ) : msg.type === "file" ? (
        <FileBubble direction={msg.direction} fileName={msg.fileName} fileSize={msg.fileSize} />
      ) : msg.type === "image" ? (
        <div className={cn("rounded-2xl overflow-hidden", isOut ? "rounded-br-sm" : "rounded-bl-sm border border-border/40")}>
          <div className="w-52 h-36 bg-muted/60 flex items-center justify-center text-muted-foreground text-xs gap-2">
            <Image size={16} />
            {msg.fileName || "imagem.jpg"}
          </div>
        </div>
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
}: InboxChatProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isClosed = contact?.conversationStatus === "encerrado" || contact?.conversationStatus === "finalizado";

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages]);

  const send = () => {
    if (!text.trim() || isClosed) return;
    onSendMessage(text.trim());
    setText("");
    if (taRef.current) taRef.current.style.height = "38px";
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
        await uploadAndSend(file, "audio");
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch {
      const { toast } = await import("sonner");
      toast.error("Não foi possível acessar o microfone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
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
    <div className="flex-1 flex flex-col min-w-0 bg-background">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/60 bg-background flex-shrink-0">
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
        <StatusPill status={contact.conversationStatus} />
        <div className="flex items-center gap-1 ml-2">
          <button className="w-8 h-8 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all">
            <Search size={14} />
          </button>
          {onTransfer && (
            <button onClick={() => onTransfer(contact.id)}
              className="w-8 h-8 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all">
              <ArrowLeftRight size={14} />
            </button>
          )}
          {onToggleInfo && (
            <button onClick={onToggleInfo}
              className={cn("w-8 h-8 rounded-lg border flex items-center justify-center transition-all",
                showInfo ? "border-primary/40 bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}>
              <Info size={14} />
            </button>
          )}
          {onUpdateStatus && (
            <button onClick={() => onUpdateStatus(contact.id, "encerrado")}
              className="w-8 h-8 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:border-red-900 transition-all">
              <X size={14} />
            </button>
          )}
          <button className="w-8 h-8 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all">
            <MoreVertical size={14} />
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

      <div className="border-t border-border/60 px-4 py-3 bg-background flex-shrink-0">
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileChange(e, "file")} />
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "image")} />
        <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileChange(e, "audio")} />

        {isClosed ? (
          <div className="flex items-center justify-between gap-3 py-2">
            <p className="text-sm text-muted-foreground">Atendimento encerrado</p>
            {onUpdateStatus && (
              <button
                onClick={() => onUpdateStatus(contact.id, "em_atendimento")}
                className="px-4 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
              >
                Reabrir atendimento
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 mb-2 pb-2 border-b border-border/40">
              <ToolBtn icon={<Paperclip size={14} />} title="Arquivo" onClick={() => fileInputRef.current?.click()} />
              <ToolBtn icon={<Image size={14} />} title="Imagem" onClick={() => imageInputRef.current?.click()} />
              <ToolBtn icon={<Mic size={14} />} title="Áudio (arquivo)" onClick={() => audioInputRef.current?.click()} />
              <div className="w-px h-4 bg-border/50 mx-1" />
              <ToolBtn icon={<Bold size={13} />} title="Negrito" />
              <ToolBtn icon={<Italic size={13} />} title="Itálico" />
              <div className="w-px h-4 bg-border/50 mx-1" />
              <AiImprovePopover text={text} onApply={(newText) => {
                setText(newText);
                requestAnimationFrame(() => {
                  if (taRef.current) {
                    taRef.current.style.height = "38px";
                    taRef.current.style.height = Math.min(taRef.current.scrollHeight, 90) + "px";
                    taRef.current.focus();
                  }
                });
              }} />
              {uploading && <span className="text-[11px] text-muted-foreground ml-2">Enviando...</span>}
              <ToolBtn icon={<FileText size={14} />} title="Notas internas" className="ml-auto" />
            </div>

            <div className="flex items-end gap-2">
              <textarea
                ref={taRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  e.target.style.height = "38px";
                  e.target.style.height = Math.min(e.target.scrollHeight, 90) + "px";
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Digite uma mensagem..."
                className="flex-1 resize-none outline-none text-sm bg-muted/50 border border-border/50 rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground leading-relaxed focus:border-primary/40 transition-all"
                style={{ height: 38, maxHeight: 90 }}
              />
              <button
                onClick={() => { if (isRecording) stopRecording(); else startRecording(); }}
                title={isRecording ? "Parar gravação" : "Gravar áudio"}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all",
                  isRecording
                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                    : "border-border/50 text-muted-foreground hover:bg-muted/50"
                )}
              >
                {isRecording ? <Square size={14} /> : <Mic size={14} />}
              </button>
              <button onClick={send}
                className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-all">
                <Send size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
