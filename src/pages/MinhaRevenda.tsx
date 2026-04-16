import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useChildTenants, ChildTenant } from "@/hooks/useChildTenants";
import { ChildTenantDetailDrawer } from "@/components/minha-revenda/ChildTenantDetailDrawer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2, Users, TrendingUp, AlertTriangle, Search, Power, MoreHorizontal,
  Crown, ShieldAlert, Gauge, DollarSign, Clock, CalendarCheck, Eye,
  Ban, ShieldCheck,
} from "lucide-react";

function formatCurrency(v: number | null) {
  if (v == null) return "R$ 0";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MinhaRevenda() {
  const { activeCompanyId } = useAuth();
  const { children, loading, parentCompany, permissions, toggleChildStatus, canCreate } = useChildTenants();
  const [searchTerm, setSearchTerm] = useState("");
  const [resellerEnabled, setResellerEnabled] = useState<boolean | null>(null);
  const [checkLoading, setCheckLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<ChildTenant | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!activeCompanyId) return;
    const check = async () => {
      const { data } = await supabase
        .from("companies")
        .select("is_reseller, reseller_panel_enabled")
        .eq("id", activeCompanyId)
        .single();
      setResellerEnabled(data?.is_reseller && (data as any)?.reseller_panel_enabled);
      setCheckLoading(false);
    };
    check();
  }, [activeCompanyId]);

  // Computed KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const active = children.filter(c => c.status === "active");
    const inactive = children.filter(c => c.status !== "active");
    const suspended = children.filter(c => c.status === "suspended" || c.subscription?.billing_status === "suspended");
    const overdue = children.filter(c => c.subscription?.payment_status === "overdue");
    const inGrace = children.filter(c => c.subscription?.grace_until && new Date(c.subscription.grace_until) >= now);
    const duingToday = children.filter(c => c.subscription?.next_due_date === todayStr);
    const createdThisMonth = children.filter(c => new Date(c.created_at) >= monthStart);

    const mrr = children.reduce((sum, c) => sum + (c.subscription?.valor_mensal_total || 0), 0);

    return { active, inactive, suspended, overdue, inGrace, duingToday, createdThisMonth, mrr };
  }, [children]);

  if (checkLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!resellerEnabled) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center max-w-md px-6 space-y-3">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Acesso Negado</h1>
          <p className="text-muted-foreground text-sm">
            O Painel da Revenda não está habilitado para este tenant.
          </p>
        </div>
      </div>
    );
  }

  const maxTenants = parentCompany?.max_child_tenants;
  const capacityUsed = children.length;
  const capacityPercent = maxTenants ? Math.round((capacityUsed / maxTenants) * 100) : 0;
  const capacityRemaining = maxTenants ? Math.max(0, maxTenants - capacityUsed) : null;

  const filtered = children.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.razao_social?.toLowerCase().includes(term) ||
      c.nome_fantasia?.toLowerCase().includes(term) ||
      c.cnpj?.includes(term)
    );
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Ativo", variant: "default" },
      inactive: { label: "Inativo", variant: "secondary" },
      suspended: { label: "Suspenso", variant: "destructive" },
      expirado: { label: "Expirado", variant: "destructive" },
    };
    const s = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
  };

  const paymentBadge = (ps: string | null | undefined) => {
    if (!ps) return null;
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      paid: { label: "Pago", variant: "default" },
      pending: { label: "Pendente", variant: "outline" },
      overdue: { label: "Inadimplente", variant: "destructive" },
      grace: { label: "Carência", variant: "secondary" },
    };
    const p = map[ps] || { label: ps, variant: "outline" as const };
    return <Badge variant={p.variant} className="text-[10px]">{p.label}</Badge>;
  };

  const openDetail = (child: ChildTenant) => {
    setSelectedTenant(child);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          Painel da Revenda
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Central de operação white-label — gerencie seus tenants filhos
        </p>
      </div>

      {/* KPIs Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-[11px] text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{capacityUsed}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-[11px] text-muted-foreground">Ativos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{kpis.active.length}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-destructive" />
            <span className="text-[11px] text-muted-foreground">Inadimplentes</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{kpis.overdue.length}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-[11px] text-muted-foreground">Suspensos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{kpis.suspended.length}</p>
        </Card>
      </div>

      {/* KPIs Row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-yellow-500" />
            <span className="text-[11px] text-muted-foreground">Vencendo Hoje</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{kpis.duingToday.length}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-[11px] text-muted-foreground">Em Carência</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{kpis.inGrace.length}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <span className="text-[11px] text-muted-foreground">MRR Estimado</span>
          </div>
          <p className="text-lg font-bold text-foreground">{formatCurrency(kpis.mrr)}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-[11px] text-muted-foreground">Criados no Mês</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{kpis.createdThisMonth.length}</p>
        </Card>
      </div>

      {/* Capacity Bar */}
      {maxTenants && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Capacidade</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {capacityUsed} / {maxTenants} ({capacityPercent}%)
            </span>
          </div>
          <Progress
            value={capacityPercent}
            className="h-2.5"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{capacityRemaining} vaga(s) restante(s)</span>
            {capacityPercent >= 100 && (
              <span className="text-destructive font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Limite atingido
              </span>
            )}
            {capacityPercent >= 80 && capacityPercent < 100 && (
              <span className="text-yellow-500 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Próximo do limite
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Capacity alert */}
      {maxTenants && capacityUsed >= maxTenants && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Limite de tenants filhos atingido. Criação de novos tenants bloqueada.
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CNPJ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="text-[11px] whitespace-nowrap">
          {filtered.length} tenant(s)
        </Badge>
      </div>

      {/* Tenant Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead className="hidden md:table-cell">Plano</TableHead>
              <TableHead className="hidden md:table-cell">Valor</TableHead>
              <TableHead className="hidden lg:table-cell">Vencimento</TableHead>
              <TableHead className="hidden md:table-cell">Usuários</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Pagamento</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {children.length === 0 ? "Nenhum tenant filho encontrado" : "Nenhum resultado para a busca"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(child => (
                <TableRow
                  key={child.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openDetail(child)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm text-foreground">{child.nome_fantasia || child.razao_social}</p>
                      <p className="text-[11px] text-muted-foreground">{child.cnpj}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {child.subscription?.plan_name || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-foreground font-medium">
                    {formatCurrency(child.subscription?.valor_mensal_total ?? null)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {child.subscription?.next_due_date
                      ? new Date(child.subscription.next_due_date).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {child.user_count}{child.subscription?.effective_user_limit ? `/${child.subscription.effective_user_limit}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>{statusBadge(child.status)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {paymentBadge(child.subscription?.payment_status)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(child); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        {(permissions.can_suspend_child_tenants || permissions.can_reactivate_child_tenants) && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleChildStatus(child.id, child.status); }}>
                            <Power className="h-4 w-4 mr-2" />
                            {child.status === "active" ? "Suspender" : "Reativar"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Drawer */}
      <ChildTenantDetailDrawer
        tenant={selectedTenant}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        permissions={permissions}
        onToggleStatus={toggleChildStatus}
      />
    </div>
  );
}
