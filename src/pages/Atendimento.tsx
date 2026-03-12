import { useState } from "react";
import { CrmKanbanBoard } from "@/components/atendimento/CrmKanbanBoard";

export default function Atendimento() {
  const [crmSearch] = useState("");

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
      <CrmKanbanBoard searchTerm={crmSearch} />
    </div>
  );
}
