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
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { TenantBillingBanner } from "./TenantBillingBanner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { BackNavigationProvider } from "@/contexts/BackNavigationContext";
import { LoginNotifications } from "@/components/notifications/LoginNotifications";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile } = useAuth();
  const hasAvatar = !!(profile as any)?.avatar_url;
  useActivityReminders();
  useEmailNotifications();
  const { bannerVisible, dismissBanner } = useNotificationManager();
  const navigate = useNavigate();
  const location = useLocation();
  const hideHeader = false;
  const isMobile = useIsMobile();
  const isAccordStack = false;
  const isAccordStackRoute = location.pathname.startsWith("/accord-stack");
  const isCollabsRoute = location.pathname.startsWith("/collabs");
  const isFullscreen = isAccordStackRoute || isCollabsRoute;

  const [sidebarExpanded, setSidebarExpanded] = useState(
    () => localStorage.getItem("sidebar-pinned") === "true"
  );

  useEffect(() => {
    const handler = (e: Event) => setSidebarExpanded((e as CustomEvent).detail);
    window.addEventListener("sidebar-hover", handler);
    return () => window.removeEventListener("sidebar-hover", handler);
  }, []);

  useEffect(() => {
    if (isAccordStackRoute) {
      document.documentElement.classList.add("lock-scroll");
    } else {
      document.documentElement.classList.remove("lock-scroll");
    }
    return () => document.documentElement.classList.remove("lock-scroll");
  }, [isAccordStackRoute]);

  return (
    <BackNavigationProvider>
      <LoginNotifications />
      <div className={cn(
        "bg-background flex flex-col",
        isFullscreen ? "h-[100dvh] overflow-hidden" : "min-h-screen"
      )}>
        {/* Desktop sidebar (hidden on Accord Stack for full-width chat) */}
        {!isMobile && !isAccordStack && <Sidebar />}

        <div
          style={{
            marginLeft: isMobile || isAccordStack ? 0 : (sidebarExpanded ? 232 : 60),
            transition: 'margin-left 300ms ease-in-out',
          }}
          className={cn(
            "min-w-0 flex flex-col",
            isFullscreen ? "h-full overflow-hidden" : "min-h-screen",
          )}
        >
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
          {!hideHeader && !isFullscreen && <Header />}
          <main
            className={cn(
              "w-full max-w-none flex-1 min-w-0 min-h-0",
              isFullscreen
                ? "p-0 overflow-hidden flex flex-col flex-1 min-h-0"
                : (hideHeader ? "p-0" : "p-3 sm:p-3 lg:p-4")
            )}
            style={
              isFullscreen
                ? undefined
                : {
                    paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
                    paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
                    paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
                  }
            }
          >
            {children}
          </main>
        </div>

        <AccordAIChat />
      </div>
    </BackNavigationProvider>
  );
}
