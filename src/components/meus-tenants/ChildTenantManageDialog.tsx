import { useState } from "react";
import { Building2, Crown, Users, FileText, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ChildTenant } from "@/hooks/useChildTenants";
import { ChildTenantDadosTab } from "./ChildTenantDadosTab";
import { TenantSubscriptionTab } from "@/components/servidores/TenantSubscriptionTab";
import TenantUsersTab from "@/components/servidores/TenantUsersTab";
import { usePermissions } from "@/hooks/usePermissions";

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

  if (!child) return null;

  const displayName = child.nome_fantasia || child.razao_social;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-lg">{displayName}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={child.status === "active" ? "default" : "secondary"} className="text-xs">
                  {child.status === "active" ? "Ativo" : "Bloqueado"}
                </Badge>
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
