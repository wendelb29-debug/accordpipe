import { useState, useMemo } from "react";
import { Rocket, Play, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialSignupDialog } from "./TrialSignupDialog";

function ParticleField() {
  const particles = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.4 + 0.1,
      duration: Math.random() * 40 + 30,
      delay: Math.random() * -40,
      driftX: (Math.random() - 0.5) * 60,
      driftY: (Math.random() - 0.5) * 60,
    }));
  }, []);

  const lines = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x1: Math.random() * 100,
      y1: Math.random() * 100,
      x2: Math.random() * 100,
      y2: Math.random() * 100,
      opacity: Math.random() * 0.08 + 0.02,
      duration: Math.random() * 50 + 40,
      delay: Math.random() * -30,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {lines.map((l) => (
          <line
            key={`line-${l.id}`}
            x1={`${l.x1}%`}
            y1={`${l.y1}%`}
            x2={`${l.x2}%`}
            y2={`${l.y2}%`}
            stroke="rgba(124,58,237,0.12)"
            strokeWidth="0.5"
            style={{
              opacity: l.opacity,
              animation: `hero-line-drift ${l.duration}s linear ${l.delay}s infinite alternate`,
            }}
          />
        ))}
      </svg>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animation: `hero-particle-float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
            ["--drift-x" as string]: `${p.driftX}px`,
            ["--drift-y" as string]: `${p.driftY}px`,
          }}
        />
      ))}
    </div>
  );
}

export function HeroSection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center" style={{ background: '#050505' }}>
      {/* Particle field */}
      <ParticleField />

      {/* Subtle ambient glow */}
      <div className="absolute top-[10%] left-[30%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.08),transparent_60%)] blur-3xl pointer-events-none" />
      <div className="absolute bottom-[5%] right-[20%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.06),transparent_60%)] blur-3xl pointer-events-none" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 md:py-36 w-full">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.06)] px-5 py-2.5 text-xs sm:text-sm font-medium text-[#A78BFA]">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span>CRM + Contratos + IA em uma só plataforma</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
            Controle seu comercial{" "}
            <br className="hidden sm:block" />
            do lead ao contrato em{" "}
            <span className="bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#C084FC] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]">
              um só lugar
            </span>
          </h1>

          <p className="mx-auto mt-5 sm:mt-6 max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed text-[#D1D5DB]">
            CRM, contratos, clientes e automações integrados em uma única plataforma.
            Simplifique sua operação e venda mais.
          </p>

          {/* CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-col items-center gap-3 sm:gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="gap-2 px-8 text-sm sm:text-base font-semibold bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-lg shadow-[rgba(124,58,237,0.3)] h-12 sm:h-14 rounded-xl hover:shadow-xl hover:shadow-[rgba(124,58,237,0.4)] hover:scale-[1.02] transition-all duration-150 w-full sm:w-auto border-0"
              onClick={() => setTrialOpen(true)}
            >
              <Rocket className="h-5 w-5" />
              Começar agora
            </Button>
            <a href="mailto:contato@accordhub.com.br?subject=Solicitar demonstração" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="gap-2 px-8 text-sm sm:text-base font-medium h-12 sm:h-14 rounded-xl border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.15)] transition-all duration-150 w-full bg-transparent">
                <Play className="h-4 w-4" />
                Ver demonstração
              </Button>
            </a>
          </div>

          {/* Trust */}
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-[#9CA3AF]">
            <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Sem cartão de crédito</span>
            <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> 7 dias grátis</span>
            <span className="hidden sm:flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Suporte incluso</span>
          </div>
        </div>
      </div>
      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />

      {/* Keyframe styles for particles */}
      <style>{`
        @keyframes hero-particle-float {
          0% { transform: translate(0, 0); }
          100% { transform: translate(var(--drift-x), var(--drift-y)); }
        }
        @keyframes hero-line-drift {
          0% { opacity: 0.02; }
          50% { opacity: 0.1; }
          100% { opacity: 0.02; }
        }
      `}</style>
    </section>
  );
}
