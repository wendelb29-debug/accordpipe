import { useState, useEffect } from "react";
import { Building2, Crown, Users, FileText, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ChildTenant } from "@/hooks/useChildTenants";
import { ChildTenantDadosTab } from "./ChildTenantDadosTab";
import { TenantSubscriptionTab } from "@/components/servidores/TenantSubscriptionTab";
import TenantUsersTab from "@/components/servidores/TenantUsersTab";
import { usePermissions } from "@/hooks/usePermissions";
import { useTenantSubscription } from "@/hooks/useBillingPlans";

interface Props {
  child: ChildTenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function ChildTenantManageDialog({ child, open, onOpenChange, onUpdated }: Props) {
  const [activeTab, setActiveTab] = useState("dados");
  const { hasPermission } = usePermissions();

  const canManageSubscription = hasPermission("manage_child_tenant_subscription");
  const canManageUsers = hasPermission("manage_child_tenant_users");

  const tabCount = 1 + (canManageSubscription ? 1 : 0) + (canManageUsers ? 1 : 0);

  // Fetch subscription info for the child
  const { subscription, activeUsers } = useTenantSubscription(child?.id ?? null);

  if (!child) return null;

  const displayName = child.nome_fantasia || child.razao_social;

  const effectiveLimit = subscription?.effective_user_limit ?? 3;
  const isOverLimit = activeUsers > effectiveLimit;
  const isAtLimit = activeUsers >= effectiveLimit;
  const isSuspended = subscription?.billing_status === "suspended";
  const isCancelled = subscription?.billing_status === "cancelled";
  const isPastDue = subscription?.billing_status === "past_due";
  const planName = subscription?.plan_name_snapshot || "Sem plano";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-lg">{displayName}</span>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant={child.status === "active" ? "default" : "secondary"} className="text-xs">
                  {child.status === "active" ? "Ativo" : "Bloqueado"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {planName}
                </Badge>
                <Badge variant="outline" className="text-xs gap-1">
                  <Users className="h-3 w-3" />
                  {activeUsers}/{effectiveLimit}
                </Badge>
                {isSuspended && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" /> Suspenso
                  </Badge>
                )}
                {isCancelled && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" /> Cancelado
                  </Badge>
                )}
                {isPastDue && (
                  <Badge className="text-xs gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30" variant="outline">
                    <AlertTriangle className="h-3 w-3" /> Inadimplente
                  </Badge>
                )}
                {isOverLimit && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" /> Acima do limite
                  </Badge>
                )}
                {isAtLimit && !isOverLimit && (
                  <Badge className="text-xs gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30" variant="outline">
                    No limite
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground font-mono">{child.cnpj}</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className={`w-full grid ${tabCount === 1 ? "grid-cols-1" : tabCount === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            <TabsTrigger value="dados" className="gap-2 text-xs">
              <FileText className="h-3.5 w-3.5" />
              Dados
            </TabsTrigger>
            {canManageSubscription && (
              <TabsTrigger value="plano" className="gap-2 text-xs">
                <Crown className="h-3.5 w-3.5" />
                Plano
              </TabsTrigger>
            )}
            {canManageUsers && (
              <TabsTrigger value="usuarios" className="gap-2 text-xs">
                <Users className="h-3.5 w-3.5" />
                Usuários
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dados" className="mt-4">
            <ChildTenantDadosTab child={child} onUpdated={onUpdated} />
          </TabsContent>

          {canManageSubscription && (
            <TabsContent value="plano" className="mt-4">
              <TenantSubscriptionTab companyId={child.id} resellerMode />
            </TabsContent>
          )}

          {canManageUsers && (
            <TabsContent value="usuarios" className="mt-4">
              <TenantUsersTab companyId={child.id} companyName={displayName} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
