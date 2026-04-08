import { useNavigate, useLocation } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const ROUTE_TITLES: Record<string, string> = {
  "/home": "Início",
  "/dashboard": "Dashboard",
  "/atendimento": "Workspaces",
  "/formularios": "Formulários",
  "/atividades": "Atividades",
  "/financeiro": "Financeiro",
  "/documentos": "Documentos",
  "/relatorios": "Relatórios",
  "/contratos": "Contratos",
  "/gestao-vendas": "Gestão de Vendas",
  "/cadastrados": "Base de Clientes",
  "/descarte": "Descarte",
  "/perfil": "Meu Perfil",
  "/accord-stack": "ACCORD Stack",
  "/configuracoes/usuarios": "Usuários",
  "/configuracoes/assinaturas": "Assinaturas",
};

const ROUTE_SUBTITLES: Record<string, string> = {
  "/atendimento": "Selecione um kanban para gerenciar",
};

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  leitura: "Leitura",
  ceo: "CEO",
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  comercial: "Comercial",
};

export function Header() {
  const { profile, role, signOut, loading, companies, activeCompanyId, setActiveCompanyId, activeCompany, isMaster, isCeo } = useAuth();
  const [currentTheme, setCurrentTheme] = useState(() => document.documentElement.classList.contains("dark") ? "dark" : "light");
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const pageTitle = ROUTE_TITLES[location.pathname] || "";
  const pageSubtitle = ROUTE_SUBTITLES[location.pathname] || "";

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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 bg-card/95 backdrop-blur-xl px-3 sm:px-6 lg:px-8 shadow-sm gap-2" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {isMobile && <MobileSidebar />}

      {/* Back arrow + Page title */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
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
        <div className="hidden sm:flex items-center gap-2 mr-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="tabular-nums">
              {currentTime.toLocaleDateString("pt-BR")} {currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <button
            onClick={handleThemeToggle}
            className="h-7 w-7 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
          >
            {currentTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="relative hidden md:block w-48 lg:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            type="search"
            placeholder="Buscar..."
            className="pl-8 pr-2 bg-muted/40 border-border/40 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-xl h-8 text-xs w-full"
          />
        </div>


        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-xl h-9 gap-2.5 px-2 hover:bg-muted/60">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #2563EB, #7A3FF2)' }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              {loading ? (
                <Skeleton className="hidden md:block h-4 w-20 rounded" />
              ) : profile ? (
                <div className="hidden md:flex flex-col items-start max-w-[140px]">
                  <span className="text-sm font-medium text-foreground truncate w-full">
                    {profile.name}
                  </span>
                  {activeCompany && (
                    <span className="text-[10px] text-muted-foreground truncate w-full leading-tight">
                      {activeCompany.nome_fantasia || activeCompany.razao_social}
                    </span>
                  )}
                </div>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-lg max-h-[80vh] overflow-y-auto">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-semibold">{profile?.name || "Usuário"}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {profile?.email}
                </span>
                {role && (
                  <Badge variant="outline" className="mt-1.5 w-fit text-[10px] rounded-md border-primary/20 text-primary">
                    {roleLabels[role]}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {(isMaster || isCeo) && profile?.is_master && (
              <>
                <DropdownMenuItem className="rounded-lg cursor-pointer gap-2" onClick={() => navigate("/servidores")}>
                  <Building2 className="h-4 w-4" />
                  Tenants
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem className="rounded-lg cursor-pointer" onClick={() => navigate("/perfil")}>Meu Perfil</DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg cursor-pointer" onClick={() => navigate("/perfil")}>Alterar Senha</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive rounded-lg cursor-pointer"
              onClick={signOut}
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
