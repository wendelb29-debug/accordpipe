import { useEffect, useRef, useState } from "react";
import { Check, Circle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useOperatorStatus, type OperatorStatusValue } from "@/hooks/useOperatorStatus";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  className?: string;
}

const STATES: {
  value: OperatorStatusValue;
  label: string;
  dot: string;
  desc: string;
}[] = [
  { value: "available", label: "Online", dot: "bg-emerald-500", desc: "Recebendo novas conversas da fila" },
  { value: "busy", label: "Ocupado", dot: "bg-amber-500", desc: "Não roteia novas conversas automaticamente" },
  { value: "away", label: "Em Pausa", dot: "bg-blue-500", desc: "Pausa temporária" },
  { value: "unavailable", label: "Offline", dot: "bg-muted-foreground/60", desc: "Sem receber conversas" },
];

export function AgentPresenceMenu({ className }: Props) {
  const { user } = useAuth();
  const { status, updating, setOperatorStatus, loading } = useOperatorStatus();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = STATES.find((s) => s.value === status) ?? STATES[3];
  const initials = (user?.user_metadata?.full_name || user?.email || "?")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={`Status: ${current.label}`}
        aria-label={`Status do agente: ${current.label}`}
        disabled={loading}
        className="flex-shrink-0 flex items-center gap-1 rounded-full pl-0.5 pr-1.5 py-0.5 border border-border/50 bg-muted/60 hover:bg-muted transition-all"
      >
        <div className="relative">
          <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-[11px] font-semibold flex items-center justify-center">
            {initials}
          </div>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background",
              current.dot
            )}
          />
        </div>
        <ChevronDown size={12} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-popover shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50 text-[11px] uppercase tracking-wide text-muted-foreground">
            Status do agente
          </div>
          {STATES.map((s) => {
            const active = s.value === status;
            return (
              <button
                key={s.value}
                onClick={async () => {
                  const ok = await setOperatorStatus(s.value);
                  setOpen(false);
                  if (ok !== false) toast.success(`Status: ${s.label}`);
                }}
                disabled={updating}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors",
                  active && "bg-muted/60"
                )}
              >
                <Circle
                  size={10}
                  className={cn("flex-shrink-0", s.dot, "rounded-full")}
                  fill="currentColor"
                  strokeWidth={0}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-foreground font-medium">{s.label}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{s.desc}</div>
                </div>
                {active && <Check size={14} className="text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
