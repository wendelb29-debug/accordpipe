import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ROUTE_PERMISSIONS } from "@/lib/permissions";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
  requiredPermission?: string;
}

export function ProtectedRoute({ children, allowedRoles, requiredPermission }: ProtectedRouteProps) {
  const { user, role, loading, profile } = useAuth();
  const { hasPermission, loading: permLoading } = usePermissions();
  const location = useLocation();

  // Wait until auth AND permissions are fully resolved before any access check
  const isFullyLoaded = !loading && !permLoading && (user ? !!profile && role !== undefined : true);

  if (!isFullyLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="animate-spin rounded-full h-14 w-14 border-[3px] border-muted border-t-primary"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 rounded-full bg-primary/10"></div>
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">Carregando seu ambiente...</p>
            <p className="text-xs text-muted-foreground">Verificando permissões</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user is active or pending
  if (profile && (!profile.is_active || (profile as any).status === "pendente" || (profile as any).status === "bloqueado")) {
    const status = (profile as any).status;
    let title = "Acesso Bloqueado";
    let message = "Sua conta foi desativada. Entre em contato com o administrador.";
    
    if (status === "pendente") {
      title = "Aguardando aprovação";
      message = "Sua conta está pendente de aprovação pelo administrador. Você receberá uma notificação quando for aprovado.";
    } else if (status === "bloqueado") {
      message = "Seu período de teste expirou. Entre em contato com nosso comercial para ativar sua conta.";
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    );
  }


  // Permission-based access check (takes priority if specified)
  const permToCheck = requiredPermission || ROUTE_PERMISSIONS[location.pathname];
  if (permToCheck && !hasPermission(permToCheck)) {
    // Still allow legacy role check as fallback for CEO/admin/master
    const isCeoOrMaster = role === "ceo" || profile?.is_master === true;
    if (!isCeoOrMaster) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h1>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta área.
            </p>
          </div>
        </div>
      );
    }
  }

  // Legacy role check (backward compat)
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const isCeoOrMaster = role === "ceo" || profile?.is_master === true;
    if (!isCeoOrMaster) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h1>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
