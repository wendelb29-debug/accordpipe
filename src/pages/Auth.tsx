import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye, EyeOff, Lock, Mail, AlertCircle, Loader2, CheckCircle2,
  Sparkles, Rocket, Users, MessageSquare, FileSignature, Bot, Building2, Wallet,
  TrendingUp, ArrowRight, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import accordLogo from "@/assets/accord-logo.png";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});

type LoginFormData = z.infer<typeof loginSchema>;

const features = [
  { icon: Users, title: "CRM Inteligente", desc: "Pipeline visual com IA" },
  { icon: MessageSquare, title: "WhatsApp Omnichannel", desc: "Atendimento centralizado" },
  { icon: FileSignature, title: "Contratos Digitais", desc: "Assinatura em segundos" },
  { icon: Bot, title: "Automação com IA", desc: "Fluxos inteligentes 24/7" },
  { icon: Building2, title: "Multi-tenancy", desc: "Escalável e white-label" },
  { icon: Wallet, title: "Gestão Financeira", desc: "MRR, boletos e cobranças" },
];

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("accord-remember-me") === "true");

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: rememberMe ? (localStorage.getItem("accord-saved-email") || "") : "",
      password: "",
    },
  });

  useEffect(() => {
    if (!loading && user) navigate("/home");
  }, [user, loading, navigate]);

  const onLogin = async (data: LoginFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      if (rememberMe) {
        localStorage.setItem("accord-remember-me", "true");
        localStorage.setItem("accord-saved-email", data.email);
      } else {
        localStorage.removeItem("accord-remember-me");
        localStorage.removeItem("accord-saved-email");
      }
      const { error } = await signIn(data.email, data.password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) setError("E-mail ou senha incorretos.");
        else if (error.message.includes("Email not confirmed")) setError("Por favor, confirme seu e-mail antes de fazer login.");
        else setError("Erro ao fazer login. Tente novamente.");
      }
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = loginForm.getValues("email");
    if (!email) { setError("Digite seu e-mail no campo acima para redefinir a senha."); return; }
    setError(null);
    setResetLoading(true);
    try {
      const { data: profiles } = await supabase.from("profiles").select("id").eq("email", email).limit(1);
      if (!profiles || profiles.length === 0) { setError("Nenhuma conta encontrada com este e-mail."); return; }
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
      <div className="flex min-h-screen items-center justify-center bg-[#05060A]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05060A] text-white overflow-hidden relative">
      {/* ==== Global ambient background ==== */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Tech grid */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />
        {/* Glow blobs */}
        <div className="absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full bg-blue-600/20 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[640px] h-[640px] rounded-full bg-violet-600/20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 w-[520px] h-[520px] rounded-full bg-fuchsia-600/10 blur-[140px]" />
        {/* Floating particles */}
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white/40 animate-float"
            style={{
              top: `${(i * 53) % 100}%`,
              left: `${(i * 37) % 100}%`,
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${8 + (i % 6)}s`,
              opacity: 0.3 + ((i % 5) * 0.08),
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-30px) translateX(10px); opacity: 0.6; }
        }
        .animate-float { animation: float linear infinite; }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(99,102,241,0.35), 0 0 60px rgba(139,92,246,0.18); }
          50% { box-shadow: 0 0 50px rgba(99,102,241,0.55), 0 0 100px rgba(139,92,246,0.30); }
        }
        .glow-pulse { animation: glowPulse 4s ease-in-out infinite; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s cubic-bezier(.2,.8,.2,1) both; }
      `}</style>

      {/* ==== Top nav ==== */}
      <header className="relative z-20 border-b border-white/[0.04] backdrop-blur-xl bg-[#05060A]/60">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={accordLogo} alt="ACCORD" className="h-8 w-auto" />
            <span className="text-sm font-bold tracking-[0.2em] text-white/90">ACCORD</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-white/50">
            <a href="#features" className="hover:text-white/90 transition">Funcionalidades</a>
            <a href="#" className="hover:text-white/90 transition">Como funciona</a>
            <a href="#" className="hover:text-white/90 transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] text-white/60 border border-white/10 bg-white/[0.03]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sistema online
            </span>
          </div>
        </div>
      </header>

      {/* ==== Hero Split ==== */}
      <main className="relative z-10 mx-auto max-w-[1400px] px-5 sm:px-8 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr,1fr] gap-10 lg:gap-14 items-start">
          {/* LEFT — Institutional */}
          <div className="fade-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur px-3 py-1.5 text-[11px] font-medium text-white/70">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              Plataforma SaaS Enterprise
            </div>

            {/* Headline */}
            <h1 className="mt-6 text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem] font-extrabold leading-[1.05] tracking-tight">
              Sua empresa perde vendas por falta de{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-500 bg-clip-text text-transparent">
                processo
              </span>{" "}
              e{" "}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
                controle
              </span>
              ?
            </h1>

            <p className="mt-5 text-[15px] sm:text-base text-white/55 max-w-xl leading-relaxed">
              Centralize CRM, contratos, WhatsApp, automações e IA em uma única plataforma —
              e transforme sua operação em uma máquina previsível de crescimento.
            </p>

            {/* CTAs */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/">
                <Button className="h-12 px-6 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0 shadow-[0_8px_32px_-8px_rgba(99,102,241,0.6)] hover:shadow-[0_12px_40px_-8px_rgba(139,92,246,0.7)] hover:scale-[1.02] transition-all duration-300 gap-2 glow-pulse">
                  <Rocket className="h-4 w-4" />
                  Teste 7 dias grátis
                  <ArrowRight className="h-4 w-4 opacity-70" />
                </Button>
              </Link>
              <a href="#login" className="hidden sm:inline-flex">
                <Button variant="ghost" className="h-12 px-5 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.06] border border-white/10">
                  Entrar
                </Button>
              </a>
            </div>

            {/* Trust */}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-white/40">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Dados criptografados</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Sem cartão de crédito</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Setup em minutos</span>
            </div>

            {/* Dashboard mockup */}
            <div className="mt-10 relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600/20 via-violet-600/20 to-fuchsia-600/20 rounded-2xl blur-xl opacity-60" />
              <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl overflow-hidden shadow-2xl">
                {/* Mock window bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="ml-3 text-[11px] text-white/40">accord.app — Dashboard</span>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 p-4">
                  {[
                    { label: "LEADS ATIVOS", value: "1.284", color: "from-blue-500/20 to-blue-500/5", text: "text-blue-300" },
                    { label: "CONTRATOS", value: "347", color: "from-violet-500/20 to-violet-500/5", text: "text-violet-300" },
                    { label: "MRR", value: "R$ 89k", color: "from-emerald-500/20 to-emerald-500/5", text: "text-emerald-300" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl border border-white/[0.06] bg-gradient-to-br ${s.color} p-3`}>
                      <div className="text-[10px] tracking-wider text-white/40 font-semibold">{s.label}</div>
                      <div className={`mt-1.5 text-xl font-bold ${s.text}`}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {/* Pipeline */}
                <div className="px-4 pb-4">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-white/80">Pipeline de Vendas</span>
                      <span className="text-[10px] text-white/40 inline-flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-emerald-400" /> Atualizado agora
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { l: "Qualificação", v: "24", g: "from-blue-500/30 to-blue-500/5" },
                        { l: "Proposta", v: "18", g: "from-indigo-500/30 to-indigo-500/5" },
                        { l: "Negociação", v: "12", g: "from-violet-500/30 to-violet-500/5" },
                        { l: "Fechamento", v: "8", g: "from-emerald-500/30 to-emerald-500/5" },
                      ].map((c) => (
                        <div key={c.l} className={`rounded-lg bg-gradient-to-b ${c.g} border border-white/[0.06] p-2.5`}>
                          <div className="h-12 rounded-md bg-white/[0.04]" />
                          <div className="mt-2 text-[10px] text-white/50 text-center">{c.l}</div>
                          <div className="text-sm font-bold text-white text-center">{c.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activity rows */}
                  <div className="mt-3 space-y-1.5">
                    {[
                      { dot: "bg-emerald-400", t: "Contrato assinado — Empresa ABC", time: "2 min" },
                      { dot: "bg-blue-400", t: "Novo lead — João Silva", time: "8 min" },
                      { dot: "bg-violet-400", t: "Proposta enviada — XYZ Corp", time: "14 min" },
                    ].map((r) => (
                      <div key={r.t} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />
                          <span className="text-[11px] text-white/70">{r.t}</span>
                        </div>
                        <span className="text-[10px] text-white/35">{r.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Feature cards */}
            <div id="features" className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur p-4 hover:border-blue-500/30 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-300 fade-up"
                  style={{ animationDelay: `${0.1 + i * 0.06}s` }}
                >
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-blue-500/[0.08] to-violet-500/[0.08]" />
                  <div className="relative">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/10">
                      <f.icon className="h-4 w-4 text-blue-300" />
                    </div>
                    <div className="mt-3 text-[13px] font-semibold text-white/90">{f.title}</div>
                    <div className="mt-0.5 text-[11px] text-white/45">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Login panel */}
          <div id="login" className="lg:sticky lg:top-24 fade-up" style={{ animationDelay: "0.15s" }}>
            <div className="relative">
              {/* Outer glow */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-blue-600/30 via-violet-600/30 to-fuchsia-600/20 blur-2xl opacity-70" />
              {/* Glass card */}
              <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] p-7 sm:p-9">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-violet-600/30 mb-4">
                    <img src={accordLogo} alt="" className="h-6 w-auto" />
                  </div>
                  <h2 className="text-[22px] font-bold tracking-tight text-white">Acessar plataforma</h2>
                  <p className="mt-1 text-[13px] text-white/50">Entre com suas credenciais para continuar</p>
                </div>

                {error && (
                  <Alert variant="destructive" className="mt-5 rounded-xl border-red-500/30 bg-red-500/10 text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="mt-5 rounded-xl border-emerald-500/30 bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <AlertDescription className="text-xs text-emerald-200">{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={loginForm.handleSubmit(onLogin)} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-11 h-12 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:border-blue-500/40 transition-all"
                        autoComplete="username"
                        {...loginForm.register("email")}
                      />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="text-[11px] text-red-400">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-11 pr-11 h-12 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:border-blue-500/40 transition-all"
                        autoComplete="current-password"
                        {...loginForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/80 transition"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-[11px] text-red-400">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(c) => setRememberMe(c === true)}
                        className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <label htmlFor="remember-me" className="text-[11px] text-white/55 cursor-pointer select-none">
                        Lembrar acesso
                      </label>
                    </div>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition disabled:opacity-50"
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                    >
                      {resetLoading ? "Enviando..." : "Esqueceu a senha?"}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    variant="ghost"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-[0_10px_30px_-8px_rgba(99,102,241,0.6)] hover:shadow-[0_14px_40px_-8px_rgba(139,92,246,0.7)] hover:scale-[1.01] transition-all duration-200 border-0"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Entrar na plataforma <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="mt-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <span className="text-[10px] tracking-wider uppercase text-white/30">Novo na ACCORD?</span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                <Link to="/" className="block mt-4">
                  <Button variant="ghost" className="w-full h-11 rounded-xl text-[13px] font-medium text-white/80 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/10">
                    Criar conta grátis — 7 dias
                  </Button>
                </Link>
              </div>

              {/* Trust strip */}
              <div className="mt-5 flex items-center justify-center gap-5 text-[10px] text-white/35">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> SSL 256-bit</span>
                <span className="w-px h-3 bg-white/10" />
                <span>LGPD compliant</span>
                <span className="w-px h-3 bg-white/10" />
                <span>SOC 2 ready</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.04] mt-10">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 py-5 flex items-center justify-between text-[11px] text-white/35">
          <span>© 2026 ACCORD — Todos os direitos reservados</span>
          <div className="hidden sm:flex items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-white/70 transition">Privacidade</Link>
            <Link to="/terms-of-service" className="hover:text-white/70 transition">Termos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
