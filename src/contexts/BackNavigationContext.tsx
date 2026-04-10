import { createContext, useContext, useRef, useCallback, ReactNode } from "react";

type BackHandler = () => boolean; // return true if handled

interface BackNavigationContextType {
  pushBackHandler: (handler: BackHandler) => () => void;
  handleBack: () => void;
}

const BackNavigationContext = createContext<BackNavigationContextType | undefined>(undefined);

export function BackNavigationProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<BackHandler[]>([]);

  const pushBackHandler = useCallback((handler: BackHandler) => {
    handlersRef.current.push(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter((h) => h !== handler);
    };
  }, []);

  const handleBack = useCallback(() => {
    // Try handlers from last to first (most recent = most specific)
    for (let i = handlersRef.current.length - 1; i >= 0; i--) {
      if (handlersRef.current[i]()) return;
    }
    // Fallback: browser history or home
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/home";
    }
  }, []);

  return (
    <BackNavigationContext.Provider value={{ pushBackHandler, handleBack }}>
      {children}
    </BackNavigationContext.Provider>
  );
}

export function useBackNavigation() {
  const ctx = useContext(BackNavigationContext);
  if (!ctx) throw new Error("useBackNavigation must be used within BackNavigationProvider");
  return ctx;
}
