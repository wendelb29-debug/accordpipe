import { useState, useMemo } from "react";
import { Target, Plus, Settings2, Users, TrendingUp, TrendingDown, Minus, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoalManagement } from "@/hooks/useGoalManagement";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useCallback } from "react";

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

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

  const companyId = useActiveCompanyId();
  const { role } = useAuth();
  const { filterAllowedWorkspaces, isCeoOrMaster } = useWorkspacePermissions();
  const { workspaces: allWorkspaces } = useWorkspaces();
  const allowedWorkspaces = useMemo(
    () => filterAllowedWorkspaces(allWorkspaces),
    [allWorkspaces, filterAllowedWorkspaces]
  );

  // Auto-select first workspace
  useMemo(() => {
    if (!workspaceId && allowedWorkspaces.length > 0) {
      setWorkspaceId(allowedWorkspaces[0].id);
    }
  }, [allowedWorkspaces, workspaceId]);

  const { workspaceGoal, userGoals, loading, upsertWorkspaceGoal, upsertUserGoal, distributeGoals } =
    useGoalManagement(workspaceId, mes, ano);

  // Fetch users for the tenant
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

  // Fetch CRM realized values
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

  const totalRealizado = useMemo(() => {
    return users.reduce((sum, u) => sum + (crmData[u.user_id]?.valor_total || 0), 0);
  }, [users, crmData]);

  const metaTotal = workspaceGoal?.meta_valor || 0;
  const pctTotal = metaTotal > 0 ? Math.round((totalRealizado / metaTotal) * 100) : 0;

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
    await distributeGoals(userIds, distributeMode);
    setShowDistributeDialog(false);
  };

  const getStatus = (pct: number) => {
    if (pct >= 100) return { label: "Acima", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    if (pct >= 70) return { label: "Dentro", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
    return { label: "Abaixo", color: "bg-red-500/20 text-red-400 border-red-500/30" };
  };

  const getTrend = (userId: string): "up" | "down" | "stable" => {
    const val = crmData[userId]?.valor_total || 0;
    const goal = userGoals.find(g => g.user_id === userId)?.meta_valor || 0;
    if (goal === 0) return "stable";
    const pct = (val / goal) * 100;
    if (pct >= 80) return "up";
    if (pct < 50) return "down";
    return "stable";
  };

  const canEdit = isCeoOrMaster || role === "admin";
  const currentYear = now.getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Gestão de Metas</h2>
              <p className="text-xs text-muted-foreground">Defina e acompanhe metas por workspace e colaborador</p>
            </div>
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
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
            <SelectTrigger className="w-[90px] h-8 text-xs">
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
              <Button size="sm" className="h-8 text-xs gap-1" onClick={() => {
                setNewMetaValor(workspaceGoal?.meta_valor?.toString() || "");
                setNewTipoMeta(workspaceGoal?.tipo_meta || "valor");
                setShowCreateDialog(true);
              }}>
                <Plus className="h-3.5 w-3.5" />
                {workspaceGoal ? "Editar Meta" : "Criar Meta"}
              </Button>
              {workspaceGoal && (
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setShowDistributeDialog(true)}>
                  <Settings2 className="h-3.5 w-3.5" />
                  Distribuir
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {!workspaceId ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-muted-foreground text-sm">Selecione um workspace para gerenciar metas</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Workspace Goal Card */}
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Meta do Workspace — {allowedWorkspaces.find(w => w.id === workspaceId)?.name || ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workspaceGoal ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Meta Total</p>
                    <p className="text-lg font-bold text-primary">
                      R$ {metaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Realizado</p>
                    <p className="text-lg font-bold text-emerald-400">
                      R$ {totalRealizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">% Atingido</p>
                    <p className="text-lg font-bold">{pctTotal}%</p>
                    <Progress value={Math.min(pctTotal, 100)} className="h-1.5 mt-1" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tendência</p>
                    <p className={`text-lg font-bold ${pctTotal >= 70 ? "text-emerald-400" : "text-red-400"}`}>
                      {pctTotal >= 100 ? "Acima" : pctTotal >= 70 ? "Dentro" : "Abaixo"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground text-sm mb-3">Nenhuma meta definida para este período</p>
                  {canEdit && (
                    <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Criar Meta
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Goals Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Distribuição por Colaborador
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {userGoals.length} meta{userGoals.length !== 1 ? "s" : ""} definida{userGoals.length !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Colaborador</th>
                      <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Meta</th>
                      <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Realizado</th>
                      <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">%</th>
                      <th className="text-center px-4 py-2.5 text-muted-foreground font-medium">Status</th>
                      <th className="text-center px-4 py-2.5 text-muted-foreground font-medium">Tendência</th>
                      {canEdit && <th className="text-center px-4 py-2.5 text-muted-foreground font-medium">Ação</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => {
                      const userGoal = userGoals.find(g => g.user_id === user.user_id);
                      const meta = userGoal?.meta_valor || 0;
                      const realizado = crmData[user.user_id]?.valor_total || 0;
                      const pct = meta > 0 ? Math.round((realizado / meta) * 100) : 0;
                      const status = getStatus(pct);
                      const trend = getTrend(user.user_id);
                      const isEditing = editingUserId === user.user_id;

                      return (
                        <tr
                          key={user.user_id}
                          className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                                {user.name?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                              <span className="font-medium truncate max-w-[180px]">{user.name}</span>
                            </div>
                          </td>
                          <td className="text-right px-4 py-2.5">
                            {isEditing ? (
                              <Input
                                type="number"
                                className="h-6 w-24 text-xs ml-auto text-right"
                                value={editingValue}
                                onChange={e => setEditingValue(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSaveUserGoal(user.user_id)}
                                autoFocus
                              />
                            ) : (
                              <span>R$ {meta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                            )}
                          </td>
                          <td className="text-right px-4 py-2.5 text-emerald-400 font-medium">
                            R$ {realizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-right px-4 py-2.5 font-bold">{pct}%</td>
                          <td className="text-center px-4 py-2.5">
                            <Badge variant="outline" className={`text-[10px] ${status.color}`}>
                              {status.label}
                            </Badge>
                          </td>
                          <td className="text-center px-4 py-2.5">
                            {trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-400 mx-auto" />}
                            {trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-red-400 mx-auto" />}
                            {trend === "stable" && <Minus className="h-3.5 w-3.5 text-muted-foreground mx-auto" />}
                          </td>
                          {canEdit && (
                            <td className="text-center px-4 py-2.5">
                              {isEditing ? (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleSaveUserGoal(user.user_id)}>
                                  <Save className="h-3 w-3" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px] px-2"
                                  onClick={() => {
                                    setEditingUserId(user.user_id);
                                    setEditingValue(meta.toString());
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
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum colaborador encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {users.length > 0 && workspaceGoal && (
                    <tfoot>
                      <tr className="border-t-2 border-border font-bold">
                        <td className="px-4 py-2.5">Total</td>
                        <td className="text-right px-4 py-2.5">
                          R$ {userGoals.reduce((s, g) => s + g.meta_valor, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-right px-4 py-2.5 text-emerald-400">
                          R$ {totalRealizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-right px-4 py-2.5">{pctTotal}%</td>
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
            <DialogTitle className="text-sm">{workspaceGoal ? "Editar" : "Criar"} Meta do Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor da Meta</label>
              <Input
                type="number"
                placeholder="Ex: 50000"
                value={newMetaValor}
                onChange={e => setNewMetaValor(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <Select value={newTipoMeta} onValueChange={setNewTipoMeta}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor">Valor (R$)</SelectItem>
                  <SelectItem value="quantidade">Quantidade</SelectItem>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveWorkspaceGoal}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribute Goals Dialog */}
      <Dialog open={showDistributeDialog} onOpenChange={setShowDistributeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Distribuir Meta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Meta total: <strong>R$ {metaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
              {" · "}{users.length} colaborador{users.length !== 1 ? "es" : ""}
            </p>
            <Select value={distributeMode} onValueChange={v => setDistributeMode(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Dividir igualmente</SelectItem>
                <SelectItem value="manual">Manter manual</SelectItem>
              </SelectContent>
            </Select>
            {distributeMode === "equal" && users.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Cada colaborador receberá: <strong>R$ {(metaTotal / users.length).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDistributeDialog(false)}>Cancelar</Button>
            <Button onClick={handleDistribute}>Distribuir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
