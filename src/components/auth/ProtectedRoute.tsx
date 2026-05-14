import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useTenantAccessGuard } from "@/hooks/useTenantAccessGuard";
import { ROUTE_PERMISSIONS } from "@/lib/permissions";
import { AlertTriangle, CreditCard, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
  requiredPermission?: string;
}

// Routes that suspended tenants can still access
const BILLING_ALLOWED_ROUTES = ["/perfil", "/home"];
const TRIAL_EXPIRED_ALLOWED_ROUTES = ["/trial-expired", "/perfil"];

export function ProtectedRoute({ children, allowedRoles, requiredPermission }: ProtectedRouteProps) {
  const { user, role, loading, profile } = useAuth();
  const { hasPermission, loading: permLoading } = usePermissions();
  const tenantAccess = useTenantAccessGuard();
  const location = useLocation();

  const isFullyLoaded =
    !loading &&
    !permLoading &&
    !tenantAccess.loading &&
    (user ? !!profile && !!role : true);

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

  // Force password change on first access
  if (
    profile &&
    profile.must_change_password === true &&
    location.pathname !== "/primeiro-acesso"
  ) {
    return <Navigate to="/primeiro-acesso" replace />;
  }

  // Block per-user trial that has expired
  if (
    profile &&
    (profile as any).trial_expires_at &&
    new Date((profile as any).trial_expires_at).getTime() <= Date.now() &&
    !TRIAL_EXPIRED_ALLOWED_ROUTES.includes(location.pathname)
  ) {
    return <Navigate to="/trial-expired" replace />;
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

  // Tenant suspended — block operational routes
  if (
    !tenantAccess.loading &&
    tenantAccess.canOnlyAccessBilling &&
    !BILLING_ALLOWED_ROUTES.includes(location.pathname)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-lg px-6 space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Acesso Suspenso</h1>
          <p className="text-muted-foreground">
            O acesso ao sistema está temporariamente suspenso por pendência financeira. Regularize o pagamento para reativar.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {tenantAccess.invoiceUrl && (
              <Button variant="default" className="gap-1.5" onClick={() => window.open(tenantAccess.invoiceUrl!, "_blank")}>
                <CreditCard className="h-4 w-4" /> Ver cobrança
              </Button>
            )}
            <Button variant="outline" className="gap-1.5">
              <MessageCircle className="h-4 w-4" /> Falar com suporte
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Permission-based access check
  const permToCheck = requiredPermission || ROUTE_PERMISSIONS[location.pathname];
  if (permToCheck && !hasPermission(permToCheck)) {
    const isCeoOrMaster = role === "ceo" || profile?.is_master === true;
    if (!isCeoOrMaster) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h1>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
          </div>
        </div>
      );
    }
  }

  // Legacy role check
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const isCeoOrMaster = role === "ceo" || profile?.is_master === true;
    if (!isCeoOrMaster) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h1>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
