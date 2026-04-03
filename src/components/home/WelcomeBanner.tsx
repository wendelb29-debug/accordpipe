import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sparkles } from "lucide-react";

export function WelcomeBanner() {
  const { profile } = useAuth();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const dateStr = format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const firstName = profile?.name?.split(" ")[0] || "Usuário";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--primary-glow))] to-[hsl(263,87%,50%)] p-6 md:p-8 text-primary-foreground shadow-lg">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 opacity-80" />
          <span className="text-sm font-medium opacity-80 capitalize">{dateStr}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {greeting}, {firstName}! 👋
        </h1>
        <p className="text-sm md:text-base opacity-80 mt-1 max-w-lg">
          Bem-vindo ao Accord. Confira as novidades e gerencie suas atividades.
        </p>
      </div>
    </div>
  );
}
