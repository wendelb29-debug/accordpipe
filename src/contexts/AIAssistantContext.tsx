import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AIAssistantMode = "header" | "open" | "hidden";

interface AIAssistantPosition {
  x: number;
  y: number;
}

interface AIAssistantContextValue {
  mode: AIAssistantMode;
  setMode: (m: AIAssistantMode) => void;
  position: AIAssistantPosition;
  setPosition: (p: AIAssistantPosition) => void;
  isDragging: boolean;
  setDragging: (d: boolean) => void;
}

const AIAssistantContext = createContext<AIAssistantContextValue | null>(null);

const STORAGE_KEY = "accord_ai_assistant_state";

function loadInitial(): { mode: AIAssistantMode; position: AIAssistantPosition } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        mode: parsed.mode || "header",
        position: parsed.position || { x: -1, y: -1 },
      };
    }
  } catch {}
  return { mode: "header", position: { x: -1, y: -1 } };
}

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const initial = typeof window !== "undefined"
    ? loadInitial()
    : { mode: "header" as AIAssistantMode, position: { x: -1, y: -1 } };
  const [mode, setModeState] = useState<AIAssistantMode>(initial.mode);
  const [position, setPositionState] = useState<AIAssistantPosition>(initial.position);
  const [isDragging, setDragging] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, position }));
    } catch {}
  }, [mode, position]);

  return (
    <AIAssistantContext.Provider
      value={{ mode, setMode: setModeState, position, setPosition: setPositionState, isDragging, setDragging }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant() {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) throw new Error("useAIAssistant precisa estar dentro de AIAssistantProvider");
  return ctx;
}
