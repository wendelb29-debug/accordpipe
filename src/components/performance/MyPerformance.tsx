import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { usePerformanceFeedbacks, useAIActionPlans } from "@/hooks/usePerformanceData";
import type { PerformanceFeedback } from "@/hooks/usePerformanceData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Target, TrendingUp, MessageSquare, ClipboardList, Eye, EyeOff,
  CheckCircle2, Clock, AlertCircle, Sparkles, Calendar, Send, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pendente: { label: "Pendente", icon: Clock, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  em_andamento: { label: "Em andamento", icon: AlertCircle, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  concluido: { label: "Concluído", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
};

export function MyPerformance() {
  const { user } = useAuth();
  const companyId = useActiveCompanyId();
  const { feedbacks, refetch: refetchFeedbacks } = usePerformanceFeedbacks(user?.id);
  const { plans } = useAIActionPlans(user?.id);

  const [expandedFb, setExpandedFb] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const [myGoals, setMyGoals] = useState<any[]>([]);
  useEffect(() => {
    if (!companyId || !user?.id) return;
    const now = new Date();
    supabase
      .from("performance_goals")
      .select("*")
      .eq("tenant_id", companyId)
      .eq("user_id", user.id)
      .eq("mes", now.getMonth() + 1)
      .eq("ano", now.getFullYear())
      .then(({ data }) => setMyGoals((data as any[] | null) || []));
  }, [companyId, user?.id]);

  const [mySnaps, setMySnaps] = useState<any[]>([]);
  useEffect(() => {
    if (!companyId || !user?.id) return;
    const now = new Date();
    supabase
      .from("performance_snapshots" as any)
      .select("*")
      .eq("tenant_id", companyId)
      .eq("user_id", user.id)
      .eq("mes", now.getMonth() + 1)
      .eq("ano", now.getFullYear())
      .order("data", { ascending: true })
      .then(({ data }: any) => setMySnaps((data as any[]) || []));
  }, [companyId, user?.id]);

  const unreadCount = feedbacks.filter(f => !f.visualizado).length;

  const markAsRead = useCallback(async (fb: PerformanceFeedback) => {
    if (fb.visualizado) return;
    await supabase
      .from("performance_feedbacks")
      .update({ visualizado: true, visualizado_em: new Date().toISOString() } as any)
      .eq("id", fb.id);
    refetchFeedbacks();
  }, [refetchFeedbacks]);

  const updateStatus = useCallback(async (fbId: string, newStatus: string) => {
    setSaving(fbId);
    await supabase
      .from("performance_feedbacks")
      .update({ status: newStatus } as any)
      .eq("id", fbId);
    toast.success("Status atualizado");
    refetchFeedbacks();
    setSaving(null);
  }, [refetchFeedbacks]);

  const saveComment = useCallback(async (fbId: string) => {
    const comment = commentDrafts[fbId];
    if (!comment?.trim()) return;
    setSaving(fbId);
    await supabase
      .from("performance_feedbacks")
      .update({ comentario_usuario: comment.trim() } as any)
      .eq("id", fbId);
    toast.success("Comentário salvo");
    setCommentDrafts(prev => ({ ...prev, [fbId]: "" }));
    refetchFeedbacks();
    setSaving(null);
  }, [commentDrafts, refetchFeedbacks]);

  const toggleExpand = (fb: PerformanceFeedback) => {
    const isExpanding = expandedFb !== fb.id;
    setExpandedFb(isExpanding ? fb.id : null);
    if (isExpanding && !fb.visualizado) markAsRead(fb);
  };

  const totalGanhos = mySnaps.reduce((s, sn) => s + (sn.ganhos || 0), 0);
  const totalPerdas = mySnaps.reduce((s, sn) => s + (sn.perdas || 0), 0);
  const avgScore = mySnaps.length > 0 ? Math.round(mySnaps.reduce((s, sn) => s + (sn.score || 0), 0) / mySnaps.length) : 0;
  const conversao = (totalGanhos + totalPerdas) > 0 ? Math.round((totalGanhos / (totalGanhos + totalPerdas)) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Meu Desempenho</h2>
          <p className="text-xs text-muted-foreground">Acompanhe suas metas, performance e feedbacks</p>
        </div>
        {unreadCount > 0 && (
          <Badge className="ml-auto bg-primary/90 text-primary-foreground text-xs gap-1">
            <MessageSquare className="h-3 w-3" /> {unreadCount} novo{unreadCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="feedbacks" className="w-full">
        <TabsList className="h-9">
          <TabsTrigger value="metas" className="text-xs gap-1"><Target className="h-3.5 w-3.5" />Minhas Metas</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs gap-1"><TrendingUp className="h-3.5 w-3.5" />Minha Performance</TabsTrigger>
          <TabsTrigger value="feedbacks" className="text-xs gap-1 relative">
            <MessageSquare className="h-3.5 w-3.5" />Meus Feedbacks
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center">{unreadCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="planos" className="text-xs gap-1"><ClipboardList className="h-3.5 w-3.5" />Planos de Ação</TabsTrigger>
        </TabsList>

        <TabsContent value="metas" className="mt-4 space-y-3">
          {myGoals.length === 0 ? (
            <Card className="p-8 text-center">
              <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma meta definida para este mês</p>
            </Card>
          ) : (
            myGoals.map(g => {
              const pct = g.meta_valor > 0 ? Math.round((g.realizado_valor / g.meta_valor) * 100) : 0;
              return (
                <Card key={g.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold">Meta Individual</p>
                    <Badge variant="outline" className={cn("text-xs", pct >= 100 ? "text-emerald-500 border-emerald-500/30" : pct >= 60 ? "text-amber-500 border-amber-500/30" : "text-red-500 border-red-500/30")}>
                      {pct}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Meta</p>
                      <p className="text-sm font-bold">{g.meta_valor.toLocaleString("pt-BR")}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Realizado</p>
                      <p className="text-sm font-bold">{g.realizado_valor.toLocaleString("pt-BR")}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Faltam</p>
                      <p className="text-sm font-bold">{Math.max(0, g.meta_valor - g.realizado_valor).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Ganhos", value: totalGanhos, icon: "🏆" },
              { label: "Perdas", value: totalPerdas, icon: "❌" },
              { label: "Conversão", value: `${conversao}%`, icon: "📊" },
              { label: "Score Médio", value: avgScore, icon: "⭐" },
            ].map(kpi => (
              <Card key={kpi.label} className="p-4 text-center">
                <p className="text-lg mb-1">{kpi.icon}</p>
                <p className="text-lg font-bold">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p>
              </Card>
            ))}
          </div>

          {mySnaps.length > 1 && (
            <Card className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">📈 Evolução</p>
              <div className="flex items-end gap-1 h-16">
                {mySnaps.map((sn) => {
                  const maxScore = Math.max(...mySnaps.map((s: any) => s.score || 1), 1);
                  const h = Math.max(6, ((sn.score || 0) / maxScore) * 64);
                  return (
                    <div
                      key={sn.id}
                      className={cn("flex-1 rounded-sm transition-all", (sn.score || 0) >= 80 ? "bg-emerald-500" : (sn.score || 0) >= 60 ? "bg-amber-500" : "bg-red-500")}
                      style={{ height: `${h}px` }}
                      title={`${new Date(sn.data + "T00:00:00").toLocaleDateString("pt-BR")}: score ${sn.score}`}
                    />
                  );
                })}
              </div>
            </Card>
          )}

          {mySnaps.length === 0 && (
            <Card className="p-8 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Sem dados de performance este mês</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="feedbacks" className="mt-4 space-y-3">
          {feedbacks.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum feedback recebido ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Quando seu supervisor registrar um feedback, ele aparecerá aqui</p>
            </Card>
          ) : (
            feedbacks.map(fb => {
              const isExpanded = expandedFb === fb.id;
              const cfg = statusConfig[fb.status] || statusConfig.pendente;
              const StatusIcon = cfg.icon;

              return (
                <Card
                  key={fb.id}
                  className={cn(
                    "overflow-hidden transition-all duration-300",
                    !fb.visualizado && "ring-1 ring-primary/30 bg-primary/[0.02]"
                  )}
                >
                  <button
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => toggleExpand(fb)}
                  >
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", cfg.color)}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          Feedback de {fb.supervisor_name || "Supervisor"}
                        </p>
                        {!fb.visualizado && (
                          <Badge className="text-[9px] bg-primary/20 text-primary border-0 gap-0.5">
                            <EyeOff className="h-2.5 w-2.5" /> Novo
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(fb.data + "T00:00:00").toLocaleDateString("pt-BR")}
                        {fb.proxima_revisao && (
                          <span className="ml-2">• Revisão: {new Date(fb.proxima_revisao + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                        )}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", cfg.color)}>
                      {cfg.label}
                    </Badge>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      {fb.pontos_fortes && (
                        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                          <p className="text-[10px] font-semibold text-emerald-500 uppercase mb-1">✅ Pontos Fortes</p>
                          <p className="text-xs">{fb.pontos_fortes}</p>
                        </div>
                      )}
                      {fb.pontos_melhoria && (
                        <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
                          <p className="text-[10px] font-semibold text-amber-500 uppercase mb-1">⚠️ Pontos de Melhoria</p>
                          <p className="text-xs">{fb.pontos_melhoria}</p>
                        </div>
                      )}
                      {fb.plano_acao && (
                        <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3">
                          <p className="text-[10px] font-semibold text-blue-500 uppercase mb-1">📋 Plano de Ação</p>
                          <p className="text-xs">{fb.plano_acao}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <p className="text-[11px] text-muted-foreground">Status:</p>
                        <Select value={fb.status} onValueChange={(v) => updateStatus(fb.id, v)}>
                          <SelectTrigger className="h-7 w-40 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="em_andamento">Em andamento</SelectItem>
                            <SelectItem value="concluido">Concluído</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {fb.comentario_usuario && (
                        <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">💬 Seu Comentário</p>
                          <p className="text-xs">{fb.comentario_usuario}</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Textarea
                          placeholder="Adicionar comentário sobre este feedback..."
                          value={commentDrafts[fb.id] || ""}
                          onChange={e => setCommentDrafts(prev => ({ ...prev, [fb.id]: e.target.value }))}
                          rows={2}
                          className="text-xs"
                        />
                        <Button
                          size="sm"
                          className="text-xs gap-1"
                          disabled={!commentDrafts[fb.id]?.trim() || saving === fb.id}
                          onClick={() => saveComment(fb.id)}
                        >
                          <Send className="h-3 w-3" />
                          {fb.comentario_usuario ? "Atualizar Comentário" : "Enviar Comentário"}
                        </Button>
                      </div>

                      {fb.visualizado && fb.visualizado_em && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Visualizado em {new Date(fb.visualizado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="planos" className="mt-4 space-y-3">
          {plans.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum plano de ação gerado</p>
              <p className="text-xs text-muted-foreground mt-1">Planos gerados pela IA aparecerão aqui</p>
            </Card>
          ) : (
            plans.map(plan => (
              <Card key={plan.id} className="p-4 space-y-3 border-primary/20 bg-primary/[0.02]">
                <div className="flex items-center justify-between">
                  <Badge className="text-[10px] bg-primary/20 text-primary border-0 gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
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
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Sugestões</p>
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
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
