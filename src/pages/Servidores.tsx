import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Check, ChevronRight, Shield, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { applyBrandColors } from "@/components/layout/ThemeSync";
import accordPatternLight from "@/assets/accord-pattern-light.png";
import accordPatternDark from "@/assets/accord-pattern-dark.png";

export default function Servidores() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companies, activeCompanyId, setActiveCompanyId, profile, isMasterTenantAdmin } = useAuth();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Block access for non-master-tenant users
  if (!isMasterTenantAdmin) {
    return <Navigate to="/home" replace />;
  }

  const isMasterUser = !!(profile as any)?.is_master;
  const isMasterTenant = (companyId: string) => isMasterUser && companyId === profile?.company_id;

  const handleSelect = async (companyId: string) => {
    if (loadingId) return;
    setLoadingId(companyId);

    try {
      const { data } = await supabase
        .from("companies")
        .select("brand_primary_color, brand_secondary_color, brand_accent_color, brand_bg_color, brand_text_color, brand_logo_url")
        .eq("id", companyId)
        .single();

      if (isMasterTenant(companyId)) {
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

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Institutional pattern background — light mode */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          backgroundImage: `url(${accordPatternLight})`,
          backgroundSize: '600px',
          backgroundRepeat: 'repeat',
          opacity: 0.35,
        }}
      />
      {/* Radial fade overlay — light */}
      <div className="absolute inset-0 dark:hidden bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--background))_80%)]" />

      {/* Institutional pattern background — dark mode */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          backgroundImage: `url(${accordPatternDark})`,
          backgroundSize: '500px',
          backgroundRepeat: 'repeat',
          opacity: 0.15,
        }}
      />
      {/* Radial fade overlay — dark */}
      <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(var(--background))_75%)]" />

      {/* Subtle glow accents */}
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
            <p className="text-sm text-muted-foreground">Selecione um servidor para acessar</p>
          </div>
        </div>

        {companies.length === 0 ? (
          <Card className="p-8 text-center backdrop-blur-sm bg-card/80">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhum servidor encontrado.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {companies.map((company) => {
              const isActive = activeCompanyId === company.id;
              const isMaster = isMasterTenant(company.id);
              const isLoading = loadingId === company.id;
              return (
                <Card
                  key={company.id}
                  onClick={() => handleSelect(company.id)}
                  className={`flex items-center gap-4 p-4 cursor-pointer transition-all duration-200 backdrop-blur-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 ${
                    isActive ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20" : "border-border bg-card/80"
                  } ${isLoading ? "opacity-80 pointer-events-none" : ""}`}
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
                  }`}>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isMaster ? (
                      <Shield className="h-5 w-5" />
                    ) : (
                      <Building2 className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                        {company.nome_fantasia || company.razao_social}
                      </p>
                      {isMaster && (
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 shrink-0">
                          Master
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{company.cnpj}</p>
                  </div>
                  {isLoading ? (
                    <span className="text-xs text-muted-foreground">Carregando...</span>
                  ) : isActive ? (
                    <Badge variant="outline" className="border-primary/30 text-primary text-[10px] shrink-0">
                      <Check className="h-3 w-3 mr-1" /> Ativo
                    </Badge>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
