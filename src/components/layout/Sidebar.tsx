import { Link, useLocation } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  Building2,
  Receipt,
  FileText,
  BarChart3,
  FileSignature,
  XCircle,
  Users,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  CalendarCheck,
  Rocket,
  Webhook,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import orbitLogo from "@/assets/orbit-logo.png";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OrbitStackDialog } from "./OrbitStackDialog";

const navigation = [
  { name: "Início", href: "/home", icon: Home, roles: ["admin", "operador", "leitura", "ceo", "administrativo", "financeiro", "comercial"] },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "operador", "leitura", "ceo", "administrativo", "financeiro", "comercial"] },
  { name: "Orbit Sales", href: "/atendimento", icon: MessageSquare, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { name: "Formulários", href: "/formularios", icon: ClipboardList, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { name: "Atividades", href: "/atividades", icon: CalendarCheck, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { name: "Pagamentos", href: "/boletos", icon: Receipt, roles: ["admin", "ceo", "financeiro"] },
  { name: "Documentos", href: "/documentos", icon: FileText, roles: ["admin", "ceo", "administrativo", "financeiro"] },
  { name: "Relatórios", href: "/relatorios", icon: BarChart3, roles: ["admin", "leitura", "ceo", "administrativo", "financeiro"] },
  { name: "Contratos", href: "/contratos", icon: FileSignature, roles: ["admin", "ceo", "financeiro"] },
  { name: "Cancelamentos", href: "/cancelamentos", icon: XCircle, roles: ["admin", "ceo", "financeiro"] },
  { name: "Gestão de Vendas", href: "/gestao-vendas", icon: Webhook, roles: ["admin", "ceo"] },
  { name: "Cadastrados", href: "/cadastrados", icon: Users, roles: ["admin", "administrativo"] },
];

const configNavigation = [
  { name: "Usuários", href: "/configuracoes/usuarios", icon: Users, roles: ["admin", "ceo", "administrativo"] },
];

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const { role, signOut, profile } = useAuth();

  const fetchOverdueActivities = useCallback(async () => {
    const { data, error } = await supabase
      .from("crm_lead_activities")
      .select("id, metadata")
      .in("type", ["activity", "meeting", "call", "email", "internal", "whatsapp"]);
    if (error || !data) return;
    const now = new Date();
    const overdue = data.filter((a: any) => {
      const meta = a.metadata || {};
      if (meta.activity_status !== "planejada" && meta.activity_status !== undefined) return false;
      if (!meta.scheduled_at) return false;
      return new Date(meta.scheduled_at) < now;
    });
    setOverdueCount(overdue.length);
  }, []);

  useEffect(() => {
    fetchOverdueActivities();
    const interval = setInterval(fetchOverdueActivities, 60000);
    return () => clearInterval(interval);
  }, [fetchOverdueActivities]);

  const filteredNavigation = navigation.filter(
    (item) => !role || item.roles.includes(role)
  );

  const filteredConfigNavigation = configNavigation.filter(
    (item) => !role || item.roles.includes(role)
  );

  const NavItem = ({ item, isActive }: { item: typeof navigation[0]; isActive: boolean }) => {
    const badge = item.href === "/atividades" && overdueCount > 0 ? overdueCount : 0;
    const content = (
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <div className="relative shrink-0">
          <item.icon className={cn("h-[18px] w-[18px]", isActive && "drop-shadow-sm")} />
          {badge > 0 && (
            <span className="absolute -top-2 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-0.5">
              {badge}
            </span>
          )}
        </div>
        {!collapsed && (
          <span className="truncate flex-1">{item.name}</span>
        )}
        {!collapsed && badge > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
            {badge}
          </span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300 flex flex-col",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-16 items-center border-b border-sidebar-border shrink-0 select-none", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        {!collapsed && (
          <div className="flex items-center gap-1 cursor-default" onClick={(e) => e.preventDefault()}>
            <span className="text-lg font-extrabold tracking-tight text-primary" style={{ fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "-0.03em" }}>ORBIT</span>
            <span className="text-lg font-light tracking-tight text-sidebar-foreground/70" style={{ fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "-0.03em" }}>HUB</span>
          </div>
        )}
        {collapsed && (
          <span className="text-sm font-extrabold text-primary cursor-default" style={{ fontFamily: "'Inter', system-ui, sans-serif" }} onClick={(e) => e.preventDefault()}>OH</span>
        )}
      </div>

      {/* Orbit Stack Button */}
      <div className={cn("shrink-0", collapsed ? "px-2 py-1" : "px-3 py-1")}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link to="/orbit-stack" className="flex w-full h-9 items-center justify-center rounded-xl text-primary hover:bg-sidebar-accent transition-colors">
                <Rocket className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">Orbit Stack</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            to="/orbit-stack"
            className={cn(
              "flex items-center gap-2 w-full h-9 rounded-xl border border-primary/20 text-primary hover:bg-primary/5 text-xs font-semibold justify-center transition-colors",
              location.pathname === "/orbit-stack" && "bg-primary text-primary-foreground border-primary shadow-sm"
            )}
          >
            <Rocket className="h-3.5 w-3.5" />
            Orbit Stack
          </Link>
        )}
      </div>

      {/* Toggle */}
      <div className={cn("flex shrink-0 py-2", collapsed ? "justify-center px-2" : "px-3")}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-1 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
        {!collapsed && (
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
            Menu
          </p>
        )}
        {filteredNavigation.map((item) => (
          <NavItem key={item.name} item={item} isActive={location.pathname === item.href} />
        ))}
      </nav>

      {/* Config & User */}
      <div className={cn("shrink-0 border-t border-sidebar-border", collapsed ? "px-2 py-2" : "px-3 py-3")}>
        {filteredConfigNavigation.length > 0 && (
          <div className="space-y-1 mb-3">
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
                Config
              </p>
            )}
            {filteredConfigNavigation.map((item) => (
              <NavItem key={item.name} item={item} isActive={location.pathname === item.href} />
            ))}
          </div>
        )}

        {/* User */}
        {!collapsed && profile && (
          <div className="rounded-xl bg-sidebar-accent/50 p-3 mb-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.name}</p>
            <p className="text-[11px] text-sidebar-foreground/40 truncate">{profile.email}</p>
          </div>
        )}

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>Sair</span>}
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="font-medium">Sair</TooltipContent>
          )}
        </Tooltip>
      </div>
    </aside>
  );
}
