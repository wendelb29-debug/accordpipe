import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import accordLogo from "@/assets/accord-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { usePermissions } from "@/hooks/usePermissions";
import { ROUTE_PERMISSIONS } from "@/lib/permissions";
import {
  Home,
  LayoutDashboard,
  Building2,
  Receipt,
  FileText,
  BarChart3,
  Users,
  LogOut,
  MessageSquare,
  CalendarCheck,
  Rocket,
  ClipboardList,
  Trash2,
  Pin,
  PinOff,
  Settings,
  ChevronDown,
  TrendingUp,
  Globe,
  Check,
  Crown,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantLogo } from "@/hooks/useTenantLogo";
import { useOverdueCount } from "@/hooks/useOverdueCount";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  { nameKey: "nav.home", href: "/home", icon: Home, roles: ["admin", "operador", "leitura", "ceo", "administrativo", "financeiro", "comercial"] },
  { nameKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "operador", "leitura", "ceo", "administrativo", "financeiro", "comercial"] },
  { nameKey: "nav.accordSales", href: "/atendimento", icon: MessageSquare, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { nameKey: "nav.forms", href: "/formularios", icon: ClipboardList, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { nameKey: "nav.activities", href: "/atividades", icon: CalendarCheck, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { nameKey: "nav.fintech", href: "/financeiro", icon: Receipt, roles: ["admin", "ceo", "financeiro"] },
  { nameKey: "nav.documents", href: "/documentos", icon: FileText, roles: ["admin", "ceo", "administrativo", "financeiro"] },
  { nameKey: "nav.reports", href: "/relatorios", icon: BarChart3, roles: ["admin", "leitura", "ceo", "administrativo", "financeiro"] },
  { nameKey: "nav.clientBase", href: "/cadastrados", icon: Users, roles: ["admin", "ceo", "administrativo"] },
  { nameKey: "nav.performance", href: "/performance", icon: TrendingUp, roles: ["admin", "ceo", "operador", "comercial"] },
  { nameKey: "nav.events", href: "/eventos", icon: CalendarCheck, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { nameKey: "nav.academy", href: "/academy", icon: GraduationCap, roles: ["admin", "operador", "leitura", "ceo", "administrativo", "financeiro", "comercial"] },
  { nameKey: "nav.discard", href: "/descarte", icon: Trash2, roles: ["admin", "ceo"] },
];

const configNavigation = [
  { nameKey: "nav.users", href: "/configuracoes/usuarios", icon: Users, roles: ["admin", "ceo", "administrativo"] },
  { nameKey: "nav.tenantManagement", href: "/gestao-tenants", icon: Crown, roles: ["ceo", "master"], tenantAdminOnly: true },
  
];

const LANGUAGES = [
  { code: "pt-BR", label: "Português (Brasil)", flag: "BR" },
  { code: "pt-PT", label: "Português (Portugal)", flag: "PT" },
  { code: "en", label: "English", flag: "US" },
  { code: "es", label: "Español", flag: "ES" },
] as const;

export function Sidebar() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(() => localStorage.getItem("sidebar-pinned") === "true");
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentLang, setCurrentLang] = useState(() => localStorage.getItem("accord-lang") || "pt-BR");

  // Sidebar is expanded when pinned OR hovered
  const collapsed = !pinned && !hovered;

  // Persist pin state
  useEffect(() => {
    localStorage.setItem("sidebar-pinned", String(pinned));
  }, [pinned]);

  // Notify AppLayout about the sidebar width — only pinned state affects layout push
  useEffect(() => {
    const layoutCollapsed = !pinned;
    window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: layoutCollapsed }));
    localStorage.setItem("sidebar-collapsed", String(layoutCollapsed));
  }, [pinned]);

  // Notify AppLayout about hover expansion so content shifts with the sidebar
  useEffect(() => {
    const expanded = pinned || hovered;
    window.dispatchEvent(new CustomEvent("sidebar-hover", { detail: expanded }));
  }, [pinned, hovered]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHovered(false), 200);
  };

  const [configOpen, setConfigOpen] = useState(false);
  const { role, signOut, profile, isMasterTenantAdmin, isGlobalMaster, isResellerTenant } = useAuth();
  const activeCompanyId = useActiveCompanyId();
  const tenantLogoUrl = useTenantLogo(activeCompanyId);
  const overdueCount = useOverdueCount();

  // Sync language from profile on load
  useEffect(() => {
    if (profile?.preferred_language) {
      const lang = profile.preferred_language;
      setCurrentLang(lang);
      localStorage.setItem("accord-lang", lang);
    }
  }, [profile]);

  const handleLanguageChange = async (code: string) => {
    setCurrentLang(code);
    localStorage.setItem("accord-lang", code);
    i18n.changeLanguage(code);
    if (profile) {
      await supabase.from("profiles").update({ preferred_language: code } as any).eq("id", profile.id);
    }
  };

  const { hasPermission } = usePermissions();

  const filteredNavigation = navigation.filter((item) => {
    if (role && !item.roles.includes(role)) return false;
    const perm = ROUTE_PERMISSIONS[item.href];
    if (perm && !hasPermission(perm)) return false;
    return true;
  });

  const filteredConfigNavigation = configNavigation.filter((item) => {
    if (role && !item.roles.includes(role)) return false;
    if ((item as any).tenantAdminOnly && !isGlobalMaster) return false;
    if ((item as any).resellerOnly && !isResellerTenant) return false;
    const perm = ROUTE_PERMISSIONS[item.href];
    if (perm && !hasPermission(perm)) return false;
    return true;
  });

  const userInitials = profile?.name
    ? profile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const NavItem = ({ item, isActive }: { item: typeof navigation[0]; isActive: boolean }) => {
    const badge = item.href === "/atividades" && overdueCount > 0 ? overdueCount : 0;
    const content = (
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 group relative",
          isActive
            ? "bg-sidebar-primary/15 text-sidebar-foreground"
            : "text-sidebar-foreground/45 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/80"
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary shadow-[0_0_8px_rgba(122,63,242,0.5)]" />
        )}
        <div className="relative shrink-0">
          <item.icon className={cn(
            "h-[18px] w-[18px] transition-colors duration-200",
            isActive ? "text-sidebar-primary" : "group-hover:text-sidebar-foreground/70"
          )} />
          {badge > 0 && collapsed && (
            <span className="absolute -top-2 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-0.5">
              {badge}
            </span>
          )}
        </div>
        <span className={cn(
          "truncate flex-1 transition-all duration-300 whitespace-nowrap",
          collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
        )}>
          {t(item.nameKey)}
        </span>
        {!collapsed && badge > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive/80 text-[10px] font-bold text-destructive-foreground px-1">
            {badge}
          </span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium text-xs">
            {t(item.nameKey)}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar flex flex-col",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-[232px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-12 items-center border-b border-sidebar-border/30 shrink-0 select-none overflow-hidden",
        collapsed ? "justify-center px-2" : "justify-start px-4"
      )}>
        <div className="flex items-center gap-2.5 cursor-default shrink-0" onClick={(e) => e.preventDefault()}>
          <img
            src={tenantLogoUrl || accordLogo}
            alt={tenantLogoUrl ? "Tenant" : "ACCORD"}
            className={cn(
              "transition-all duration-300 object-contain w-auto flex-shrink-0",
              collapsed ? "h-7 max-w-[36px]" : "h-8",
              tenantLogoUrl ? "max-w-[120px]" : "max-w-[32px]"
            )}
          />
          {!tenantLogoUrl && (
            <span className={cn(
              "text-[15px] font-bold tracking-tight text-sidebar-foreground/90 whitespace-nowrap transition-all duration-300",
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
            )}>
              ACCORD
            </span>
          )}
        </div>
        {/* Pin/Toggle button - visible when expanded */}
        {!collapsed && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setPinned(!pinned)}
                className={cn(
                  "ml-auto flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200",
                  pinned
                    ? "bg-sidebar-primary/20 text-sidebar-primary hover:bg-sidebar-primary/30"
                    : "text-sidebar-foreground/30 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/60"
                )}
              >
                {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium text-xs">
              {pinned ? t("common.close") : t("common.view")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* ACCORD Stack Button */}
      <div className={cn("shrink-0 overflow-hidden", collapsed ? "px-2 py-2" : "px-3 py-2")}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link to="/accord-stack" className="flex w-full h-9 items-center justify-center rounded-xl text-sidebar-primary hover:bg-sidebar-accent transition-colors">
                <Rocket className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium text-xs">ACCORD Stack</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            to="/accord-stack"
            className={cn(
              "flex items-center gap-2 w-full h-9 rounded-xl border border-sidebar-primary/20 text-sidebar-primary hover:bg-sidebar-primary/10 text-xs font-semibold justify-center transition-all",
              location.pathname === "/accord-stack" && "text-sidebar-primary-foreground border-sidebar-primary shadow-[0_0_12px_rgba(122,63,242,0.3)]"
            )}
            style={location.pathname === "/accord-stack" ? { background: 'linear-gradient(135deg, #7A3FF2, #D94FD5)' } : undefined}
          >
            <Rocket className="h-3.5 w-3.5" />
            <span className="transition-opacity duration-300">ACCORD Stack</span>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-0.5 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>
        {!collapsed && (
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/20 transition-opacity duration-300">
            Menu
          </p>
        )}
        {filteredNavigation.map((item) => (
          <NavItem key={t(item.nameKey)} item={item} isActive={location.pathname === item.href} />
        ))}
      </nav>

      {/* Config & User */}
      <div className={cn("shrink-0 border-t border-sidebar-border/40", collapsed ? "px-2 py-2" : "px-3 py-2")}>
        {filteredConfigNavigation.length > 0 && (
          <div className="space-y-0.5 mb-4">
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setConfigOpen(!configOpen)}
                    className="flex justify-center w-full p-2 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{t("nav.settings")}</TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={() => setConfigOpen(!configOpen)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors text-xs font-semibold"
              >
                <Settings className="h-4 w-4" />
                <span className="flex-1 text-left">{t("nav.settings")}</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", configOpen && "rotate-180")} />
              </button>
            )}
            {configOpen && (
              <div className="space-y-0.5 pl-1">
                {filteredConfigNavigation.map((item) => (
                  <NavItem key={t(item.nameKey)} item={item} isActive={location.pathname === item.href} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Card */}
        {!collapsed && profile && (
          <Link
            to="/perfil"
            className="flex items-center gap-3 rounded-xl bg-sidebar-accent/60 p-3 mb-2 border border-sidebar-border/20 hover:bg-sidebar-accent/80 transition-all duration-200 group"
          >
            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-sidebar-primary/25">
              {(profile as any)?.avatar_url ? (
                <img src={(profile as any).avatar_url} alt={profile.name} className="h-full w-full object-cover rounded-full" />
              ) : (
                <AvatarFallback className="text-[10px] font-bold bg-sidebar-primary/20 text-sidebar-primary">
                  {userInitials}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{profile.name}</p>
              <p className="text-[10px] text-sidebar-foreground/30 truncate">{profile.email}</p>
            </div>
          </Link>
        )}

        {collapsed && profile && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link to="/perfil" className="flex justify-center mb-2">
                <Avatar className="h-8 w-8 ring-2 ring-sidebar-primary/25">
                  {(profile as any)?.avatar_url ? (
                    <img src={(profile as any).avatar_url} alt={profile.name} className="h-full w-full object-cover rounded-full" />
                  ) : (
                    <AvatarFallback className="text-[10px] font-bold bg-sidebar-primary/20 text-sidebar-primary">
                      {userInitials}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">{profile.name}</TooltipContent>
          </Tooltip>
        )}

        {/* Language Selector */}
        {collapsed ? (
          <DropdownMenu>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className="flex justify-center w-full p-2 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors mb-1">
                    <Globe className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Idioma</TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="end" className="w-52 rounded-xl">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  className="rounded-lg cursor-pointer gap-2.5 text-xs"
                  onSelect={() => handleLanguageChange(lang.code)}
                >
                  <span className="text-[10px] font-bold text-muted-foreground w-5 shrink-0">{lang.flag}</span>
                  <span className="flex-1">{lang.label}</span>
                  {currentLang === lang.code && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-200 text-[13px] font-medium mb-1">
                <Globe className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1 text-left truncate">
                  {LANGUAGES.find(l => l.code === currentLang)?.flag}{" "}
                  {LANGUAGES.find(l => l.code === currentLang)?.label}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56 rounded-xl">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  className="rounded-lg cursor-pointer gap-2.5 text-xs"
                  onSelect={() => handleLanguageChange(lang.code)}
                >
                  <span className="text-[10px] font-bold text-muted-foreground w-5 shrink-0">{lang.flag}</span>
                  <span className="flex-1">{lang.label}</span>
                  {currentLang === lang.code && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-sidebar-foreground/30 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              <span className={cn(
                "transition-all duration-300 whitespace-nowrap",
                collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
              )}>Sair</span>
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="font-medium text-xs">Sair</TooltipContent>
          )}
        </Tooltip>
      </div>
    </aside>
  );
}
