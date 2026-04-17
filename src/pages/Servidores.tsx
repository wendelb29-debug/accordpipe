import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Check, ChevronRight, ChevronDown, Shield, Loader2, Crown, Home } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { applyBrandColors } from "@/components/layout/ThemeSync";
import accordPatternDark from "@/assets/accord-pattern-dark.png";

interface TenantItem {
  id: string;
  nome_fantasia: string | null;
  razao_social: string;
  cnpj: string;
  is_reseller: boolean;
  parent_tenant_id: string | null;
  servidor_id: string | null;
  status: string;
}

type TenantType = "MASTER" | "REVENDEDOR" | "SUBTENANT" | "TENANT";

function getTenantType(tenant: TenantItem): TenantType {
  if (!tenant.servidor_id && !tenant.parent_tenant_id) return "MASTER";
  if (tenant.is_reseller) return "REVENDEDOR";
  if (tenant.parent_tenant_id) return "SUBTENANT";
  return "TENANT";
}

const typeBadgeConfig: Record<TenantType, { label: string; className: string }> = {
  MASTER: { label: "Master", className: "border-amber-500/30 text-amber-600 bg-amber-500/10" },
  REVENDEDOR: { label: "Revendedor", className: "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" },
  SUBTENANT: { label: "Subtenant", className: "border-muted text-muted-foreground bg-muted/50" },
  TENANT: { label: "Tenant", className: "border-primary/30 text-primary bg-primary/10" },
};

export default function Servidores() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeCompanyId, setActiveCompanyId, profile, isGlobalMaster, isResellerTenant } = useAuth();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [subTenantsMap, setSubTenantsMap] = useState<Record<string, TenantItem[]>>({});
  const [loadingSubsId, setLoadingSubsId] = useState<string | null>(null);

  const isMasterUser = !!profile?.is_master;

  const fetchTenants = useCallback(async () => {
    setFetching(true);
    try {
      if (isGlobalMaster) {
        // Master global: fetch ALL tenants (full tree)
        const { data } = await supabase
          .from("companies")
          .select("id, nome_fantasia, razao_social, cnpj, is_reseller, parent_tenant_id, servidor_id, status")
          .in("status", ["active", "teste"])
          .order("razao_social");
        setTenants((data as TenantItem[]) || []);
      } else if (isResellerTenant && activeCompanyId) {
        // Reseller: fetch self + child tenants
        const { data } = await supabase
          .from("companies")
          .select("id, nome_fantasia, razao_social, cnpj, is_reseller, parent_tenant_id, servidor_id, status")
          .or(`id.eq.${activeCompanyId},parent_tenant_id.eq.${activeCompanyId},created_by_tenant_id.eq.${activeCompanyId}`)
          .in("status", ["active", "teste"])
          .order("razao_social");
        setTenants((data as TenantItem[]) || []);
      } else if (profile?.company_id) {
        // Common tenant: only self
        const { data } = await supabase
          .from("companies")
          .select("id, nome_fantasia, razao_social, cnpj, is_reseller, parent_tenant_id, servidor_id, status")
          .eq("id", profile.company_id)
          .in("status", ["active", "teste"]);
        setTenants((data as TenantItem[]) || []);
      }
    } catch (err) {
      console.error("Error fetching tenants:", err);
    } finally {
      setFetching(false);
    }
  }, [isGlobalMaster, isResellerTenant, activeCompanyId, profile?.company_id]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const canSwitchTenant = (targetId: string): boolean => {
    if (isGlobalMaster) return true;
    if (isResellerTenant) {
      const target = tenants.find(t => t.id === targetId);
      return !!(target && (target.parent_tenant_id === activeCompanyId || target.id === activeCompanyId));
    }
    return targetId === activeCompanyId;
  };

  const handleSelect = async (companyId: string) => {
    if (loadingId) return;
    if (!canSwitchTenant(companyId)) return;
    setLoadingId(companyId);

    try {
      const { data } = await supabase
        .from("companies")
        .select("brand_primary_color, brand_secondary_color, brand_accent_color, brand_bg_color, brand_text_color, brand_logo_url, servidor_id")
        .eq("id", companyId)
        .single();

      const isMasterTenantTarget = isMasterUser && data?.servidor_id === null && companyId === profile?.company_id;
      if (isMasterTenantTarget) {
        applyBrandColors(null);
      } else if (data) {
        applyBrandColors(data);
      } else {
        applyBrandColors(null);
      }

      window.dispatchEvent(new CustomEvent("tenant-switched", { detail: { companyId } }));
      setActiveCompanyId(companyId);
      localStorage.removeItem("accord-last-workspace");
      await queryClient.invalidateQueries();
      await new Promise((r) => setTimeout(r, 400));
      navigate("/home");
    } catch {
      setActiveCompanyId(companyId);
      navigate("/home");
    } finally {
      setLoadingId(null);
    }
  };

  const toggleExpand = async (tenantId: string) => {
    const next = new Set(expandedIds);
    if (next.has(tenantId)) {
      next.delete(tenantId);
      setExpandedIds(next);
      return;
    }
    next.add(tenantId);
    setExpandedIds(next);
    if (!subTenantsMap[tenantId]) {
      setLoadingSubsId(tenantId);
      try {
        const { data } = await supabase
          .from("companies")
          .select("id, nome_fantasia, razao_social, cnpj, is_reseller, parent_tenant_id, servidor_id, status")
          .eq("parent_tenant_id", tenantId)
          .in("status", ["active", "teste"])
          .order("razao_social");
        setSubTenantsMap((prev) => ({ ...prev, [tenantId]: (data as TenantItem[]) || [] }));
      } finally {
        setLoadingSubsId(null);
      }
    }
  };

  // Separate master tenant from rest, and group by hierarchy
  const masterTenants = tenants.filter(t => !t.servidor_id && !t.parent_tenant_id);
  // Top-level only: exclude tenants that are children of resellers (they appear nested)
  const resellerIds = new Set(tenants.filter(t => t.is_reseller).map(t => t.id));
  const childTenants = tenants.filter(t =>
    (t.servidor_id !== null || t.parent_tenant_id !== null) &&
    !(t.parent_tenant_id && resellerIds.has(t.parent_tenant_id))
  );

  // For reseller: show self first then children
  const sortedTenants = isGlobalMaster
    ? [...masterTenants, ...childTenants]
    : tenants;

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Background pattern */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{ backgroundImage: `url(${accordPatternDark})`, backgroundSize: '500px', backgroundRepeat: 'repeat', opacity: 0.08 }}
      />
      <div className="absolute inset-0 dark:hidden bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(var(--background))_75%)]" />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{ backgroundImage: `url(${accordPatternDark})`, backgroundSize: '500px', backgroundRepeat: 'repeat', opacity: 0.15 }}
      />
      <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(var(--background))_75%)]" />
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-primary/[0.03] blur-[80px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus Servidores</h1>
            <p className="text-sm text-muted-foreground">
              {isGlobalMaster
                ? "Gerencie e acesse todos os servidores"
                : isResellerTenant
                  ? "Selecione um servidor para acessar"
                  : "Seu servidor"}
            </p>
          </div>
        </div>

        {fetching ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tenants.length === 0 ? (
          <Card className="p-8 text-center backdrop-blur-sm bg-card/80">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhum servidor encontrado.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedTenants.map((tenant) => {
              const isActive = activeCompanyId === tenant.id;
              const tenantType = getTenantType(tenant);
              const badge = typeBadgeConfig[tenantType];
              const isLoading = loadingId === tenant.id;
              const canSwitch = canSwitchTenant(tenant.id);

              return (
                <Card
                  key={tenant.id}
                  onClick={() => canSwitch && handleSelect(tenant.id)}
                  className={`flex items-center gap-4 p-4 transition-all duration-200 backdrop-blur-sm ${
                    canSwitch ? "cursor-pointer hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5" : "opacity-70 cursor-default"
                  } ${
                    isActive ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20" : "border-border bg-card/80"
                  } ${isLoading ? "opacity-80 pointer-events-none" : ""}`}
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
                  }`}>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : tenantType === "MASTER" ? (
                      <Shield className="h-5 w-5" />
                    ) : tenantType === "REVENDEDOR" ? (
                      <Crown className="h-5 w-5" />
                    ) : (
                      <Building2 className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-semibold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                        {tenant.nome_fantasia || tenant.razao_social}
                      </p>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${badge.className}`}>
                        {badge.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{tenant.cnpj}</p>
                  </div>
                  {isLoading ? (
                    <span className="text-xs text-muted-foreground">Carregando...</span>
                  ) : isActive ? (
                    <Badge variant="outline" className="border-primary/30 text-primary text-[10px] shrink-0">
                      <Check className="h-3 w-3 mr-1" /> Ativo
                    </Badge>
                  ) : canSwitch ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
