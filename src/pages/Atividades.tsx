import { useState, useEffect, useMemo, useCallback } from "react";
import {
  PhoneCall, Mail, Users, Briefcase, MessageSquare, CheckCircle, ExternalLink,
  Ban, MoreVertical, Calendar, ListOrdered, Filter, Settings,
  UserCircle, Plus, Loader2, ChevronLeft, ChevronRight, AlertTriangle, Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CrmLeadDetailView } from "@/components/atendimento/CrmLeadDetailView";
import { ActivityStatusModal } from "@/components/atendimento/ActivityStatusModal";
import { CrmLead } from "@/hooks/useCrmLeads";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ACTIVITY_TYPE_ICONS: Record<string, any> = {
  call: PhoneCall,
  email: Mail,
  meeting: Users,
  internal: Briefcase,
  whatsapp: MessageSquare,
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: "Ligação",
  email: "E-mail",
  meeting: "Reunião",
  internal: "Atividade Interna",
  whatsapp: "WhatsApp",
};

interface ActivityRow {
  id: string;
  lead_id: string;
  servidor_id: string;
  type: string;
  title: string;
  description: string | null;
  metadata: any;
  created_by_name: string | null;
  created_by_user_id: string | null;
  created_at: string;
  status: string;
  completed_at: string | null;
  completed_by_name: string | null;
  completion_note: string | null;
  no_show_at: string | null;
  no_show_by_name: string | null;
  no_show_note: string | null;
  // joined
  lead_company_name?: string;
  lead_contact_name?: string;
  lead_source?: string;
}

const PER_PAGE_OPTIONS = [20, 50, 100];

interface UserAvatarMap {
  [userId: string]: { name: string; avatar_url: string | null };
}

export default function Atividades() {
  const { profile, isMaster, isAdmin, activeCompanyId, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "agenda">("list");
  const [statusTab, setStatusTab] = useState<"planned" | "completed" | "no_show">("planned");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [dateFilter, setDateFilter] = useState("today");
  const [userAvatars, setUserAvatars] = useState<UserAvatarMap>({});
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  // Lead detail drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLead, setDrawerLead] = useState<CrmLead | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Modal state
  const [modalTarget, setModalTarget] = useState<ActivityRow | null>(null);
  const [modalType, setModalType] = useState<"complete" | "no_show">("complete");

  // View note dialog
  const [viewNoteItem, setViewNoteItem] = useState<ActivityRow | null>(null);

  useEffect(() => {
    fetchActivities();
  }, [activeCompanyId, dateFilter, view]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const servidorId = isMaster ? activeCompanyId : profile?.company_id;
      const scheduledTypes = ["call", "email", "meeting", "internal", "whatsapp"];

      let query = supabase
        .from("crm_lead_activities")
        .select("*")
        .in("type", scheduledTypes)
        .order("created_at", { ascending: false });

      if (servidorId) {
        query = query.eq("servidor_id", servidorId);
      }

      if (!isMaster && !isAdmin && user?.id) {
        query = query.eq("created_by_user_id", user.id);
      }

      const effectiveFilter = view === "agenda" ? "all" : dateFilter;
      const now = new Date();
      if (effectiveFilter === "today") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
        query = query.gte("created_at", start).lt("created_at", end);
      } else if (effectiveFilter === "week") {
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        query = query.gte("created_at", startOfWeek.toISOString()).lt("created_at", endOfWeek.toISOString());
      } else if (effectiveFilter === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
        query = query.gte("created_at", startOfMonth).lt("created_at", endOfMonth);
      }

      const { data, error } = await query;
      if (error) throw error;

      const leadIds = [...new Set((data || []).map((a) => a.lead_id))];
      let leadsMap: Record<string, { company_name: string; contact_name: string | null; source: string }> = {};

      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from("crm_leads")
          .select("id, company_name, contact_name, source")
          .in("id", leadIds);
        if (leads) {
          for (const l of leads) {
            leadsMap[l.id] = { company_name: l.company_name, contact_name: l.contact_name, source: l.source };
          }
        }
      }

      const enriched: ActivityRow[] = (data || []).map((a) => ({
        ...a,
        metadata: a.metadata as any,
        lead_company_name: leadsMap[a.lead_id]?.company_name || "-",
        lead_contact_name: leadsMap[a.lead_id]?.contact_name || "-",
        lead_source: leadsMap[a.lead_id]?.source || "Manual",
      }));

      setActivities(enriched);
      setPage(1);

      const userIds = [...new Set(enriched.map((a) => a.created_by_user_id).filter(Boolean))] as string[];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);
        if (profiles) {
          const avatarMap: UserAvatarMap = {};
          for (const p of profiles) {
            avatarMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
          }
          setUserAvatars(avatarMap);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar atividades");
    } finally {
      setLoading(false);
    }
  };

  // Resolve status from column + metadata fallback
  const getStatus = (a: ActivityRow): "planned" | "completed" | "no_show" => {
    if (a.status === "completed") return "completed";
    if (a.status === "no_show") return "no_show";
    const ms = (a.metadata as any)?.activity_status || (a.metadata as any)?.status;
    if (ms === "concluida") return "completed";
    if (ms === "no_show") return "no_show";
    return "planned";
  };

  const planned = activities.filter(a => getStatus(a) === "planned");
  const completed = activities.filter(a => getStatus(a) === "completed");
  const noShowList = activities.filter(a => getStatus(a) === "no_show");

  const currentList = statusTab === "planned" ? planned : statusTab === "completed" ? completed : noShowList;

  const handleOpenModal = (activity: ActivityRow, type: "complete" | "no_show") => {
    setModalTarget(activity);
    setModalType(type);
  };

  const handleModalConfirm = async (note: string, _createAnother: boolean) => {
    if (!modalTarget) return;
    const activity = modalTarget;
    const isComplete = modalType === "complete";

    const updateData: any = isComplete
      ? {
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_by_user_id: profile?.user_id || null,
          completed_by_name: profile?.name || null,
          completion_note: note,
        }
      : {
          status: "no_show",
          no_show_at: new Date().toISOString(),
          no_show_by_user_id: profile?.user_id || null,
          no_show_by_name: profile?.name || null,
          no_show_note: note,
        };

    const meta = activity.metadata || {};
    updateData.metadata = {
      ...meta,
      activity_status: isComplete ? "concluida" : "no_show",
      ...(isComplete ? { completed_at: updateData.completed_at, completion_comment: note } : {}),
    };

    const { error } = await supabase
      .from("crm_lead_activities")
      .update(updateData)
      .eq("id", activity.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      setModalTarget(null);
      return;
    }

    toast.success(isComplete ? "Atividade concluída!" : "Marcada como no-show");
    setModalTarget(null);
    await fetchActivities();
  };

  // Pagination
  const totalItems = currentList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const paginated = currentList.slice((page - 1) * perPage, page * perPage);
  const startItem = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, totalItems);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      "\n" + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const handleLeadClick = async (activity: ActivityRow) => {
    if (!activity.lead_id) {
      toast.error("Esta atividade não está vinculada a uma oportunidade");
      return;
    }
    setDrawerLoading(true);
    setDrawerOpen(true);
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("id", activity.lead_id)
      .maybeSingle();
    setDrawerLoading(false);
    if (error || !data) {
      toast.error("Oportunidade não encontrada");
      setDrawerOpen(false);
      return;
    }
    setDrawerLead(data as CrmLead);
  };

  const handleDrawerUpdate = useCallback(async (id: string, updates: Partial<CrmLead>) => {
    const { error } = await supabase.from("crm_leads").update(updates as any).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return false; }
    setDrawerLead((prev) => prev ? { ...prev, ...updates } : prev);
    return true;
  }, []);

  const handleDrawerMoveStage = useCallback(async (id: string, stage: string) => {
    const { error } = await supabase.from("crm_leads").update({ stage, stage_entered_at: new Date().toISOString() } as any).eq("id", id);
    if (error) { toast.error("Erro ao mover etapa"); return false; }
    setDrawerLead((prev) => prev ? { ...prev, stage, stage_entered_at: new Date().toISOString() } : prev);
    return true;
  }, []);

  const handleDrawerDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from("crm_leads").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return false; }
    setDrawerOpen(false);
    setDrawerLead(null);
    return true;
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Listagem de atividades</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Home / Atividades</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[120px] md:w-[140px] h-9 text-sm rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={() => setView("list")}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "agenda" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={() => setView("agenda")}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs: List / Agenda */}
      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "agenda")}>
        <TabsList className="mb-4">
          <TabsTrigger value="list" className="gap-2">
            <ListOrdered className="h-4 w-4" />
            Atividades
          </TabsTrigger>
          <TabsTrigger value="agenda" className="gap-2">
            <Calendar className="h-4 w-4" />
            Agenda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {/* Status sub-tabs */}
          <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v as any); setPage(1); }}>
            <TabsList className="mb-4 bg-muted/50">
              <TabsTrigger value="planned" className="text-xs gap-1.5">
                Planejadas <Badge variant="secondary" className="text-[10px] ml-1 h-4 px-1">{planned.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs gap-1.5">
                Concluídas <Badge variant="secondary" className="text-[10px] ml-1 h-4 px-1">{completed.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="no_show" className="text-xs gap-1.5">
                No-show <Badge variant="secondary" className="text-[10px] ml-1 h-4 px-1">{noShowList.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="md:hidden space-y-3">
                  {paginated.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Nenhuma atividade encontrada.
                    </div>
                  ) : (
                    paginated.map((activity) => {
                      const meta = activity.metadata || {};
                      const actType = meta.activity_type || activity.type;
                      const TypeIcon = ACTIVITY_TYPE_ICONS[actType] || Briefcase;
                      const resolvedStatus = getStatus(activity);
                      const scheduledDate = meta.scheduled_at ? new Date(meta.scheduled_at).toLocaleDateString("pt-BR") : null;
                      const scheduledTime = meta.scheduled_at ? new Date(meta.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;
                      const scheduledAt = meta.scheduled_at ? new Date(meta.scheduled_at) : null;
                      const isOverdue = scheduledAt && resolvedStatus === "planned" && scheduledAt < new Date();

                      return (
                        <div key={activity.id} className={cn("rounded-xl border border-border bg-card p-4 shadow-sm relative", isOverdue && "border-l-2 border-l-destructive bg-destructive/5")}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn("shrink-0 h-9 w-9 rounded-lg flex items-center justify-center", isOverdue ? "bg-destructive/10" : "bg-muted")}>
                                <TypeIcon className={cn("h-4 w-4", isOverdue ? "text-destructive" : "text-muted-foreground")} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {ACTIVITY_TYPE_LABELS[actType] || activity.title}
                                </p>
                                {activity.description && (
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">{activity.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {resolvedStatus === "planned" && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(activity, "complete")} title="Concluir">
                                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(activity, "no_show")} title="No-show">
                                    <Ban className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </>
                              )}
                              {resolvedStatus !== "planned" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewNoteItem(activity)} title="Ver observação">
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <UserCircle className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{activity.created_by_name || "Sistema"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <span>{scheduledDate || formatDate(activity.created_at).split("\n")[0]}</span>
                              {scheduledTime && <span className="text-foreground font-medium">{scheduledTime}</span>}
                            </div>
                            {activity.lead_company_name && activity.lead_company_name !== "-" && (
                              <div
                                className="col-span-2 flex items-center gap-1.5 text-primary text-xs font-medium cursor-pointer hover:underline"
                                onClick={() => handleLeadClick(activity)}
                              >
                                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{activity.lead_company_name}</span>
                                {activity.lead_contact_name && <span className="text-muted-foreground">· {activity.lead_contact_name}</span>}
                              </div>
                            )}
                          </div>

                          {isOverdue && (
                            <div className="mt-2 flex items-center gap-1 text-destructive text-[11px] font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              Atrasada
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop table view */}
                <div className="hidden md:block rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 [&>th]:h-9 [&>th]:py-2 [&>th]:px-3">
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Título</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Descrição</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Responsável</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Oportunidade</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Pessoa</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Empresa</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Início</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Duração</TableHead>
                        {statusTab !== "planned" && (
                          <TableHead className="font-semibold text-xs uppercase tracking-wider">
                            {statusTab === "completed" ? "Concluído por" : "Registrado por"}
                          </TableHead>
                        )}
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                            Nenhuma atividade encontrada.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginated.map((activity) => {
                          const meta = activity.metadata || {};
                          const actType = meta.activity_type || activity.type;
                          const TypeIcon = ACTIVITY_TYPE_ICONS[actType] || Briefcase;
                          const resolvedStatus = getStatus(activity);
                          const scheduledDate = meta.scheduled_at ? new Date(meta.scheduled_at).toLocaleDateString("pt-BR") : null;
                          const scheduledTime = meta.scheduled_at ? new Date(meta.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;
                          const duration = meta.duration || "--";
                          const scheduledAt = meta.scheduled_at ? new Date(meta.scheduled_at) : null;
                          const isOverdue = scheduledAt && resolvedStatus === "planned" && scheduledAt < new Date();
                          const creatorAvatar = activity.created_by_user_id ? userAvatars[activity.created_by_user_id] : null;

                          return (
                            <TableRow key={activity.id} className={cn("group hover:bg-muted/30 relative [&>td]:py-2 [&>td]:px-3", isOverdue && "bg-destructive/5")}>
                              {isOverdue && (
                                <td className="absolute left-0 top-0 bottom-0 w-1 bg-destructive rounded-l" />
                              )}
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="font-medium text-sm text-foreground">
                                    {ACTIVITY_TYPE_LABELS[actType] || activity.title}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                                {activity.description || "--"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    {creatorAvatar?.avatar_url ? (
                                      <AvatarImage src={creatorAvatar.avatar_url} alt={creatorAvatar.name} />
                                    ) : null}
                                    <AvatarFallback className="text-[10px] bg-muted">
                                      {(activity.created_by_name || "S").slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm truncate max-w-[100px]">
                                    {activity.created_by_name || "Sistema"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div
                                  className="flex items-center gap-1.5 cursor-pointer hover:underline"
                                  onClick={() => handleLeadClick(activity)}
                                >
                                  <span className="text-sm text-primary font-medium truncate max-w-[150px]">
                                    {activity.lead_source || "Manual"} {activity.lead_company_name !== "-" ? `[${activity.lead_company_name?.substring(0, 10)}...]` : ""}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span
                                  className="text-sm text-primary font-medium cursor-pointer hover:underline"
                                  onClick={() => handleLeadClick(activity)}
                                >
                                  {activity.lead_contact_name || "--"}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm text-primary">
                                {activity.lead_company_name}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-foreground whitespace-pre-line">
                                  {scheduledDate && scheduledTime
                                    ? `${scheduledDate}\n${scheduledTime}`
                                    : formatDate(activity.created_at)}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-foreground">
                                {duration}
                              </TableCell>
                              {statusTab !== "planned" && (
                                <TableCell className="text-sm text-muted-foreground">
                                  {statusTab === "completed" ? activity.completed_by_name : activity.no_show_by_name || "—"}
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  {resolvedStatus === "planned" && (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={() => handleOpenModal(activity, "complete")} title="Concluir">
                                        <CheckCircle className="h-4 w-4 text-muted-foreground hover:text-emerald-600" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={() => handleOpenModal(activity, "no_show")} title="No-show">
                                        <Ban className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                      </Button>
                                    </>
                                  )}
                                  {resolvedStatus !== "planned" && (
                                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                                      onClick={() => setViewNoteItem(activity)} title="Ver observação">
                                      <Eye className="h-3.5 w-3.5" /> Observação
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                      <SelectTrigger className="w-[100px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PER_PAGE_OPTIONS.map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} por pág.</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">
                      {startItem}-{endItem} de {totalItems}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="text-xs h-8 hidden sm:inline-flex" disabled={page === 1} onClick={() => setPage(1)}>
                      Primeira
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="flex items-center justify-center h-8 w-8 rounded-md border text-xs font-medium bg-primary text-primary-foreground">
                      {page}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-8 hidden sm:inline-flex" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
                      Última
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Tabs>
        </TabsContent>

        <TabsContent value="agenda">
          <WeeklyCalendarView
            activities={planned}
            loading={loading}
            userAvatars={userAvatars}
            onActivityClick={handleLeadClick}
          />
        </TabsContent>
      </Tabs>

      {/* Completion / No-Show Modal */}
      <ActivityStatusModal
        open={!!modalTarget}
        onClose={() => setModalTarget(null)}
        onConfirm={handleModalConfirm}
        type={modalType}
        activityTitle={modalTarget?.title}
      />

      {/* View Note Dialog */}
      <Dialog open={!!viewNoteItem} onOpenChange={(o) => { if (!o) setViewNoteItem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {viewNoteItem ? (getStatus(viewNoteItem) === "completed" ? "Observação de Conclusão" : "Observação de No-Show") : ""}
            </DialogTitle>
            <DialogDescription>{viewNoteItem?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-lg bg-muted/50 border text-sm whitespace-pre-wrap">
              {viewNoteItem?.completion_note || viewNoteItem?.no_show_note || (viewNoteItem?.metadata as any)?.completion_comment || "Sem observação registrada."}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {(viewNoteItem?.completed_by_name || viewNoteItem?.no_show_by_name) && (
                <p>Por: {viewNoteItem?.completed_by_name || viewNoteItem?.no_show_by_name}</p>
              )}
              {(viewNoteItem?.completed_at || viewNoteItem?.no_show_at) && (
                <p>Em: {new Date(viewNoteItem?.completed_at || viewNoteItem?.no_show_at || "").toLocaleString("pt-BR")}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={(open) => { if (!open) { setDrawerOpen(false); setDrawerLead(null); } }}>
        <SheetContent side="right" className="w-full sm:max-w-[85vw] lg:max-w-[70vw] p-0 overflow-y-auto">
          <SheetTitle className="sr-only">Detalhes da Oportunidade</SheetTitle>
          {drawerLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : drawerLead ? (
            <div className="h-full overflow-y-auto">
              <div className="sticky top-0 z-20 flex items-center justify-end gap-2 px-4 py-2 bg-background/80 backdrop-blur-sm border-b border-border">
                <Button
                  size="sm"
                  className="gap-1.5 text-xs font-semibold"
                  onClick={() => {
                    const wsId = drawerLead.workspace_id;
                    if (!wsId) {
                      toast.error("Esta oportunidade não está vinculada a um workspace");
                      return;
                    }
                    setDrawerOpen(false);
                    setDrawerLead(null);
                    navigate(`/atendimento?workspace=${wsId}&lead=${drawerLead.id}`);
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir no CRM
                </Button>
              </div>
              <CrmLeadDetailView
                lead={drawerLead}
                onBack={() => { setDrawerOpen(false); setDrawerLead(null); }}
                onUpdate={handleDrawerUpdate}
                onMoveStage={handleDrawerMoveStage}
                onDelete={handleDrawerDelete}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ===== WEEKLY CALENDAR VIEW (Premium) =====
const WEEKDAY_LABELS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 20) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

function getWeekDays(refDate: Date): Date[] {
  const d = new Date(refDate);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const nd = new Date(start);
    nd.setDate(start.getDate() + i);
    days.push(nd);
  }
  return days;
}

function formatWeekRange(days: Date[]): string {
  const first = days[0];
  const last = days[6];
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} de ${months[first.getMonth()]} de ${first.getFullYear()}`;
  }
  const m1 = months[first.getMonth()].slice(0, 3);
  const m2 = months[last.getMonth()].slice(0, 3);
  return `${first.getDate()} ${m1}. – ${last.getDate()} ${m2}. ${first.getFullYear()}`;
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

function parseDuration(durStr: string): number {
  if (!durStr || durStr === "--") return 30;
  const [h, m] = durStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  call: "border-l-blue-500",
  email: "border-l-amber-500",
  meeting: "border-l-emerald-500",
  internal: "border-l-purple-500",
  whatsapp: "border-l-green-500",
};

const ACTIVITY_TYPE_BG: Record<string, string> = {
  call: "bg-blue-500/10",
  email: "bg-amber-500/10",
  meeting: "bg-emerald-500/10",
  internal: "bg-purple-500/10",
  whatsapp: "bg-green-500/10",
};

interface WeeklyCalendarProps {
  activities: ActivityRow[];
  loading: boolean;
  userAvatars: UserAvatarMap;
  onActivityClick: (activity: ActivityRow) => void;
}

function WeeklyCalendarView({ activities, loading, userAvatars, onActivityClick }: WeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const now = new Date();
  const refDate = new Date(now);
  refDate.setDate(now.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(refDate);

  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = now.toISOString().slice(0, 10);

  const activityMap = useMemo(() => {
    const map: Record<string, ActivityRow[]> = {};
    for (const a of activities) {
      const meta = a.metadata || {};
      let dateKey: string;
      let timeVal: string;

      if (meta.scheduled_at) {
        const sd = new Date(meta.scheduled_at);
        dateKey = sd.toISOString().slice(0, 10);
        timeVal = sd.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      } else {
        dateKey = meta.date || a.created_at.slice(0, 10);
        timeVal = meta.time || "";
      }

      a.metadata = { ...meta, _resolved_date: dateKey, _resolved_time: timeVal };
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(a);
    }
    return map;
  }, [activities]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Premium Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            {formatWeekRange(weekDays)}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activities.length} atividade{activities.length !== 1 ? "s" : ""} planejada{activities.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 px-3"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            Hoje
          </Button>
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-260px)]">
          <table className="w-full border-collapse table-fixed">
            {/* Header with day names */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/60 backdrop-blur-sm">
                <th className="w-[60px] border-b border-r border-border p-0" />
                {weekDays.map((day, i) => {
                  const isToday = day.toISOString().slice(0, 10) === todayStr;
                  const isWeekend = i === 0 || i === 6;
                  const dayCount = (activityMap[day.toISOString().slice(0, 10)] || []).length;
                  return (
                    <th
                      key={i}
                      className={cn(
                        "border-b border-r last:border-r-0 border-border py-3 px-2 text-center transition-colors",
                        isWeekend && "bg-muted/40"
                      )}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={cn(
                          "text-[10px] uppercase tracking-widest font-medium",
                          isToday ? "text-primary" : "text-muted-foreground"
                        )}>
                          {WEEKDAY_SHORT[i]}
                        </span>
                        <span className={cn(
                          "text-lg font-bold leading-none",
                          isToday
                            ? "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center"
                            : "text-foreground"
                        )}>
                          {day.getDate()}
                        </span>
                        {dayCount > 0 && (
                          <span className="text-[9px] text-muted-foreground font-medium mt-0.5">
                            {dayCount} ativ.
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot, slotIdx) => {
                const slotMinutes = parseTime(slot);
                const isCurrentSlot = weekOffset === 0 && Math.abs(currentTimeMinutes - slotMinutes) < 15;
                const isFullHour = slot.endsWith(":00");

                return (
                  <tr key={slot} className={cn("h-12", isFullHour ? "border-t border-border/60" : "")}>
                    <td className={cn(
                      "border-r border-border text-right pr-2 align-top pt-1 w-[60px] select-none",
                      isFullHour ? "text-xs font-medium text-muted-foreground" : "text-[10px] text-muted-foreground/50",
                      isCurrentSlot && "text-primary font-bold"
                    )}>
                      {isFullHour && slot}
                    </td>
                    {weekDays.map((day, colIdx) => {
                      const dateKey = day.toISOString().slice(0, 10);
                      const isWeekend = colIdx === 0 || colIdx === 6;
                      const isToday = dateKey === todayStr;
                      const dayActivities = activityMap[dateKey] || [];

                      const slotActivities = dayActivities.filter((a) => {
                        const meta = a.metadata || {};
                        const time = meta._resolved_time || meta.time || "";
                        if (!time) return false;
                        const actMinutes = parseTime(time);
                        return actMinutes >= slotMinutes && actMinutes < slotMinutes + 30;
                      });

                      // Current time indicator
                      const showTimeLine = isToday && weekOffset === 0 &&
                        currentTimeMinutes >= slotMinutes && currentTimeMinutes < slotMinutes + 30;
                      const timeLineTop = showTimeLine
                        ? `${((currentTimeMinutes - slotMinutes) / 30) * 100}%`
                        : undefined;

                      return (
                        <td
                          key={colIdx}
                          className={cn(
                            "border-r last:border-r-0 border-border/40 p-0 align-top relative",
                            isFullHour && "border-t border-border/30",
                            isWeekend && "bg-muted/10",
                            isToday && "bg-primary/[0.03]"
                          )}
                        >
                          {/* Current time red line */}
                          {showTimeLine && (
                            <div
                              className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                              style={{ top: timeLineTop }}
                            >
                              <div className="w-2 h-2 rounded-full bg-destructive -ml-1" />
                              <div className="flex-1 h-[2px] bg-destructive" />
                            </div>
                          )}

                          {slotActivities.map((a) => {
                            const meta = a.metadata || {};
                            const actType = meta.activity_type || a.type;
                            const time = meta._resolved_time || meta.time || "";
                            const LABELS: Record<string, string> = {
                              call: "Ligação", email: "E-mail", meeting: "Reunião",
                              internal: "Atividade Interna", whatsapp: "WhatsApp",
                              activity: "Atividade",
                            };
                            const TypeIcon = ACTIVITY_TYPE_ICONS[actType] || Briefcase;
                            const colorClass = ACTIVITY_TYPE_COLORS[actType] || "border-l-primary";
                            const bgClass = ACTIVITY_TYPE_BG[actType] || "bg-primary/5";
                            const avatar = a.created_by_user_id ? userAvatars[a.created_by_user_id] : null;
                            const initials = (a.created_by_name || "S").slice(0, 2).toUpperCase();

                            return (
                              <div
                                key={a.id}
                                className={cn(
                                  "m-0.5 rounded-md border-l-[3px] shadow-sm p-1.5 text-[11px] cursor-pointer",
                                  "hover:shadow-lg hover:scale-[1.02] transition-all duration-150",
                                  "group relative",
                                  colorClass,
                                  bgClass,
                                )}
                                onClick={() => onActivityClick(a)}
                                title={`${LABELS[actType] || a.title}\n${a.lead_company_name || ""}\nResponsável: ${a.created_by_name || "Sistema"}\nHorário: ${time}`}
                              >
                                <div className="flex items-center gap-1.5">
                                  {/* Avatar */}
                                  <Avatar className="h-5 w-5 shrink-0">
                                    {avatar?.avatar_url ? (
                                      <AvatarImage src={avatar.avatar_url} alt={avatar.name} className="object-cover" />
                                    ) : null}
                                    <AvatarFallback className="text-[8px] bg-muted font-semibold">
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>

                                  <span className="font-semibold text-foreground truncate flex-1 leading-tight">
                                    {a.created_by_name || "Sistema"}
                                  </span>

                                  {/* Time badge */}
                                  <span className="shrink-0 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-[1px] rounded-md">
                                    {time}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 mt-1">
                                  <TypeIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground truncate leading-tight">
                                    {LABELS[actType] || a.title}
                                  </span>
                                </div>

                                {/* Company name */}
                                {a.lead_company_name && a.lead_company_name !== "-" && (
                                  <p className="text-[10px] text-primary/80 truncate mt-0.5 font-medium">
                                    {a.lead_company_name}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}