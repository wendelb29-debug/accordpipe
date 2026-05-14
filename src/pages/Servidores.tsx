import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Check, ChevronRight, ChevronDown, Shield, Loader2, Crown, Home } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { applyBrandColors } from "@/components/layout/ThemeSync";


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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;

    const lerp = (a: number[], b: number[], t: number) =>
      a.map((v, i) => Math.round(v + (b[i] - v) * t));

    const getColors = () => {
      const isDark = document.documentElement.classList.contains('dark');
      return {
        blue:       isDark ? [37, 99, 235]  : [59, 130, 246],
        purple:     [122, 63, 242] as number[],
        dotAlpha:   isDark ? 0.07 : 0.06,
        lineAlpha:  isDark ? 0.13 : 0.08,
        ptAlphaMin: isDark ? 0.15 : 0.09,
        ptAlphaMax: isDark ? 0.45 : 0.26,
      };
    };

    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const { width, height } = p.getBoundingClientRect();
      canvas.width  = width  * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width  = width  + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };

    const c = getColors();
    const pts = Array.from({ length: 70 }, () => {
      const p = canvas.parentElement;
      const W = p?.offsetWidth  || 1000;
      const H = p?.offsetHeight || 700;
      const t = Math.random();
      return {
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .25,
        vy: (Math.random() - .5) * .25,
        r: Math.random() * 1.8 + .8, t,
        a: c.ptAlphaMin + Math.random() * (c.ptAlphaMax - c.ptAlphaMin),
      };
    });

    const draw = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const W = p.offsetWidth, H = p.offsetHeight;
      const { blue, purple, dotAlpha, lineAlpha } = getColors();
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = `rgba(122,63,242,${dotAlpha})`;
      for (let x = 18; x < W; x += 36)
        for (let y = 18; y < H; y += 36) {
          ctx.beginPath(); ctx.arc(x, y, .85, 0, Math.PI * 2); ctx.fill();
        }

      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            const col = lerp(lerp(blue, purple, a.t), lerp(blue, purple, b.t), .5);
            ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${(1 - d / 130) * lineAlpha})`;
            ctx.lineWidth = .6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        const col = lerp(blue, purple, p.t);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${p.a})`; ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };

    resize(); draw();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);

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
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />


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
              const isExpandable = tenant.is_reseller;
              const isExpanded = expandedIds.has(tenant.id);
              const subs = subTenantsMap[tenant.id] || [];
              const isLoadingSubs = loadingSubsId === tenant.id;

              return (
                <div key={tenant.id} className="flex flex-col gap-2">
                  <Card
                    className={`flex items-center gap-4 p-4 transition-all duration-200 backdrop-blur-sm ${
                      canSwitch ? "hover:shadow-lg hover:border-primary/40" : "opacity-70"
                    } ${
                      isActive ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20" : "border-border bg-card/80"
                    } ${isLoading ? "opacity-80 pointer-events-none" : ""}`}
                  >
                    <div
                      onClick={() => canSwitch && handleSelect(tenant.id)}
                      className={`flex items-center gap-4 flex-1 min-w-0 ${canSwitch ? "cursor-pointer" : "cursor-default"}`}
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
                    </div>
                    {isLoading ? (
                      <span className="text-xs text-muted-foreground">Carregando...</span>
                    ) : isActive ? (
                      <Badge variant="outline" className="border-primary/30 text-primary text-[10px] shrink-0">
                        <Check className="h-3 w-3 mr-1" /> Ativo
                      </Badge>
                    ) : null}
                    {isExpandable ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(tenant.id); }}
                        className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors shrink-0"
                        aria-label={isExpanded ? "Recolher" : "Expandir"}
                      >
                        {isLoadingSubs ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    ) : canSwitch && !isActive ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : null}
                  </Card>

                  {isExpandable && isExpanded && (
                    <div className="ml-6 pl-4 border-l-2 border-border/60 flex flex-col gap-2 animate-fade-in">
                      {isLoadingSubs && subs.length === 0 ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                          <Loader2 className="h-3 w-3 animate-spin" /> Carregando sub-tenants...
                        </div>
                      ) : subs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">Nenhum sub-tenant criado.</p>
                      ) : (
                        subs.map((sub) => {
                          const subActive = activeCompanyId === sub.id;
                          const subLoading = loadingId === sub.id;
                          const subCanSwitch = canSwitchTenant(sub.id);
                          return (
                            <Card
                              key={sub.id}
                              onClick={() => subCanSwitch && handleSelect(sub.id)}
                              className={`flex items-center gap-3 p-3 transition-all duration-200 backdrop-blur-sm ${
                                subCanSwitch ? "cursor-pointer hover:shadow-md hover:border-primary/40" : "opacity-70 cursor-default"
                              } ${
                                subActive ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card/60"
                              } ${subLoading ? "opacity-80 pointer-events-none" : ""}`}
                            >
                              <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
                                subActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                              }`}>
                                {subLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Home className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${subActive ? "text-primary" : "text-foreground"}`}>
                                  {sub.nome_fantasia || sub.razao_social}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">{sub.cnpj}</p>
                              </div>
                              {subActive ? (
                                <Badge variant="outline" className="border-primary/30 text-primary text-[10px] shrink-0">
                                  <Check className="h-3 w-3 mr-1" /> Ativo
                                </Badge>
                              ) : subCanSwitch ? (
                                <span className="text-xs text-primary font-medium flex items-center gap-1 shrink-0">
                                  Entrar <ChevronRight className="h-3 w-3" />
                                </span>
                              ) : null}
                            </Card>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
