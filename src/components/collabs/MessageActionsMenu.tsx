import { useState } from "react";
import {
  Reply,
  Copy,
  Forward,
  Sparkles,
  CheckSquare,
  ChevronRight,
  Trash2,
  Check,
  Pencil,
  Pin,
  PinOff,
  Languages,
  Download,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface MessageActionsMenuProps {
  message: {
    id: string;
    sender_id: string | null;
    content: string | null;
    attachments?: Array<{ kind: string; name?: string; url?: string }>;
    is_pinned?: boolean | null;
  };
  currentUserId: string;
  isOwn: boolean;
  tone?: "mine" | "other";
  onReply: () => void;
  onCreateTask?: () => void;
  onForward?: () => void;
  onSelect?: () => void;
  onAskCopilot?: () => void;
  onStartEdit?: () => void;
  onAfterMutation?: () => void;
}

export function MessageActionsMenu({
  message,
  isOwn,
  tone = "other",
  onReply,
  onCreateTask,
  onForward,
  onSelect,
  onAskCopilot,
  onStartEdit,
  onAfterMutation,
}: MessageActionsMenuProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content || "");
  const [busy, setBusy] = useState(false);

  const plain = (message.content || "").trim();

  const handleCopy = async () => {
    const text =
      plain ||
      message.attachments?.map((a) => a.url || a.name).filter(Boolean).join("\n") ||
      "";
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensagem copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    const { error } = await supabase.from("collab_messages").delete().eq("id", message.id);
    setBusy(false);
    if (error) {
      toast.error("Erro ao excluir", { description: error.message });
      return;
    }
    toast.success("Mensagem excluída");
    setConfirmDelete(false);
    onAfterMutation?.();
  };

  const handleSaveEdit = async () => {
    const next = editText.trim();
    if (!next || next === plain) {
      setEditing(false);
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("collab_messages")
      .update({ content: next })
      .eq("id", message.id);
    setBusy(false);
    if (error) {
      toast.error("Erro ao editar", { description: error.message });
      return;
    }
    toast.success("Mensagem editada");
    setEditing(false);
    onAfterMutation?.();
  };

  const handleTogglePin = async () => {
    setBusy(true);
    const next = !message.is_pinned;
    const { error } = await supabase
      .from("collab_messages")
      .update({ is_pinned: next } as any)
      .eq("id", message.id);
    setBusy(false);
    if (error) {
      toast.error("Erro", { description: error.message });
      return;
    }
    toast.success(next ? "Mensagem fixada" : "Mensagem desafixada");
    onAfterMutation?.();
  };

  const handleDownloadAttachments = () => {
    const atts = (message.attachments || []).filter((a) => a.url);
    if (atts.length === 0) {
      toast.info("Esta mensagem não tem anexos");
      return;
    }
    atts.forEach((a) => {
      const link = document.createElement("a");
      link.href = a.url!;
      link.download = a.name || "anexo";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            title="Mais ações"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
              tone === "mine"
                ? "text-white/90 hover:bg-white/15"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <MoreHorizontal className="h-[16px] w-[16px]" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={tone === "mine" ? "end" : "start"}
          sideOffset={6}
          className="w-[230px] p-1.5 rounded-2xl border-border shadow-2xl bg-popover"
        >
          <Item icon={Reply} label="Responder" onSelect={onReply} />
          <Item icon={Copy} label="Copiar" onSelect={handleCopy} />
          <Item
            icon={Forward}
            label="Encaminhar"
            onSelect={() => (onForward ? onForward() : toast.info("Encaminhar — em breve"))}
          />
          <DropdownMenuSeparator className="my-1 bg-border" />
          <Item
            icon={Sparkles}
            label="Pergunte ao CoPilot"
            accent="violet"
            onSelect={() => (onAskCopilot ? onAskCopilot() : toast.info("CoPilot — em breve"))}
          />
          <Item
            icon={CheckSquare}
            label="Criar tarefa"
            onSelect={() => (onCreateTask ? onCreateTask() : toast.info("Criar tarefa — em breve"))}
          />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="rounded-lg px-3 py-2 cursor-pointer text-[13px] focus:bg-accent data-[state=open]:bg-accent gap-3">
              <MoreHorizontal className="h-[16px] w-[16px] text-muted-foreground shrink-0" />
              <span className="flex-1">Outro</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent
              className="w-[210px] p-1.5 rounded-2xl border-border shadow-2xl bg-popover"
              sideOffset={4}
            >
              {isOwn && plain && (
                <Item
                  icon={Pencil}
                  label="Editar"
                  onSelect={() => {
                    if (onStartEdit) {
                      onStartEdit();
                    } else {
                      setEditText(plain);
                      setEditing(true);
                    }
                  }}
                />
              )}
              <Item
                icon={message.is_pinned ? PinOff : Pin}
                label={message.is_pinned ? "Desafixar" : "Fixar"}
                onSelect={handleTogglePin}
              />
              <Item
                icon={Languages}
                label="Traduzir"
                onSelect={() => toast.info("Tradução — em breve")}
              />
              {(message.attachments?.length ?? 0) > 0 && (
                <Item icon={Download} label="Baixar anexos" onSelect={handleDownloadAttachments} />
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {isOwn && (
            <>
              <DropdownMenuSeparator className="my-1 bg-border" />
              <Item
                icon={Trash2}
                label="Excluir"
                accent="red"
                onSelect={() => setConfirmDelete(true)}
              />
            </>
          )}

          <Item
            icon={Check}
            label="Selecionar"
            onSelect={() =>
              onSelect ? onSelect() : toast.info("Seleção múltipla — em breve")
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem será removida para todos os participantes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busy}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-300"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={editing} onOpenChange={setEditing}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar mensagem</AlertDialogTitle>
          </AlertDialogHeader>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            autoFocus
            className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-[14px] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition resize-none"
            placeholder="Conteúdo da mensagem"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveEdit}
              disabled={busy}
              className="bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-300"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Item({
  icon: Icon,
  label,
  onSelect,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onSelect: () => void;
  accent?: "red" | "violet";
}) {
  const color =
    accent === "red"
      ? "text-red-500 focus:bg-red-50 dark:focus:bg-red-500/10"
      : accent === "violet"
      ? "text-violet-600 focus:bg-violet-50 dark:focus:bg-violet-500/10"
      : "text-foreground focus:bg-accent";
  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className={`rounded-lg px-3 py-2 cursor-pointer text-[13px] gap-3 ${color}`}
    >
      <Icon
        className={`h-[16px] w-[16px] shrink-0 ${
          accent === "red"
            ? "text-red-500"
            : accent === "violet"
            ? "text-violet-600"
            : "text-muted-foreground"
        }`}
      />
      <span className="flex-1">{label}</span>
    </DropdownMenuItem>
  );
}
