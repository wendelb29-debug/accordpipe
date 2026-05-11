import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useBackNavigation } from "@/contexts/BackNavigationContext";
import {
  Clock, MoreVertical, Trash2, Mail, PhoneCall, Loader2,
  Users, ClipboardList, FileCheck, FileWarning, Sparkles, CalendarSearch
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
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

const stageColors: Record<string, { bg: string; text: string; icon: string; border: string }> = {
  "cadastro-pendente": { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", icon: "bg-amber-500", border: "border-amber-200 dark:border-amber-800" },
  "dados-em-analise": { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", icon: "bg-blue-500", border: "border-blue-200 dark:border-blue-800" },
  "cadastro-concluido": { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-700 dark:text-green-400", icon: "bg-green-500", border: "border-green-200 dark:border-green-800" },
  "documentacao-pendente": { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400", icon: "bg-red-500", border: "border-red-200 dark:border-red-800" },
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
  const [showOldConcluidos, setShowOldConcluidos] = useState(false);
  const { pushBackHandler } = useBackNavigation();

  useEffect(() => {
    if (!detailLead) return;
    const unregister = pushBackHandler(() => {
      setDetailLead(null);
      return true;
    });
    return unregister;
  }, [detailLead, pushBackHandler]);

  const pipelineRef = useRef<HTMLDivElement>(null);
  const isDraggingScroll = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const handlePipelineMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.kanban-card')) return;
    const el = pipelineRef.current;
    if (!el) return;
    isDraggingScroll.current = true;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeftStart.current = el.scrollLeft;
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  }, []);

  const handlePipelineMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingScroll.current) return;
    e.preventDefault();
    const el = pipelineRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = scrollLeftStart.current - (x - startX.current) * 1.3;
  }, []);

  const handlePipelineMouseUp = useCallback(() => {
    isDraggingScroll.current = false;
    const el = pipelineRef.current;
    if (el) { el.style.cursor = 'grab'; el.style.userSelect = ''; }
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (
          !l.company_name.toLowerCase().includes(s) &&
          !l.contact_name?.toLowerCase().includes(s) &&
          !l.phone?.includes(s) &&
          !l.email?.toLowerCase().includes(s)
        ) return false;
      }
      // Hide "cadastro-concluido" cards older than 24h unless filter is active
      if (l.stage === "cadastro-concluido" && !showOldConcluidos) {
        const enteredAt = new Date(l.stage_entered_at).getTime();
        const now = Date.now();
        if (now - enteredAt > 24 * 60 * 60 * 1000) return false;
      }
      return true;
    });
  }, [leads, searchTerm, showOldConcluidos]);

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (detailLead) {
    const currentLead = leads.find((l) => l.id === detailLead.id) || detailLead;
    return (
      <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
        <CrmLeadDetailView
          lead={currentLead}
          onBack={() => setDetailLead(null)}
          onUpdate={updateLead}
          onMoveStage={moveToStage}
          onDelete={async (id) => { await deleteLead(id); setDetailLead(null); return true; }}
          isAdminPipeline
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Summary Bar */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="bg-card rounded-xl border border-border/50 px-4 py-2.5 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Validação de Clientes</p>
          <p className="text-xl font-bold text-foreground mt-0.5">{filteredLeads.length} <span className="text-sm font-normal text-muted-foreground">pendentes</span></p>
        </div>
      </div>

      {/* Kanban Columns */}
      <div
        ref={pipelineRef}
        className="flex gap-3 px-4 pb-4 flex-1 min-h-0 overflow-x-auto cursor-grab"
        onMouseDown={handlePipelineMouseDown}
        onMouseMove={handlePipelineMouseMove}
        onMouseUp={handlePipelineMouseUp}
        onMouseLeave={handlePipelineMouseUp}
      >
        {stageStats.map((stage) => {
          const Icon = stageIcons[stage.id] || Clock;
          const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);
          const colors = stageColors[stage.id] || stageColors["cadastro-pendente"];

          return (
            <div
              key={stage.id}
              className={cn(
                "flex-shrink-0 w-[280px] rounded-2xl flex flex-col border transition-all duration-200",
                colors.border,
                colors.bg,
                dragOverStage === stage.id && "ring-2 ring-primary/60 scale-[1.01]"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="px-3 py-3 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg shadow-sm", colors.icon)}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-semibold text-sm text-foreground">{stage.title}</span>
                    <span className={cn("text-xs font-bold rounded-full px-2.5 py-0.5 bg-card border border-border/50 shadow-sm", colors.text)}>
                      {stageLeads.length}
                    </span>
                  </div>
                  {stage.id === "cadastro-concluido" && (
                    <Button
                      variant={showOldConcluidos ? "default" : "ghost"}
                      size="icon"
                      className="h-6 w-6 rounded-lg"
                      title={showOldConcluidos ? "Mostrar apenas últimas 24h" : "Mostrar todos (histórico)"}
                      onClick={() => setShowOldConcluidos(!showOldConcluidos)}
                    >
                      <CalendarSearch className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto">
                {stageLeads.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/30">
                    <Icon className="h-10 w-10 mb-3" />
                    <p className="text-xs font-medium">Etapa vazia</p>
                  </div>
                )}
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggedLead(lead)}
                    onClick={() => setDetailLead(lead)}
                    className={cn(
                      "kanban-card rounded-2xl bg-card border border-border/40 p-3.5 cursor-grab active:cursor-grabbing transition-all duration-200 group shadow-sm",
                      "hover:-translate-y-[3px] hover:shadow-[0_12px_30px_rgba(0,0,0,0.1)]",
                      draggedLead?.id === lead.id && "opacity-40 scale-95"
                    )}
                    style={{ boxShadow: draggedLead?.id === lead.id ? undefined : '0 8px 25px rgba(0,0,0,0.06)' }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-foreground truncate">{lead.company_name}</p>
                        {lead.contact_name && (
                          <div className="flex items-center gap-1 text-muted-foreground mt-0.5 text-[11px]">
                            <Users className="h-3 w-3 shrink-0" />
                            <span className="truncate">{lead.contact_name}</span>
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Vendedor responsável */}
                    {lead.created_by_name && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
                        <ClipboardList className="h-3 w-3 shrink-0" />
                        <span className="truncate">Vendedor: <span className="font-medium text-foreground">{lead.created_by_name}</span></span>
                      </div>
                    )}

                    {/* Valor */}
                    {lead.value_mrr > 0 && (
                      <div className="text-[11px] text-muted-foreground mb-1">
                        MRR: <span className="font-bold text-primary">{formatCurrency(lead.value_mrr)}</span>
                      </div>
                    )}

                    {lead.email && (
                      <div className="flex items-center gap-1 text-muted-foreground text-[11px] mb-0.5">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-1 text-muted-foreground text-[11px] mb-0.5">
                        <PhoneCall className="h-3 w-3 shrink-0" />
                        <span>{lead.phone}</span>
                      </div>
                    )}

                    {/* Tags - show Pendente de Correção / Devolvido */}
                    {lead.tags && lead.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {lead.tags.includes("Pendente de Correção") && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-orange-300 text-orange-700 bg-orange-50">
                            🔄 Pendente de Correção
                          </Badge>
                        )}
                        {lead.tags.includes("Devolvido") && !lead.tags.includes("Pendente de Correção") && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50">
                            🔄 Devolvido
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 pt-2 mt-2 border-t border-border/30">
                      <span>{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
                      <span className={cn(
                        "font-semibold rounded-full px-2 py-0.5",
                        lead.lead_status === "won"
                          ? "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {lead.lead_status === "won" ? "Ganho" : lead.lead_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
