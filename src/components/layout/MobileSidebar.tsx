import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import accordLogo from "@/assets/accord-logo.png";
import {
  Home, Newspaper, LayoutDashboard, Receipt, FileText, BarChart3,
  Users, LogOut, MessageSquare, CalendarCheck, Rocket,
  ClipboardList, Trash2, Menu, Settings, ChevronDown, TrendingUp,
  Globe, Check, Crown, GraduationCap, Mail,
  // novos
  Zap, Headset, MessagesSquare, UsersRound, CircleDollarSign,
  Files, ChartColumn, ArchiveX, Settings2, Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ROUTE_PERMISSIONS } from "@/lib/permissions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOverdueCount } from "@/hooks/useOverdueCount";
import { useUnreadEmailCount } from "@/hooks/useUnreadEmailCount";

const navigation = [
  { nameKey: "nav.feed", href: "/home", icon: Newspaper, roles: ["admin", "operador", "leitura", "ceo", "administrativo", "financeiro", "comercial"] },
  { nameKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "operador", "leitura", "ceo", "administrativo", "financeiro", "comercial"] },
  { nameKey: "nav.accordSales", href: "/atendimento", icon: Headset, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { nameKey: "nav.email", href: "/email", icon: Mail, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { nameKey: "nav.forms", href: "/formularios", icon: ClipboardList, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { nameKey: "nav.activities", href: "/atividades", icon: CalendarCheck, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { nameKey: "nav.fintech", href: "/financeiro", icon: CircleDollarSign, roles: ["admin", "ceo", "financeiro"] },
  { nameKey: "nav.documents", href: "/documentos", icon: Files, roles: ["admin", "ceo", "administrativo", "financeiro"] },
  { nameKey: "nav.reports", href: "/relatorios", icon: ChartColumn, roles: ["admin", "leitura", "ceo", "administrativo", "financeiro"] },
  { nameKey: "nav.clientBase", href: "/cadastrados", icon: UsersRound, roles: ["admin", "ceo", "administrativo"] },
  { nameKey: "nav.performance", href: "/performance", icon: TrendingUp, roles: ["admin", "ceo", "operador", "comercial"] },
  
  { nameKey: "nav.academy", href: "/academy", icon: GraduationCap, roles: ["admin", "operador", "leitura", "ceo", "administrativo", "financeiro", "comercial"] },
  { nameKey: "nav.discard", href: "/descarte", icon: ArchiveX, roles: ["admin", "ceo"] },
];

const configNavigation = [
  { nameKey: "nav.users", href: "/configuracoes/usuarios", icon: UsersRound, roles: ["admin", "ceo", "administrativo"] },
  { nameKey: "nav.tenantManagement", href: "/gestao-tenants", icon: Crown, roles: ["ceo", "master"], tenantAdminOnly: true },
];

const LANGUAGES = [
  { code: "pt-BR", label: "Português (Brasil)", flag: "BR" },
  { code: "pt-PT", label: "Português (Portugal)", flag: "PT" },
  { code: "en", label: "English", flag: "US" },
  { code: "es", label: "Español", flag: "ES" },
] as const;

export function MobileSidebar() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { role, signOut, profile, isGlobalMaster, isResellerTenant } = useAuth();
  const { hasPermission } = usePermissions();
  const [open, setOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(true);
  const [currentLang, setCurrentLang] = useState(() => localStorage.getItem("accord-lang") || "pt-BR");
  const overdueCount = useOverdueCount();
  const unreadEmailCount = useUnreadEmailCount();

  useEffect(() => {
    if (profile?.preferred_language) {
      setCurrentLang(profile.preferred_language);
    }
  }, [profile]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = original; };
    }
  }, [open]);

  const handleLanguageChange = async (code: string) => {
    setCurrentLang(code);
    localStorage.setItem("accord-lang", code);
    i18n.changeLanguage(code);
    if (profile) {
      await supabase.from("profiles").update({ preferred_language: code } as any).eq("id", profile.id);
    }
  };

  const filteredNavigation = navigation.filter((item) => {
    if (role && !item.roles.includes(role)) return false;
    const perm = ROUTE_PERMISSIONS[item.href];
    if (perm && !hasPermission(perm)) return false;
    return true;
  });

  const filteredConfigNavigation = configNavigation.filter((item) => {
    if (role && !item.roles.includes(role)) return false;
    if ((item as any).tenantAdminOnly && !isGlobalMaster) return false;
    const perm = ROUTE_PERMISSIONS[item.href];
    if (perm && !hasPermission(perm)) return false;
    return true;
  });

  const userInitials = profile?.name
    ? profile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const closeAndGo = () => setOpen(false);

  const itemClass = (active: boolean) => cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 relative",
    active
      ? "bg-sidebar-primary/15 text-sidebar-foreground"
      : "text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/85 active:bg-sidebar-accent"
  );

  const currentLangLabel = LANGUAGES.find(l => l.code === currentLang)?.flag || "BR";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-10 w-10 rounded-xl active:scale-95">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[88vw] max-w-[320px] p-0 bg-sidebar border-sidebar-border flex flex-col gap-0"
        style={{
          height: "100dvh",
          maxHeight: "100dvh",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {/* Logo */}
        <div className="flex min-h-[56px] items-center justify-between px-5 border-b border-sidebar-border/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <img src={accordLogo} alt="ACCORD" className="h-8 w-auto" />
            <span className="text-[15px] font-bold tracking-tight text-sidebar-foreground/90">ACCORD</span>
          </div>
        </div>

        {/* Scrollable area */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* ACCORD Stack */}
          <div className="px-3 pt-3 pb-2">
            <Link
              to="/accord-stack"
              onClick={closeAndGo}
              className={cn(
                "flex items-center gap-2 w-full h-10 rounded-xl border border-sidebar-primary/20 text-sidebar-primary hover:bg-sidebar-primary/10 text-xs font-semibold justify-center transition-all",
                location.pathname === "/accord-stack" && "text-sidebar-primary-foreground border-sidebar-primary shadow-[0_0_12px_rgba(122,63,242,0.3)]"
              )}
              style={location.pathname === "/accord-stack" ? { background: 'linear-gradient(135deg, #7A3FF2, #D94FD5)' } : undefined}
            >
              <Zap className="h-3.5 w-3.5" />
              ACCORD Stack
            </Link>
          </div>

          {/* Main navigation */}
          <nav className="px-3 py-2 space-y-0.5">
            <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/25">
              Menu
            </p>
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              let badge = 0;
              if (item.href === "/atividades" && overdueCount > 0) badge = overdueCount;
              else if (item.href === "/email" && unreadEmailCount > 0) badge = unreadEmailCount;
              return (
                <Link
                  key={item.nameKey}
                  to={item.href}
                  onClick={closeAndGo}
                  className={itemClass(isActive)}
                >
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary shadow-[0_0_8px_rgba(122,63,242,0.5)]" />}
                  <item.icon className={cn("h-[17px] w-[17px] shrink-0", isActive && "text-sidebar-primary")} />
                  <span className="truncate flex-1">{t(item.nameKey)}</span>
                  {badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Settings collapsible */}
          {filteredConfigNavigation.length > 0 && (
            <div className="px-3 py-2 border-t border-sidebar-border/30 mt-2">
              <button
                onClick={() => setConfigOpen(v => !v)}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors text-xs font-semibold"
              >
                <Settings2 className="h-4 w-4" />
                <span className="flex-1 text-left">{t("nav.settings")}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", configOpen && "rotate-180")} />
              </button>
              {configOpen && (
                <div className="space-y-0.5 pl-1 mt-1">
                  {filteredConfigNavigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.nameKey}
                        to={item.href}
                        onClick={closeAndGo}
                        className={itemClass(isActive)}
                      >
                        <item.icon className={cn("h-[17px] w-[17px] shrink-0", isActive && "text-sidebar-primary")} />
                        <span className="truncate">{t(item.nameKey)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Language */}
          <div className="px-3 py-2 border-t border-sidebar-border/30">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors text-xs font-semibold">
                  <Languages className="h-4 w-4" />
                  <span className="flex-1 text-left">{t("common.language") || "Idioma"}</span>
                  <span className="text-[10px] text-sidebar-foreground/50">{currentLangLabel}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {LANGUAGES.map(l => (
                  <DropdownMenuItem key={l.code} onClick={() => handleLanguageChange(l.code)} className="cursor-pointer">
                    <span className="flex-1">{l.label}</span>
                    {currentLang === l.code && <Check className="h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Footer: user + logout */}
        <div
          className="border-t border-sidebar-border/50 px-3 pt-3 shrink-0"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-sidebar-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>{t("header.logout")}</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
