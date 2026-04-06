import { useNavigate } from "react-router-dom";
import { Search, User, Moon, Sun } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { MobileSidebar } from "./MobileSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  leitura: "Leitura",
  ceo: "CEO",
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  comercial: "Comercial",
};

export function Header() {
  const { profile, role, signOut, loading } = useAuth();
  const [currentTheme, setCurrentTheme] = useState(() => document.documentElement.classList.contains("dark") ? "dark" : "light");
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleThemeToggle = async () => {
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newTheme);
    localStorage.setItem("theme", newTheme);
    setCurrentTheme(newTheme);
    // Persist to DB (non-blocking)
    if (profile) {
      supabase.from("profiles").update({ theme: newTheme } as any).eq("id", profile.id).then(() => {});
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 bg-card/95 backdrop-blur-xl px-3 sm:px-6 lg:px-8 shadow-sm gap-2" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {isMobile && <MobileSidebar />}
      <div className="flex items-center flex-1 min-w-0 overflow-hidden">
        <div className="relative w-full min-w-0 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            type="search"
            placeholder="Buscar leads, clientes, documentos..."
            className="pl-9 pr-2 bg-muted/40 border-border/40 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-xl h-9 sm:h-10 text-xs sm:text-sm w-full truncate"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={handleThemeToggle}
        >
          {currentTheme === "dark" ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
        </Button>

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-xl h-9 gap-2.5 px-2 hover:bg-muted/60">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #2563EB, #7A3FF2)' }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              {loading ? (
                <Skeleton className="hidden md:block h-4 w-20 rounded" />
              ) : profile ? (
                <span className="hidden text-sm font-medium text-foreground md:block max-w-[120px] truncate">
                  {profile.name}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-semibold">{profile?.name || "Usuário"}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {profile?.email}
                </span>
                {role && (
                  <Badge variant="outline" className="mt-1.5 w-fit text-[10px] rounded-md border-primary/20 text-primary">
                    {roleLabels[role]}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-lg cursor-pointer" onClick={() => navigate("/perfil")}>Perfil</DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg cursor-pointer">Configurações</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive rounded-lg cursor-pointer"
              onClick={signOut}
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
