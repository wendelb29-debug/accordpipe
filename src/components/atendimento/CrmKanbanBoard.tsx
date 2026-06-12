import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useBackNavigation } from "@/contexts/BackNavigationContext";
import {
  Clock, Users, MessageSquare, Phone, RefreshCw, FileSignature,
  MoreVertical, Trash2, Edit, Loader2,
  Plus, Sparkles, Link2, Check, Tag, Search, Filter, CalendarClock, AlertTriangle, CheckCircle,
  CheckCircle2, XCircle,
} from "lucide-react";
import { KanbanQuickActionZones } from "./KanbanQuickActionZones";
import { StatusFilteredGrid } from "./StatusFilteredGrid";
import { TransferWorkspaceDialog } from "./TransferWorkspaceDialog";
import { LostReasonDialog } from "./LostReasonDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getLeadContractSignatureStats } from "@/lib/contractSigners";
import { CrmLeadDialog } from "./CrmLeadDialog";
import { CrmLeadDetailView } from "./CrmLeadDetailView";
import { FormLinkDialog } from "./FormLinkDialog";
import { CrmSearchDialog } from "./CrmSearchDialog";
import {
  FilterPanel,
  FilterState,
  emptyFilterState,
  countActiveFilters,
  applyFilters,
} from "./FilterPanel";
import { useCrmLeads, CrmLead, STAGES } from "@/hooks/useCrmLeads";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

const stageIcons: Record<string, React.ElementType> = {
  "novos": Sparkles,
  "standby": Clock,
  "primeiro-contato": MessageSquare,
  "call-negocio": Phone,
  "follow-up-1": RefreshCw,
  "follow-up-2": RefreshCw,
  "contrato-fechado": FileSignature,
};

// Premium stage colors for the ACCORD design
const stageColors: Record<string, { bg: string; text: string; icon: string; border: string }> = {
  "novos": { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", icon: "bg-emerald-500", border: "border-emerald-200 dark:border-emerald-800" },
  "standby": { bg: "bg-slate-50 dark:bg-slate-900/30", text: "text-slate-600 dark:text-slate-400", icon: "bg-slate-500", border: "border-slate-200 dark:border-slate-700" },
  "primeiro-contato": { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", icon: "bg-blue-500", border: "border-blue-200 dark:border-blue-800" },
  "call-negocio": { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", icon: "bg-amber-500", border: "border-amber-200 dark:border-amber-800" },
  "follow-up-1": { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400", icon: "bg-purple-500", border: "border-purple-200 dark:border-purple-800" },
  "follow-up-2": { bg: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-400", icon: "bg-indigo-500", border: "border-indigo-200 dark:border-indigo-800" },
  "contrato-fechado": { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-700 dark:text-green-400", icon: "bg-green-500", border: "border-green-200 dark:border-green-800" },
};

interface CrmKanbanBoardProps {
  searchTerm: string;
  workspaceId?: string | null;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const isLeadOverdueDynamic = (lead: CrmLead, slaDays: number): boolean => {
  if (!slaDays || slaDays <= 0 || !lead.stage_entered_at) return false;
  const enteredAt = new Date(lead.stage_entered_at);
  const now = new Date();
  const diffDays = (now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > slaDays;
};

const isLeadOverdue = (lead: CrmLead, stageId: string): boolean => {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage?.daysLimit || !lead.stage_entered_at) return false;
  const match = stage.daysLimit.match(/^(\d+)d$/);
  if (!match) return false;
  const limitDays = parseInt(match[1], 10);
  if (limitDays <= 0) return false;
  return isLeadOverdueDynamic(lead, limitDays);
};

const getProgressColor = (lead: CrmLead, stageId: string, hasActivity: boolean, hasOverdueActivity: boolean): string => {
  if (hasOverdueActivity) return "bg-red-500";
  if (!hasActivity) return "bg-amber-400";
  if (isLeadOverdue(lead, stageId)) return "bg-red-400";
  const days = Math.floor((Date.now() - new Date(lead.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 2) return "bg-emerald-500";
  if (days <= 5) return "bg-amber-400";
  return "bg-red-400";
};

export function CrmKanbanBoard({ searchTerm, workspaceId }: CrmKanbanBoardProps) {
  // Fetch dynamic kanban columns for this workspace
  const { dynamicStages, columns: kanbanCols, loading: colsLoading } = useKanbanColumns(workspaceId);
  const hasDynamicColumns = kanbanCols.length > 0;

  const { leads, loading, createLead, updateLead, deleteLead, moveToStage, markAsWonAndTransfer, totalLeads, totalPS, totalMRR, stageStats } = useCrmLeads(
    "commercial",
    workspaceId,
    hasDynamicColumns ? dynamicStages : undefined
  );
  const { profile } = useAuth();
  const companyId = useActiveCompanyId();
  const navigate = useNavigate();
  const [draggedLead, setDraggedLead] = useState<CrmLead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [detailLead, setDetailLead] = useState<CrmLead | null>(null);
  const [statusFilter, setStatusFilter] = useState<"open" | "won" | "lost" | "trash">("open");
  const [transferOpen, setTransferOpen] = useState(false);
  const [lostReasonOpen, setLostReasonOpen] = useState(false);
  const [pendingLead, setPendingLead] = useState<CrmLead | null>(null);
  const [trashLeads, setTrashLeads] = useState<CrmLead[]>([]);
  const { pushBackHandler } = useBackNavigation();

  // Register back handler when lead detail is open
  useEffect(() => {
    if (!detailLead) return;
    const unregister = pushBackHandler(() => {
      setDetailLead(null);
      return true;
    });
    return unregister;
  }, [detailLead, pushBackHandler]);

  // Auto-open lead detail when navigated with ?lead=ID (e.g. coming back from Inbox)
  const [searchParamsKb, setSearchParamsKb] = useSearchParams();
  useEffect(() => {
    const leadParam = searchParamsKb.get("lead");
    if (!leadParam || loading) return;
    const target = leads.find((l) => l.id === leadParam);
    if (target) {
      setDetailLead(target);
      searchParamsKb.delete("lead");
      setSearchParamsKb(searchParamsKb, { replace: true });
    }
  }, [searchParamsKb, leads, loading, setSearchParamsKb]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [formLinkOpen, setFormLinkOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [teamMembers, setTeamMembers] = useState<{ user_id: string; name: string; avatar_url?: string | null }[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [leadsWithActivity, setLeadsWithActivity] = useState<Set<string>>(new Set());
  const [leadsWithOverdueActivity, setLeadsWithOverdueActivity] = useState<Set<string>>(new Set());
  const [overdueActivityCount, setOverdueActivityCount] = useState<Record<string, number>>({});
  const [nextActivities, setNextActivities] = useState<Record<string, string>>({});
  const [lastCompletedActivities, setLastCompletedActivities] = useState<Record<string, string>>({});
  const [signatureStatsByLead, setSignatureStatsByLead] = useState<Record<string, { signed: number; total: number; approved: boolean }>>({});
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>(emptyFilterState);
  const activeFilterCount = countActiveFilters(advancedFilters);

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

  useEffect(() => {
    const fetchTags = async () => {
      if (!companyId) return;
      const { data } = await supabase
        .from("crm_tags")
        .select("id, name, color")
        .eq("servidor_id", companyId)
        .order("name");
      if (data) setAvailableTags(data);
    };
    fetchTags();
  }, [companyId]);

  useEffect(() => {
    const fetchActivityStatus = async () => {
      if (leads.length === 0) return;
      const leadIds = leads.map((l) => l.id);
      const { data } = await supabase
        .from("crm_lead_activities")
        .select("lead_id, title, created_at, type, metadata")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false });
      if (data) {
        const withActivity = new Set<string>();
        const withOverdue = new Set<string>();
        const overdueCount: Record<string, number> = {};
        const nextAct: Record<string, string> = {};
        const lastCompleted: Record<string, string> = {};
        const scheduledTypes = ["internal", "email", "call", "meeting", "whatsapp"];
        const now = new Date();
        for (const activity of data) {
          const meta = activity.metadata as any;
          const status = meta?.activity_status || "planejada";
          const isScheduled = scheduledTypes.includes(activity.type);
          if (isScheduled && status === "planejada") {
            const scheduledAt = meta?.scheduled_at ? new Date(meta.scheduled_at) : null;
            if (scheduledAt && scheduledAt < now) {
              // Overdue activity
              withOverdue.add(activity.lead_id);
              overdueCount[activity.lead_id] = (overdueCount[activity.lead_id] || 0) + 1;
            }
            if (!withActivity.has(activity.lead_id)) {
              nextAct[activity.lead_id] = activity.title;
            }
            withActivity.add(activity.lead_id);
          }
          // Track last completed activity per lead
          if (isScheduled && status === "concluida" && !lastCompleted[activity.lead_id]) {
            lastCompleted[activity.lead_id] = activity.title;
          }
        }
        setLeadsWithActivity(withActivity);
        setLeadsWithOverdueActivity(withOverdue);
        setOverdueActivityCount(overdueCount);
        setNextActivities(nextAct);
        setLastCompletedActivities(lastCompleted);
      }
    };
    fetchActivityStatus();
  }, [leads]);

  useEffect(() => {
    let isMounted = true;

    const fetchSignatureStats = async () => {
      if (leads.length === 0) {
        if (isMounted) setSignatureStatsByLead({});
        return;
      }

      const leadIds = leads.map((lead) => lead.id);
      const { data: contracts, error: contractsError } = await supabase
        .from("contracts")
        .select("id, lead_id, created_at, signature_status")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false });

      if (contractsError || !isMounted) return;

      const latestContractsByLead = new Map<string, { id: string; lead_id: string; signature_status: string | null }>();

      for (const contract of contracts || []) {
        if (!contract.lead_id || latestContractsByLead.has(contract.lead_id)) continue;
        latestContractsByLead.set(contract.lead_id, contract as { id: string; lead_id: string; signature_status: string | null });
      }

      const contractIds = Array.from(latestContractsByLead.values()).map((contract) => contract.id);

      if (contractIds.length === 0) {
        if (isMounted) setSignatureStatsByLead({});
        return;
      }

      const { data: signers, error: signersError } = await supabase
        .from("contract_signatures")
        .select("id, contract_id, signer_role, signed_at, signer_name, signer_document")
        .in("contract_id", contractIds);

      if (signersError || !isMounted) return;

      const signersByContract = new Map<string, any[]>();

      for (const signer of signers || []) {
        const current = signersByContract.get(signer.contract_id) || [];
        current.push(signer);
        signersByContract.set(signer.contract_id, current);
      }

      const nextStats: Record<string, { signed: number; total: number; approved: boolean }> = {};

      for (const contract of latestContractsByLead.values()) {
        const { signed, total, allSigned } = getLeadContractSignatureStats(signersByContract.get(contract.id) || []);

        if (total === 0) continue;

        nextStats[contract.lead_id] = {
          signed,
          total,
          approved: allSigned || contract.signature_status === "signed",
        };
      }

      if (isMounted) {
        setSignatureStatsByLead(nextStats);
      }
    };

    fetchSignatureStats();

    const channel = supabase
      .channel("crm-contract-signature-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_signatures" }, fetchSignatureStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "contracts" }, fetchSignatureStats)
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [leads]);

  // Fetch avatars for all lead creators
  useEffect(() => {
    const fetchCreatorAvatars = async () => {
      if (leads.length === 0 || teamMembers.length > 0) return;
      const userIds = [...new Set(leads.map(l => l.created_by_user_id).filter(Boolean))] as string[];
      if (userIds.length === 0) return;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      if (data) setTeamMembers(data);
    };
    fetchCreatorAvatars();
  }, [leads, teamMembers.length]);

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  useEffect(() => {
    if (!isAdminOrMaster || !companyId) return;
    const fetchTeam = async () => {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id)
        .maybeSingle();
      const hasAdminRole = roleData?.role === "admin" || roleData?.role === "ceo";
      if (!profile.is_master && !hasAdminRole) return;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      if (data) setTeamMembers(data);
    };
    fetchTeam();
  }, [isAdminOrMaster, companyId, profile?.user_id, profile?.is_master]);

  const copyFormLink = async () => {
    let cId = companyId;
    if (!cId) {
      const { data } = await supabase
        .from("companies")
        .select("id")
        .is("servidor_id", null)
        .in("status", ["active", "teste"])
        .limit(1)
        .maybeSingle();
      cId = data?.id || null;
    }
    if (!cId) {
      toast.error("Nenhuma empresa encontrada");
      return;
    }
    const url = `${window.location.origin}/captura/${cId}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast.success("Link do formulário copiado!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const baseFiltered = leads.filter((l) => {
    if (selectedUserId !== "all" && l.created_by_user_id !== selectedUserId) return false;
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
  const filteredLeads = applyFilters(baseFiltered, advancedFilters);

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

  const fetchTrashLeads = useCallback(async () => {
    if (!companyId) return;
    let q = supabase
      .from("crm_leads")
      .select("*")
      .eq("lead_status", "trash")
      .order("status_changed_at", { ascending: false, nullsFirst: false });
    if (workspaceId) q = q.eq("workspace_id", workspaceId);
    const { data } = await q;
    setTrashLeads((data as CrmLead[]) || []);
  }, [companyId, workspaceId]);

  useEffect(() => {
    if (statusFilter === "trash") fetchTrashLeads();
  }, [statusFilter, fetchTrashLeads]);

  const handleQuickAction = async (zoneId: "trash" | "lost" | "won" | "transfer") => {
    if (!draggedLead) return;
    const lead = draggedLead;
    setDraggedLead(null);

    switch (zoneId) {
      case "trash": {
        if (!window.confirm(`Mover "${lead.contact_name || lead.company_name}" para a lixeira?`)) return;
        await updateLead(lead.id, {
          lead_status: "trash",
          status_changed_at: new Date().toISOString(),
        } as any);
        toast.success("Card movido pra lixeira", {
          action: {
            label: "Desfazer",
            onClick: async () => {
              await updateLead(lead.id, { lead_status: "open", status_changed_at: new Date().toISOString() } as any);
              toast.success("Restaurado");
            },
          },
        });
        break;
      }
      case "lost": {
        setPendingLead(lead);
        setLostReasonOpen(true);
        break;
      }
      case "won": {
        try {
          await markAsWonAndTransfer(lead.id);
          toast.success(`"${lead.contact_name || lead.company_name}" marcado como ganho 🎉`);
        } catch (err: any) {
          toast.error(err?.message || "Erro ao marcar como ganho");
        }
        break;
      }
      case "transfer": {
        setPendingLead(lead);
        setTransferOpen(true);
        break;
      }
    }
  };

  const counters = useMemo(() => ({
    open: leads.filter((l) => !l.lead_status || l.lead_status === "open").length,
    won: leads.filter((l) => l.lead_status === "won").length,
    lost: leads.filter((l) => l.lead_status === "lost").length,
    trash: trashLeads.length,
  }), [leads, trashLeads]);

  const openNew = () => { setSelectedLead(null); setIsNew(true); setDialogOpen(true); };
  const openEdit = (lead: CrmLead) => { setSelectedLead(lead); setIsNew(false); setDialogOpen(true); };
  const openDetail = (lead: CrmLead) => { setDetailLead(lead); };

  const handleSave = async (data: Partial<CrmLead>) => {
    if (isNew) await createLead(data);
    else if (selectedLead) await updateLead(selectedLead.id, data);
  };

  if (loading || colsLoading) {
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
          dynamicStages={hasDynamicColumns ? dynamicStages : undefined}
          stagesLoading={colsLoading}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-muted/30">
      {/* KPI Cards */}
      <div className="px-3 py-1 flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 flex-1">
          <div className="flex items-center gap-3 bg-card rounded-lg border border-border/50 px-3 py-1 shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Oport.</span>
              <span className="text-sm font-bold text-foreground">{filteredLeads.length}</span>
            </div>
            <div className="w-px h-4 bg-border/50" />
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">P&S</span>
              <span className="text-sm font-bold text-foreground">{formatCurrency(totalPS)}</span>
            </div>
            <div className="w-px h-4 bg-border/50" />
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">MRR</span>
              <span className="text-sm font-bold text-primary">{formatCurrency(totalMRR)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {searchOpen && (
            <Input
              autoFocus
              type="search"
              placeholder="Buscar lead..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="h-8 w-44 text-xs border-border/50 bg-card rounded-lg shadow-sm"
              onBlur={() => { if (!localSearch) setSearchOpen(false); }}
            />
          )}
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg shadow-sm border-border/50" onClick={() => setGlobalSearchOpen(true)} title="Pesquisar">
            <Search className="h-3.5 w-3.5" />
          </Button>
          {(isAdminOrMaster || teamMembers.length > 0) && teamMembers.length > 0 && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="h-8 w-36 text-xs border-border/50 bg-card rounded-lg shadow-sm">
                <Users className="h-3 w-3 mr-1 shrink-0" />
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id} className="text-xs">{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {availableTags.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant={selectedTags.length > 0 ? "default" : "outline"} className="h-8 w-8 relative rounded-lg shadow-sm border-border/50">
                  <Filter className="h-3.5 w-3.5" />
                  {selectedTags.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground px-0.5">
                      {selectedTags.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 rounded-xl" align="end">
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
                        "flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-[11px] hover:bg-muted transition-colors",
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
          <Button
            size="icon"
            variant={activeFilterCount > 0 ? "default" : "outline"}
            className="h-8 w-8 relative rounded-lg shadow-sm border-border/50"
            onClick={() => setFilterPanelOpen(true)}
            title="Filtrar cards"
          >
            <Filter className="h-3.5 w-3.5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground px-0.5">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg shadow-sm border-border/50" onClick={() => setFormLinkOpen(true)}>
            <Tag className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg shadow-sm border-border/50" onClick={() => navigate("/contato")}>
            <Link2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={openNew} className="h-8 gap-1.5 text-xs px-4 rounded-[10px] shadow-sm bg-primary hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Novo Card
          </Button>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="px-3 pt-1 pb-1.5 shrink-0">
        <div className="flex items-center gap-1 px-1 py-1 rounded-xl bg-muted/40 border border-border w-fit">
          {([
            { id: "open", label: "Em aberto", color: "bg-primary text-primary-foreground", Icon: null },
            { id: "won", label: "Ganhos", color: "bg-emerald-500 text-white", Icon: CheckCircle2 },
            { id: "lost", label: "Perdidos", color: "bg-orange-500 text-white", Icon: XCircle },
            { id: "trash", label: "Lixeira", color: "bg-red-500 text-white", Icon: Trash2 },
          ] as const).map((c) => {
            const active = statusFilter === c.id;
            const count = (counters as any)[c.id] || 0;
            return (
              <button
                key={c.id}
                onClick={() => setStatusFilter(c.id as any)}
                className={cn(
                  "h-7 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition",
                  active ? `${c.color} shadow-sm` : "text-muted-foreground hover:text-foreground hover:bg-card"
                )}
              >
                {c.Icon && <c.Icon className="w-3 h-3" />}
                {c.label}
                {count > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[9.5px] font-bold tabular-nums",
                    active ? "bg-white/20" : "bg-muted-foreground/15"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Kanban Columns / Status Grid */}
      {statusFilter !== "open" ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <StatusFilteredGrid
            leads={statusFilter === "trash" ? trashLeads : filteredLeads.filter(l => l.lead_status === statusFilter)}
            statusFilter={statusFilter as "won" | "lost" | "trash"}
            onRestore={async (leadId) => {
              await updateLead(leadId, { lead_status: "open", status_changed_at: new Date().toISOString() } as any);
              if (statusFilter === "trash") {
                setTrashLeads(prev => prev.filter(l => l.id !== leadId));
              }
              toast.success("Card restaurado pro pipeline");
            }}
            onOpenCard={openDetail}
          />
        </div>
      ) : (
      <div className="flex-1 min-h-0 flex flex-col w-full max-w-full">
        <div
          ref={pipelineRef}
          style={{ scrollBehavior: 'smooth', scrollbarWidth: 'thin' }}
          className="flex flex-1 min-h-0 items-stretch gap-2 pl-2 pr-6 pb-0 w-full max-w-full overflow-x-auto overflow-y-hidden cursor-grab [&::-webkit-scrollbar]:h-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-r [&::-webkit-scrollbar-thumb]:from-[hsl(var(--primary))] [&::-webkit-scrollbar-thumb]:to-[hsl(263,87%,60%)]"
          onMouseDown={handlePipelineMouseDown}
          onMouseMove={handlePipelineMouseMove}
          onMouseUp={handlePipelineMouseUp}
          onMouseLeave={handlePipelineMouseUp}
        >
        {stageStats.map((stage) => {
          const Icon = stageIcons[stage.id] || Clock;
          const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);
          const colors = stageColors[stage.id] || { bg: "bg-muted/30", text: "text-foreground", icon: "bg-primary", border: "border-border" };
          const dynCol = kanbanCols.find(c => c.id === stage.id);
          const rawSla = dynCol?.sla_days ?? (stage.daysLimit ? parseInt(stage.daysLimit, 10) : 0);
          const slaDays = Math.max(0, Math.round(Number(rawSla) || 0));


          return (
            <div
              key={stage.id}
              className={cn(
                "flex-shrink-0 w-[220px] rounded-xl flex flex-col border transition-all duration-200",
                dynCol ? "border-border/50" : `${colors.border} ${colors.bg}`,
                !dynCol && !colors.bg && "bg-muted/20",
                dragOverStage === stage.id && "ring-2 ring-primary/60 scale-[1.01]"
              )}
              style={dynCol?.color ? {
                backgroundColor: `color-mix(in srgb, ${dynCol.color} 6%, transparent)`,
                borderTopColor: dynCol.color,
                borderTopWidth: '2px',
              } : undefined}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="px-2.5 py-2 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn("p-1 rounded-md", dynCol ? "" : colors.icon)}
                      style={dynCol ? { backgroundColor: dynCol.color } : undefined}
                    >
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="font-semibold text-[11px] text-foreground">{stage.title}</span>
                    <span className={cn("text-[10px] font-bold rounded-full px-2 py-0.5 bg-card border border-border/50", dynCol ? "text-foreground" : colors.text)}>
                      {stage.count}
                    </span>
                  </div>
                  {stage.daysLimit && (
                    <span className="text-[9px] text-muted-foreground/60 font-medium">{stage.daysLimit}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[9px] mt-1">
                  <span className="text-muted-foreground">P&S <span className="font-semibold text-foreground">{formatCurrency(stage.totalPS)}</span></span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-muted-foreground">MRR <span className="font-semibold text-primary">{formatCurrency(stage.totalMRR)}</span></span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 px-1.5 pb-1.5 space-y-1.5 overflow-y-auto">
                {stageLeads.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/30">
                    <Icon className="h-8 w-8 mb-2" />
                    <p className="text-[10px] font-medium">Etapa vazia</p>
                  </div>
                )}
                {stageLeads.map((lead) => {
                  const overdue = dynCol
                    ? isLeadOverdueDynamic(lead, slaDays)
                    : isLeadOverdue(lead, stage.id);
                  const stageEnteredAt = lead.stage_entered_at
                    ? new Date(lead.stage_entered_at)
                    : new Date(lead.created_at);
                  const days = Math.max(0, Math.floor(
                    (Date.now() - stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24)
                  ));
                  const overdueByDays = slaDays > 0
                    ? Math.max(0, Math.round(days - slaDays))
                    : 0;
                  const hasActivity = leadsWithActivity.has(lead.id);
                  const hasOverdue = leadsWithOverdueActivity.has(lead.id);
                  const overdueActCount = overdueActivityCount[lead.id] || 0;
                  const noActivity = !hasActivity;
                  const progressColor = getProgressColor(lead, stage.id, hasActivity, hasOverdue);
                  const signatureStats = signatureStatsByLead[lead.id];

                  // Priority: 1) lost, 2) overdue activity, 3) SLA exceeded, 4) no activity, 5) normal
                  const isLost = lead.lead_status === "lost";
                  const isNaturalState = !isLost && !hasOverdue && !noActivity && !overdue;
                  const cardStyle = isLost
                    ? "bg-red-50/80 dark:bg-red-950/40 border-red-400/70 dark:border-red-700/60 ring-1 ring-red-400/30"
                    : hasOverdue
                    ? "bg-red-50/70 dark:bg-red-950/30 border-red-300/70 dark:border-red-800/50"
                    : overdue && hasActivity
                    ? "bg-red-50/60 dark:bg-red-950/20 border-red-200/60 dark:border-red-800/40"
                    : noActivity
                    ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40"
                    : "bg-card/95 dark:bg-[rgba(255,255,255,0.03)] border-border/40 dark:border-[rgba(255,255,255,0.07)]";

                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => setDraggedLead(lead)}
                      onClick={() => openDetail(lead)}
                      className={cn(
                        "kanban-card rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-200 group relative overflow-hidden",
                        "active:scale-[0.98]",
                        draggedLead?.id === lead.id && "opacity-40 scale-95",
                        cardStyle,
                        isNaturalState
                          ? "hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 dark:hover:border-primary/30 hover:brightness-105 dark:hover:brightness-110"
                          : "hover:-translate-y-[2px] hover:shadow-md"
                      )}
                      style={{
                        boxShadow: draggedLead?.id === lead.id ? undefined
                          : isNaturalState ? '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)' : '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      {/* Top accent bar - uses tenant primary color */}
                      <div
                        className={cn(
                          "absolute top-0 left-0 right-0 h-[2.5px] rounded-t-xl",
                          hasOverdue ? "bg-destructive" : overdue ? "bg-destructive/70" : noActivity ? "bg-amber-400" : ""
                        )}
                        style={isNaturalState ? {
                          background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))`,
                        } : undefined}
                      />

                      <div className="p-2.5 pt-3">
                        {/* Lead name + status icons */}
                        <div className="flex items-start justify-between mb-1">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className={cn(
                                "text-[11px] truncate",
                                isNaturalState ? "font-bold text-foreground tracking-tight" : "font-semibold text-foreground"
                              )}>
                                {lead.contact_name || lead.source}
                              </p>
                              {hasOverdue && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-[10px]">
                                    {overdueActCount} atividade{overdueActCount > 1 ? "s" : ""} atrasada{overdueActCount > 1 ? "s" : ""}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {!hasOverdue && noActivity && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-[10px]">Sem atividade</TooltipContent>
                                </Tooltip>
                              )}
                              {!hasOverdue && !noActivity && overdue && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Clock className="h-3 w-3 shrink-0 text-destructive" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-[10px]">Tempo excedido na etapa</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {/* Company name */}
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{lead.company_name}</p>
                            {isLost && (
                              <Badge variant="destructive" className="text-[8px] h-3.5 px-1 mt-0.5 gap-0.5 font-semibold">
                                ✕ Perdido
                              </Badge>
                            )}
                          </div>
                          <DropdownMenu>

                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(lead); }}>
                                <Edit className="h-3.5 w-3.5 mr-2" /> Editar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Values */}
                        <div className={cn(
                          "flex items-center gap-1.5 text-[10px] py-1 px-1.5 rounded-md mt-1",
                          isNaturalState ? "bg-muted/50 dark:bg-muted/20" : ""
                        )}>
                          <span className="text-muted-foreground">P&S <span className="font-bold text-foreground">{formatCurrency(lead.value_ps)}</span></span>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="text-muted-foreground">MRR <span className="font-bold text-primary">{formatCurrency(lead.value_mrr)}</span></span>
                        </div>

                        {/* Contact info */}
                        {(lead.phone || lead.email) && isNaturalState && (
                          <div className="flex items-center gap-1 mt-1.5 text-[9px] text-muted-foreground/70">
                            {lead.phone ? (
                              <>
                                <Phone className="h-2.5 w-2.5" />
                                <span className="truncate">{lead.phone}</span>
                              </>
                            ) : lead.email ? (
                              <>
                                <MessageSquare className="h-2.5 w-2.5" />
                                <span className="truncate">{lead.email}</span>
                              </>
                            ) : null}
                          </div>
                        )}

                        {signatureStats && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[9px] gap-0.5 px-1.5 py-0",
                                signatureStats.approved
                                  ? "bg-status-paid text-status-paid-foreground"
                                  : "bg-status-open text-status-open-foreground"
                              )}
                            >
                              {signatureStats.approved ? <CheckCircle className="h-2.5 w-2.5" /> : <FileSignature className="h-2.5 w-2.5" />}
                              {signatureStats.approved
                                ? "Aprovado"
                                : `${signatureStats.signed}/${signatureStats.total}`}
                            </Badge>
                          </div>
                        )}

                        {/* Won / Devolvido badges */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lead.lead_status === "won" && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold rounded-full px-1.5 py-0"
                              style={{ backgroundColor: '#D1FAE5', color: '#059669' }}>
                              ✅ Ganho
                            </span>
                          )}
                          {lead.tags?.includes("Pendente de Correção") && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold rounded-full px-1.5 py-0"
                              style={{ backgroundColor: '#FED7AA', color: '#C2410C' }}>
                              ⚠️ Correção
                            </span>
                          )}
                          {lead.tags?.includes("Devolvido") && !lead.tags?.includes("Pendente de Correção") && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold rounded-full px-1.5 py-0"
                              style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                              🔄 Devolvido
                            </span>
                          )}
                        </div>

                        {/* Activity indicator */}
                        {hasOverdue && (
                          <div className="flex items-center gap-1 mt-1.5 text-[9px] text-destructive font-medium">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            <span>{overdueActCount} atividade{overdueActCount > 1 ? "s" : ""} atrasada{overdueActCount > 1 ? "s" : ""}</span>
                          </div>
                        )}
                        {!hasOverdue && hasActivity && nextActivities[lead.id] && (
                          <div className="flex items-center gap-1 mt-1.5 text-[9px] text-muted-foreground">
                            <CalendarClock className="h-2.5 w-2.5 text-primary/60" />
                            <span className="truncate">{nextActivities[lead.id]}</span>
                          </div>
                        )}
                        {noActivity && !hasOverdue && lastCompletedActivities[lead.id] && (
                          <div className="flex items-center gap-1 mt-1.5 text-[9px] text-muted-foreground">
                            <CheckCircle className="h-2.5 w-2.5 text-emerald-500" />
                            <span className="truncate">{lastCompletedActivities[lead.id]}</span>
                          </div>
                        )}
                        {noActivity && !hasOverdue && !lastCompletedActivities[lead.id] && (
                          <div className="flex items-center gap-1 mt-1.5 text-[9px] text-amber-600 dark:text-amber-400 font-medium">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            <span>Sem atividade</span>
                          </div>
                        )}

                        {/* Footer */}
                        <div className={cn(
                          "flex items-center justify-between mt-2 pt-2",
                          isNaturalState ? "border-t border-border/10" : "border-t border-border/15"
                        )}>
                          <div className="flex items-center gap-1">
                            {lead.created_by_name && (() => {
                              const memberAvatar = teamMembers.find(m => m.user_id === lead.created_by_user_id)?.avatar_url;
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Avatar className={cn("h-5 w-5", isNaturalState ? "ring-1 ring-primary/20" : "ring-1 ring-primary/15")}>
                                      {memberAvatar && <AvatarImage src={memberAvatar} alt={lead.created_by_name} />}
                                      <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">
                                        {lead.created_by_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="text-[10px] font-medium">{lead.created_by_name}</TooltipContent>
                                </Tooltip>
                              );
                            })()}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-[9px] text-muted-foreground/50 cursor-help">{stageEnteredAt.toLocaleDateString("pt-BR")}</span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-[10px] space-y-1">
                                <div><strong>Entrou neste estágio:</strong> {stageEnteredAt.toLocaleString("pt-BR")}</div>
                                <div><strong>Lead criado em:</strong> {new Date(lead.created_at).toLocaleString("pt-BR")}</div>
                                <div><strong>SLA da coluna:</strong> {slaDays > 0 ? `${slaDays} dia${slaDays > 1 ? "s" : ""}` : "sem SLA"}</div>
                                <div><strong>Há {days} dia{days !== 1 ? "s" : ""} neste estágio</strong></div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span className={cn(
                            "text-[9px] font-bold rounded-full px-1.5 py-0",
                            overdue ? "text-destructive bg-destructive/10"
                              : days > 3 ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                              : isNaturalState ? "text-muted-foreground/60"
                              : "text-muted-foreground/50"
                          )}>
                            {overdue && overdueByDays > 0 ? `+${overdueByDays}d atraso` : `${days}d`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        </div>
      </div>
      )}

      <KanbanQuickActionZones
        visible={!!draggedLead}
        currentStatus={draggedLead?.lead_status}
        onAction={handleQuickAction}
      />

      <LostReasonDialog
        open={lostReasonOpen}
        lead={pendingLead}
        onOpenChange={setLostReasonOpen}
        onConfirm={async (reason) => {
          if (pendingLead) {
            await updateLead(pendingLead.id, {
              lead_status: "lost",
              lost_reason: reason,
              status_changed_at: new Date().toISOString(),
            } as any);
            toast.success("Marcado como perdido");
          }
          setLostReasonOpen(false);
          setPendingLead(null);
        }}
      />

      <TransferWorkspaceDialog
        open={transferOpen}
        lead={pendingLead}
        currentWorkspaceId={workspaceId}
        onOpenChange={setTransferOpen}
        onTransfer={async (newWorkspaceId) => {
          if (pendingLead) {
            await updateLead(pendingLead.id, { workspace_id: newWorkspaceId } as any);
            toast.success("Card transferido");
          }
          setTransferOpen(false);
          setPendingLead(null);
        }}
      />


      <CrmLeadDialog
        lead={selectedLead}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        onDelete={deleteLead}
        isNew={isNew}
        dynamicStages={hasDynamicColumns ? dynamicStages : undefined}
        stagesLoading={colsLoading}
      />
      <FormLinkDialog open={formLinkOpen} onOpenChange={setFormLinkOpen} />
      <CrmSearchDialog
        open={globalSearchOpen}
        onOpenChange={setGlobalSearchOpen}
        onSelectLead={(lead) => openDetail(lead)}
      />
      <FilterPanel
        open={filterPanelOpen}
        onOpenChange={setFilterPanelOpen}
        value={advancedFilters}
        onApply={setAdvancedFilters}
        responsaveis={teamMembers.map((m) => ({ user_id: m.user_id, name: m.name }))}
      />
    </div>
  );
}
