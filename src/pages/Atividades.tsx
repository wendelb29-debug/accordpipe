import { useState, useEffect, useMemo } from "react";
import {
  PhoneCall, Mail, Users, Briefcase, MessageSquare, CheckCircle,
  Ban, MoreVertical, Calendar, ListOrdered, Filter, Settings,
  UserCircle, Plus, Loader2, ChevronLeft, ChevronRight, AlertTriangle,
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
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [dateFilter, setDateFilter] = useState("today");
  const [userAvatars, setUserAvatars] = useState<UserAvatarMap>({});
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
  }, [activeCompanyId, dateFilter, view]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const servidorId = isMaster ? activeCompanyId : profile?.company_id;

      // Build activity types filter for scheduled activities only
      const scheduledTypes = ["call", "email", "meeting", "internal", "whatsapp"];

      let query = supabase
        .from("crm_lead_activities")
        .select("*")
        .in("type", scheduledTypes)
        .order("created_at", { ascending: false });

      if (servidorId) {
        query = query.eq("servidor_id", servidorId);
      }

      // User isolation: non-admin/non-master users only see their own activities
      if (!isMaster && !isAdmin && user?.id) {
        query = query.eq("created_by_user_id", user.id);
      }

      // Date filter - skip for agenda view (loads all and filters client-side)
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

      // Fetch lead info for each activity
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

      const enriched: ActivityRow[] = (data || [])
        .filter((a) => {
          const meta = (a.metadata as any) || {};
          return meta.status !== "concluida" && meta.status !== "no_show";
        })
        .map((a) => ({
          ...a,
          metadata: a.metadata as any,
          lead_company_name: leadsMap[a.lead_id]?.company_name || "-",
          lead_contact_name: leadsMap[a.lead_id]?.contact_name || "-",
          lead_source: leadsMap[a.lead_id]?.source || "Manual",
        }));

      setActivities(enriched);
      setPage(1);

      // Fetch user avatars for all unique created_by_user_id
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

  const handleMarkDone = async (activity: ActivityRow) => {
    const meta = activity.metadata || {};
    const { error } = await supabase
      .from("crm_lead_activities")
      .update({ metadata: { ...meta, status: "concluida" } } as any)
      .eq("id", activity.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Atividade concluída!");
    fetchActivities();
  };

  const handleMarkNoShow = async (activity: ActivityRow) => {
    const meta = activity.metadata || {};
    const { error } = await supabase
      .from("crm_lead_activities")
      .update({ metadata: { ...meta, status: "no_show" } } as any)
      .eq("id", activity.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Marcada como no-show");
    fetchActivities();
  };

  // Pagination
  const totalItems = activities.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const paginated = activities.slice((page - 1) * perPage, page * perPage);
  const startItem = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, totalItems);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      "\n" + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const handleLeadClick = (activity: ActivityRow) => {
    if (isMobile) {
      setExpandedActivityId(expandedActivityId === activity.id ? null : activity.id);
    } else {
      window.open(`/gestao-vendas?lead=${activity.lead_id}`, "_blank");
    }
  };

  const dateFilterLabels: Record<string, string> = {
    today: "Hoje",
    week: "Esta semana",
    month: "Este mês",
    all: "Todos",
  };

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

          {/* View toggles */}
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

      {/* Tabs: Atividades / Agenda */}
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
                    Nenhuma atividade encontrada para o período selecionado.
                  </div>
                ) : (
                  paginated.map((activity) => {
                    const meta = activity.metadata || {};
                    const actType = meta.activity_type || activity.type;
                    const TypeIcon = ACTIVITY_TYPE_ICONS[actType] || Briefcase;
                    const status = meta.status || "planejada";
                    const scheduledDate = meta.scheduled_at ? new Date(meta.scheduled_at).toLocaleDateString("pt-BR") : (meta.scheduled_date ? new Date(meta.scheduled_date).toLocaleDateString("pt-BR") : null);
                    const scheduledTime = meta.scheduled_at ? new Date(meta.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : (meta.scheduled_time || meta.time || null);
                    const scheduledAt = meta.scheduled_at ? new Date(meta.scheduled_at) : (meta.scheduled_date ? new Date(meta.scheduled_date) : null);
                    const isOverdue = scheduledAt && status !== "concluida" && status !== "no_show" && scheduledAt < new Date();
                    const creatorAvatar = activity.created_by_user_id ? userAvatars[activity.created_by_user_id] : null;

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
                            {status !== "concluida" && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMarkDone(activity)} title="Concluir">
                                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleMarkDone(activity)}>
                                  <CheckCircle className="h-3.5 w-3.5 mr-2" /> Concluir
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMarkNoShow(activity)}>
                                  <Ban className="h-3.5 w-3.5 mr-2" /> No-show
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

                        {/* Expanded activity details on mobile */}
                        {expandedActivityId === activity.id && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border text-xs space-y-2">
                            <p className="font-semibold text-foreground">{activity.title}</p>
                            {activity.description && <p className="text-muted-foreground">{activity.description}</p>}
                            <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                              <span>Empresa: {activity.lead_company_name}</span>
                              <span>Pessoa: {activity.lead_contact_name || "--"}</span>
                              <span>Responsável: {activity.created_by_name || "Sistema"}</span>
                              <span>Origem: {activity.lead_source || "Manual"}</span>
                            </div>
                          </div>
                        )}

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
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10"><Checkbox /></TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Título</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Descrição</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Responsável</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Oportunidade</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Pessoa</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Empresa</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Início</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Duração</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Conclusão</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                          Nenhuma atividade encontrada para o período selecionado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((activity) => {
                        const meta = activity.metadata || {};
                        const actType = meta.activity_type || activity.type;
                        const TypeIcon = ACTIVITY_TYPE_ICONS[actType] || Briefcase;
                        const status = meta.status || "planejada";
                        const scheduledDate = meta.scheduled_at ? new Date(meta.scheduled_at).toLocaleDateString("pt-BR") : (meta.scheduled_date ? new Date(meta.scheduled_date).toLocaleDateString("pt-BR") : null);
                        const scheduledTime = meta.scheduled_at ? new Date(meta.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : (meta.scheduled_time || meta.time || null);
                        const duration = meta.duration || "--";
                        const scheduledAt = meta.scheduled_at ? new Date(meta.scheduled_at) : (meta.scheduled_date ? new Date(meta.scheduled_date) : null);
                        const isOverdue = scheduledAt && status !== "concluida" && status !== "no_show" && scheduledAt < new Date();
                        const creatorAvatar = activity.created_by_user_id ? userAvatars[activity.created_by_user_id] : null;

                        return (
                          <TableRow key={activity.id} className={cn("group hover:bg-muted/30 relative", isOverdue && "bg-destructive/5")}>
                            {isOverdue && (
                              <td className="absolute left-0 top-0 bottom-0 w-1 bg-destructive rounded-l" />
                            )}
                            <TableCell><Checkbox /></TableCell>
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
                                title="Abrir oportunidade em nova aba"
                              >
                                {activity.lead_source && activity.lead_source !== "Manual" && (
                                  <span className="text-amber-500">★</span>
                                )}
                                <span className="text-sm text-primary font-medium truncate max-w-[150px]">
                                  {activity.lead_source || "Manual"} {activity.lead_company_name !== "-" ? `[${activity.lead_company_name?.substring(0, 10)}...]` : ""}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className="text-sm text-primary font-medium cursor-pointer hover:underline"
                                onClick={() => handleLeadClick(activity)}
                                title="Abrir oportunidade em nova aba"
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
                            <TableCell className="text-sm text-muted-foreground">
                              {status === "concluida"
                                ? new Date(activity.created_at).toLocaleDateString("pt-BR")
                                : "--"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {status !== "concluida" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleMarkDone(activity)}
                                    title="Concluir"
                                  >
                                    <CheckCircle className="h-4 w-4 text-muted-foreground hover:text-emerald-600" />
                                  </Button>
                                )}
                                {status !== "no_show" && status !== "concluida" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleMarkNoShow(activity)}
                                    title="No-show"
                                  >
                                    <Ban className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleMarkDone(activity)}>
                                      <CheckCircle className="h-3.5 w-3.5 mr-2" /> Concluir
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleMarkNoShow(activity)}>
                                      <Ban className="h-3.5 w-3.5 mr-2" /> No-show
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
        </TabsContent>

        <TabsContent value="agenda">
          <WeeklyCalendarView activities={activities} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== WEEKLY CALENDAR VIEW (PipeRun style) =====
const WEEKDAY_LABELS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 19; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 19) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
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
  const months = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
  return `${first.getDate()} – ${last.getDate()} de ${months[first.getMonth()]} de ${first.getFullYear()}`;
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

function WeeklyCalendarView({ activities, loading }: { activities: ActivityRow[]; loading: boolean }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [calendarMode, setCalendarMode] = useState<"week" | "month">("week");

  const now = new Date();
  const refDate = new Date(now);
  refDate.setDate(now.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(refDate);

  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = now.toISOString().slice(0, 10);

  // Map activities to their scheduled date/time
  // Activities store scheduled_at as full datetime OR separate date/time fields
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

      // Enrich metadata with resolved time for slot matching
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
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground italic">
          {formatWeekRange(weekDays)}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant={calendarMode === "month" ? "outline" : "outline"}
            size="sm"
            className="text-xs h-8"
            onClick={() => setCalendarMode("month")}
          >
            Mês
          </Button>
          <Button
            variant={calendarMode === "week" ? "default" : "outline"}
            size="sm"
            className="text-xs h-8"
            onClick={() => setCalendarMode("week")}
          >
            Semana
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekly grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <table className="w-full border-collapse table-fixed">
            <thead className="sticky top-0 z-10 bg-card">
              <tr>
                <th className="w-16 border-b border-r border-border p-0" />
                {weekDays.map((day, i) => {
                  const isToday = day.toISOString().slice(0, 10) === todayStr;
                  const isWeekend = i === 0 || i === 6;
                  return (
                    <th
                      key={i}
                      className={cn(
                        "border-b border-r last:border-r-0 border-border p-2 text-center text-sm font-semibold",
                        isToday ? "text-primary" : "text-foreground",
                        isWeekend && "bg-muted/30"
                      )}
                    >
                      {WEEKDAY_LABELS[i]}, {day.getDate()}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => {
                const slotMinutes = parseTime(slot);
                const isCurrentSlot = todayStr && Math.abs(currentTimeMinutes - slotMinutes) < 30 && weekOffset === 0;

                return (
                  <tr key={slot} className="h-10">
                    <td className={cn(
                      "border-r border-b border-border text-xs text-muted-foreground text-right pr-2 align-top pt-1 w-16 select-none",
                      isCurrentSlot && "text-destructive font-bold"
                    )}>
                      {isCurrentSlot && <span className="text-destructive mr-0.5">▸</span>}
                      {slot}
                    </td>
                    {weekDays.map((day, colIdx) => {
                      const dateKey = day.toISOString().slice(0, 10);
                      const isWeekend = colIdx === 0 || colIdx === 6;
                      const isToday = dateKey === todayStr;
                      const dayActivities = activityMap[dateKey] || [];

                      // Find activities that start in this slot
                      const slotActivities = dayActivities.filter((a) => {
                        const meta = a.metadata || {};
                        const time = meta._resolved_time || meta.time || "";
                        if (!time) return false;
                        const actMinutes = parseTime(time);
                        return actMinutes >= slotMinutes && actMinutes < slotMinutes + 30;
                      });

                      // Filter out past activities (time + duration has passed)
                      const visibleActivities = slotActivities.filter((a) => {
                        const meta = a.metadata || {};
                        const time = meta._resolved_time || meta.time || "";
                        const duration = parseDuration(meta.duration || "00:30");
                        const actMinutes = parseTime(time);
                        const endMinutes = actMinutes + duration;

                        // Only hide if it's today and past the end time
                        if (dateKey === todayStr && weekOffset === 0) {
                          return currentTimeMinutes < endMinutes;
                        }
                        // For past days, hide all; for future days, show all
                        if (day < new Date(todayStr)) return false;
                        return true;
                      });

                      return (
                        <td
                          key={colIdx}
                          className={cn(
                            "border-r border-b last:border-r-0 border-border p-0 align-top relative",
                            isWeekend && "bg-muted/20",
                            isToday && "bg-primary/5"
                          )}
                        >
                          {visibleActivities.map((a) => {
                            const meta = a.metadata || {};
                            const actType = meta.activity_type || a.type;
                            const time = meta._resolved_time || meta.time || "";

                            return (
                              <div
                                key={a.id}
                                className="m-0.5 rounded border border-border bg-card shadow-sm p-1.5 text-[11px] cursor-default hover:shadow-md transition-shadow"
                                title={`${ACTIVITY_TYPE_LABELS[actType] || a.title} - ${a.lead_company_name}`}
                              >
                                <div className="flex items-center gap-1">
                                  <UserCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="font-medium text-foreground truncate">
                                    {a.created_by_name || "Sistema"}
                                  </span>
                                  <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                                    {time}
                                  </span>
                                </div>
                                <p className="text-muted-foreground truncate mt-0.5">
                                  {ACTIVITY_TYPE_LABELS[actType] || a.title}
                                </p>
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
