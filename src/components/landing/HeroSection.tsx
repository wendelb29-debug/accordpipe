import { useState, useEffect, useRef } from "react";
import { Rocket, Play, CheckCircle2, BarChart3, FileSignature, MessageSquare, Bot, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialSignupDialog } from "./TrialSignupDialog";

/* ── Animated network background (canvas) ── */
function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };

    const init = () => {
      resize();
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const count = Math.floor((w * h) / 18000);
      particles = Array.from({ length: Math.min(count, 80) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
      }));
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(37,99,235,0.04)";
      ctx.lineWidth = 0.5;
      const gs = 60;
      for (let x = 0; x < w; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gs) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99,130,255,0.35)";
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(99,130,255,${0.08 * (1 - dist / 140)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener("resize", init);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", init); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

/* ── Product mockup panel ── */
function ProductMockup() {
  return (
    <div className="relative w-full max-w-[540px] mx-auto lg:mx-0">
      <div className="absolute -inset-8 bg-[radial-gradient(ellipse,rgba(37,99,235,0.12),transparent_70%)] blur-2xl pointer-events-none" />

      <div className="relative rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,24,39,0.8)] backdrop-blur-xl p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#EF4444]" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#F59E0B]" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#22C55E]" />
          <span className="ml-2 sm:ml-3 text-[10px] sm:text-[11px] text-[#6B7280] font-medium tracking-wide">accord.app — Dashboard</span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
          {[
            { label: "Leads ativos", value: "1.284", color: "#3B82F6" },
            { label: "Contratos", value: "347", color: "#8B5CF6" },
            { label: "MRR", value: "R$ 89k", color: "#22C55E" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-2 sm:p-3">
              <p className="text-[9px] sm:text-[10px] text-[#6B7280] uppercase tracking-wider">{s.label}</p>
              <p className="text-base sm:text-lg font-bold mt-0.5 sm:mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-semibold text-[#D1D5DB]">Pipeline de Vendas</span>
            <span className="text-[9px] sm:text-[10px] text-[#6B7280]">Atualizado agora</span>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            {[
              { stage: "Qualificação", count: 24, bg: "bg-[#3B82F6]" },
              { stage: "Proposta", count: 18, bg: "bg-[#8B5CF6]" },
              { stage: "Negociação", count: 12, bg: "bg-[#A855F7]" },
              { stage: "Fechamento", count: 8, bg: "bg-[#22C55E]" },
            ].map((s) => (
              <div key={s.stage} className="flex-1 min-w-0">
                <div className={`h-12 sm:h-16 rounded-lg ${s.bg} opacity-20 relative overflow-hidden`}>
                  <div className={`absolute bottom-0 left-0 right-0 ${s.bg} opacity-60 rounded-lg`} style={{ height: `${(s.count / 24) * 100}%` }} />
                </div>
                <p className="text-[8px] sm:text-[9px] text-[#6B7280] mt-1 sm:mt-1.5 text-center truncate">{s.stage}</p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-[#D1D5DB] text-center">{s.count}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
          {[
            { text: "Contrato assinado — Empresa ABC", time: "2 min", dot: "#22C55E" },
            { text: "Novo lead — João Silva", time: "8 min", dot: "#3B82F6" },
            { text: "Proposta enviada — Tech Corp", time: "15 min", dot: "#8B5CF6" },
          ].map((a) => (
            <div key={a.text} className="flex items-center gap-2 sm:gap-3 rounded-lg bg-[rgba(255,255,255,0.02)] px-2.5 sm:px-3 py-1.5 sm:py-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style={{ background: a.dot }} />
              <span className="text-[10px] sm:text-[11px] text-[#9CA3AF] flex-1 truncate">{a.text}</span>
              <span className="text-[9px] sm:text-[10px] text-[#4B5563] shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Hero ── */
export function HeroSection() {
  const [trialOpen, setTrialOpen] = useState(false);

  const benefits = [
    { icon: BarChart3, text: "Controle total do funil de vendas" },
    { icon: FileSignature, text: "Propostas e contratos em segundos" },
    { icon: MessageSquare, text: "Atendimento integrado via WhatsApp" },
    { icon: Bot, text: "Automação com inteligência artificial" },
    { icon: Users, text: "Gestão completa de clientes e recorrência" },
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#070B14] via-[#0B1120] to-[#0F172A]" />
      <NetworkBackground />

      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#070B14] to-transparent pointer-events-none z-10" />

      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-4 sm:pt-8 sm:pb-6 lg:pt-10 lg:pb-8 w-full">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
          {/* Left — Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.06)] px-3 py-1 text-[11px] sm:text-xs font-medium text-[#60A5FA] mb-3 sm:mb-4 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
              Plataforma SaaS Enterprise
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3rem] xl:text-[3.5rem] font-black tracking-[-0.03em] leading-[1.05] text-white animate-slide-up">
              Sua empresa perde vendas{" "}
              <br className="hidden sm:block" />
              por falta de{" "}
              <span className="bg-gradient-to-r from-[#3B82F6] via-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent">
                processo e controle?
              </span>
            </h1>

            <p className="mt-3 text-sm sm:text-base text-[#94A3B8] max-w-xl mx-auto lg:mx-0 leading-relaxed animate-slide-up" style={{ animationDelay: "0.1s" }}>
              Centralize CRM, propostas, contratos, atendimento e automação com IA em um único sistema — e transforme sua operação em uma máquina previsível de crescimento.
            </p>

            {/* Benefits */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto lg:mx-0 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              {benefits.map((b) => (
                <div key={b.text} className="flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 transition-all duration-200 hover:border-[rgba(59,130,246,0.15)] hover:bg-[rgba(59,130,246,0.04)]">
                  <b.icon className="h-3.5 w-3.5 text-[#3B82F6] shrink-0" />
                  <span className="text-[12px] sm:text-[13px] text-[#CBD5E1] font-medium">{b.text}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:justify-center lg:justify-start animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <Button
                size="lg"
                className="gap-2 px-6 text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xl shadow-[rgba(37,99,235,0.25)] h-11 rounded-xl transition-all duration-200 hover:shadow-2xl hover:shadow-[rgba(37,99,235,0.35)] hover:scale-[1.02] w-full sm:w-auto border-0"
                onClick={() => setTrialOpen(true)}
              >
                <Rocket className="h-4 w-4" />
                Teste 7 dias grátis
              </Button>
              <a href="mailto:contato@accordhub.com.br?subject=Solicitar demonstração" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="gap-2 px-6 text-sm font-medium h-11 rounded-xl border-[rgba(255,255,255,0.1)] text-[#E2E8F0] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.2)] transition-all duration-200 w-full bg-transparent">
                  <Play className="h-4 w-4" />
                  Ver demonstração
                </Button>
              </a>
            </div>

            {/* Trust */}
            <div className="mt-3 flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-5 text-[11px] sm:text-xs text-[#64748B] animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" /> Sem cartão de crédito</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" /> 7 dias grátis</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" /> Suporte incluso</span>
            </div>
          </div>

          {/* Right — Product mockup (visible on md+ now) */}
          <div className="hidden md:block animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <ProductMockup />
          </div>
        </div>
      </div>

      {/* Social proof bar — relative now, not absolute */}
      <div className="relative z-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-3 sm:pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(17,24,39,0.6)] backdrop-blur-xl px-4 sm:px-6 py-4 sm:py-5">
            {[
              { value: "12k+", label: "Propostas geradas" },
              { value: "8k+", label: "Contratos assinados" },
              { value: "50k+", label: "Leads gerenciados" },
              { value: "99.9%", label: "Uptime garantido" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-lg sm:text-xl md:text-2xl font-black text-white">{s.value}</p>
                <p className="text-[10px] sm:text-[11px] text-[#64748B] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#0B1120] to-transparent pointer-events-none z-10" />

      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}
