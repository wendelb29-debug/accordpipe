import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrmKanbanBoard } from "@/components/atendimento/CrmKanbanBoard";
import { AdminKanbanBoard } from "@/components/atendimento/AdminKanbanBoard";
import { ImportarPlanilha } from "@/components/atendimento/ImportarPlanilha";
import { WorkspaceHub } from "@/components/atendimento/WorkspaceHub";
import { WorkspaceProvider, useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBackNavigation } from "@/contexts/BackNavigationContext";
import { MessageSquare, ClipboardList, FileSpreadsheet } from "lucide-react";

function AtendimentoContent() {
  const [crmSearch] = useState("");
  const { role, isMaster } = useAuth();
  const { activeWorkspaceId, workspaces, loading: wsLoading, selectWorkspace, activeWorkspace } = useWorkspaceContext();
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const { pushBackHandler } = useBackNavigation();

  const canSeeCommercial = isMaster || role === "admin" || role === "operador" || role === "ceo" || role === "comercial";
  const canSeeAdmin = isMaster || role === "admin" || role === "administrativo" || role === "ceo";

  // Auto-select workspace from query params (e.g. coming from Atividades drawer)
  useEffect(() => {
    const wsParam = searchParams.get("workspace");
    if (wsParam && !selectedWsId && !wsLoading) {
      selectWorkspace(wsParam);
      setSelectedWsId(wsParam);
      // Clean up query params after consuming
      searchParams.delete("workspace");
      searchParams.delete("lead");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, selectedWsId, wsLoading, selectWorkspace, setSearchParams]);

  // Register back handler: when workspace is selected, go back to hub
  useEffect(() => {
    if (!selectedWsId) return;
    const unregister = pushBackHandler(() => {
      setSelectedWsId(null);
      return true;
    });
    return unregister;
  }, [selectedWsId, pushBackHandler]);

  // Sync the active workspace name into the global header title
  useEffect(() => {
    const name = selectedWsId ? (activeWorkspace?.name || "") : "";
    window.dispatchEvent(new CustomEvent("header:title-suffix", { detail: name }));
    return () => {
      window.dispatchEvent(new CustomEvent("header:title-suffix", { detail: "" }));
    };
  }, [selectedWsId, activeWorkspace?.name]);

  // Show hub if no workspace selected yet
  if (!selectedWsId) {
    return (
      <div className="-m-3 md:-m-6 lg:-m-8 h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col">
        <WorkspaceHub
          onSelectWorkspace={(id) => {
            selectWorkspace(id);
            setSelectedWsId(id);
          }}
        />
      </div>
    );
  }

  const backButton = (
    <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-xs">
      <button
        onClick={() => setSelectedWsId(null)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        Workspaces
      </button>
    </div>
  );

  // If user only has access to admin pipeline
  if (canSeeAdmin && !canSeeCommercial) {
    return (
      <div className="-m-3 md:-m-6 lg:-m-8 h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col">
        {backButton}
        <AdminKanbanBoard searchTerm={crmSearch} />
      </div>
    );
  }

  // If user only has access to commercial
  if (canSeeCommercial && !canSeeAdmin) {
    return (
      <div className="-m-3 md:-m-6 lg:-m-8 h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col">
        {backButton}
        <CrmKanbanBoard searchTerm={crmSearch} workspaceId={selectedWsId} />
      </div>
    );
  }

  // Only commercial (fallback)
  if (!canSeeAdmin) {
    return (
      <div className="-m-3 md:-m-6 lg:-m-8 h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col">
        {backButton}
        <CrmKanbanBoard searchTerm={crmSearch} workspaceId={selectedWsId} />
      </div>
    );
  }

  // Both pipelines accessible
  return (
    <div className="-m-3 md:-m-6 lg:-m-8 h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col">
      {backButton}
      <Tabs defaultValue="comercial" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-3 mt-0.5 mb-0 w-fit h-8">
          <TabsTrigger value="comercial" className="gap-1 text-[11px] h-7 px-3">
            <MessageSquare className="h-3 w-3" /> Pipeline Comercial
          </TabsTrigger>
          <TabsTrigger value="importar" className="gap-1 text-[11px] h-7 px-3">
            <FileSpreadsheet className="h-3 w-3" /> Importar Planilha
          </TabsTrigger>
        </TabsList>
        <TabsContent value="comercial" className="flex-1 overflow-hidden mt-0">
          <CrmKanbanBoard searchTerm={crmSearch} workspaceId={selectedWsId} />
        </TabsContent>
        <TabsContent value="importar" className="flex-1 overflow-hidden mt-0">
          <ImportarPlanilha />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Atendimento() {
  return (
    <WorkspaceProvider>
      <AtendimentoContent />
    </WorkspaceProvider>
  );
}
