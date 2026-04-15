import { useState, useEffect } from "react";
import { Crown, Users, AlertTriangle, Save, History, Settings2, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingPlans, useTenantSubscription } from "@/hooks/useBillingPlans";
import { ManagePlansDialog } from "./ManagePlansDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  companyId: string;
  resellerMode?: boolean;
}

const statusLabels: Record<string, string> = {
  active: "Ativo",
  trial: "Trial",
  past_due: "Inadimplente",
  suspended: "Suspenso",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  active: "border-green-500/30 text-green-600 bg-green-500/10",
  trial: "border-blue-500/30 text-blue-600 bg-blue-500/10",
  past_due: "border-amber-500/30 text-amber-600 bg-amber-500/10",
  suspended: "border-red-500/30 text-red-600 bg-red-500/10",
  cancelled: "border-muted text-muted-foreground bg-muted/50",
};

export function TenantSubscriptionTab({ companyId, resellerMode }: Props) {
  const { plans, loading: plansLoading, fetchPlans } = useBillingPlans();
  const { subscription, activeUsers, loading: subLoading, upsertSubscription } = useTenantSubscription(companyId);
  const { user, isMasterTenantAdmin, isMaster } = useAuth();

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [extraFree, setExtraFree] = useState(0);
  const [extraPaid, setExtraPaid] = useState(0);
  const [billingStatus, setBillingStatus] = useState("active");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [hasCustomOverride, setHasCustomOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [managePlansOpen, setManagePlansOpen] = useState(false);

  useEffect(() => {
    if (subscription) {
      setSelectedPlanId(subscription.plan_id || "");
      setExtraFree(subscription.extra_free_users);
      setExtraPaid(subscription.extra_paid_users);
      setBillingStatus(subscription.billing_status);
      setBillingCycle(subscription.billing_cycle);
      setHasCustomOverride(subscription.has_custom_override);
    }
  }, [subscription]);

  // Only master/CEO of master tenant or reseller managing child can access
  if (!resellerMode && !isMasterTenantAdmin && !isMaster) {
    return (
      <Card className="p-8 text-center">
        <Crown className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">Acesso restrito. Apenas o CEO ou Master do tenant principal pode gerenciar planos e limites de usuários.</p>
      </Card>
    );
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const baseLimit = selectedPlan?.base_user_limit ?? subscription?.base_user_limit_snapshot ?? 3;
  const effectiveLimit = baseLimit + extraFree + extraPaid;
  const remaining = Math.max(0, effectiveLimit - activeUsers);
  const usagePercent = effectiveLimit > 0 ? Math.min(100, (activeUsers / effectiveLimit) * 100) : 0;
  const isOverLimit = activeUsers > effectiveLimit;

  const monthlyPrice = selectedPlan?.monthly_price ?? (subscription as any)?.monthly_price_snapshot ?? 0;
  const yearlyPrice = selectedPlan?.yearly_price ?? (subscription as any)?.yearly_price_snapshot ?? 0;
  const pricePerExtra = selectedPlan?.price_per_extra_user ?? subscription?.price_per_extra_user_snapshot ?? 0;
  const displayPrice = billingCycle === "yearly" ? yearlyPrice : monthlyPrice;
  const extraCost = extraPaid * pricePerExtra;

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setExtraFree(plan.extra_free_users_default);
      setHasCustomOverride(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPlanId) {
      toast.error("Selecione um plano.");
      return;
    }
    setSaving(true);
    try {
      const plan = plans.find((p) => p.id === selectedPlanId);
      if (!plan) throw new Error("Plano não encontrado");

      const oldPlanName = subscription?.plan_name_snapshot;
      const oldLimit = subscription?.effective_user_limit;

      if (subscription) {
        await supabase.from("tenant_subscription_history").insert({
          tenant_id: companyId,
          subscription_id: subscription.id,
          changed_by: user?.id,
          old_plan_name: subscription.plan_name_snapshot,
          new_plan_name: plan.name,
          old_base_limit: subscription.base_user_limit_snapshot,
          new_base_limit: plan.base_user_limit,
          old_extra_free_users: subscription.extra_free_users,
          new_extra_free_users: extraFree,
          old_extra_paid_users: subscription.extra_paid_users,
          new_extra_paid_users: extraPaid,
          old_effective_user_limit: subscription.effective_user_limit,
          new_effective_user_limit: plan.base_user_limit + extraFree + extraPaid,
          change_reason: "Alteração manual via painel",
        } as any);
      }

      const ok = await upsertSubscription({
        plan_id: selectedPlanId,
        plan_name_snapshot: plan.name,
        base_user_limit_snapshot: plan.base_user_limit,
        extra_free_users: extraFree,
        extra_paid_users: extraPaid,
        price_per_extra_user_snapshot: plan.price_per_extra_user,
        billing_cycle: billingCycle,
        billing_status: billingStatus,
        has_custom_override: hasCustomOverride || extraFree !== plan.extra_free_users_default,
        monthly_price_snapshot: plan.monthly_price,
        yearly_price_snapshot: plan.yearly_price,
      } as any);

      if (ok) {
        toast.success("Assinatura do tenant atualizada!");
        // Audit log for reseller actions
        if (resellerMode && user) {
          await supabase.from("audit_logs").insert({
            user_id: user.id,
            user_name: user.email,
            action: "update_child_tenant_subscription",
            target_type: "tenant_subscription",
            target_id: companyId,
            details: {
              old_plan: oldPlanName,
              new_plan: plan.name,
              old_limit: oldLimit,
              new_limit: plan.base_user_limit + extraFree + extraPaid,
              billing_status: billingStatus,
            },
          });
        }
      }
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from("tenant_subscription_history")
      .select("*")
      .eq("tenant_id", companyId)
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory((data as any[]) || []);
    setShowHistory(true);
  };

  const fmtCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (plansLoading || subLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Status alerts */}
      {isOverLimit && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Este tenant está acima do limite contratado ({activeUsers}/{effectiveLimit}). Não será possível adicionar novos usuários até regularizar.
        </div>
      )}
      {billingStatus === "past_due" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Assinatura inadimplente. Regularize para evitar suspensão.
        </div>
      )}
      {["suspended", "cancelled"].includes(billingStatus) && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Assinatura {billingStatus === "suspended" ? "suspensa" : "cancelada"}. Criação de usuários bloqueada.
        </div>
      )}

      {/* Usage + Price card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-primary" />
            Consumo do Plano
            {subscription?.has_custom_override && (
              <Badge variant="outline" className="text-xs">Customizado</Badge>
            )}
            {subscription && (
              <Badge variant="outline" className={`text-xs ml-auto ${statusColors[subscription.billing_status] || ""}`}>
                {statusLabels[subscription.billing_status] || subscription.billing_status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Base" value={baseLimit} />
            <StatBox label="Extras grátis" value={extraFree} />
            <StatBox label="Extras pagos" value={extraPaid} />
            <StatBox label="Total liberado" value={effectiveLimit} highlight />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Em uso: <strong>{activeUsers}</strong>
              </span>
              <span className="text-muted-foreground">
                Restam: <strong className={isOverLimit ? "text-destructive" : "text-primary"}>{remaining}</strong>
              </span>
            </div>
            <Progress value={usagePercent} className="h-3" />
          </div>

          {/* Price summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/50">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Mensal</div>
              <div className="text-sm font-semibold">{fmtCurrency(monthlyPrice)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Anual</div>
              <div className="text-sm font-semibold">{fmtCurrency(yearlyPrice)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Extra/usuário</div>
              <div className="text-sm font-semibold">{fmtCurrency(pricePerExtra)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Custo extras</div>
              <div className="text-sm font-semibold">{fmtCurrency(extraCost)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Configuração do Plano</CardTitle>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setManagePlansOpen(true)}>
              <Settings2 className="h-4 w-4" />
              Gerenciar Planos
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={selectedPlanId} onValueChange={handlePlanSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.filter((p) => p.is_active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.base_user_limit} usuários — {fmtCurrency(p.monthly_price)}/mês)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status da Assinatura</Label>
              <Select value={billingStatus} onValueChange={setBillingStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="past_due">Inadimplente</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Extras grátis</Label>
              <Input type="number" min={0} value={extraFree} onChange={(e) => setExtraFree(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Extras pagos</Label>
              <Input type="number" min={0} value={extraPaid} onChange={(e) => setExtraPaid(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Ciclo</Label>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isOverLimit && (
            <p className="text-xs text-amber-500">
              ⚠ O limite será inferior ao número de usuários ativos. Novas criações ficarão bloqueadas, mas usuários existentes não serão afetados.
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving || !selectedPlanId} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Assinatura"}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={loadHistory}>
              <History className="h-4 w-4" />
              Histórico
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {showHistory && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Histórico de Alterações</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma alteração registrada.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {history.map((h: any) => (
                  <div key={h.id} className="text-xs border rounded-lg p-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">{h.old_plan_name} → {h.new_plan_name}</span>
                      <span className="text-muted-foreground">{new Date(h.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Limite: {h.old_effective_user_limit} → {h.new_effective_user_limit}
                      {h.change_reason && ` • ${h.change_reason}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manage Plans Dialog */}
      <ManagePlansDialog
        open={managePlansOpen}
        onOpenChange={(v) => {
          setManagePlansOpen(v);
          if (!v) fetchPlans();
        }}
        onPlanSelected={handlePlanSelect}
      />
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2 text-center ${highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}>
      <div className={`text-xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
