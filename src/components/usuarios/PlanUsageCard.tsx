import { Crown, Users, Plus, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useTenantSubscription } from "@/hooks/useBillingPlans";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  tenantId: string | null;
}

export function PlanUsageCard({ tenantId }: Props) {
  const { subscription, activeUsers, loading } = useTenantSubscription(tenantId);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="p-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const planName = subscription?.plan_name_snapshot || "Sem plano";
  const baseLimit = subscription?.base_user_limit_snapshot || 3;
  const extraFree = subscription?.extra_free_users || 0;
  const extraPaid = subscription?.extra_paid_users || 0;
  const totalLimit = subscription?.effective_user_limit || baseLimit;
  const remaining = Math.max(0, totalLimit - activeUsers);
  const usagePercent = totalLimit > 0 ? Math.min(100, (activeUsers / totalLimit) * 100) : 0;
  const isNearLimit = usagePercent >= 80;
  const isAtLimit = activeUsers >= totalLimit;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crown className="h-5 w-5 text-primary" />
          Plano {planName}
          {subscription?.has_custom_override && (
            <Badge variant="outline" className="text-xs">Customizado</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Base" value={baseLimit} />
          <Stat label="Extras grátis" value={extraFree} />
          <Stat label="Extras pagos" value={extraPaid} />
          <Stat label="Total liberado" value={totalLimit} highlight />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Em uso: <strong>{activeUsers}</strong>
            </span>
            <span className="text-muted-foreground">
              Restam: <strong className={isAtLimit ? "text-destructive" : "text-primary"}>{remaining}</strong>
            </span>
          </div>
          <Progress value={usagePercent} className="h-3" />
          {isAtLimit && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Limite atingido. Contrate usuários extras ou altere o plano.
            </p>
          )}
          {isNearLimit && !isAtLimit && (
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Próximo do limite de usuários.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2 text-center ${highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}>
      <div className={`text-xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
