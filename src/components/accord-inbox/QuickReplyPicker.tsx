import { useEffect, useMemo, useRef, useState } from "react";
import { Zap, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuickReplies, QuickReply } from "@/hooks/useQuickReplies";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QuickReplyPickerProps {
  companyId: string | null | undefined;
  open: boolean;
  query: string; // chars typed after the leading "/"
  onClose: () => void;
  onPick: (reply: QuickReply) => void;
}

/**
 * Floating popover that lists quick replies when the user types "/" in the
 * message composer. Filters by shortcut/title/content as they keep typing.
 */
export function QuickReplyPicker({ companyId, open, query, onClose, onPick }: QuickReplyPickerProps) {
  const { replies, isLoading, create } = useQuickReplies(companyId);
  const [activeIdx, setActiveIdx] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return replies;
    return replies.filter((r) => {
      return (
        r.shortcut?.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q)
      );
    });
  }, [replies, q]);

  useEffect(() => { setActiveIdx(0); }, [q, open]);

  useEffect(() => {
    if (!open || createOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (filtered[activeIdx]) {
          e.preventDefault();
          onPick(filtered[activeIdx]);
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, createOpen, filtered, activeIdx, onClose, onPick]);

  if (!open) return null;

  return (
    <>
      <div
        ref={listRef}
        className="absolute bottom-full left-2 mb-2 w-[min(360px,calc(100vw-2rem))] max-h-72 overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2"
      >
        <div className="px-3 py-2 border-b border-border/60 flex items-center gap-2 text-xs text-muted-foreground sticky top-0 bg-popover z-10">
          <Zap size={12} className="text-primary" />
          <span className="font-medium text-foreground">Respostas rápidas</span>
          {q && <span className="ml-auto opacity-60">/{q}</span>}
        </div>
        {isLoading ? (
          <div className="px-3 py-4 text-xs text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground">
            {replies.length === 0
              ? "Nenhuma resposta rápida cadastrada."
              : "Nenhuma resposta encontrada."}
          </div>
        ) : (
          filtered.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => onPick(r)}
              className={cn(
                "w-full text-left px-3 py-2 flex flex-col gap-0.5 border-b border-border/40",
                i === activeIdx ? "bg-primary/10" : "hover:bg-muted/60",
              )}
            >
              <div className="flex items-center gap-2">
                {r.shortcut && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    /{r.shortcut.replace(/^\//, "")}
                  </span>
                )}
                <span className="text-sm font-medium text-foreground truncate">{r.title}</span>
                {r.category && (
                  <span className="ml-auto text-[10px] text-muted-foreground">{r.category}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{r.content}</p>
            </button>
          ))
        )}
        {/* Footer: create new */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setCreateOpen(true); }}
          className="w-full sticky bottom-0 bg-popover border-t border-border/60 px-3 py-2 flex items-center gap-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          <Plus size={14} />
          Criar nova resposta rápida
          {q && <span className="ml-auto font-mono text-[10px] opacity-70">/{q}</span>}
        </button>
      </div>

      <CreateQuickReplyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialShortcut={q}
        isSubmitting={create.isPending}
        onSubmit={async (values) => {
          try {
            await create.mutateAsync(values);
            setCreateOpen(false);
            onClose();
          } catch {
            /* toast handled in hook */
          }
        }}
      />
    </>
  );
}

interface CreateValues {
  title: string;
  shortcut: string;
  category: string;
  content: string;
}

function CreateQuickReplyDialog({
  open,
  onOpenChange,
  initialShortcut,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialShortcut: string;
  isSubmitting: boolean;
  onSubmit: (values: CreateValues) => Promise<void>;
}) {
  const [values, setValues] = useState<CreateValues>({
    title: "",
    shortcut: initialShortcut,
    category: "",
    content: "",
  });

  useEffect(() => {
    if (open) {
      setValues({ title: "", shortcut: initialShortcut, category: "", content: "" });
    }
  }, [open, initialShortcut]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) return toast.error("Título obrigatório");
    if (!values.content.trim()) return toast.error("Conteúdo obrigatório");
    let shortcut = values.shortcut.trim().replace(/^\//, "");
    if (shortcut.includes(" ")) return toast.error("Atalho não pode ter espaços");
    await onSubmit({
      title: values.title.trim(),
      shortcut: shortcut || "",
      category: values.category.trim(),
      content: values.content,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Nova resposta rápida
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Atalho</label>
            <div className="flex items-center gap-1">
              <span className="px-2.5 py-2 bg-muted rounded-md text-sm font-mono text-muted-foreground">/</span>
              <Input
                placeholder="oi"
                value={values.shortcut}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    shortcut: e.target.value.toLowerCase().replace(/\s/g, "").replace(/^\//, ""),
                  }))
                }
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Sem espaços. Ex: /oi, /obrigado</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Título</label>
            <Input
              placeholder="Ex: Saudação amigável"
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Categoria (opcional)</label>
            <Input
              placeholder="Ex: Saudações, Vendas, Suporte"
              value={values.category}
              onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Conteúdo</label>
            <Textarea
              placeholder="Escreva o conteúdo que será inserido…"
              value={values.content}
              onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
              rows={5}
              disabled={isSubmitting}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
