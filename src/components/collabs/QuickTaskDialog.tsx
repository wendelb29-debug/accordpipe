import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Flame, X, Paperclip, ListChecks, Calendar as CalendarIcon, Loader2, User as UserIcon, Hash } from "lucide-react";
import { HexAvatar, hexGradientFor } from "@/components/collabs/HexAvatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface QuickTaskMember {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationName: string;
  senderName: string;
  messageText: string;
  members: QuickTaskMember[];
  currentUserId: string;
  onCreate: (data: {
    title: string;
    assigneeId: string;
    dueAt: string;
    description: string;
  }) => Promise<void>;
}

function defaultDeadline() {
  const d = new Date();
  d.setDate(d.getDate() + 8);
  d.setHours(19, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function formatDeadline(iso: string) {
  if (!iso) return "Sem prazo";
  const d = new Date(iso);
  const day = d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day} ${time}`;
}

export function QuickTaskDialog({
  open,
  onOpenChange,
  conversationName,
  senderName,
  messageText,
  members,
  currentUserId,
  onCreate,
}: Props) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const [dueAt, setDueAt] = useState(defaultDeadline());
  const [showAssignee, setShowAssignee] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setAssigneeId(currentUserId);
      setDueAt(defaultDeadline());
      setShowAssignee(false);
      setShowDate(false);
    }
  }, [open, currentUserId]);

  const assignee = useMemo(
    () => members.find((m) => m.id === assigneeId) || members[0] || null,
    [members, assigneeId]
  );

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Dê um nome para a tarefa");
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        assigneeId,
        dueAt,
        description: messageText,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao criar tarefa", { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-md rounded-2xl overflow-hidden border-border">
        {/* Header / title input */}
        <div className="px-5 pt-4 pb-3 flex items-center gap-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome da Tarefa"
            className="flex-1 text-[20px] font-semibold bg-transparent outline-none text-foreground placeholder:text-muted-foreground/70"
          />
          <button
            title="Alta prioridade"
            className="w-8 h-8 rounded-full flex items-center justify-center text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10"
          >
            <Flame className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Context card */}
        <div className="mx-5 mb-4 rounded-xl border border-border bg-muted/40 p-3">
          <div className="flex items-start gap-2.5">
            <div className="text-2xl leading-none text-muted-foreground select-none">"</div>
            <div className="flex-1 min-w-0 -mt-0.5">
              <div className="text-[12.5px] text-muted-foreground">
                Bate-papo: <span className="text-sky-500 font-medium">{conversationName}</span>
              </div>
              <div className="text-[13px] font-medium text-foreground mt-1">{senderName}</div>
              <div className="text-[13px] text-foreground/80 mt-0.5 break-words">
                {messageText || "(sem texto)"}
              </div>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="px-5 pb-2 space-y-3">
          <div className="flex items-center gap-3 text-[13.5px]">
            <span className="w-24 text-muted-foreground">Responsável:</span>
            <div className="relative">
              <button
                onClick={() => setShowAssignee((v) => !v)}
                className="flex items-center gap-2 hover:bg-accent rounded-full pl-1 pr-2.5 py-1 transition"
              >
                {assignee ? (
                  <>
                    <HexAvatar
                      src={assignee.avatar_url || undefined}
                      initials={assignee.name.slice(0, 2).toUpperCase()}
                      background={hexGradientFor(assignee.name)}
                      size={24}
                    />
                    <span className="font-medium text-foreground">{assignee.name}</span>
                  </>
                ) : (
                  <>
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Selecionar</span>
                  </>
                )}
              </button>
              {showAssignee && (
                <div className="absolute z-20 mt-1 w-56 max-h-60 overflow-y-auto bg-popover border border-border rounded-xl shadow-xl p-1">
                  {members.length === 0 && (
                    <div className="text-[12.5px] text-muted-foreground text-center py-3">
                      Sem membros
                    </div>
                  )}
                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setAssigneeId(m.id);
                        setShowAssignee(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-accent",
                        m.id === assigneeId && "bg-accent"
                      )}
                    >
                      <HexAvatar
                        src={m.avatar_url || undefined}
                        initials={m.name.slice(0, 2).toUpperCase()}
                        background={hexGradientFor(m.name)}
                        size={22}
                      />
                      <span className="text-[13px] text-foreground">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-[13.5px]">
            <span className="w-24 text-muted-foreground">Prazo:</span>
            <div className="relative">
              <button
                onClick={() => setShowDate((v) => !v)}
                className="flex items-center gap-1.5 hover:bg-accent rounded-full px-2.5 py-1 transition"
              >
                <CalendarIcon className="h-4 w-4 text-sky-500" />
                <span className="font-medium text-foreground">{formatDeadline(dueAt)}</span>
              </button>
              {showDate && (
                <div className="absolute z-20 mt-1 bg-popover border border-border rounded-xl shadow-xl p-2">
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="text-[13px] bg-transparent outline-none text-foreground px-2 py-1.5"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chips row */}
        <div className="px-5 py-3 flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-[12.5px] text-muted-foreground hover:bg-accent transition">
            <Paperclip className="h-3.5 w-3.5" />
            Arquivos
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-[12.5px] text-muted-foreground hover:bg-accent transition">
            <ListChecks className="h-3.5 w-3.5" />
            Listas de verificação
          </button>
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-full border border-border bg-muted/40 text-[12.5px]">
            <Hash className="h-3 w-3 text-muted-foreground" />
            <span className="text-foreground font-medium">{conversationName}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center gap-3 bg-muted/20">
          <button
            onClick={handleCreate}
            disabled={submitting || !title.trim()}
            className="h-9 px-5 rounded-md bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13.5px] font-medium flex items-center gap-1.5 transition"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Criar
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[13.5px] text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          <span className="ml-auto text-[12.5px] text-sky-500 cursor-pointer hover:underline">
            Formulário detalhado
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
