import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useChildTenants, ChildTenant } from "@/hooks/useChildTenants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2, Users, TrendingUp, AlertTriangle, Search, Power, MoreHorizontal,
  Crown, DollarSign, ShieldAlert, Gauge,
} from "lucide-react";

export default function MinhaRevenda() {
  const { activeCompanyId, profile } = useAuth();
  const { children, loading, parentCompany, toggleChildStatus, canCreate } = useChildTenants();
  const [searchTerm, setSearchTerm] = useState("");
  const [resellerEnabled, setResellerEnabled] = useState<boolean | null>(null);
  const [checkLoading, setCheckLoading] = useState(true);

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
            O Painel da Revenda não está habilitado para este tenant. Ative o modo Revendedor nas configurações.
          </p>
        </div>
      </div>
    );
  }

  const activeChildren = children.filter(c => c.status === "active");
  const inactiveChildren = children.filter(c => c.status !== "active");
  const maxTenants = parentCompany?.max_child_tenants;
  const capacityUsed = children.length;
  const capacityRemaining = maxTenants ? maxTenants - capacityUsed : null;

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

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          Painel da Revenda
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seus tenants filhos e acompanhe a operação da sua revenda
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total de Tenants</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{capacityUsed}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Ativos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{activeChildren.length}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Inativos / Suspensos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{inactiveChildren.length}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Capacidade</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {maxTenants ? `${capacityUsed} / ${maxTenants}` : `${capacityUsed} / ∞`}
          </p>
        </Card>
      </div>

      {/* Capacity warning */}
      {maxTenants && capacityUsed >= maxTenants && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Limite de tenants filhos atingido. Contate o administrador para expandir sua capacidade.
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
      </div>

      {/* Tenant Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead className="hidden md:table-cell">CNPJ</TableHead>
              <TableHead className="hidden md:table-cell">Usuários</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {children.length === 0 ? "Nenhum tenant filho encontrado" : "Nenhum resultado para a busca"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(child => (
                <TableRow key={child.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm text-foreground">{child.nome_fantasia || child.razao_social}</p>
                      <p className="text-xs text-muted-foreground">{child.razao_social}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{child.cnpj}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {child.user_count}
                    </div>
                  </TableCell>
                  <TableCell>{statusBadge(child.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleChildStatus(child.id, child.status)}>
                          <Power className="h-4 w-4 mr-2" />
                          {child.status === "active" ? "Suspender" : "Reativar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
