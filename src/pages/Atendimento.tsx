import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandIcon } from "@/components/ui/brand-icon";
import { CrmKanbanBoard } from "@/components/atendimento/CrmKanbanBoard";
import { AdminKanbanBoard } from "@/components/atendimento/AdminKanbanBoard";
import { ImportarPlanilha } from "@/components/atendimento/ImportarPlanilha";
import { WorkspaceHub } from "@/components/atendimento/WorkspaceHub";
import { WorkspaceProvider, useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBackNavigation } from "@/contexts/BackNavigationContext";
import { MessageSquare, ClipboardList, FileSpreadsheet, UserRound } from "lucide-react";
import { CloserPanel } from "@/components/closer/CloserPanel";

import { usePermissions } from "@/hooks/usePermissions";

function AtendimentoContent() {
  const [crmSearch] = useState("");
  const { role, isMaster, profile, activeCompanyId } = useAuth();
  const { activeWorkspaceId, workspaces, loading: wsLoading, selectWorkspace, activeWorkspace } = useWorkspaceContext();
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = usePermissions();

  const { pushBackHandler } = useBackNavigation();

  const canSeeCommercial = isMaster || role === "admin" || role === "operador" || role === "ceo" || role === "comercial";
  const canSeeAdmin = isMaster || role === "admin" || role === "administrativo" || role === "ceo";
  
  // Validates if user is an active member of the current tenant
  const isActiveTenantMember = !!profile && profile.is_active && profile.company_id === activeCompanyId;
  
  // Permission to use Closer - any authorized member of an active tenant with closer permission
  const canAccessCloser = (isMaster || hasPermission("use_closer")) && isActiveTenantMember;

  // Auto-select workspace from query params
  useEffect(() => {
    const wsParam = searchParams.get("workspace");
    if (wsParam && !selectedWsId && !wsLoading) {
      selectWorkspace(wsParam);
      setSelectedWsId(wsParam);
      searchParams.delete("workspace");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, selectedWsId, wsLoading, selectWorkspace, setSearchParams]);

  useEffect(() => {
    if (!selectedWsId) return;
    const unregister = pushBackHandler(() => {
      setSelectedWsId(null);
      return true;
    });
    return unregister;
  }, [selectedWsId, pushBackHandler]);

  if (!selectedWsId) {
    return (
      <div className="-m-3 lg:-m-4 flex-1 min-h-0 overflow-hidden flex flex-col">
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
    <div className="flex items-center gap-2 px-3 pt-1 pb-0.5">
      <h2 className="text-xs font-bold text-foreground">{activeWorkspace?.name || "Workspace"}</h2>
    </div>
  );

  // PRIORITY: Kamilla Workspace specialized view
  if (canAccessKamillaTools) {
    return (
      <div className="-m-3 lg:-m-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        {backButton}
        <Tabs defaultValue="comercial" className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mx-3 mt-0.5 mb-0">
            <TabsList className="w-fit h-8">
              <TabsTrigger value="comercial" className="gap-1.5 text-[11px] h-7 px-3">
                <BrandIcon icon={MessageSquare} tone="emerald" size="xs" /> Pipeline Comercial
              </TabsTrigger>
              <TabsTrigger value="importar" className="gap-1.5 text-[11px] h-7 px-3">
                <BrandIcon icon={FileSpreadsheet} tone="green" size="xs" /> Importar Planilha
              </TabsTrigger>
              <TabsTrigger value="closer" className="gap-1.5 text-[11px] h-7 px-3">
                <BrandIcon icon={UserRound} tone="blue" size="xs" /> Closer
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="comercial" className="flex-1 overflow-hidden mt-0">
            <CrmKanbanBoard searchTerm={crmSearch} workspaceId={selectedWsId} />
          </TabsContent>
          <TabsContent value="importar" className="flex-1 overflow-hidden mt-0">
            <ImportarPlanilha workspaceId={selectedWsId} />
          </TabsContent>
          <TabsContent value="closer" className="flex-1 overflow-hidden mt-0">
            <CloserPanel />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Fallback to role-based rendering for other workspaces
  if (canSeeAdmin && !canSeeCommercial) {
    return (
      <div className="-m-3 lg:-m-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        {backButton}
        <AdminKanbanBoard searchTerm={crmSearch} />
      </div>
    );
  }

  if (canSeeCommercial && !canSeeAdmin) {
    return (
      <div className="-m-3 lg:-m-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        {backButton}
        <CrmKanbanBoard searchTerm={crmSearch} workspaceId={selectedWsId} />
      </div>
    );
  }

  if (!canSeeAdmin) {
    return (
      <div className="-m-3 lg:-m-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        {backButton}
        <CrmKanbanBoard searchTerm={crmSearch} workspaceId={selectedWsId} />
      </div>
    );
  }

  return (
    <div className="-m-3 lg:-m-4 flex-1 min-h-0 overflow-hidden flex flex-col">
      {backButton}
      <Tabs defaultValue="comercial" className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mx-3 mt-0.5 mb-0">
          <TabsList className="w-fit h-8">
            <TabsTrigger value="comercial" className="gap-1.5 text-[11px] h-7 px-3">
              <BrandIcon icon={MessageSquare} tone="emerald" size="xs" /> Pipeline Comercial
            </TabsTrigger>
            <TabsTrigger value="importar" className="gap-1.5 text-[11px] h-7 px-3">
              <BrandIcon icon={FileSpreadsheet} tone="green" size="xs" /> Importar Planilha
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="comercial" className="flex-1 overflow-hidden mt-0">
          <CrmKanbanBoard searchTerm={crmSearch} workspaceId={selectedWsId} />
        </TabsContent>
        <TabsContent value="importar" className="flex-1 overflow-hidden mt-0">
          <ImportarPlanilha workspaceId={selectedWsId} />
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
