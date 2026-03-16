import { useState } from "react";
import {
  Clock, GripVertical, MoreVertical, Trash2, Edit, Building2, Mail, PhoneCall, Loader2,
  Users, ClipboardList, FileCheck, FileWarning, Sparkles
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CrmLeadDetailView } from "./CrmLeadDetailView";
import { useCrmLeads, CrmLead, ADMIN_STAGES } from "@/hooks/useCrmLeads";

const stageIcons: Record<string, React.ElementType> = {
  "cadastro-pendente": ClipboardList,
  "dados-em-analise": FileCheck,
  "cadastro-concluido": Sparkles,
  "documentacao-pendente": FileWarning,
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface AdminKanbanBoardProps {
  searchTerm: string;
}

export function AdminKanbanBoard({ searchTerm }: AdminKanbanBoardProps) {
  const { leads, loading, updateLead, deleteLead, moveToStage, stageStats } = useCrmLeads("admin");
  const [draggedLead, setDraggedLead] = useState<CrmLead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [detailLead, setDetailLead] = useState<CrmLead | null>(null);

  const filteredLeads = leads.filter((l) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      l.company_name.toLowerCase().includes(s) ||
      l.contact_name?.toLowerCase().includes(s) ||
      l.phone?.includes(s) ||
      l.email?.toLowerCase().includes(s)
    );
  });

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggedLead || draggedLead.stage === targetStage) {
      setDraggedLead(null);
      setDragOverStage(null);
      return;
    }
    await moveToStage(draggedLead.id, targetStage);
    setDraggedLead(null);
    setDragOverStage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (detailLead) {
    const currentLead = leads.find((l) => l.id === detailLead.id) || detailLead;
    return (
      <CrmLeadDetailView
        lead={currentLead}
        onBack={() => setDetailLead(null)}
        onUpdate={updateLead}
        onMoveStage={moveToStage}
        onDelete={async (id) => {
          await deleteLead(id);
          setDetailLead(null);
          return true;
        }}
        isAdminPipeline
      />
    );
  }

  return (
    <>
      {/* Summary Bar */}
      <div className="px-4 py-3 border-b bg-card flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            <ClipboardList className="h-4 w-4 inline mr-1.5" />
            Cadastro de Clientes — {filteredLeads.length} registros
          </h2>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-2 p-3 h-[calc(100%-3.5rem)] overflow-x-auto">
        {stageStats.map((stage) => {
          const Icon = stageIcons[stage.id] || Clock;
          const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);

          return (
            <div
              key={stage.id}
              className={cn(
                "flex-shrink-0 w-64 bg-muted/40 rounded-lg flex flex-col",
                dragOverStage === stage.id && "ring-2 ring-primary"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="p-2.5 border-b bg-background rounded-t-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("p-1 rounded", stage.color)}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-semibold text-xs">{stage.title}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stage.count}</Badge>
                  </div>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 p-1 space-y-1 overflow-y-auto">
                {stageLeads.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Icon className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-xs">Etapa vazia</p>
                  </div>
                )}
                {stageLeads.map((lead) => (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggedLead(lead)}
                    onClick={() => setDetailLead(lead)}
                    className={cn(
                      "cursor-grab active:cursor-grabbing hover:shadow-md transition-all text-xs",
                      draggedLead?.id === lead.id && "opacity-50"
                    )}
                  >
                    <CardContent className="p-2 space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-xs truncate text-foreground">{lead.company_name}</p>
                            {lead.contact_name && (
                              <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                                <Users className="h-3 w-3 shrink-0" />
                                <span className="truncate">{lead.contact_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-5 w-5">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {lead.email && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <PhoneCall className="h-3 w-3 shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 pt-1 border-t border-border/50">
                        <span>📅 {new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {lead.lead_status === "won" ? "Ganho" : lead.lead_status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
