import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityReminders } from "@/hooks/useActivityReminders";
import { OrbitAIChat } from "@/components/orbit-ai/OrbitAIChat";


interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile } = useAuth();
  const hasAvatar = !!(profile as any)?.avatar_url;
  useActivityReminders();
  const location = useLocation();
  const hideHeader = location.pathname === "/atendimento";

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");

  useEffect(() => {
    const handler = (e: Event) => setSidebarCollapsed((e as CustomEvent).detail);
    window.addEventListener("sidebar-toggle", handler);
    return () => window.removeEventListener("sidebar-toggle", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "pl-[68px]" : "pl-60")}>
        {!hasAvatar && profile && (
          <Link
            to="/perfil"
            className="flex items-center justify-center gap-2 bg-destructive text-destructive-foreground text-sm font-medium py-2 px-4 hover:bg-destructive/90 transition-colors"
          >
            <AlertTriangle className="h-4 w-4" />
            Complete seu cadastro — Foto de perfil obrigatória *
          </Link>
        )}
        {!hideHeader && <Header />}
        <main className={cn("max-w-[1600px] mx-auto", hideHeader ? "p-0" : "p-6 lg:p-8")}>{children}</main>
      </div>
      <ResolverComIA />
      <OrbitAIChat />
    </div>
  );
}
