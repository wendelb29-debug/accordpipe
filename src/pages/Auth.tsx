import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2, CheckCircle2, Users, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import accordLogo from "@/assets/accord-logo.png";
import dashboardMockup from "@/assets/dashboard-mockup-login.jpg";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

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
        .from("profiles")
        .select("id")
        .eq("email", email)
        .limit(1);

      if (!profiles || profiles.length === 0) {
        setError("Nenhuma conta encontrada com este e-mail.");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError("Erro ao enviar e-mail de redefinição.");
      } else {
        setSuccess("E-mail de redefinição enviado! Verifique sua caixa de entrada.");
      }
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(135deg, #0F1C3F 0%, #3B3F9C 35%, #7A3FF2 70%, #D94FD5 100%)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-foreground"></div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center p-4 sm:p-6 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0F1C3F 0%, #3B3F9C 35%, #7A3FF2 70%, #D94FD5 100%)' }}
    >
      {/* Decorative elements */}
      <div className="absolute top-[10%] left-[5%] w-32 h-32 rounded-full opacity-20 blur-[60px]" style={{ background: '#7A3FF2' }} />
      <div className="absolute bottom-[10%] right-[10%] w-40 h-40 rounded-full opacity-15 blur-[80px]" style={{ background: '#D94FD5' }} />
      <div className="absolute top-[5%] right-[20%] w-20 h-20 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #3B3F9C 0%, transparent 70%)' }} />

      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

      {/* Sparkle dots */}
      <div className="absolute top-[15%] right-[30%] w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
      <div className="absolute top-[70%] left-[15%] w-1 h-1 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-[20%] right-[15%] w-1.5 h-1.5 rounded-full bg-white/25 animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Curved line decorations */}
      <svg className="absolute bottom-0 left-0 w-full h-[40%] opacity-[0.04]" viewBox="0 0 1200 400" fill="none">
        <path d="M0 300 Q300 200 600 280 T1200 200" stroke="white" strokeWidth="1.5" />
        <path d="M0 350 Q400 250 700 320 T1200 250" stroke="white" strokeWidth="1" />
      </svg>

      {/* Main card container */}
      <div className="relative z-10 w-full max-w-[960px] rounded-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col lg:flex-row" style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.4)' }}>
        {/* LEFT SIDE — Branding */}
        <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-10 overflow-hidden" style={{ background: 'linear-gradient(160deg, rgba(15,28,63,0.95) 0%, rgba(59,63,156,0.9) 50%, rgba(122,63,242,0.85) 100%)' }}>
          {/* Inner glow */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full opacity-20 blur-[100px]" style={{ background: '#7A3FF2' }} />

          {/* Logo */}
          <div className="flex items-center gap-2.5 relative z-10">
            <img src={accordLogo} alt="ACCORD" className="h-8 w-auto" />
            <span className="text-lg font-bold tracking-tight text-primary-foreground">ACCORD</span>
          </div>

          {/* Hero text */}
          <div className="relative z-10 space-y-4">
            <h1 className="text-3xl xl:text-4xl font-extrabold text-primary-foreground leading-[1.15] tracking-tight">
              Gerencie sua operação
              <br />
              em um só lugar
            </h1>
            <p className="text-sm text-white/50 leading-relaxed max-w-sm">
              Simplifique sua gestão de leads, vendas e atendimento em uma única plataforma.
            </p>
          </div>

          {/* Dashboard mockup */}
          <div className="relative z-10 mt-4">
            <div className="rounded-xl overflow-hidden shadow-xl border border-white/10">
              <img
                src={dashboardMockup}
                alt="Dashboard"
                className="w-full h-auto opacity-90"
                loading="lazy"
                width={960}
                height={640}
              />
            </div>
          </div>

          {/* Stats bar */}
          <div className="relative z-10 flex items-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-white/70" />
              </div>
              <span className="text-xs text-white/60">
                <span className="font-semibold text-white/90">+500</span> clientes ativos
              </span>
            </div>
            <div className="w-px h-4 bg-white/15" />
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center">
                <Briefcase className="h-3.5 w-3.5 text-white/70" />
              </div>
              <span className="text-xs text-white/60">
                <span className="font-semibold text-white/90">+10,000</span> leads gerenciados
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE — Login form */}
        <div className="flex flex-col justify-center bg-card p-8 sm:p-10 lg:p-12 lg:w-[45%]">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src={accordLogo} alt="ACCORD" className="h-7 w-auto" />
              <span className="text-base font-bold tracking-tight text-foreground">ACCORD</span>
            </div>
          </div>

          <div className="space-y-6 w-full max-w-sm mx-auto">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                Bem-vindo de volta!
              </h2>
            </div>

            {error && (
              <Alert variant="destructive" className="animate-fade-in rounded-xl border-destructive/30 bg-destructive/5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="animate-fade-in border-accent/30 bg-accent/5 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <AlertDescription className="text-sm text-accent">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <div className="space-y-1">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="E-mail"
                    className="pl-12 h-13 rounded-xl border-border bg-muted/30 focus:bg-background transition-colors text-sm"
                    autoComplete="username"
                    {...loginForm.register("email")}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive ml-1">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha"
                    className="pl-12 pr-11 h-13 rounded-xl border-border bg-muted/30 focus:bg-background transition-colors text-sm"
                    autoComplete="current-password"
                    {...loginForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive ml-1">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? "Enviando..." : "Esqueci minha senha"}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-13 rounded-xl text-sm font-semibold text-primary-foreground shadow-lg transition-all"
                style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 8px 24px -4px rgba(37, 99, 235, 0.35)' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            {/* Footer */}
            <p className="text-center text-[11px] text-muted-foreground/50 pt-4">
              © 2026 ACCORD — Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
