import { useEffect, useMemo, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuickReplies, QuickReply } from "@/hooks/useQuickReplies";

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
  const { replies, isLoading } = useQuickReplies(companyId);
  const [activeIdx, setActiveIdx] = useState(0);
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
    if (!open) return;
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
  }, [open, filtered, activeIdx, onClose, onPick]);

  if (!open) return null;

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-2 mb-2 w-[min(360px,calc(100vw-2rem))] max-h-72 overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2"
    >
      <div className="px-3 py-2 border-b border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
        <Zap size={12} className="text-primary" />
        <span className="font-medium text-foreground">Respostas rápidas</span>
        {q && <span className="ml-auto opacity-60">/{q}</span>}
      </div>
      {isLoading ? (
        <div className="px-3 py-4 text-xs text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="px-3 py-4 text-xs text-muted-foreground">
          {replies.length === 0
            ? "Nenhuma resposta rápida cadastrada. Peça ao admin para criar."
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
              "w-full text-left px-3 py-2 flex flex-col gap-0.5 border-b border-border/40 last:border-b-0",
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
    </div>
  );
}
