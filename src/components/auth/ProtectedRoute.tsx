import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Carregando...</p>
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

  // Check if signature is completed (block access if not)
  if (profile && !(profile as any).signature_completed && location.pathname !== "/onboarding/assinatura") {
    return <Navigate to="/onboarding/assinatura" replace />;
  }

  // Check if user has required role
  if (allowedRoles && role && !allowedRoles.includes(role)) {
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

  return <>{children}</>;
}
