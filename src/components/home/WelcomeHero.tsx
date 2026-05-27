import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

const INSPIRATIONS = [
  { quote: "Foque no progresso, não na perfeição.", sub: "Pequenas ações hoje, grandes resultados amanhã." },
  { quote: "A disciplina vence o talento quando o talento não tem disciplina.", sub: "Constância constrói legado." },
  { quote: "Faça hoje o que os outros não querem, viva amanhã como os outros não podem.", sub: "Compromisso é o atalho mais longo e mais seguro." },
  { quote: "Cada cliente é uma história. Cada venda, uma conexão.", sub: "Construa relacionamentos, não apenas negócios." },
  { quote: "Clareza gera execução. Execução gera resultado.", sub: "Defina o próximo passo e mova-se." },
];

export function WelcomeHero() {
  const { profile } = useAuth();
  const [idx, setIdx] = useState(0);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const dateStr = format(now, "EEEE, dd 'de' MMMM", { locale: ptBR });
  const firstName = profile?.name?.split(" ")[0] || "Usuário";

  const current = useMemo(() => INSPIRATIONS[idx % INSPIRATIONS.length], [idx]);

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-white/40 dark:border-white/5
                 bg-gradient-to-br from-[#f5f1ff] via-[#ece4ff] to-[#e3d8ff]
                 dark:from-[#1b1530] dark:via-[#241a3d] dark:to-[#15102a]
                 shadow-[0_20px_60px_-20px_rgba(124,58,237,0.35)]
                 px-6 md:px-10 py-8 md:py-10"
    >
      {/* Geometric subtle pattern */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07] dark:opacity-[0.12]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <pattern id="grid-hero" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-hero)" />
      </svg>

      {/* Floating gradient orbs */}
      <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-gradient-to-br from-violet-400/40 to-fuchsia-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-gradient-to-tr from-indigo-400/30 to-purple-300/20 blur-3xl" />


      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/60 dark:bg-white/5 backdrop-blur px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-violet-700 dark:text-violet-300 border border-white/60 dark:border-white/10">
          <span>{dateStr}</span>
          <span aria-hidden>☀️</span>
        </div>

        <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
          {greeting},{" "}
          <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-300 dark:via-purple-300 dark:to-fuchsia-300 bg-clip-text text-transparent">
            {firstName}!
          </span>{" "}
          <span className="inline-block animate-[wave_2s_ease-in-out_infinite] origin-[70%_70%]">👋</span>
        </h1>

        <p className="mt-4 text-[15px] md:text-base text-slate-700/90 dark:text-slate-200/90 italic">
          "{current.quote}"
        </p>
        <p className="mt-1 text-sm text-slate-600/80 dark:text-slate-300/70">
          {current.sub}
        </p>

        <Button
          onClick={() => setIdx((i) => i + 1)}
          className="mt-6 h-10 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-[0_8px_24px_-6px_rgba(124,58,237,0.6)] border-0 gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Inspiração do dia
        </Button>
      </div>

      <style>{`
        @keyframes wave {
          0%, 60%, 100% { transform: rotate(0deg); }
          10%, 30% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
        }
      `}</style>
    </section>
  );
}
