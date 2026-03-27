import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, Users, MessageSquare, Phone, RefreshCw, FileSignature, GripVertical,
  MoreVertical, Trash2, Edit, Building2, Mail, PhoneCall, Loader2,
  Plus, TrendingUp, Sparkles, Link2, Check, Tag, Search, Filter, CalendarClock, AlertTriangle
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { CrmLeadDialog } from "./CrmLeadDialog";
import { CrmLeadDetailView } from "./CrmLeadDetailView";
import { FormLinkDialog } from "./FormLinkDialog";
import { CrmSearchDialog } from "./CrmSearchDialog";
import { useCrmLeads, CrmLead, STAGES } from "@/hooks/useCrmLeads";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const stageIcons: Record<string, React.ElementType> = {
  "novos": Sparkles,
  "standby": Clock,
  
  "primeiro-contato": MessageSquare,
  "call-negocio": Phone,
  "follow-up-1": RefreshCw,
  "follow-up-2": RefreshCw,
  "informe-cs": TrendingUp,
  "contrato-fechado": FileSignature,
};

interface CrmKanbanBoardProps {
  searchTerm: string;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const isLeadOverdue = (lead: CrmLead, stageId: string): boolean => {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage?.daysLimit || !lead.stage_entered_at) return false;
  const match = stage.daysLimit.match(/^(\d+)d$/);
  if (!match) return false;
  const limitDays = parseInt(match[1], 10);
  if (limitDays <= 0) return false;
  const enteredAt = new Date(lead.stage_entered_at);
  const now = new Date();
  const diffDays = (now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > limitDays;
};

export function CrmKanbanBoard({ searchTerm }: CrmKanbanBoardProps) {
  const { leads, loading, createLead, updateLead, deleteLead, moveToStage, markAsWonAndTransfer, totalLeads, totalPS, totalMRR, stageStats } = useCrmLeads("commercial");
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [draggedLead, setDraggedLead] = useState<CrmLead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [detailLead, setDetailLead] = useState<CrmLead | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [formLinkOpen, setFormLinkOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [teamMembers, setTeamMembers] = useState<{ user_id: string; name: string }[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [leadsWithActivity, setLeadsWithActivity] = useState<Set<string>>(new Set());
  const [nextActivities, setNextActivities] = useState<Record<string, string>>({});

  // Drag-to-scroll
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
    const walk = (x - startX.current) * 1.3;
    el.scrollLeft = scrollLeftStart.current - walk;
  }, []);

  const handlePipelineMouseUp = useCallback(() => {
    isDraggingScroll.current = false;
    const el = pipelineRef.current;
    if (el) {
      el.style.cursor = 'grab';
      el.style.userSelect = '';
    }
  }, []);

  const isAdminOrMaster = profile?.is_master || false;

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      const servidorId = profile?.company_id;
      if (!servidorId) return;
      const { data } = await supabase
        .from("crm_tags")
        .select("id, name, color")
        .eq("servidor_id", servidorId)
        .order("name");
      if (data) setAvailableTags(data);
    };
    fetchTags();
  }, [profile?.company_id]);

  // Fetch activity status for all leads (check if they have scheduled activities)
  useEffect(() => {
    const fetchActivityStatus = async () => {
      if (leads.length === 0) return;
      const leadIds = leads.map((l) => l.id);
      
      // Fetch all activities for current leads that are of type "task" or "call" or "meeting" (scheduled activities)
      const { data } = await supabase
        .from("crm_lead_activities")
        .select("lead_id, title, created_at, type, metadata")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false });
      
      if (data) {
        const withActivity = new Set<string>();
        const nextAct: Record<string, string> = {};
        
        for (const activity of data) {
          // Any activity counts as having a scheduled return
          if (!withActivity.has(activity.lead_id)) {
            withActivity.add(activity.lead_id);
            nextAct[activity.lead_id] = activity.title;
          }
        }
        
        setLeadsWithActivity(withActivity);
        setNextActivities(nextAct);
      }
    };
    fetchActivityStatus();
  }, [leads]);

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  // Fetch team members for admin/master
  useEffect(() => {
    if (!isAdminOrMaster || !profile?.company_id) return;
    const fetchTeam = async () => {
      // Check if user has admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id)
        .maybeSingle();
      
      const hasAdminRole = roleData?.role === "admin" || roleData?.role === "ceo";
      if (!profile.is_master && !hasAdminRole) return;

      const { data } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("name");
      if (data) setTeamMembers(data);
    };
    fetchTeam();
  }, [isAdminOrMaster, profile?.company_id, profile?.user_id, profile?.is_master]);

  const copyFormLink = async () => {
    let companyId = profile?.company_id;
    if (!companyId) {
      const { data } = await supabase
        .from("companies")
        .select("id")
        .is("servidor_id", null)
        .in("status", ["active", "teste"])
        .limit(1)
        .maybeSingle();
      companyId = data?.id || null;
    }
    if (!companyId) {
      toast.error("Nenhuma empresa encontrada");
      return;
    }
    const url = `${window.location.origin}/captura/${companyId}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast.success("Link do formulário copiado!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const filteredLeads = leads.filter((l) => {
    // Filter by selected collaborator
    if (selectedUserId !== "all" && l.created_by_user_id !== selectedUserId) return false;
    // Filter by selected tags
    if (selectedTags.length > 0) {
      const leadTags = l.tags || [];
      if (!selectedTags.some((t) => leadTags.includes(t))) return false;
    }
    const term = localSearch || searchTerm;
    if (!term) return true;
    const s = term.toLowerCase();
    return (
      l.company_name.toLowerCase().includes(s) ||
      l.contact_name?.toLowerCase().includes(s) ||
      l.phone?.includes(s) ||
      l.email?.toLowerCase().includes(s) ||
      l.source?.toLowerCase().includes(s)
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

  const openNew = () => {
    setSelectedLead(null);
    setIsNew(true);
    setDialogOpen(true);
  };

  const openEdit = (lead: CrmLead) => {
    setSelectedLead(lead);
    setIsNew(false);
    setDialogOpen(true);
  };

  const openDetail = (lead: CrmLead) => {
    setDetailLead(lead);
  };

  const handleSave = async (data: Partial<CrmLead>) => {
    if (isNew) {
      await createLead(data);
    } else if (selectedLead) {
      await updateLead(selectedLead.id, data);
    }
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
      />
    );
  }


  return (
    <>
      {/* Premium Summary Bar */}
      <div className="px-4 py-2 border-b bg-card/90 backdrop-blur-sm flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground text-sm">{filteredLeads.length}</span>
            <span className="text-muted-foreground/70">oportunidades</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground/70">P&S:</span>
            <span className="font-bold text-foreground">{formatCurrency(totalPS)}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground/70">MRR:</span>
            <span className="font-bold text-primary">{formatCurrency(totalMRR)}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {searchOpen && (
            <Input
              autoFocus
              type="search"
              placeholder="Buscar..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="h-7 w-40 text-xs border-0 bg-muted/50 focus-visible:ring-1 rounded-lg"
              onBlur={() => { if (!localSearch) setSearchOpen(false); }}
            />
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setGlobalSearchOpen(true)} title="Pesquisar">
            <Search className="h-3.5 w-3.5" />
          </Button>
          {(isAdminOrMaster || teamMembers.length > 0) && teamMembers.length > 0 && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="h-7 w-36 text-xs border-0 bg-muted/50 rounded-lg">
                <Users className="h-3 w-3 mr-1 shrink-0" />
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id} className="text-xs">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {availableTags.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant={selectedTags.length > 0 ? "default" : "ghost"} className="h-7 w-7 relative">
                  <Filter className="h-3.5 w-3.5" />
                  {selectedTags.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground px-0.5">
                      {selectedTags.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="text-[11px] font-medium text-muted-foreground mb-1.5 px-1">Filtrar por tag</div>
                {selectedTags.length > 0 && (
                  <Button variant="ghost" size="sm" className="w-full h-6 text-[11px] mb-1" onClick={() => setSelectedTags([])}>
                    Limpar filtros
                  </Button>
                )}
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.name)}
                      className={cn(
                        "flex items-center gap-2 w-full rounded px-2 py-1 text-[11px] hover:bg-muted transition-colors",
                        selectedTags.includes(tag.name) && "bg-muted"
                      )}
                    >
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                      <span className="truncate flex-1 text-left">{tag.name}</span>
                      {selectedTags.includes(tag.name) && <Check className="h-3 w-3 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setFormLinkOpen(true)}>
            <Tag className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate("/contato")}>
            <Link2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={openNew} className="h-7 gap-1.5 text-xs px-3 rounded-lg shadow-sm">
            <Plus className="h-3.5 w-3.5" /> Novo
          </Button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div
        ref={pipelineRef}
        className="flex gap-3 p-3 h-[calc(100%-44px)] overflow-x-auto cursor-grab"
        onMouseDown={handlePipelineMouseDown}
        onMouseMove={handlePipelineMouseMove}
        onMouseUp={handlePipelineMouseUp}
        onMouseLeave={handlePipelineMouseUp}
      >
        {stageStats.map((stage) => {
          const Icon = stageIcons[stage.id] || Clock;
          const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);

          return (
            <div
              key={stage.id}
              className={cn(
                "flex-shrink-0 w-56 bg-muted/30 rounded-xl flex flex-col border border-border/30",
                dragOverStage === stage.id && "ring-2 ring-primary/50 bg-primary/5"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-border/30 rounded-t-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg", stage.color)}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-bold text-sm text-foreground">{stage.title}</span>
                    <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full px-2 py-0.5">{stage.count}</span>
                  </div>
                  {stage.daysLimit && (
                    <span className="text-[10px] text-muted-foreground/60 font-medium">{stage.daysLimit}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground/70">P&S <span className="font-semibold text-foreground/80">{formatCurrency(stage.totalPS)}</span></span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-muted-foreground/70">MRR <span className="font-semibold text-primary/80">{formatCurrency(stage.totalMRR)}</span></span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {stageLeads.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40">
                    <Icon className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-xs font-medium">Etapa vazia</p>
                  </div>
                )}
                {stageLeads.map((lead) => {
                  const overdue = isLeadOverdue(lead, stage.id);
                  const days = Math.floor((Date.now() - new Date(lead.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24));
                  const hasActivity = leadsWithActivity.has(lead.id);
                  const isNovosLeads = stage.id === "novos";
                  const noActivity = !hasActivity && !isNovosLeads;

                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => setDraggedLead(lead)}
                      onClick={() => openDetail(lead)}
                      className={cn(
                        "kanban-card rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group",
                        draggedLead?.id === lead.id && "opacity-40 scale-95",
                        noActivity
                          ? "border-yellow-400/60 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-500/40"
                          : overdue
                            ? "border-destructive/40 bg-destructive/5 dark:bg-destructive/10"
                            : "border-border/40 bg-card hover:border-border/80"
                      )}
                    >
                      {/* No activity alert */}
                      {noActivity && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-200/60 dark:bg-yellow-800/40 rounded-full px-2 py-0.5">
                            <AlertTriangle className="h-3 w-3" />
                            Sem atividade
                          </span>
                        </div>
                      )}

                      {/* Status badge */}
                      {overdue && hasActivity && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                            Atrasado
                          </span>
                        </div>
                      )}

                      {/* Zone 1: Source + Company */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-foreground truncate">{lead.source}</p>
                          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{lead.company_name}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(lead); }}>
                              <Edit className="h-3.5 w-3.5 mr-2" /> Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Zone 2: Contact info */}
                      <div className="space-y-0.5 mb-2 text-[11px] text-muted-foreground/60">
                        {lead.contact_name && (
                          <p className="truncate">👤 {lead.contact_name}</p>
                        )}
                        {lead.email && (
                          <p className="truncate">✉ {lead.email}</p>
                        )}
                        {lead.phone && (
                          <p>📞 {lead.phone}</p>
                        )}
                      </div>

                      {/* Zone 3: Values */}
                      <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground/50">→</span>
                          <span className="text-xs font-bold text-foreground">{formatCurrency(lead.value_ps)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground/50">↺</span>
                          <span className="text-xs font-bold text-primary">{formatCurrency(lead.value_mrr)}</span>
                        </div>
                      </div>

                      {lead.lead_status === "won" && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 rounded-full px-2 py-0.5">
                            ✅ Ganho
                          </span>
                        </div>
                      )}

                      {/* Activity indicator */}
                      {hasActivity && nextActivities[lead.id] && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/60">
                          <CalendarClock className="h-3 w-3" />
                          <span className="truncate">{nextActivities[lead.id]}</span>
                        </div>
                      )}

                      {/* Footer: Avatar + date + days */}
                      <div className="flex items-center justify-between mt-2 pt-1.5">
                        <div className="flex items-center gap-1.5">
                          {lead.created_by_name && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">
                                    {lead.created_by_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">{lead.created_by_name}</TooltipContent>
                            </Tooltip>
                          )}
                          <span className="text-[10px] text-muted-foreground/40">{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold rounded-full px-1.5 py-0.5",
                          overdue
                            ? "bg-destructive/10 text-destructive"
                            : days > 3
                              ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                              : "text-muted-foreground/40"
                        )}>
                          {days}d
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <CrmLeadDialog
        lead={selectedLead}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        onDelete={deleteLead}
        isNew={isNew}
      />
      <FormLinkDialog open={formLinkOpen} onOpenChange={setFormLinkOpen} />
      <CrmSearchDialog
        open={globalSearchOpen}
        onOpenChange={setGlobalSearchOpen}
        onSelectLead={(lead) => openDetail(lead)}
      />
    </>
  );
}
