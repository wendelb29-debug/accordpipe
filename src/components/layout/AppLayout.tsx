import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { MobileSidebar } from "./MobileSidebar";
import { Header } from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityReminders } from "@/hooks/useActivityReminders";
import { useNotificationManager } from "@/hooks/useNotificationManager";
import { AccordAIChat } from "@/components/accord-ai/AccordAIChat";
import { TenantBillingBanner } from "./TenantBillingBanner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { BackNavigationProvider } from "@/contexts/BackNavigationContext";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile } = useAuth();
  const hasAvatar = !!(profile as any)?.avatar_url;
  useActivityReminders();
  const { bannerVisible, dismissBanner } = useNotificationManager();
  const navigate = useNavigate();
  const location = useLocation();
  const hideHeader = false;
  const isMobile = useIsMobile();
  const isAccordStack = false;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");

  useEffect(() => {
    const handler = (e: Event) => setSidebarCollapsed((e as CustomEvent).detail);
    window.addEventListener("sidebar-toggle", handler);
    return () => window.removeEventListener("sidebar-toggle", handler);
  }, []);

  return (
    <BackNavigationProvider>
      <div className="min-h-screen bg-background safe-area-top overflow-x-hidden">
        {/* Desktop sidebar (hidden on Accord Stack for full-width chat) */}
        {!isMobile && !isAccordStack && <Sidebar />}

        <div className={cn(
          "transition-all duration-300 min-w-0 flex flex-col min-h-screen",
          isMobile || isAccordStack ? "pl-0" : (sidebarCollapsed ? "pl-[60px]" : "pl-[232px]")
        )}>
          {/* Tenant billing alert banner */}
          <TenantBillingBanner />

          {/* Notification activation banner */}
          {bannerVisible && (
            <div className="flex items-center justify-center gap-3 bg-red-500/80 text-white text-sm font-medium py-2 px-4">
              <Bell className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm">Ative as notificações para não perder mensagens e lembretes!</span>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-xs px-3 shrink-0"
                onClick={() => navigate("/perfil")}
              >
                Ativar agora
              </Button>
            </div>
          )}

          {!hasAvatar && profile && (
            <Link
              to="/perfil"
              className="flex items-center justify-center gap-2 bg-destructive text-destructive-foreground text-xs sm:text-sm font-medium py-1.5 px-4 hover:bg-destructive/90 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              Complete seu cadastro — Foto de perfil obrigatória *
            </Link>
          )}
          {!hideHeader && <Header />}
          <main className={cn(
            "w-full max-w-none flex-1 min-w-0 min-h-0",
            isAccordStack ? "p-0 overflow-hidden" : (hideHeader ? "p-0" : "p-2 sm:p-3 lg:p-4 2xl:p-5")
          )}>
            {children}
          </main>
        </div>

        <AccordAIChat />
      </div>
    </BackNavigationProvider>
  );
}
