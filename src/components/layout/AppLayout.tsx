import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 transition-all duration-300">
        {!hasAvatar && profile && (
          <Link
            to="/perfil"
            className="flex items-center justify-center gap-2 bg-destructive text-destructive-foreground text-sm font-medium py-2 px-4 hover:bg-destructive/90 transition-colors"
          >
            <AlertTriangle className="h-4 w-4" />
            Complete seu cadastro — Foto de perfil obrigatória *
          </Link>
        )}
        <Header />
        <main className="p-6 max-w-[1600px]">{children}</main>
      </div>
      <OrbitAIChat />
    </div>
  );
}
