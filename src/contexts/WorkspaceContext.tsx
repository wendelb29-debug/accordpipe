import { createContext, useContext, ReactNode } from "react";
import { useWorkspaces, Workspace } from "@/hooks/useWorkspaces";

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeWorkspaceId: string | null;
  selectWorkspace: (id: string) => void;
  createWorkspace: (name: string, color?: string) => Promise<Workspace | null>;
  updateWorkspace: (id: string, updates: Partial<Pick<Workspace, "name" | "color" | "icon">>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  loading: boolean;
  isAdminOrCeo: boolean;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const ws = useWorkspaces();
  return (
    <WorkspaceContext.Provider value={ws}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspaceContext must be used within WorkspaceProvider");
  return ctx;
}
