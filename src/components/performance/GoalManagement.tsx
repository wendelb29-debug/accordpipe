import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Target, Plus, Settings2, Users, TrendingUp, TrendingDown, Minus, Save, Search,
  ArrowUpDown, Lightbulb, AlertTriangle, Award, ChevronDown, ChevronUp, BarChart3,
  Zap, X, Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useGoalManagement } from "@/hooks/useGoalManagement";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role_label?: string;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type SortKey = "name" | "meta" | "realizado" | "pct";
type SortDir = "asc" | "desc";

function formatValue(val: number, tipo: string) {
  if (tipo === "percentual") return `${val.toFixed(1)}%`;
  if (tipo === "quantidade") return val.toLocaleString("pt-BR");
  return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function getStatusConfig(pct: number) {
  if (pct >= 100) return { label: "Acima da meta", color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20", dot: "bg-emerald-500" };
  if (pct >= 70) return { label: "Dentro da meta", color: "bg-amber-500/15 text-amber-500 border-amber-500/20", dot: "bg-amber-500" };
  if (pct >= 40) return { label: "Abaixo da meta", color: "bg-orange-500/15 text-orange-500 border-orange-500/20", dot: "bg-orange-500" };
  return { label: "Em risco", color: "bg-red-500/15 text-red-500 border-red-500/20", dot: "bg-red-500" };
}

function getProgressColor(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 70) return "bg-amber-500";
  if (pct >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export function GoalManagement() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [workspaceId, setWorkspaceId] = useState<string | undefined>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDistributeDialog, setShowDistributeDialog] = useState(false);
  const [newMetaValor, setNewMetaValor] = useState("");
  const [newTipoMeta, setNewTipoMeta] = useState("valor");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [distributeMode, setDistributeMode] = useState<"equal" | "manual">("equal");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("pct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [manualValues, setManualValues] = useState<Record<string, string>>({});

  const companyId = useActiveCompanyId();
  const { role } = useAuth();
  const { filterAllowedWorkspaces, isCeoOrMaster, canEditWorkspace } = useWorkspacePermissions();
  const { workspaces: allWorkspaces } = useWorkspaces();
  const allowedWorkspaces = useMemo(
    () => filterAllowedWorkspaces(allWorkspaces),
    [allWorkspaces, filterAllowedWorkspaces]
  );

  useMemo(() => {
    if (!workspaceId && allowedWorkspaces.length > 0) {
      setWorkspaceId(allowedWorkspaces[0].id);
    }
  }, [allowedWorkspaces, workspaceId]);

  const { workspaceGoal, userGoals, loading, upsertWorkspaceGoal, upsertUserGoal, distributeGoals } =
    useGoalManagement(workspaceId, mes, ano);

  const fetchUsers = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, name, email, avatar_url")
      .eq("company_id", companyId)
      .eq("is_active", true);
    setUsers((data as any[]) || []);
  }, [companyId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const [crmData, setCrmData] = useState<Record<string, { ganhos: number; valor_total: number; conversao: number }>>({});
  useEffect(() => {
    if (!companyId) return;
    supabase.rpc("compute_crm_performance", {
      _tenant_id: companyId,
      _mes: mes,
      _ano: ano,
    }).then(({ data }) => {
      const map: Record<string, any> = {};
      (data || []).forEach((row: any) => {
        map[row.user_id] = {
          ganhos: Number(row.ganhos) || 0,
          valor_total: Number(row.valor_total) || 0,
          conversao: Number(row.conversao) || 0,
        };
      });
      setCrmData(map);
    });
  }, [companyId, mes, ano]);

  const tipoMeta = workspaceGoal?.tipo_meta || "valor";

  const getRealizado = (userId: string) => {
    const crm = crmData[userId];
    if (!crm) return 0;
    if (tipoMeta === "quantidade") return crm.ganhos;
    if (tipoMeta === "percentual") return crm.conversao;
    return crm.valor_total;
  };

  const totalRealizado = useMemo(() => {
    return users.reduce((sum, u) => sum + getRealizado(u.user_id), 0);
  }, [users, crmData, tipoMeta]);

  const metaTotal = workspaceGoal?.meta_valor || 0;
  const pctTotal = metaTotal > 0 ? Math.round((totalRealizado / metaTotal) * 100) : 0;

  // Previous month comparison
  const [prevRealizado, setPrevRealizado] = useState(0);
  useEffect(() => {
    if (!companyId) return;
    const prevMes = mes === 1 ? 12 : mes - 1;
    const prevAno = mes === 1 ? ano - 1 : ano;
    supabase.rpc("compute_crm_performance", {
      _tenant_id: companyId,
      _mes: prevMes,
      _ano: prevAno,
    }).then(({ data }) => {
      const total = (data || []).reduce((s: number, r: any) => s + (Number(r.valor_total) || 0), 0);
      setPrevRealizado(total);
    });
  }, [companyId, mes, ano]);

  const variacao = prevRealizado > 0
    ? Math.round(((totalRealizado - prevRealizado) / prevRealizado) * 100)
    : 0;

  // Build enriched user rows
  const userRows = useMemo(() => {
    return users.map(user => {
      const userGoal = userGoals.find(g => g.user_id === user.user_id);
      const meta = userGoal?.meta_valor || 0;
      const realizado = getRealizado(user.user_id);
      const pct = meta > 0 ? Math.round((realizado / meta) * 100) : 0;
      return { ...user, meta, realizado, pct };
    });
  }, [users, userGoals, crmData, tipoMeta]);

  const avgPct = useMemo(() => {
    const withGoal = userRows.filter(r => r.meta > 0);
    if (withGoal.length === 0) return 0;
    return Math.round(withGoal.reduce((s, r) => s + r.pct, 0) / withGoal.length);
  }, [userRows]);

  // Insights
  const insights = useMemo(() => {
    const withGoal = userRows.filter(r => r.meta > 0);
    if (withGoal.length === 0) return [];

    const sorted = [...withGoal].sort((a, b) => b.pct - a.pct);
    const items: { icon: any; text: string; type: "success" | "warning" | "info" }[] = [];

    if (sorted[0]) {
      items.push({
        icon: Award,
        text: `${sorted[0].name.split(" ")[0]} lidera com ${sorted[0].pct}% da meta`,
        type: "success",
      });
    }
    if (sorted.length > 1 && sorted[sorted.length - 1].pct < 50) {
      const last = sorted[sorted.length - 1];
      items.push({
        icon: AlertTriangle,
        text: `${last.name.split(" ")[0]} está em risco com apenas ${last.pct}%`,
        type: "warning",
      });
    }
    if (pctTotal < 70) {
      const daysInMonth = new Date(ano, mes, 0).getDate();
      const daysPassed = mes === now.getMonth() + 1 && ano === now.getFullYear() ? now.getDate() : daysInMonth;
      const expectedPct = Math.round((daysPassed / daysInMonth) * 100);
      if (pctTotal < expectedPct - 10) {
        items.push({
          icon: AlertTriangle,
          text: `Time abaixo da curva esperada (${pctTotal}% vs ${expectedPct}% esperado)`,
          type: "warning",
        });
      }
    }
    if (pctTotal >= 100) {
      items.push({ icon: Zap, text: "Time acima da meta! Parabéns!", type: "success" });
    }

    return items;
  }, [userRows, pctTotal, mes, ano]);

  // Filtered & sorted
  const filteredRows = useMemo(() => {
    let rows = [...userRows];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    }
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "meta") cmp = a.meta - b.meta;
      else if (sortKey === "realizado") cmp = a.realizado - b.realizado;
      else cmp = a.pct - b.pct;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [userRows, searchQuery, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const handleSaveWorkspaceGoal = async () => {
    const val = parseFloat(newMetaValor);
    if (isNaN(val) || val < 0) return;
    await upsertWorkspaceGoal(val, newTipoMeta);
    setShowCreateDialog(false);
  };

  const handleSaveUserGoal = async (userId: string) => {
    const val = parseFloat(editingValue);
    if (isNaN(val) || val < 0) return;
    await upsertUserGoal(userId, val);
    setEditingUserId(null);
    setEditingValue("");
  };

  const handleDistribute = async () => {
    const userIds = users.map(u => u.user_id);
    if (distributeMode === "manual") {
      const vals: Record<string, number> = {};
      userIds.forEach(uid => { vals[uid] = parseFloat(manualValues[uid] || "0") || 0; });
      await distributeGoals(userIds, "manual", vals);
    } else {
      await distributeGoals(userIds, "equal");
    }
    setShowDistributeDialog(false);
  };

  const canEdit = isCeoOrMaster || role === "admin" || (workspaceId ? canEditWorkspace(workspaceId) : false);
  const currentYear = now.getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const workspaceName = allowedWorkspaces.find(w => w.id === workspaceId)?.name || "";
  const statusGeral = getStatusConfig(pctTotal);

  const manualTotal = useMemo(() => {
    return users.reduce((s, u) => s + (parseFloat(manualValues[u.user_id] || "0") || 0), 0);
  }, [manualValues, users]);
  const manualDiff = metaTotal - manualTotal;

  // Init manual values when opening distribute dialog
  useEffect(() => {
    if (showDistributeDialog) {
      const vals: Record<string, string> = {};
      users.forEach(u => {
        const existing = userGoals.find(g => g.user_id === u.user_id);
        vals[u.user_id] = existing?.meta_valor?.toString() || "0";
      });
      setManualValues(vals);
    }
  }, [showDistributeDialog]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Gestão de Metas</h2>
            <p className="text-[11px] text-muted-foreground">Defina e acompanhe metas por workspace e colaborador</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={workspaceId || ""} onValueChange={v => setWorkspaceId(v)}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Selecione workspace" />
            </SelectTrigger>
            <SelectContent>
              {allowedWorkspaces.map(w => (
                <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
            <SelectTrigger className="w-[80px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && (
            <>
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => {
                setNewMetaValor(workspaceGoal?.meta_valor?.toString() || "");
                setNewTipoMeta(workspaceGoal?.tipo_meta || "valor");
                setShowCreateDialog(true);
              }}>
                <Plus className="h-3.5 w-3.5" />
                {workspaceGoal ? "Editar Meta" : "Criar Meta"}
              </Button>
              {workspaceGoal && (
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setShowDistributeDialog(true)}>
                  <Settings2 className="h-3.5 w-3.5" />
                  Distribuir
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {!workspaceId ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Target className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">Selecione um workspace para gerenciar metas</p>
            <p className="text-muted-foreground text-xs">Escolha o time ou operação desejada no seletor acima</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Executive Workspace Card */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className={`h-1 ${pctTotal >= 100 ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300" : pctTotal >= 70 ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300" : "bg-gradient-to-r from-primary via-primary/60 to-primary/20"}`} />
            <CardContent className="p-5">
              {workspaceGoal ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{workspaceName}</h3>
                      <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-medium">
                        {tipoMeta}
                      </Badge>
                    </div>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${statusGeral.color}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${statusGeral.dot}`} />
                      {statusGeral.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Meta Total</p>
                      <p className="text-xl font-bold text-primary">{formatValue(metaTotal, tipoMeta)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Realizado</p>
                      <p className="text-xl font-bold text-emerald-500">{formatValue(totalRealizado, tipoMeta)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">% Atingido</p>
                      <p className="text-xl font-bold">{pctTotal}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">vs Mês Anterior</p>
                      <div className="flex items-center gap-1">
                        {variacao >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <p className={`text-xl font-bold ${variacao >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {variacao >= 0 ? "+" : ""}{variacao}%
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Média do Time</p>
                      <p className="text-xl font-bold">{avgPct}%</p>
                    </div>
                  </div>

                  {/* Premium progress bar */}
                  <div className="space-y-1.5">
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/50">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressColor(pctTotal)}`}
                        style={{ width: `${Math.min(pctTotal, 100)}%` }}
                      />
                      {pctTotal > 0 && pctTotal < 100 && (
                        <div
                          className="absolute top-0 h-full w-0.5 bg-foreground/20"
                          style={{ left: `${Math.min(pctTotal, 100)}%` }}
                        />
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-muted mb-3">
                    <Target className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Nenhuma meta definida para este período</p>
                  <p className="text-xs text-muted-foreground mb-4">Crie uma meta para começar o acompanhamento</p>
                  {canEdit && (
                    <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Criar Meta
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {insights.map((insight, i) => (
                <Card key={i} className={`border-0 ${insight.type === "success" ? "bg-emerald-500/5 border-emerald-500/10" : insight.type === "warning" ? "bg-amber-500/5 border-amber-500/10" : "bg-primary/5 border-primary/10"}`}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${insight.type === "success" ? "bg-emerald-500/10" : insight.type === "warning" ? "bg-amber-500/10" : "bg-primary/10"}`}>
                      <insight.icon className={`h-4 w-4 ${insight.type === "success" ? "text-emerald-500" : insight.type === "warning" ? "text-amber-500" : "text-primary"}`} />
                    </div>
                    <p className="text-xs font-medium">{insight.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Distribution Table */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-3 px-5 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Distribuição por Colaborador
                  <Badge variant="secondary" className="text-[10px] ml-1 font-normal">
                    {userGoals.length}/{users.length}
                  </Badge>
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar colaborador..."
                    className="h-7 w-[180px] pl-8 text-xs"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left px-5 py-2.5 text-muted-foreground font-medium cursor-pointer select-none" onClick={() => handleSort("name")}>
                        <span className="flex items-center gap-1">Colaborador <ArrowUpDown className="h-3 w-3" /></span>
                      </th>
                      <th className="text-right px-4 py-2.5 text-muted-foreground font-medium cursor-pointer select-none" onClick={() => handleSort("meta")}>
                        <span className="flex items-center justify-end gap-1">Meta <ArrowUpDown className="h-3 w-3" /></span>
                      </th>
                      <th className="text-right px-4 py-2.5 text-muted-foreground font-medium cursor-pointer select-none" onClick={() => handleSort("realizado")}>
                        <span className="flex items-center justify-end gap-1">Realizado <ArrowUpDown className="h-3 w-3" /></span>
                      </th>
                      <th className="text-right px-4 py-2.5 text-muted-foreground font-medium w-[100px]">Progresso</th>
                      <th className="text-right px-4 py-2.5 text-muted-foreground font-medium cursor-pointer select-none w-[60px]" onClick={() => handleSort("pct")}>
                        <span className="flex items-center justify-end gap-1">% <ArrowUpDown className="h-3 w-3" /></span>
                      </th>
                      <th className="text-center px-4 py-2.5 text-muted-foreground font-medium w-[80px]">vs Média</th>
                      <th className="text-center px-4 py-2.5 text-muted-foreground font-medium w-[100px]">Status</th>
                      {canEdit && <th className="text-center px-4 py-2.5 text-muted-foreground font-medium w-[70px]">Ação</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, idx) => {
                      const status = getStatusConfig(row.pct);
                      const isEditing = editingUserId === row.user_id;
                      const diffFromAvg = row.pct - avgPct;

                      return (
                        <tr
                          key={row.user_id}
                          className="border-b border-border/20 hover:bg-muted/20 transition-all duration-150 group"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-[11px] font-semibold text-primary ring-1 ring-primary/10">
                                {row.name?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                              <div>
                                <span className="font-medium text-xs block truncate max-w-[200px]">{row.name}</span>
                                <span className="text-[10px] text-muted-foreground">{row.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="text-right px-4 py-3">
                            {isEditing ? (
                              <Input
                                type="number"
                                className="h-7 w-28 text-xs ml-auto text-right"
                                value={editingValue}
                                onChange={e => setEditingValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") handleSaveUserGoal(row.user_id);
                                  if (e.key === "Escape") { setEditingUserId(null); setEditingValue(""); }
                                }}
                                autoFocus
                              />
                            ) : (
                              <span className="font-medium">{formatValue(row.meta, tipoMeta)}</span>
                            )}
                          </td>
                          <td className="text-right px-4 py-3 text-emerald-500 font-semibold">
                            {formatValue(row.realizado, tipoMeta)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/50">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(row.pct)}`}
                                style={{ width: `${Math.min(row.pct, 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="text-right px-4 py-3 font-bold text-sm">{row.pct}%</td>
                          <td className="text-center px-4 py-3">
                            <span className={`text-[10px] font-semibold ${diffFromAvg >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                              {diffFromAvg >= 0 ? "+" : ""}{diffFromAvg}%
                            </span>
                          </td>
                          <td className="text-center px-4 py-3">
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${status.color}`}>
                              <span className={`inline-block h-1 w-1 rounded-full mr-1 ${status.dot}`} />
                              {status.label.split(" ")[0]}
                            </Badge>
                          </td>
                          {canEdit && (
                            <td className="text-center px-4 py-3">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-emerald-500" onClick={() => handleSaveUserGoal(row.user_id)}>
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => { setEditingUserId(null); setEditingValue(""); }}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px] px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                    setEditingUserId(row.user_id);
                                    setEditingValue(row.meta.toString());
                                  }}
                                >
                                  Editar
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {filteredRows.length === 0 && (
                      <tr>
                        <td colSpan={canEdit ? 8 : 7} className="text-center py-12 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-6 w-6 text-muted-foreground/50" />
                            <p className="text-xs">Nenhum colaborador encontrado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredRows.length > 0 && workspaceGoal && (
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                        <td className="px-5 py-3 text-xs">Total ({filteredRows.length})</td>
                        <td className="text-right px-4 py-3 text-xs">
                          {formatValue(userGoals.reduce((s, g) => s + g.meta_valor, 0), tipoMeta)}
                        </td>
                        <td className="text-right px-4 py-3 text-xs text-emerald-500">
                          {formatValue(totalRealizado, tipoMeta)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/50">
                            <div
                              className={`h-full rounded-full ${getProgressColor(pctTotal)}`}
                              style={{ width: `${Math.min(pctTotal, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="text-right px-4 py-3 text-sm">{pctTotal}%</td>
                        <td colSpan={canEdit ? 3 : 2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Create / Edit Workspace Goal Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{workspaceGoal ? "Editar" : "Criar"} Meta — {workspaceName}</DialogTitle>
            <DialogDescription className="text-xs">
              Defina a meta principal do workspace para {MESES[mes - 1]} de {ano}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo da Meta</label>
              <Select value={newTipoMeta} onValueChange={setNewTipoMeta}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor">Valor (R$)</SelectItem>
                  <SelectItem value="quantidade">Quantidade</SelectItem>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {newTipoMeta === "valor" ? "Valor da Meta (R$)" : newTipoMeta === "quantidade" ? "Quantidade alvo" : "Percentual alvo (%)"}
              </label>
              <Input
                type="number"
                placeholder={newTipoMeta === "valor" ? "Ex: 50000" : newTipoMeta === "quantidade" ? "Ex: 30" : "Ex: 80"}
                value={newMetaValor}
                onChange={e => setNewMetaValor(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveWorkspaceGoal}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribute Goals Dialog - Premium */}
      <Dialog open={showDistributeDialog} onOpenChange={setShowDistributeDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              Distribuir Meta — {workspaceName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Meta total: <strong>{formatValue(metaTotal, tipoMeta)}</strong> · {users.length} colaborador{users.length !== 1 ? "es" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={distributeMode} onValueChange={v => setDistributeMode(v as any)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Dividir igualmente</SelectItem>
                <SelectItem value="manual">Distribuir manualmente</SelectItem>
              </SelectContent>
            </Select>

            {distributeMode === "equal" && users.length > 0 && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">
                    Cada colaborador receberá: <strong className="text-foreground">{formatValue(metaTotal / users.length, tipoMeta)}</strong>
                  </p>
                </CardContent>
              </Card>
            )}

            {distributeMode === "manual" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Distribuído: {formatValue(manualTotal, tipoMeta)}</span>
                  {Math.abs(manualDiff) > 0.01 && (
                    <span className={`font-medium ${manualDiff > 0 ? "text-amber-500" : "text-red-500"}`}>
                      {manualDiff > 0 ? "Restante" : "Excedente"}: {formatValue(Math.abs(manualDiff), tipoMeta)}
                    </span>
                  )}
                  {Math.abs(manualDiff) <= 0.01 && (
                    <span className="text-emerald-500 font-medium flex items-center gap-1">
                      <Check className="h-3 w-3" /> Distribuição completa
                    </span>
                  )}
                </div>
                <Separator />
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {users.map(u => (
                    <div key={u.user_id} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary shrink-0">
                        {u.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <span className="text-xs truncate flex-1 min-w-0">{u.name}</span>
                      <Input
                        type="number"
                        className="h-7 w-28 text-xs text-right"
                        value={manualValues[u.user_id] || ""}
                        onChange={e => setManualValues(prev => ({ ...prev, [u.user_id]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDistributeDialog(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleDistribute} className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Distribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
