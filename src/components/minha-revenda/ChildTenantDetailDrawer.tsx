import { ChildTenant, ResellerPermissions } from "@/hooks/useChildTenants";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Users, CreditCard, Calendar, Mail, Phone, User,
  FileText, Power, Shield, Clock,
} from "lucide-react";

interface Props {
  tenant: ChildTenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: ResellerPermissions;
  onToggleStatus: (id: string, status: string) => void;
}

const statusColors: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  inactive: { label: "Inativo", variant: "secondary" },
  suspended: { label: "Suspenso", variant: "destructive" },
  expirado: { label: "Expirado", variant: "destructive" },
  trial: { label: "Trial", variant: "outline" },
};

const paymentStatusColors: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Pago", variant: "default" },
  pending: { label: "Pendente", variant: "outline" },
  overdue: { label: "Inadimplente", variant: "destructive" },
  grace: { label: "Em carência", variant: "secondary" },
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function formatCurrency(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}

export function ChildTenantDetailDrawer({ tenant, open, onOpenChange, permissions, onToggleStatus }: Props) {
  if (!tenant) return null;

  const sub = tenant.subscription;
  const statusInfo = statusColors[tenant.status] || { label: tenant.status, variant: "outline" as const };
  const paymentInfo = sub?.payment_status ? paymentStatusColors[sub.payment_status] || { label: sub.payment_status, variant: "outline" as const } : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            {tenant.nome_fantasia || tenant.razao_social}
          </SheetTitle>
          <div className="flex items-center gap-2">
            <Badge variant={statusInfo.variant} className="text-[10px]">{statusInfo.label}</Badge>
            {paymentInfo && (
              <Badge variant={paymentInfo.variant} className="text-[10px]">{paymentInfo.label}</Badge>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="dados" className="mt-2">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="dados" className="text-[11px]">Dados</TabsTrigger>
            <TabsTrigger value="assinatura" className="text-[11px]">Assinatura</TabsTrigger>
            <TabsTrigger value="cobrancas" className="text-[11px]">Cobranças</TabsTrigger>
            <TabsTrigger value="usuarios" className="text-[11px]">Usuários</TabsTrigger>
          </TabsList>

          {/* DADOS */}
          <TabsContent value="dados" className="space-y-1 mt-4">
            <InfoRow icon={Building2} label="Razão Social" value={tenant.razao_social} />
            <InfoRow icon={Building2} label="Nome Fantasia" value={tenant.nome_fantasia} />
            <InfoRow icon={FileText} label="CNPJ" value={tenant.cnpj} />
            <InfoRow icon={Mail} label="E-mail" value={tenant.email} />
            <InfoRow icon={Phone} label="Telefone" value={tenant.telefone} />
            <InfoRow icon={User} label="Responsável" value={tenant.responsavel} />
            <InfoRow icon={Calendar} label="Criado em" value={formatDate(tenant.created_at)} />
            <InfoRow icon={Shield} label="Tipo" value={tenant.tenant_type === "reseller" ? "Revendedor" : "Padrão"} />

            {(permissions.can_suspend_child_tenants || permissions.can_reactivate_child_tenants) && (
              <>
                <Separator className="my-3" />
                <Button
                  variant={tenant.status === "active" ? "destructive" : "default"}
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onToggleStatus(tenant.id, tenant.status);
                    onOpenChange(false);
                  }}
                >
                  <Power className="h-4 w-4 mr-2" />
                  {tenant.status === "active" ? "Suspender Tenant" : "Reativar Tenant"}
                </Button>
              </>
            )}
          </TabsContent>

          {/* ASSINATURA */}
          <TabsContent value="assinatura" className="space-y-1 mt-4">
            {sub ? (
              <>
                <InfoRow icon={CreditCard} label="Plano" value={sub.plan_name || "Sem plano"} />
                <InfoRow icon={Clock} label="Ciclo" value={sub.billing_cycle === "yearly" ? "Anual" : "Mensal"} />
                <InfoRow icon={CreditCard} label="Valor Mensal" value={formatCurrency(sub.valor_mensal_total)} />
                <InfoRow icon={Calendar} label="Próximo Vencimento" value={formatDate(sub.next_due_date)} />
                <InfoRow icon={Shield} label="Status da Assinatura" value={
                  <Badge variant={sub.billing_status === "active" ? "default" : "destructive"} className="text-[10px]">
                    {sub.billing_status === "active" ? "Ativa" : sub.billing_status === "suspended" ? "Suspensa" : sub.billing_status || "—"}
                  </Badge>
                } />
                <InfoRow icon={CreditCard} label="Status de Pagamento" value={
                  paymentInfo ? <Badge variant={paymentInfo.variant} className="text-[10px]">{paymentInfo.label}</Badge> : "—"
                } />
                {sub.grace_until && (
                  <InfoRow icon={Clock} label="Carência até" value={formatDate(sub.grace_until)} />
                )}
                {sub.blocked_at && (
                  <InfoRow icon={Shield} label="Bloqueado em" value={formatDate(sub.blocked_at)} />
                )}
                <InfoRow icon={Calendar} label="Início" value={formatDate(sub.start_date)} />
              </>
            ) : (
              <Card className="p-6 text-center text-muted-foreground text-sm">
                Nenhuma assinatura encontrada para este tenant.
              </Card>
            )}
          </TabsContent>

          {/* COBRANÇAS */}
          <TabsContent value="cobrancas" className="mt-4">
            {permissions.can_view_child_billing ? (
              sub ? (
                <Card className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Cobrança Vigente</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Valor</p>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(sub.valor_mensal_total)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Vencimento</p>
                      <p className="text-sm font-semibold text-foreground">{formatDate(sub.next_due_date)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Status</p>
                      {paymentInfo ? (
                        <Badge variant={paymentInfo.variant} className="text-[10px]">{paymentInfo.label}</Badge>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Ciclo</p>
                      <p className="text-sm text-foreground">{sub.billing_cycle === "yearly" ? "Anual" : "Mensal"}</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-6 text-center text-muted-foreground text-sm">
                  Nenhuma cobrança encontrada.
                </Card>
              )
            ) : (
              <Card className="p-6 text-center text-muted-foreground text-sm">
                Você não tem permissão para visualizar cobranças.
              </Card>
            )}
          </TabsContent>

          {/* USUÁRIOS */}
          <TabsContent value="usuarios" className="mt-4">
            <Card className="p-4 space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Resumo de Usuários</h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xl font-bold text-foreground">{tenant.user_count}</p>
                  <p className="text-[10px] text-muted-foreground">Ativos</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xl font-bold text-foreground">{sub?.effective_user_limit ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Limite</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xl font-bold text-foreground">
                    {sub?.effective_user_limit != null ? Math.max(0, sub.effective_user_limit - tenant.user_count) : "∞"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Vagas</p>
                </div>
              </div>
              {sub?.extra_paid_users != null && sub.extra_paid_users > 0 && (
                <p className="text-xs text-muted-foreground">
                  {sub.extra_paid_users} usuário(s) extra(s) pago(s)
                </p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
