import { useNavigate } from "react-router-dom";
import { Search, User, Moon, Sun, Building2, ChevronDown } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
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
import { useTheme } from "next-themes";

const roleLabels = {
  admin: "Administrador",
  operador: "Operador",
  leitura: "Leitura",
  ceo: "CEO",
};

export function Header() {
  const { profile, role, signOut, isMaster, isCeo, isAdmin, companies, activeCompany, activeCompanyId, setActiveCompanyId } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const showSwitcher = (isMaster || isCeo) && companies.length > 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-6">
      {/* Company Switcher + Search */}
      <div className="flex items-center gap-4 flex-1">
        {showSwitcher && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 max-w-[280px] h-10 rounded-xl">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate text-sm">
                  {activeCompany
                    ? (activeCompany.nome_fantasia || activeCompany.razao_social)
                    : "Todas as empresas"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px] rounded-xl max-h-[400px] overflow-y-auto">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Selecionar empresa</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(isMaster || isCeo) && (
                <DropdownMenuItem
                  className="rounded-lg gap-2"
                  onClick={() => setActiveCompanyId(null)}
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Todas as empresas</p>
                    <p className="text-xs text-muted-foreground">Visão Master</p>
                  </div>
                  {!activeCompanyId && <Badge variant="secondary" className="ml-auto text-[10px]">Ativo</Badge>}
                </DropdownMenuItem>
              )}
              {(isMaster || isCeo) && <DropdownMenuSeparator />}
              {companies.map((company) => (
                <DropdownMenuItem
                  key={company.id}
                  className="rounded-lg gap-2"
                  onClick={() => setActiveCompanyId(company.id)}
                >
                  <Building2 className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{company.nome_fantasia || company.razao_social}</p>
                    <p className="text-xs text-muted-foreground font-mono">{company.cnpj}</p>
                  </div>
                  {activeCompanyId === company.id && <Badge variant="secondary" className="ml-auto text-[10px]">Ativo</Badge>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            type="search"
            placeholder="Buscar empresas, boletos, documentos..."
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 rounded-xl h-10"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl h-10 w-10"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-xl h-10 gap-2 px-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              {profile && (
                <span className="hidden text-sm font-medium text-foreground md:block max-w-[120px] truncate">
                  {profile.name}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{profile?.name || "Usuário"}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {profile?.email}
                </span>
                {role && (
                  <Badge variant="outline" className="mt-1.5 w-fit text-[10px] rounded-md">
                    {roleLabels[role]}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-lg" onClick={() => navigate("/perfil")}>Perfil</DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg">Configurações</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive rounded-lg"
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
