import { Link, useLocation } from "react-router-dom";
import accordLogo from "@/assets/accord-logo.png";
import {
  Home, LayoutDashboard, Building2, Receipt, FileText, BarChart3,
  FileSignature, Users, LogOut, MessageSquare, CalendarCheck, Rocket,
  Webhook, ClipboardList, Trash2, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Início", href: "/home", icon: Home, roles: ["admin", "operador", "leitura", "ceo", "administrativo", "financeiro", "comercial"] },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "operador", "leitura", "ceo", "administrativo", "financeiro", "comercial"] },
  { name: "Vendas", href: "/atendimento", icon: MessageSquare, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { name: "Formulários", href: "/formularios", icon: ClipboardList, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  { name: "Atividades", href: "/atividades", icon: CalendarCheck, roles: ["admin", "operador", "ceo", "administrativo", "comercial"] },
  
  { name: "Fintech", href: "/financeiro", icon: Receipt, roles: ["admin", "ceo", "financeiro"] },
  { name: "Documentos", href: "/documentos", icon: FileText, roles: ["admin", "ceo", "administrativo", "financeiro"] },
  { name: "Relatórios", href: "/relatorios", icon: BarChart3, roles: ["admin", "leitura", "ceo", "administrativo", "financeiro"] },
  
  { name: "Gestão de Vendas", href: "/gestao-vendas", icon: Webhook, roles: ["admin", "ceo"] },
  { name: "Base de Clientes", href: "/cadastrados", icon: Users, roles: ["admin", "ceo", "administrativo"] },
  { name: "Descarte", href: "/descarte", icon: Trash2, roles: ["admin", "ceo"] },
];

const configNavigation = [
  { name: "Usuários", href: "/configuracoes/usuarios", icon: Users, roles: ["admin", "ceo", "administrativo"] },
];

export function MobileSidebar() {
  const location = useLocation();
  const { role, signOut, profile } = useAuth();
  const [open, setOpen] = useState(false);

  const filteredNavigation = navigation.filter(
    (item) => !role || item.roles.includes(role)
  );
  const filteredConfigNavigation = configNavigation.filter(
    (item) => !role || item.roles.includes(role)
  );

  const userInitials = profile?.name
    ? profile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-9 w-9 rounded-xl">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-sidebar-border/30">
          <div className="flex items-center gap-2.5">
            <img src={accordLogo} alt="ACCORD" className="h-8 w-auto" />
            <span className="text-[15px] font-bold tracking-tight text-sidebar-foreground/90">ACCORD</span>
          </div>
        </div>

        {/* ACCORD Stack */}
        <div className="px-3 py-3">
          <Link
            to="/accord-stack"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2 w-full h-9 rounded-xl border border-sidebar-primary/20 text-sidebar-primary hover:bg-sidebar-primary/10 text-xs font-semibold justify-center transition-all",
              location.pathname === "/accord-stack" && "text-sidebar-primary-foreground border-sidebar-primary shadow-[0_0_12px_rgba(122,63,242,0.3)]"
            )}
            style={location.pathname === "/accord-stack" ? { background: 'linear-gradient(135deg, #7A3FF2, #D94FD5)' } : undefined}
          >
            <Rocket className="h-3.5 w-3.5" />
            ACCORD Stack
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto py-4 px-3">
          <p className="px-3 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.15em] text-sidebar-foreground/20">Menu</p>
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 relative",
                  isActive
                    ? "bg-sidebar-primary/15 text-sidebar-foreground"
                    : "text-sidebar-foreground/45 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/80"
                )}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary shadow-[0_0_8px_rgba(122,63,242,0.5)]" />}
                <item.icon className={cn("h-[17px] w-[17px]", isActive ? "text-sidebar-primary" : "")} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Config & User */}
        <div className="border-t border-sidebar-border/50 px-3 py-3">
          {filteredConfigNavigation.length > 0 && (
            <div className="space-y-0.5 mb-4">
              <p className="px-3 pb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/15">Config</p>
              {filteredConfigNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
                      isActive ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/40"
                    )}
                  >
                    <item.icon className="h-[17px] w-[17px]" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {profile && (
            <Link
              to="/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-3 mb-2 border border-sidebar-border/20"
            >
              <Avatar className="h-8 w-8 shrink-0 ring-2 ring-sidebar-primary/20">
                {(profile as any)?.avatar_url ? (
                  <img src={(profile as any).avatar_url} alt={profile.name} className="h-full w-full object-cover rounded-full" />
                ) : (
                  <AvatarFallback className="text-[10px] font-bold bg-sidebar-primary/20 text-sidebar-primary">{userInitials}</AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">{profile.name}</p>
                <p className="text-[10px] text-sidebar-foreground/30 truncate">{profile.email}</p>
              </div>
            </Link>
          )}

          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-sidebar-foreground/30 hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>Sair</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
