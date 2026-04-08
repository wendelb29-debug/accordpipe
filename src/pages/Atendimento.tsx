import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrmKanbanBoard } from "@/components/atendimento/CrmKanbanBoard";
import { AdminKanbanBoard } from "@/components/atendimento/AdminKanbanBoard";
import { ImportarPlanilha } from "@/components/atendimento/ImportarPlanilha";
import { WorkspaceSelector } from "@/components/atendimento/WorkspaceSelector";
import { WorkspaceProvider, useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, ClipboardList, FileSpreadsheet } from "lucide-react";

function AtendimentoContent() {
  const [crmSearch] = useState("");
  const { role, isMaster } = useAuth();
  const { activeWorkspaceId, workspaces, loading: wsLoading } = useWorkspaceContext();

  const canSeeCommercial = isMaster || role === "admin" || role === "operador" || role === "ceo" || role === "comercial";
  const canSeeAdmin = isMaster || role === "admin" || role === "administrativo" || role === "ceo";

  const workspaceBar = (
    <div className="flex items-center gap-2 px-3 pt-2 pb-1">
      <WorkspaceSelector />
      {!wsLoading && workspaces.length === 0 && (
        <span className="text-xs text-muted-foreground">Crie um workspace para organizar seus funis</span>
      )}
    </div>
  );

  // If user only has access to admin pipeline
  if (canSeeAdmin && !canSeeCommercial) {
    return (
      <div className="h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col">
        {workspaceBar}
        <AdminKanbanBoard searchTerm={crmSearch} />
      </div>
    );
  }

  // If user only has access to commercial
  if (canSeeCommercial && !canSeeAdmin) {
    return (
      <div className="h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col">
        {workspaceBar}
        <CrmKanbanBoard searchTerm={crmSearch} workspaceId={activeWorkspaceId} />
      </div>
    );
  }

  // Only commercial (fallback for users with no specific access)
  if (!canSeeAdmin) {
    return (
      <div className="h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col">
        {workspaceBar}
        <CrmKanbanBoard searchTerm={crmSearch} workspaceId={activeWorkspaceId} />
      </div>
    );
  }

  // Both pipelines accessible
  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col">
      {workspaceBar}
      <Tabs defaultValue="comercial" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-3 mt-1 mb-0 w-fit h-8">
          <TabsTrigger value="comercial" className="gap-1 text-[11px] h-7 px-3">
            <MessageSquare className="h-3 w-3" /> Pipeline Comercial
          </TabsTrigger>
          <TabsTrigger value="cadastro" className="gap-1 text-[11px] h-7 px-3">
            <ClipboardList className="h-3 w-3" /> Validação de Clientes
          </TabsTrigger>
          <TabsTrigger value="importar" className="gap-1 text-[11px] h-7 px-3">
            <FileSpreadsheet className="h-3 w-3" /> Importar Planilha
          </TabsTrigger>
        </TabsList>
        <TabsContent value="comercial" className="flex-1 overflow-hidden mt-0">
          <CrmKanbanBoard searchTerm={crmSearch} workspaceId={activeWorkspaceId} />
        </TabsContent>
        <TabsContent value="cadastro" className="flex-1 overflow-hidden mt-0">
          <AdminKanbanBoard searchTerm={crmSearch} />
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
