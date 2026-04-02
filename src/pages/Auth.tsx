import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import orbitLogo from "@/assets/orbit-logo.png";

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
  const [rememberMe, setRememberMe] = useState(false);
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* LEFT — Hero branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(245,60%,12%)] via-[hsl(250,50%,18%)] to-[hsl(260,45%,8%)]" />

        {/* Glow orbs */}
        <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] rounded-full bg-[hsl(250,80%,50%)] opacity-[0.12] blur-[120px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] rounded-full bg-[hsl(280,70%,55%)] opacity-[0.10] blur-[100px]" />
        <div className="absolute top-[60%] left-[40%] w-[300px] h-[300px] rounded-full bg-[hsl(220,90%,55%)] opacity-[0.08] blur-[80px]" />

        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

        {/* Floating shapes */}
        <div className="absolute top-[20%] right-[15%] w-20 h-20 border border-white/[0.06] rounded-2xl rotate-12 animate-[float_6s_ease-in-out_infinite]" />
        <div className="absolute bottom-[25%] left-[20%] w-14 h-14 border border-white/[0.04] rounded-xl -rotate-6 animate-[float_8s_ease-in-out_infinite_1s]" />
        <div className="absolute top-[50%] right-[30%] w-10 h-10 bg-white/[0.03] rounded-lg rotate-45 animate-[float_7s_ease-in-out_infinite_2s]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full animate-fade-in">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={orbitLogo} alt="ORBIT HUB" className="h-10 w-auto brightness-0 invert opacity-90" />
          </div>

          {/* Hero copy */}
          <div className="max-w-lg">
            <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.08] tracking-tight">
              Gerencie sua
              <br />
              operação em
              <br />
              <span className="bg-gradient-to-r from-[hsl(250,80%,70%)] to-[hsl(280,70%,65%)] bg-clip-text text-transparent">
                um só lugar.
              </span>
            </h1>
            <p className="mt-6 text-[17px] text-white/50 leading-relaxed max-w-md">
              CRM, contratos, WhatsApp e IA integrada — tudo que você precisa para automatizar e escalar sua operação comercial.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mt-8">
              {["CRM Inteligente", "WhatsApp", "Contratos", "IA Integrada"].map((f) => (
                <span
                  key={f}
                  className="px-3 py-1.5 text-xs font-medium text-white/60 bg-white/[0.06] border border-white/[0.08] rounded-full backdrop-blur-sm"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-[11px] text-white/20 font-medium tracking-widest uppercase">
            © 2026 Orbit Hub — Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* RIGHT — Login form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-[400px] animate-fade-in">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden text-center">
            <img src={orbitLogo} alt="ORBIT HUB" className="h-9 w-auto mx-auto mb-3" />
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Voltar ao site
            </Link>
          </div>

          {/* Form card */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-[26px] font-extrabold tracking-tight text-foreground">
                Bem-vindo de volta
              </h2>
              <p className="text-sm text-muted-foreground">
                Entre com suas credenciais para acessar a plataforma
              </p>
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

            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-11 h-12 rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors text-sm"
                    autoComplete="username"
                    {...loginForm.register("email")}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive mt-1">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-11 pr-11 h-12 rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors text-sm"
                    autoComplete="current-password"
                    {...loginForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive mt-1">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="rounded"
                  />
                  <label htmlFor="remember-me" className="text-xs text-muted-foreground cursor-pointer">
                    Lembrar-me
                  </label>
                </div>
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
                className="w-full h-12 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
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

            {/* Back to site — desktop */}
            <div className="hidden lg:block text-center pt-2">
              <Link
                to="/"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Voltar ao site
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Float animation keyframe */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(var(--tw-rotate, 0)); }
          50% { transform: translateY(-12px) rotate(var(--tw-rotate, 0)); }
        }
      `}</style>
    </div>
  );
}
