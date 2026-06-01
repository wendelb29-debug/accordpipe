import { useMemo } from "react";
import { Trash2, Send, Loader2 } from "lucide-react";

interface RecordingBarProps {
  duration: number;
  levels: number[];
  sending: boolean;
  onCancel: () => void;
  onSend: () => void;
}

function fmt(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RecordingBar({ duration, levels, sending, onCancel, onSend }: RecordingBarProps) {
  const view = useMemo(() => {
    const slice = levels.slice(-36);
    while (slice.length < 36) slice.unshift(0.1);
    return slice;
  }, [levels]);

  return (
    <div className="flex items-center gap-3 w-full">
      <button
        onClick={onCancel}
        className="w-10 h-10 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition shrink-0"
        title="Cancelar"
        aria-label="Cancelar gravação"
      >
        <Trash2 className="w-[18px] h-[18px]" />
      </button>

      <div className="flex items-center gap-2.5 flex-1 min-w-0 bg-red-50/60 border border-red-100 rounded-full px-3.5 py-2">
        <span className="relative flex items-center justify-center shrink-0">
          <span className="absolute w-3 h-3 rounded-full bg-red-500/40 animate-ping" />
          <span className="relative w-2.5 h-2.5 rounded-full bg-red-500" />
        </span>
        <span className="text-[12.5px] font-semibold text-red-600 tabular-nums shrink-0">
          {fmt(duration)}
        </span>
        <div className="flex-1 min-w-0 flex items-center gap-[2px] h-6 overflow-hidden">
          {view.map((v, i) => {
            const h = Math.max(3, v * 22);
            return (
              <span
                key={i}
                className="rounded-full"
                style={{ width: 2.5, height: h, background: "#dc2626", opacity: 0.45 + v * 0.55 }}
              />
            );
          })}
        </div>
        <span className="hidden sm:inline text-[10.5px] text-gray-500 shrink-0">
          gravando…
        </span>
      </div>

      <button
        onClick={onSend}
        disabled={sending}
        className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 transition active:scale-95 disabled:opacity-60"
        style={{
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          boxShadow: "0 6px 16px -4px rgba(16,185,129,0.5)",
        }}
        title={sending ? "Enviando..." : "Enviar"}
        aria-label="Enviar áudio"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>
    </div>
  );
}
