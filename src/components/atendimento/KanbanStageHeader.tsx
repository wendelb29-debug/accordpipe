import { useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DynamicStage, STAGES, ADMIN_STAGES, ALL_STAGES } from "@/hooks/useCrmLeads";
import { Skeleton } from "@/components/ui/skeleton";

interface KanbanStageHeaderProps {
  currentStageId: string;
  stageEnteredAt: string;
  dynamicStages?: DynamicStage[];
  isAdminPipeline?: boolean;
  stagesLoading?: boolean;
  saving?: boolean;
  onChangeStage: (stageId: string) => void;
}

export function KanbanStageHeader({
  currentStageId,
  stageEnteredAt,
  dynamicStages,
  isAdminPipeline,
  stagesLoading,
  saving,
  onChangeStage,
}: KanbanStageHeaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const stages = useMemo(() => {
    if (dynamicStages && dynamicStages.length > 0) return dynamicStages;
    return isAdminPipeline ? [...ADMIN_STAGES] : [...STAGES];
  }, [dynamicStages, isAdminPipeline]);

  const currentStageIndex = stages.findIndex((s) => s.id === currentStageId);

  const getDaysInStage = () => {
    const entered = new Date(stageEnteredAt);
    const now = new Date();
    return Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24));
  };

  const currentStageName =
    stages.find((s) => s.id === currentStageId)?.title ||
    ALL_STAGES.find((s) => s.id === currentStageId)?.title ||
    currentStageId;

  // Auto-scroll to active stage
  useEffect(() => {
    if (scrollRef.current && currentStageIndex >= 0) {
      const container = scrollRef.current;
      const activeBtn = container.children[currentStageIndex] as HTMLElement | undefined;
      if (activeBtn) {
        const offset = activeBtn.offsetLeft - container.offsetWidth / 2 + activeBtn.offsetWidth / 2;
        container.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
      }
    }
  }, [currentStageIndex]);

  if (stagesLoading) {
    return (
      <div className="flex gap-0.5 overflow-hidden pb-1 -mb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7 flex-1 min-w-[70px] rounded-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <p className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight">
        Etapa: <strong>{currentStageName}</strong>
        {" · "}{getDaysInStage()}d
      </p>
      <div
        ref={scrollRef}
        className="flex gap-px overflow-x-auto pb-0.5 -mb-0.5 scrollbar-hide"
      >
        {stages.map((stage, i) => {
          const isActive = i === currentStageIndex;
          const isPast = i < currentStageIndex;

          const bgStyle: React.CSSProperties = {};
          let colorClass = "";

          if (isActive) {
            if (stage.rawColor) {
              bgStyle.backgroundColor = stage.rawColor;
              colorClass = "text-white";
            } else {
              colorClass = `${stage.color} text-white`;
            }
          } else if (isPast) {
            if (stage.rawColor) {
              bgStyle.backgroundColor = stage.rawColor;
              bgStyle.opacity = 0.25;
            }
            colorClass = isPast && !stage.rawColor ? "bg-primary/20 text-primary" : "";
          }

          return (
            <button
              key={stage.id}
              onClick={() => onChangeStage(stage.id)}
              disabled={saving}
              style={bgStyle}
              className={cn(
                "flex-shrink-0 min-w-[60px] sm:flex-1 py-1 text-[9px] sm:text-[10px] font-medium rounded-sm transition-all text-center truncate px-1 relative",
                colorClass,
                !isActive && !isPast && !stage.rawColor && "bg-muted text-muted-foreground hover:bg-muted/80",
                !isActive && !isPast && stage.rawColor && "text-muted-foreground hover:opacity-80",
                saving && "opacity-50 cursor-not-allowed"
              )}
              title={stage.title}
            >
              {stage.title}
              {isActive && (
                <span className="block text-[8px] sm:text-[9px] opacity-80">{getDaysInStage()}d</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
