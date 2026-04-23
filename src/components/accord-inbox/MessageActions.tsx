import { useEffect, useRef, useState } from "react";
import { Reply, Smile, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface MessageActionsProps {
  isOut: boolean;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onCopy?: () => void;
  copyText?: string;
  onClose: () => void;
  anchorRect: DOMRect | null;
}

/**
 * Floating action toolbar shown above a message bubble after a left-click.
 * Compact, non-intrusive, with an inline emoji picker.
 */
export function MessageActions({
  isOut, onReply, onReact, onCopy, copyText, onClose, anchorRect,
}: MessageActionsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    // Defer so the originating click doesn't immediately close it
    const t = setTimeout(() => {
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!anchorRect) return null;

  // Position above the bubble, aligned to the same side
  const top = Math.max(8, anchorRect.top - 48);
  const style: React.CSSProperties = isOut
    ? { top, right: Math.max(8, window.innerWidth - anchorRect.right) }
    : { top, left: Math.max(8, anchorRect.left) };

  const handleCopy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => { setCopied(false); onClose(); }, 700);
    } catch { /* noop */ }
    onCopy?.();
  };

  return (
    <div
      ref={ref}
      className="fixed z-50 animate-scale-in"
      style={style}
    >
      <div className="flex items-center gap-0.5 bg-popover border border-border/60 rounded-full shadow-lg px-1 py-1 backdrop-blur-sm">
        {showEmojis ? (
          <div className="flex items-center gap-0.5 px-1">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => { onReact(e); onClose(); }}
                className="w-8 h-8 flex items-center justify-center rounded-full text-lg hover:bg-muted transition-transform hover:scale-125"
                aria-label={`Reagir com ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowEmojis(true)}
              title="Reagir"
              className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <Smile size={15} />
            </button>
            <button
              onClick={() => { onReply(); onClose(); }}
              title="Responder"
              className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <Reply size={15} />
            </button>
            {copyText && (
              <button
                onClick={handleCopy}
                title="Copiar"
                className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                {copied ? <Check size={15} className={cn("text-emerald-500")} /> : <Copy size={15} />}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
