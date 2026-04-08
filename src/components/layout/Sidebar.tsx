import { Link, useLocation } from "react-router-dom";
import accordLogo from "@/assets/accord-logo.png";
import { usePermissions } from "@/hooks/usePermissions";
import { ROUTE_PERMISSIONS } from "@/lib/permissions";
import {
  Home,
  LayoutDashboard,
  Building2,
  Receipt,
  FileText,
  BarChart3,
  FileSignature,
  Users,
  LogOut,
  MessageSquare,
  CalendarCheck,
  Rocket,
  Webhook,
  ClipboardList,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navigation = [
  { name: "Início", href: "/home", icon: Home, roles: ["admin", "operador", "leitura", "ceo", "administrativo", "financeiro", "comercial"] },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "operador", "leitura", "ceo", "administrativo", "financeiro", "comercial"] },
  { name: "Accord Sales", href: "/atendimento", icon: MessageSquare, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { name: "Formulários", href: "/formularios", icon: ClipboardList, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { name: "Atividades", href: "/atividades", icon: CalendarCheck, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { name: "Financeiro", href: "/financeiro", icon: Receipt, roles: ["admin", "ceo", "financeiro"] },
  { name: "Documentos", href: "/documentos", icon: FileText, roles: ["admin", "ceo", "administrativo", "financeiro"] },
  { name: "Relatórios", href: "/relatorios", icon: BarChart3, roles: ["admin", "leitura", "ceo", "administrativo", "financeiro"] },
  { name: "Contratos", href: "/contratos", icon: FileSignature, roles: ["admin", "ceo", "financeiro"] },
  { name: "Vendas", href: "/gestao-vendas", icon: Webhook, roles: ["admin", "ceo"] },
  { name: "Base de Clientes", href: "/cadastrados", icon: Users, roles: ["admin", "ceo", "administrativo"] },
  { name: "Descarte", href: "/descarte", icon: Trash2, roles: ["admin", "ceo"] },
];

const configNavigation = [
  { name: "Usuários", href: "/configuracoes/usuarios", icon: Users, roles: ["admin", "ceo", "administrativo"] },
  { name: "Assinaturas", href: "/configuracoes/assinaturas", icon: FileSignature, roles: ["admin", "ceo"] },
];

export function Sidebar() {
  const location = useLocation();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(() => localStorage.getItem("sidebar-pinned") === "true");
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sidebar is expanded when pinned OR hovered
  const collapsed = !pinned && !hovered;

  // Persist pin state
  useEffect(() => {
    localStorage.setItem("sidebar-pinned", String(pinned));
  }, [pinned]);

  // Notify AppLayout about the sidebar width
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: collapsed }));
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHovered(false), 200);
  };

  const [overdueCount, setOverdueCount] = useState(0);
  const { role, signOut, profile } = useAuth();

  const fetchOverdueActivities = useCallback(async () => {
    if (!profile?.user_id) return;
    const { data, error } = await supabase
      .from("crm_lead_activities")
      .select("id, metadata")
      .eq("created_by_user_id", profile.user_id)
      .in("type", ["activity", "meeting", "call", "email", "internal", "whatsapp"]);
    if (error || !data) return;
    const now = new Date();
    const overdue = data.filter((a: any) => {
      const meta = a.metadata || {};
      const status = meta.status || meta.activity_status || "planejada";
      if (status === "concluida" || status === "no_show") return false;
      const scheduled = meta.scheduled_at || meta.scheduled_date;
      if (!scheduled) return false;
      return new Date(scheduled) < now;
    });
    setOverdueCount(overdue.length);
  }, [profile?.user_id]);

  useEffect(() => {
    fetchOverdueActivities();
    const interval = setInterval(fetchOverdueActivities, 60000);
    return () => clearInterval(interval);
  }, [fetchOverdueActivities]);

  const { hasPermission } = usePermissions();

  const filteredNavigation = navigation.filter((item) => {
    if (role && !item.roles.includes(role)) return false;
    const perm = ROUTE_PERMISSIONS[item.href];
    if (perm && !hasPermission(perm)) return false;
    return true;
  });

  const filteredConfigNavigation = configNavigation.filter((item) => {
    if (role && !item.roles.includes(role)) return false;
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
          {item.name}
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
            {item.name}
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
        collapsed ? "w-[52px]" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-16 items-center border-b border-sidebar-border/30 shrink-0 select-none overflow-hidden",
        collapsed ? "justify-center px-2" : "justify-start px-5"
      )}>
        <div className="flex items-center gap-2.5 cursor-default shrink-0" onClick={(e) => e.preventDefault()}>
          <img src={accordLogo} alt="ACCORD" className={cn("transition-all duration-300", collapsed ? "h-7" : "h-8")} />
          <span className={cn(
            "text-[15px] font-bold tracking-tight text-sidebar-foreground/90 whitespace-nowrap transition-all duration-300",
            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
          )}>
            ACCORD
          </span>
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
              {pinned ? "Desafixar sidebar" : "Fixar sidebar"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* ACCORD Stack Button */}
      <div className={cn("shrink-0 overflow-hidden", collapsed ? "px-2 py-3" : "px-3 py-3")}>
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
      <nav className={cn("flex-1 space-y-0.5 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {!collapsed && (
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/20 transition-opacity duration-300">
            Menu
          </p>
        )}
        {filteredNavigation.map((item) => (
          <NavItem key={item.name} item={item} isActive={location.pathname === item.href} />
        ))}
      </nav>

      {/* Config & User */}
      <div className={cn("shrink-0 border-t border-sidebar-border/40", collapsed ? "px-2 py-3" : "px-3 py-3")}>
        {filteredConfigNavigation.length > 0 && (
          <div className="space-y-0.5 mb-4">
            {!collapsed && (
              <p className="px-3 pb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/15 transition-opacity duration-300">
                Config
              </p>
            )}
            {filteredConfigNavigation.map((item) => (
              <NavItem key={item.name} item={item} isActive={location.pathname === item.href} />
            ))}
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
