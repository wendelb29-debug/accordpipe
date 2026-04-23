import { useNavigate } from "react-router-dom";
import { Building2, Check, ChevronDown, Crown, Plus, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Header tenant switcher.
 *
 * Responsibilities (and ONLY these):
 *  - Show the active tenant.
 *  - Let the user switch between tenants they are allowed to see.
 *  - Provide quick links to "Editar Tenant" (current) and "Criar/Gerenciar"
 *    when the user has permission.
 *
 * It does NOT create, edit, or delete tenants directly — those flows live
 * on dedicated pages so creation, edition, and switching never get mixed.
 */
export function TenantSwitcher() {
  const navigate = useNavigate();
  const {
    companies,
    activeCompany,
    activeCompanyId,
    setActiveCompanyId,
    isGlobalMaster,
    isResellerTenant,
  } = useAuth();

  // Hide entirely when there is nothing to switch and no admin context.
  if (!companies || companies.length === 0) return null;
  const hasMultiple = companies.length > 1;
  const canCreate = isGlobalMaster || isResellerTenant;

  if (!hasMultiple && !canCreate) return null;

  const label =
    activeCompany?.nome_fantasia ||
    activeCompany?.razao_social ||
    "Selecionar tenant";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-8 text-xs font-semibold border-primary/20 hover:border-primary/40 max-w-[220px]"
        >
          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Trocar tenant ativo
        </DropdownMenuLabel>

        {companies.map((c) => {
          const isActive = c.id === activeCompanyId;
          const isMasterTenant = c.servidor_id === null;
          return (
            <DropdownMenuItem
              key={c.id}
              onClick={() => setActiveCompanyId(c.id)}
              className="gap-2"
            >
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">
                {c.nome_fantasia || c.razao_social}
              </span>
              {isMasterTenant && (
                <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                  <Crown className="h-2.5 w-2.5 mr-0.5" /> Master
                </Badge>
              )}
              {c.is_reseller && (
                <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-600">
                  Revenda
                </Badge>
              )}
              {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </DropdownMenuItem>
          );
        })}

        {(canCreate || activeCompanyId) && <DropdownMenuSeparator />}

        {activeCompanyId && (
          <DropdownMenuItem
            onClick={() => navigate(`/tenant/${activeCompanyId}/editar`)}
            className="gap-2"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="text-sm">Editar tenant atual</span>
          </DropdownMenuItem>
        )}

        {isGlobalMaster && (
          <>
            <DropdownMenuItem onClick={() => navigate("/servidores")} className="gap-2">
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-sm">Gerenciar tenants</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/servidores/novo")}
              className="gap-2 text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-sm">Criar novo tenant</span>
            </DropdownMenuItem>
          </>
        )}

        {isResellerTenant && !isGlobalMaster && (
          <DropdownMenuItem onClick={() => navigate("/meus-tenants")} className="gap-2">
            <Building2 className="h-3.5 w-3.5" />
            <span className="text-sm">Meus tenants</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
