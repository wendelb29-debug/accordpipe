import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, MessageSquare, Target, TrendingUp, TrendingDown, Calendar, Loader2, BarChart3 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { usePerformanceFeedbacks, useAIActionPlans } from "@/hooks/usePerformanceData";
import type { PerformanceGoal, PerformanceSnapshot, UserProfile, WorkspaceKPI } from "@/hooks/usePerformanceData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  user: UserProfile | null;
  goals: PerformanceGoal[];
  snapshots: PerformanceSnapshot[];
  teamAvgScore?: number;
  teamAvgConversao?: number;
  workspaceKpis?: WorkspaceKPI[];
}

export function PerformanceDetailDrawer({ open, onClose, user, goals, snapshots, teamAvgScore = 0, teamAvgConversao = 0, workspaceKpis }: Props) {
  const companyId = useActiveCompanyId();
  const { profile } = useAuth();
  const { feedbacks, refetch: refetchFeedbacks } = usePerformanceFeedbacks(user?.user_id);
  const { plans, refetch: refetchPlans } = useAIActionPlans(user?.user_id);

  const [fbForm, setFbForm] = useState({ pontos_fortes: "", pontos_melhoria: "", plano_acao: "", proxima_revisao: "" });
  const [savingFb, setSavingFb] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  if (!user) return null;

  const userGoal = goals.find(g => g.user_id === user.user_id);
  const userSnaps = snapshots.filter(s => s.user_id === user.user_id).sort((a, b) => a.data.localeCompare(b.data));
  const totalGanhos = userSnaps.reduce((s, snap) => s + snap.ganhos, 0);
  const totalPerdas = userSnaps.reduce((s, snap) => s + snap.perdas, 0);
  const totalValor = userSnaps.reduce((s, snap) => s + snap.valor_total, 0);
  const avgScore = userSnaps.length > 0 ? Math.round(userSnaps.reduce((s, snap) => s + snap.score, 0) / userSnaps.length) : 0;
  const conversao = (totalGanhos + totalPerdas) > 0 ? Math.round((totalGanhos / (totalGanhos + totalPerdas)) * 100) : 0;
  const pct = userGoal?.percentual || 0;

  // Trend
  const trend = (() => {
    if (userSnaps.length < 2) return "stable";
    const recent = userSnaps.slice(-3);
    const older = userSnaps.slice(-6, -3);
    if (older.length === 0) return "stable";
    const r = recent.reduce((s, sn) => s + sn.score, 0) / recent.length;
    const o = older.reduce((s, sn) => s + sn.score, 0) / older.length;
    return r > o + 5 ? "up" : r < o - 5 ? "down" : "stable";
  })();

  // Diagnosis
  const diagnosis = (() => {
    if (pct >= 100) return { text: "Excelente performance — acima da meta!", color: "text-emerald-400" };
    if (pct >= 70) return { text: "Desempenho sólido — dentro do esperado.", color: "text-blue-400" };
    if (pct >= 40) return { text: "Atenção — desempenho abaixo do esperado.", color: "text-amber-400" };
    return { text: "Alerta crítico — performance em risco.", color: "text-red-400" };
  })();

  const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleSaveFeedback = async () => {
    if (!companyId || !profile?.user_id) return;
    setSavingFb(true);
    try {
      await supabase.from("performance_feedbacks").insert({
        tenant_id: companyId,
        supervisor_id: profile.user_id,
        user_id: user.user_id,
        pontos_fortes: fbForm.pontos_fortes || null,
        pontos_melhoria: fbForm.pontos_melhoria || null,
        plano_acao: fbForm.plano_acao || null,
        proxima_revisao: fbForm.proxima_revisao || null,
      } as any);
      toast.success("Feedback registrado");
      setFbForm({ pontos_fortes: "", pontos_melhoria: "", plano_acao: "", proxima_revisao: "" });
      refetchFeedbacks();
    } catch {
      toast.error("Erro ao salvar feedback");
    } finally {
      setSavingFb(false);
    }
  };

  const handleGenerateAIPlan = async () => {
    if (!companyId || !user) return;
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("performance-ai-copilot", {
        body: {
          userId: user.user_id,
          userName: user.name,
          tenantId: companyId,
          goal: userGoal ? { meta: userGoal.meta_valor, realizado: userGoal.realizado_valor, percentual: userGoal.percentual } : null,
          snapshots: userSnaps.slice(-7).map(s => ({ data: s.data, ganhos: s.ganhos, perdas: s.perdas, conversao: s.conversao, score: s.score })),
          totalGanhos,
          totalPerdas,
          avgScore,
          workspaceKpis: workspaceKpis?.map(k => ({ nome: k.nome, tipo: k.tipo, origem: k.origem })),
        },
      });
      if (error) throw error;

      await supabase.from("performance_ai_plans").insert({
        tenant_id: companyId,
        user_id: user.user_id,
        gerado_por: "ia",
        diagnostico: data?.diagnostico || null,
        sugestoes: data?.sugestoes || null,
        meta_recuperacao: data?.meta_recuperacao || null,
        data_reavaliacao: data?.data_reavaliacao || null,
        status: "ativo",
      } as any);

      toast.success("Plano de ação gerado pela IA");
      refetchPlans();
    } catch (err: any) {
      toast.error("Erro ao gerar plano: " + (err.message || ""));
    } finally {
      setGeneratingAI(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-base">{user.name}</SheetTitle>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {trend === "up" && <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30 gap-0.5"><TrendingUp className="h-2.5 w-2.5" />Subindo</Badge>}
                {trend === "down" && <Badge variant="outline" className="text-[9px] text-red-400 border-red-500/30 gap-0.5"><TrendingDown className="h-2.5 w-2.5" />Caindo</Badge>}
                {trend === "stable" && <Badge variant="outline" className="text-[9px] gap-0.5">Estável</Badge>}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Diagnosis */}
        <div className={cn("rounded-lg border p-3 mb-4", diagnosis.color === "text-emerald-400" ? "border-emerald-500/20 bg-emerald-500/5" : diagnosis.color === "text-blue-400" ? "border-blue-500/20 bg-blue-500/5" : diagnosis.color === "text-amber-400" ? "border-amber-500/20 bg-amber-500/5" : "border-red-500/20 bg-red-500/5")}>
          <p className={cn("text-xs font-medium", diagnosis.color)}>{diagnosis.text}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Meta", value: userGoal?.meta_valor?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "—" },
            { label: "Realizado", value: userGoal?.realizado_valor?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
            { label: "% Atingido", value: pct ? `${pct}%` : "—" },
            { label: "Ganhos", value: totalGanhos },
            { label: "Perdas", value: totalPerdas },
            { label: "Score Médio", value: avgScore },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg bg-muted/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p>
              <p className="text-sm font-bold">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Team Comparison */}
        {(teamAvgScore > 0 || teamAvgConversao > 0) && (
          <div className="rounded-lg border border-border/50 p-3 mb-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">📊 vs Média do Time</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground">Score</p>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-bold", avgScore >= teamAvgScore ? "text-emerald-400" : "text-red-400")}>{avgScore}</span>
                  <span className="text-[10px] text-muted-foreground">/ {teamAvgScore} avg</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Conversão</p>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-bold", conversao >= teamAvgConversao ? "text-emerald-400" : "text-red-400")}>{conversao}%</span>
                  <span className="text-[10px] text-muted-foreground">/ {teamAvgConversao}% avg</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mini Timeline */}
        {userSnaps.length > 1 && (
          <div className="rounded-lg border border-border/50 p-3 mb-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">📈 Evolução</p>
            <div className="flex items-end gap-1 h-12">
              {userSnaps.map((sn) => {
                const maxScore = Math.max(...userSnaps.map(s => s.score), 1);
                const h = Math.max(4, (sn.score / maxScore) * 48);
                return (
                  <div
                    key={sn.id}
                    className={cn(
                      "flex-1 rounded-sm transition-all",
                      sn.score >= 80 ? "bg-emerald-500" : sn.score >= 60 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ height: `${h}px` }}
                    title={`${new Date(sn.data + "T00:00:00").toLocaleDateString("pt-BR")}: score ${sn.score}`}
                  />
                );
              })}
            </div>
          </div>
        )}

        <Tabs defaultValue="feedback" className="w-full">
          <TabsList className="w-full bg-muted/30">
            <TabsTrigger value="feedback" className="flex-1 text-xs gap-1"><MessageSquare className="h-3 w-3" />Feedback</TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 text-xs gap-1"><Sparkles className="h-3 w-3" />IA Copilot</TabsTrigger>
          </TabsList>

          <TabsContent value="feedback" className="space-y-4 mt-3">
            <div className="space-y-3 rounded-lg border border-border/50 p-4">
              <p className="text-xs font-semibold">Registrar Feedback (One-on-One)</p>
              <div>
                <Label className="text-[11px]">Pontos Fortes</Label>
                <Textarea value={fbForm.pontos_fortes} onChange={e => setFbForm(p => ({ ...p, pontos_fortes: e.target.value }))} rows={2} className="text-xs mt-1" />
              </div>
              <div>
                <Label className="text-[11px]">Pontos de Melhoria</Label>
                <Textarea value={fbForm.pontos_melhoria} onChange={e => setFbForm(p => ({ ...p, pontos_melhoria: e.target.value }))} rows={2} className="text-xs mt-1" />
              </div>
              <div>
                <Label className="text-[11px]">Plano de Ação</Label>
                <Textarea value={fbForm.plano_acao} onChange={e => setFbForm(p => ({ ...p, plano_acao: e.target.value }))} rows={2} className="text-xs mt-1" />
              </div>
              <div>
                <Label className="text-[11px]">Próxima Revisão</Label>
                <Input type="date" value={fbForm.proxima_revisao} onChange={e => setFbForm(p => ({ ...p, proxima_revisao: e.target.value }))} className="text-xs mt-1" />
              </div>
              <Button size="sm" className="w-full text-xs" onClick={handleSaveFeedback} disabled={savingFb}>
                {savingFb ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                Salvar Feedback
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Histórico</p>
              {feedbacks.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Nenhum feedback registrado.</p>}
              {feedbacks.map(fb => (
                <div key={fb.id} className="rounded-lg border border-border/30 p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-[10px]">
                      <Calendar className="h-2.5 w-2.5 mr-1" />
                      {new Date(fb.data + "T00:00:00").toLocaleDateString("pt-BR")}
                    </Badge>
                    {fb.proxima_revisao && (
                      <span className="text-[10px] text-muted-foreground">Revisão: {new Date(fb.proxima_revisao + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                    )}
                  </div>
                  {fb.pontos_fortes && <p className="text-[11px]"><strong className="text-emerald-400">✅ Fortes:</strong> {fb.pontos_fortes}</p>}
                  {fb.pontos_melhoria && <p className="text-[11px]"><strong className="text-amber-400">⚠️ Melhorias:</strong> {fb.pontos_melhoria}</p>}
                  {fb.plano_acao && <p className="text-[11px]"><strong className="text-blue-400">📋 Plano:</strong> {fb.plano_acao}</p>}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 mt-3">
            <Button
              className="w-full gap-2"
              onClick={handleGenerateAIPlan}
              disabled={generatingAI}
            >
              {generatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Gerar Plano de Ação com IA
            </Button>

            {plans.map(plan => (
              <div key={plan.id} className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="text-[10px] bg-primary/20 text-primary border-0">
                    <Sparkles className="h-2.5 w-2.5 mr-1" />
                    Performance Copilot
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(plan.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
                {plan.diagnostico && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Diagnóstico</p>
                    <p className="text-xs">{plan.diagnostico}</p>
                  </div>
                )}
                {plan.sugestoes && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Plano de Ação</p>
                    <p className="text-xs whitespace-pre-line">{plan.sugestoes}</p>
                  </div>
                )}
                {plan.meta_recuperacao && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Meta de Recuperação</p>
                    <p className="text-xs">{plan.meta_recuperacao}</p>
                  </div>
                )}
                {plan.data_reavaliacao && (
                  <p className="text-[10px] text-muted-foreground">📅 Reavaliar em: {new Date(plan.data_reavaliacao + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
