import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye, EyeOff, Lock, Mail, AlertCircle, Loader2, CheckCircle2, ArrowRight,
  Home, Phone, FileText, Shield, KanbanSquare, Calendar, MessageCircle,
  Users, Sparkles, Check, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import accordLogo from "@/assets/accord-logo.png";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});

type LoginFormData = z.infer<typeof loginSchema>;

const BLUE: [number, number, number] = [37, 99, 235];
const PURPLE: [number, number, number] = [122, 63, 242];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpColor = (c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] =>
  [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; r: number; col: [number, number, number]; alpha: number }> = [];
    let raf = 0;

    const dpr = window.devicePixelRatio || 1;

    const makeParticle = () => {
      const t = Math.random();
      return {
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 2 + 1,
        col: lerpColor(BLUE, PURPLE, t),
        alpha: Math.random() * 0.5 + 0.15,
      };
    };

    const init = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      const count = Math.min(Math.floor((W * H) / 9000), 90);
      particles = Array.from({ length: count }, makeParticle);
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(122,63,242,0.12)";
      const gs = 34;
      for (let x = gs / 2; x < W; x += gs) {
        for (let y = gs / 2; y < H; y += gs) {
          ctx.beginPath(); ctx.arc(x, y, 0.9, 0, Math.PI * 2); ctx.fill();
        }
      }
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const a = (1 - dist / 130) * 0.18;
            const mid = lerpColor(p.col, q.col, 0.5);
            ctx.strokeStyle = `rgba(${mid[0]},${mid[1]},${mid[2]},${a})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${p.alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    init(); draw();
    const onResize = () => init();
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full z-0" />;
}

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [openSheet, setOpenSheet] = useState<null | "about" | "contact" | "terms" | "privacy">(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!loading && user) navigate("/home");
  }, [user, loading, navigate]);

  const onLogin = async (data: LoginFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("E-mail ou senha incorretos.");
        } else if (error.message.includes("Email not confirmed")) {
          setError("Por favor, confirme seu e-mail antes de fazer login.");
        } else {
          setError("Erro ao fazer login. Tente novamente.");
        }
      }
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = loginForm.getValues("email");
    if (!email) {
      setError("Digite seu e-mail no campo acima para redefinir a senha.");
      return;
    }
    setError(null);
    setResetLoading(true);
    try {
      const { data: profiles } = await supabase
        .from("profiles").select("id").eq("email", email).limit(1);
      if (!profiles || profiles.length === 0) {
        setError("Nenhuma conta encontrada com este e-mail.");
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError("Erro ao enviar e-mail de redefinição.");
      else setSuccess("E-mail de redefinição enviado! Verifique sua caixa de entrada.");
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F2FF]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7A3FF2]" />
      </div>
    );
  }

  const features = [
    { icon: KanbanSquare, title: "Pipeline de Vendas", desc: "Kanban visual com acompanhamento em tempo real" },
    { icon: Calendar, title: "Gestão de Agenda", desc: "Reuniões, follow-ups e lembretes automáticos" },
    { icon: MessageCircle, title: "Atendimento WhatsApp", desc: "Inbox unificado com chatbot e transferências" },
    { icon: FileText, title: "Propostas Comerciais", desc: "Geração automática e assinatura digital" },
    { icon: Users, title: "CRM Integrado", desc: "Gestão completa de clientes e empresas" },
    { icon: Sparkles, title: "Accord IA", desc: "Automação inteligente de mensagens e tarefas" },
  ];

  const topLinks: { icon: typeof Home; label: string; key: "about" | "contact" | "terms" | "privacy" }[] = [
    { icon: Home, label: "Sobre a empresa", key: "about" },
    { icon: Phone, label: "Contato", key: "contact" },
    { icon: FileText, label: "Termos de serviço", key: "terms" },
    { icon: Shield, label: "Política de privacidade", key: "privacy" },
  ];

  const sheetTitles: Record<NonNullable<typeof openSheet>, string> = {
    about: "Sobre a empresa",
    contact: "Contato",
    terms: "Termos de serviço",
    privacy: "Política de privacidade",
  };

  return (
    <div className="flex min-h-screen font-sans" style={{ fontFamily: "'Geist', -apple-system, sans-serif" }}>
      {/* LEFT */}
      <div className="hidden lg:flex flex-1 relative flex-col overflow-hidden bg-[#F4F2FF] px-[52px] pt-[44px] pb-12">
        <ParticleCanvas />
        {/* Orbs */}
        <div className="orb-anim absolute rounded-full pointer-events-none z-0" style={{ width: 320, height: 320, top: -80, left: -80, background: "rgba(122,63,242,0.12)", filter: "blur(70px)" }} />
        <div className="orb-anim absolute rounded-full pointer-events-none z-0" style={{ width: 240, height: 240, bottom: 60, left: "40%", background: "rgba(37,99,235,0.1)", filter: "blur(70px)", animationDirection: "reverse" }} />
        <div className="orb-anim absolute rounded-full pointer-events-none z-0" style={{ width: 180, height: 180, top: "40%", right: 60, background: "rgba(122,63,242,0.08)", filter: "blur(70px)", animationDelay: "2s" }} />

        {/* Topbar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-0.5 px-8 py-[13px] border-b border-[rgba(122,63,242,0.1)] backdrop-blur-md" style={{ background: "rgba(244,242,255,0.75)" }}>
          {topLinks.map((l) => {
            const Icon = l.icon;
            return (
              <button
                key={l.label}
                type="button"
                onClick={() => setOpenSheet(l.key)}
                className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#4B5563] hover:text-[#7A3FF2] hover:bg-[rgba(122,63,242,0.08)] px-3 py-[5px] rounded-md transition-colors"
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>{l.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="relative z-[1] flex flex-col">
          <img
            src={accordLogo}
            alt="ACCORD"
            className="-mt-5 -ml-1 w-[240px] sm:w-[280px] lg:w-[300px] h-auto select-none drop-shadow-[0_2px_12px_rgba(122,63,242,0.18)]"
            style={{ objectFit: "contain" }}
            draggable={false}
          />
          <div className="text-[12px] font-medium tracking-wide text-[#6B7280] -mt-10 mb-6">plataforma comercial inteligente</div>

          <h1 className="text-[36px] font-black text-[#0D1117] tracking-[-1.8px] leading-[1.08] mb-4 max-w-[430px]">
            CRM, contratos e atendimento com{" "}
            <em className="not-italic bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #2563EB 0%, #7A3FF2 100%)" }}>
              inteligência artificial
            </em>
          </h1>

          <p className="text-[14px] text-[#4B5563] leading-[1.75] max-w-[400px] mb-[38px]">
            ACCORD é uma plataforma completa para times de vendas que querem escalar com processo, controle e automação — tudo em um único sistema.
          </p>

          <div className="grid grid-cols-2 gap-3.5 mb-10 max-w-[560px]">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group flex items-start gap-3">
                <div className="flex-shrink-0 w-[38px] h-[38px] bg-white/90 border border-[rgba(122,63,242,0.18)] rounded-[10px] flex items-center justify-center group-hover:bg-[rgba(122,63,242,0.08)] group-hover:border-[rgba(122,63,242,0.3)] group-hover:-translate-y-px transition-all">
                  <Icon className="w-[18px] h-[18px] text-[#7A3FF2]" strokeWidth={1.8} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#0D1117] mb-[3px]">{title}</div>
                  <div className="text-[11.5px] text-[#6B7280] leading-[1.55]">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2.5 flex-wrap">
            {["Integração oficial WhatsApp", "Multi-empresa", "Segurança enterprise"].map((b) => (
              <div key={b} className="flex items-center gap-[7px] text-white text-[12px] font-semibold px-[18px] py-2 rounded-full transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(122,63,242,0.3)]" style={{ background: "linear-gradient(135deg, #2563EB 0%, #7A3FF2 100%)" }}>
                <Check className="w-[13px] h-[13px]" strokeWidth={2.5} />
                {b}
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes orbFloat { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-24px) scale(1.06); } }
          .orb-anim { animation: orbFloat 9s ease-in-out infinite; }
        `}</style>
      </div>

      {/* RIGHT */}
      <div
        className="flex flex-col items-center justify-center w-full lg:w-[430px] lg:flex-shrink-0 px-5 sm:px-10 lg:px-10 py-12 relative overflow-hidden min-h-screen lg:min-h-0"
        style={{ background: "linear-gradient(155deg, #2563EB 0%, #5B2FD8 38%, #7A3FF2 65%, #8B28C4 100%)" }}
      >
        <div className="absolute pointer-events-none rounded-full" style={{ top: -130, right: -90, width: 380, height: 380, background: "rgba(139,40,196,0.3)", filter: "blur(70px)" }} />
        <div className="absolute pointer-events-none rounded-full" style={{ bottom: -110, left: -70, width: 300, height: 300, background: "rgba(37,99,235,0.25)", filter: "blur(60px)" }} />

        <div className="relative z-[1] w-full max-w-[360px] -translate-y-10">
          <div className="flex justify-center mt-16 mb-2">
            <img src={accordLogo} alt="ACCORD" className="brightness-0 invert" style={{ height: 168, width: "auto", objectFit: "contain" }} />
          </div>

          <div className="text-[22px] font-extrabold text-white tracking-[-0.8px] text-center mb-1.5">Entre na sua conta</div>
          <div className="text-[13px] text-white/60 text-center mb-[26px]">Acesse sua conta para continuar</div>

          {error && (
            <Alert variant="destructive" className="mb-4 rounded-xl border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm text-red-700">{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50 rounded-xl">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={loginForm.handleSubmit(onLogin)} className="bg-white rounded-2xl px-[26px] py-7">
            <div className="mb-3.5">
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">E-mail</label>
              <div className="flex items-center gap-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[9px] px-3.5 transition-all focus-within:border-[#7A3FF2] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(122,63,242,0.12)]">
                <Mail className="w-[15px] h-[15px] text-[#9CA3AF] flex-shrink-0" strokeWidth={1.8} />
                <Input
                  type="email"
                  placeholder="seu@email.com.br"
                  autoComplete="username"
                  className="flex-1 border-0 bg-transparent text-[13.5px] text-[#0D1117] py-[11px] h-auto px-0 shadow-none focus-visible:ring-0 placeholder:text-[#D1D5DB]"
                  {...loginForm.register("email")}
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="mb-3.5">
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Senha</label>
              <div className="flex items-center gap-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[9px] px-3.5 transition-all focus-within:border-[#7A3FF2] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(122,63,242,0.12)]">
                <Lock className="w-[15px] h-[15px] text-[#9CA3AF] flex-shrink-0" strokeWidth={1.8} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  className="flex-1 border-0 bg-transparent text-[13.5px] text-[#0D1117] py-[11px] h-auto px-0 shadow-none focus-visible:ring-0 placeholder:text-[#D1D5DB]"
                  {...loginForm.register("password")}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors flex-shrink-0">
                  {showPassword ? <EyeOff className="w-[15px] h-[15px]" strokeWidth={1.8} /> : <Eye className="w-[15px] h-[15px]" strokeWidth={1.8} />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-xs text-red-500 mt-1">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-end mb-[18px]">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-[12px] font-semibold text-[#7A3FF2] hover:underline disabled:opacity-50"
              >
                {resetLoading ? "Enviando..." : "Esqueceu a senha?"}
              </button>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              variant="ghost"
              className="w-full py-[13px] h-auto rounded-[9px] text-[14px] font-bold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-px shadow-[0_2px_14px_rgba(122,63,242,0.4)] hover:shadow-[0_6px_22px_rgba(122,63,242,0.5)]"
              style={{ background: "linear-gradient(135deg, #2563EB 0%, #7A3FF2 100%)" }}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
              ) : (
                <>Entrar <ArrowRight className="w-4 h-4" strokeWidth={2} /></>
              )}
            </Button>
          </form>

          <div className="text-center mt-4 text-[12px] text-white/55">
            Ainda não tem conta?{" "}
            <Link to="/" className="text-white font-bold hover:underline">Solicitar acesso</Link>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-white/40">
            <ShieldCheck className="w-[13px] h-[13px]" strokeWidth={1.8} />
            Conexão criptografada e segura
          </div>
        </div>
      </div>

      {/* Side sheet for footer/topbar info pages */}
      <Sheet open={openSheet !== null} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent
          side="right"
          className="w-screen sm:max-w-none sm:w-1/2 overflow-y-auto bg-[#070B14] text-[#E5E7EB] border-l border-white/10 p-0"
        >
          <SheetHeader className="px-6 sm:px-8 pt-6 pb-4 border-b border-white/10">
            <SheetTitle className="text-[#E5E7EB] text-2xl font-bold">
              {openSheet ? sheetTitles[openSheet] : ""}
            </SheetTitle>
          </SheetHeader>

          <div className="px-6 sm:px-8 py-6 space-y-6 text-sm sm:text-base text-[#D1D5DB] leading-relaxed">
            {openSheet === "about" && (
              <>
                <p>O <strong>ACCORD</strong> é uma plataforma comercial inteligente que une CRM, contratos digitais, atendimento via WhatsApp, gestão financeira e automações com IA — tudo em um único sistema.</p>
                <p>Nossa missão é ajudar times de vendas e operações a escalarem com processo, controle e produtividade, eliminando ferramentas fragmentadas.</p>
                <p>Desenvolvido pela <strong>Accord Pipe</strong>, focamos em entregar uma experiência premium, segura e adaptada à realidade de empresas brasileiras.</p>
              </>
            )}

            {openSheet === "contact" && (
              <>
                <p>Estamos disponíveis para tirar dúvidas, ajudar com onboarding ou discutir parcerias.</p>
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[#7A3FF2]" />
                    <a href="mailto:suporte@accordclass.com.br" className="text-[#2563EB] hover:underline">suporte@accordclass.com.br</a>
                  </div>
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-4 h-4 text-[#7A3FF2]" />
                    <span>Atendimento via WhatsApp diretamente pela plataforma</span>
                  </div>
                </div>
              </>
            )}

            {openSheet === "terms" && (
              <>
                <p className="text-xs text-[#9CA3AF]">Última atualização: 23 de abril de 2026</p>
                <Section title="1. Identificação do Vendedor">
                  Estes Termos de Uso regem o acesso e utilização da plataforma Accord, fornecida por <strong>Accord Pipe</strong>.
                </Section>
                <Section title="2. Aceitação">O uso continuado do Serviço constitui aceitação destes Termos.</Section>
                <Section title="3. Descrição do Serviço">Plataforma SaaS de gestão operacional com CRM, contratos, assinatura digital, WhatsApp e financeiro.</Section>
                <Section title="4. Uso Permitido">Não utilizar para fins ilícitos, fraude, spam ou violação de propriedade intelectual.</Section>
                <Section title="5. Propriedade Intelectual">Software, marca e identidade visual são de propriedade exclusiva da Accord Pipe.</Section>
                <Section title="6. Pagamentos">Processados por revendedor oficial. Consulte a Política de Reembolso.</Section>
                <Section title="7. Limitação de Responsabilidade">Limitada aos valores efetivamente pagos nos 12 meses anteriores ao evento.</Section>
                <Section title="8. Lei Aplicável">Regidos pelas leis do Brasil. Foro: Comarca de Uberlândia/MG.</Section>
                <Section title="9. Contato">
                  <a href="mailto:suporte@accordclass.com.br" className="text-[#2563EB] hover:underline">suporte@accordclass.com.br</a>
                </Section>
              </>
            )}

            {openSheet === "privacy" && (
              <>
                <p className="text-xs text-[#9CA3AF]">Última atualização: 23 de abril de 2026</p>
                <Section title="1. Controlador">Accord Pipe atua como controlador dos dados pessoais coletados.</Section>
                <Section title="2. Dados Coletados">Cadastro (nome, e-mail, CPF, telefone), dados da empresa, conteúdo do usuário, telemetria e suporte.</Section>
                <Section title="3. Finalidades">Manutenção da conta, prestação do serviço, prevenção a fraudes, melhoria e suporte.</Section>
                <Section title="4. Compartilhamento">Provedores de infraestrutura, Merchant of Record, assessores e autoridades quando exigido por lei.</Section>
                <Section title="5. Retenção">Mantemos dados apenas pelo tempo necessário às finalidades e obrigações legais.</Section>
                <Section title="6. Direitos do Titular (LGPD)">Acesso, correção, anonimização, portabilidade e revogação de consentimento.</Section>
                <Section title="7. Segurança">Criptografia em trânsito, controle de acesso baseado em função e auditoria.</Section>
                <Section title="8. Contato">
                  <a href="mailto:suporte@accordclass.com.br" className="text-[#2563EB] hover:underline">suporte@accordclass.com.br</a>
                </Section>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-base font-semibold text-[#E5E7EB] mb-1.5">{title}</h3>
      <div>{children}</div>
    </section>
  );
}
