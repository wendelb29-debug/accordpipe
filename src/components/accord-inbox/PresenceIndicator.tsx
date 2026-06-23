import type { PresenceIndicator as PresenceType } from "@/hooks/usePresenceIndicators";
import { Mic, Pencil } from "lucide-react";

interface PresenceIndicatorProps {
  indicators: PresenceType[];
}

function TypingDots() {
  return (
    <div className="flex gap-1 ml-1">
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
      <span
        className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"
        style={{ animationDelay: "0.15s" }}
      />
      <span
        className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"
        style={{ animationDelay: "0.3s" }}
      />
    </div>
  );
}

export function PresenceIndicator({ indicators }: PresenceIndicatorProps) {
  const active = indicators.filter((i) => i.presenceType !== "paused");
  if (active.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 px-3 py-1.5">
      {active.map((indicator) => (
        <div
          key={`${indicator.userId}-${indicator.presenceType}`}
          className="flex items-center gap-2 text-xs"
        >
          {indicator.presenceType === "typing" && (
            <span className="flex items-center gap-1.5 text-primary">
              <Pencil className="w-3 h-3" />
              <span>{indicator.userName} está digitando</span>
              <TypingDots />
            </span>
          )}
          {indicator.presenceType === "recording" && (
            <span className="flex items-center gap-1.5 text-red-500">
              <Mic className="w-3 h-3 animate-pulse" />
              <span>{indicator.userName} está gravando áudio</span>
              <TypingDots />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
