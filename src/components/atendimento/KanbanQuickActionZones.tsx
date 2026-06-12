import { useState } from "react";
import { Trash2, XCircle, CheckCircle2, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ZoneId = "trash" | "lost" | "won" | "transfer";

interface Zone {
  id: ZoneId;
  Icon: typeof Trash2;
  label: string;
  desc: string;
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  hover: string;
  ring: string;
}

const ZONES: Zone[] = [
  {
    id: "trash",
    Icon: Trash2,
    label: "Lixeira",
    desc: "Mover pra lixeira",
    bg: "bg-red-50/80 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900/60",
    iconBg: "bg-red-100 dark:bg-red-500/20",
    iconColor: "text-red-600 dark:text-red-400",
    hover: "hover:bg-red-100/90 hover:border-red-400 dark:hover:bg-red-950/50 dark:hover:border-red-700",
    ring: "ring-red-500/30",
  },
  {
    id: "lost",
    Icon: XCircle,
    label: "Perder/Cancelar",
    desc: "Marcar como perdido",
    bg: "bg-orange-50/80 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-900/60",
    iconBg: "bg-orange-100 dark:bg-orange-500/20",
    iconColor: "text-orange-600 dark:text-orange-400",
    hover: "hover:bg-orange-100/90 hover:border-orange-400 dark:hover:bg-orange-950/50 dark:hover:border-orange-700",
    ring: "ring-orange-500/30",
  },
  {
    id: "won",
    Icon: CheckCircle2,
    label: "Ganhar/Concluir",
    desc: "Fechar como ganho",
    bg: "bg-emerald-50/80 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-900/60",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    hover: "hover:bg-emerald-100/90 hover:border-emerald-400 dark:hover:bg-emerald-950/50 dark:hover:border-emerald-700",
    ring: "ring-emerald-500/30",
  },
  {
    id: "transfer",
    Icon: ArrowLeftRight,
    label: "Transferir",
    desc: "Mover pra outro workspace",
    bg: "bg-blue-50/80 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900/60",
    iconBg: "bg-blue-100 dark:bg-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    hover: "hover:bg-blue-100/90 hover:border-blue-400 dark:hover:bg-blue-950/50 dark:hover:border-blue-700",
    ring: "ring-blue-500/30",
  },
];

interface Props {
  visible: boolean;
  currentStatus?: string | null;
  onAction: (zoneId: ZoneId) => void;
}

export function KanbanQuickActionZones({ visible, currentStatus, onAction }: Props) {
  const [activeZone, setActiveZone] = useState<ZoneId | null>(null);

  const visibleZones = ZONES.filter((z) => z.id !== currentStatus);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 pb-3 px-4 md:px-6 pointer-events-none animate-in slide-in-from-bottom-4 duration-200"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 max-w-7xl mx-auto pointer-events-auto">
        {visibleZones.map((zone) => {
          const isActive = activeZone === zone.id;
          return (
            <button
              key={zone.id}
              onDragEnter={(e) => {
                e.preventDefault();
                setActiveZone(zone.id);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setActiveZone((cur) => (cur === zone.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                setActiveZone(null);
                onAction(zone.id);
              }}
              onClick={() => onAction(zone.id)}
              className={cn(
                "group relative overflow-hidden border-2 border-dashed rounded-2xl transition-all duration-200",
                "px-4 py-5 flex flex-col items-center justify-center gap-2 text-center cursor-pointer",
                "backdrop-blur-md shadow-lg",
                zone.bg,
                zone.border,
                zone.hover,
                isActive && `scale-[1.04] border-solid shadow-2xl ring-4 ${zone.ring}`
              )}
              style={{ minHeight: 110 }}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform",
                  zone.iconBg,
                  isActive && "scale-110"
                )}
              >
                <zone.Icon className={cn("w-6 h-6", zone.iconColor)} />
              </div>
              <div className="space-y-0.5">
                <div className={cn("text-[14px] font-bold", zone.iconColor)}>{zone.label}</div>
                <div className="text-[10.5px] text-muted-foreground">
                  {isActive ? "Solte aqui ↓" : zone.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
