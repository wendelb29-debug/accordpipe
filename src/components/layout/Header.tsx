import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, User, Moon, Sun, Clock, ChevronLeft, Building2 } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { MobileSidebar } from "./MobileSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useBackNavigation } from "@/contexts/BackNavigationContext";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const ROUTE_TITLE_KEYS: Record<string, string> = {
  "/home": "nav.home",
  "/dashboard": "nav.dashboard",
  "/atendimento": "header.workspaces",
  "/formularios": "nav.forms",
  "/atividades": "nav.activities",
  "/financeiro": "nav.fintech",
  "/documentos": "nav.documents",
  "/relatorios": "nav.reports",
  "/contratos": "nav.contracts",
  "/gestao-vendas": "nav.salesManagement",
  "/cadastrados": "nav.clientBase",
  "/descarte": "nav.discard",
  "/perfil": "header.profile",
  "/accord-stack": "ACCORD Stack",
  "/configuracoes/usuarios": "nav.users",
  "/configuracoes/assinaturas": "nav.signatures",
  "/performance": "nav.performance",
  "/eventos": "nav.events",
};

const ROUTE_SUBTITLES: Record<string, string> = {
  "/dashboard": "Visão geral da sua operação",
  "/formularios": "Crie formulários personalizados para capturar leads automaticamente no CRM",
  "/atendimento": "Selecione um kanban para gerenciar",
};

export function Header() {
  const { t } = useTranslation();
  const { profile, role, signOut, loading, companies, activeCompanyId, setActiveCompanyId, activeCompany, isMaster, isCeo, isMasterTenantAdmin, isGlobalMaster, isResellerTenant } = useAuth();
  const { handleBack } = useBackNavigation();
  const [currentTheme, setCurrentTheme] = useState(() => document.documentElement.classList.contains("dark") ? "dark" : "light");
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const titleKey = ROUTE_TITLE_KEYS[location.pathname];
  const baseTitle = titleKey ? (titleKey.startsWith("ACCORD") ? titleKey : t(titleKey)) : "";
  const [titleSuffix, setTitleSuffix] = useState<string>("");
  const pageTitle = baseTitle + (titleSuffix ? ` / ${titleSuffix}` : "");
  const pageSubtitle = ROUTE_SUBTITLES[location.pathname] || "";

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail || "";
      setTitleSuffix(detail);
    };
    window.addEventListener("header:title-suffix", handler);
    return () => window.removeEventListener("header:title-suffix", handler);
  }, []);

  // Reset suffix on route change
  useEffect(() => {
    setTitleSuffix("");
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleThemeToggle = async () => {
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    // Enable smooth transition
    document.documentElement.classList.add("theme-transition");
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newTheme);
    localStorage.setItem("theme", newTheme);
    setCurrentTheme(newTheme);
    // Remove transition class after animation completes
    setTimeout(() => document.documentElement.classList.remove("theme-transition"), 200);
    // Persist to DB (non-blocking)
    if (profile) {
      supabase.from("profiles").update({ theme: newTheme } as any).eq("id", profile.id).then(() => {});
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border/50 bg-card/95 backdrop-blur-xl px-3 sm:px-4 lg:px-6 shadow-sm gap-2" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {isMobile && <MobileSidebar />}

      {/* Back arrow + Page title */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <button
          onClick={handleBack}
          title={t("header.back")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all duration-200 shrink-0 active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        {pageTitle && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate">{pageTitle}</h1>
            {pageSubtitle && <p className="text-[10px] text-muted-foreground truncate">{pageSubtitle}</p>}
          </div>
        )}
      </div>

      {/* Right: Clock + Theme + Search + Notifications + User */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Theme toggle - always visible */}
        <button
          onClick={handleThemeToggle}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
        >
          {currentTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        <div className="hidden sm:flex items-center gap-2 mr-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="tabular-nums">
              {currentTime.toLocaleDateString("pt-BR")} {currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>

        <div className="relative hidden md:block w-48 lg:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            type="search"
            placeholder={t("header.search")}
            className="pl-8 pr-2 bg-muted/40 border-border/40 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-xl h-8 text-xs w-full"
          />
        </div>


        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-xl h-9 gap-2.5 px-2 hover:bg-muted/60">
              {loading ? (
                <Skeleton className="hidden md:block h-4 w-20 rounded" />
              ) : profile ? (
                <div className="hidden md:flex flex-col items-end max-w-[140px]">
                  <span className="text-sm font-medium text-foreground truncate w-full text-right">
                    {profile.name}
                  </span>
                  {activeCompany && (
                    <span className="text-[10px] text-muted-foreground truncate w-full leading-tight text-right">
                      {activeCompany.nome_fantasia || activeCompany.razao_social}
                    </span>
                  )}
                </div>
              ) : null}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #2563EB, #7A3FF2)' }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-lg max-h-[80vh] overflow-y-auto">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-semibold">{profile?.name || t("header.user")}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {profile?.email}
                </span>
                {role && (
                  <Badge variant="outline" className="mt-1.5 w-fit text-[10px] rounded-md border-primary/20 text-primary">
                    {t(`roles.${role}`)}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {(isGlobalMaster || isResellerTenant) && (
              <>
                <DropdownMenuItem className="rounded-lg cursor-pointer gap-2" onClick={() => navigate("/servidores")}>
                  <Building2 className="h-4 w-4" />
                  {t("nav.tenants")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem className="rounded-lg cursor-pointer" onClick={() => navigate("/perfil")}>{t("header.profile")}</DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg cursor-pointer" onClick={() => navigate("/perfil")}>{t("header.changePassword")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive rounded-lg cursor-pointer"
              onClick={signOut}
            >
              {t("header.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
