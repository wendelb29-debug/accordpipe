import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrmKanbanBoard } from "@/components/atendimento/CrmKanbanBoard";
import { AdminKanbanBoard } from "@/components/atendimento/AdminKanbanBoard";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, ClipboardList } from "lucide-react";

export default function Atendimento() {
  const [crmSearch] = useState("");
  const { role, isMaster } = useAuth();

  const canSeeCommercial = isMaster || role === "admin" || role === "operador" || role === "ceo" || role === "comercial";
  const canSeeAdmin = isMaster || role === "admin" || role === "administrativo" || role === "ceo";

  // If user only has access to admin pipeline
  if (canSeeAdmin && !canSeeCommercial) {
    return (
      <div className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
        <AdminKanbanBoard searchTerm={crmSearch} />
      </div>
    );
  }

  // If user only has access to commercial
  if (canSeeCommercial && !canSeeAdmin) {
    return (
      <div className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
        <CrmKanbanBoard searchTerm={crmSearch} />
      </div>
    );
  }

  // Only commercial (fallback for users with no specific access)
  if (!canSeeAdmin) {
    return (
      <div className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
        <CrmKanbanBoard searchTerm={crmSearch} />
      </div>
    );
  }

  // Both pipelines accessible
  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
      <Tabs defaultValue="comercial" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-3 mt-1 mb-0 w-fit h-8">
          <TabsTrigger value="comercial" className="gap-1 text-[11px] h-7 px-3">
            <MessageSquare className="h-3 w-3" /> Pipeline Comercial
          </TabsTrigger>
          <TabsTrigger value="cadastro" className="gap-1 text-[11px] h-7 px-3">
            <ClipboardList className="h-3 w-3" /> Cadastro de Clientes
          </TabsTrigger>
        </TabsList>
        <TabsContent value="comercial" className="flex-1 overflow-hidden mt-0">
          <CrmKanbanBoard searchTerm={crmSearch} />
        </TabsContent>
        <TabsContent value="cadastro" className="flex-1 overflow-hidden mt-0">
          <AdminKanbanBoard searchTerm={crmSearch} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
