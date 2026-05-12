import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2, CheckCircle2, ArrowLeft, ShieldCheck, KanbanSquare, Calendar, MessageCircle, FileText, Users, Sparkles, Check } from "lucide-react";
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
      <div className="flex min-h-screen items-center justify-center bg-[#050510]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen animate-fade-in">
      {/* LEFT — Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between overflow-hidden bg-[#050510]">
        {/* Back */}
        <Link
          to="/"
          className="absolute top-6 left-6 z-20 flex items-center gap-1.5 text-sm text-white/40 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Link>

        {/* Tech grid background */}
        <div className="absolute inset-0">
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />
          {/* Radial glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/[0.07] blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-indigo-600/[0.05] blur-[100px]" />
          {/* Floating dots */}
          <div className="absolute top-[20%] left-[30%] w-1 h-1 rounded-full bg-blue-400/30 animate-pulse" />
          <div className="absolute top-[60%] left-[70%] w-1.5 h-1.5 rounded-full bg-indigo-400/20 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[40%] left-[15%] w-1 h-1 rounded-full bg-blue-300/25 animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[75%] left-[45%] w-1 h-1 rounded-full bg-indigo-300/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 800 900">
            <line x1="200" y1="100" x2="500" y2="300" stroke="white" strokeWidth="1" />
            <line x1="500" y1="300" x2="300" y2="600" stroke="white" strokeWidth="1" />
            <line x1="300" y1="600" x2="600" y2="800" stroke="white" strokeWidth="1" />
            <line x1="100" y1="400" x2="400" y2="500" stroke="white" strokeWidth="1" />
            <line x1="400" y1="500" x2="700" y2="400" stroke="white" strokeWidth="1" />
            <circle cx="200" cy="100" r="3" fill="rgba(96,165,250,0.3)" />
            <circle cx="500" cy="300" r="3" fill="rgba(96,165,250,0.3)" />
            <circle cx="300" cy="600" r="3" fill="rgba(96,165,250,0.3)" />
            <circle cx="600" cy="800" r="3" fill="rgba(96,165,250,0.3)" />
            <circle cx="100" cy="400" r="3" fill="rgba(129,140,248,0.3)" />
            <circle cx="400" cy="500" r="3" fill="rgba(129,140,248,0.3)" />
            <circle cx="700" cy="400" r="3" fill="rgba(129,140,248,0.3)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-start h-full px-16 xl:px-20">
          <div className="flex items-center gap-2.5 mb-12">
            <img src={accordLogo} alt="ACCORD" className="h-9 w-auto" />
            <span className="text-lg font-bold tracking-tight text-white/90">ACCORD</span>
          </div>
          <h1 className="text-4xl xl:text-[2.75rem] font-extrabold text-white leading-[1.15] tracking-tight max-w-md">
            Sua operação organizada.
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Suas vendas previsíveis.
            </span>
          </h1>
          <p className="mt-5 text-sm text-white/30 max-w-sm leading-relaxed">
            CRM, contratos, automação e atendimento — tudo em uma única plataforma.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 px-16 xl:px-20 pb-8">
          <div className="flex items-center gap-6 text-[11px] text-white/25">
            <span>© 2026 ACCORD</span>
            <span className="w-px h-3 bg-white/10" />
            <span>Todos os direitos reservados</span>
          </div>
        </div>
      </div>

      {/* RIGHT — Login form */}
      <div className="flex flex-col justify-center items-center w-full lg:w-[45%] bg-white px-5 sm:px-10 py-8 lg:py-0 relative min-h-screen lg:min-h-0">
        {/* Mobile back */}
        <Link
          to="/"
          className="absolute top-5 left-5 lg:hidden flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Link>

        <div className="w-full max-w-[380px] space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-6 lg:hidden">
              <img src={accordLogo} alt="ACCORD" className="h-7 w-auto" />
              <span className="text-base font-bold tracking-tight text-gray-900">ACCORD</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Acessar plataforma
            </h2>
            <p className="text-sm text-gray-400">
              Entre com suas credenciais para continuar
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <Alert variant="destructive" className="animate-fade-in rounded-xl border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm text-red-700">{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="animate-fade-in border-green-200 bg-green-50 rounded-xl">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-12 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm text-gray-900 placeholder:text-gray-300"
                  autoComplete="username"
                  {...loginForm.register("email")}
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-xs text-red-500 ml-1">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-12 pr-11 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm text-gray-900 placeholder:text-gray-300"
                  autoComplete="current-password"
                  {...loginForm.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-xs text-red-500 ml-1">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <label htmlFor="remember-me" className="text-xs text-gray-400 cursor-pointer select-none">
                  Lembrar-me
                </label>
              </div>
              <button
                type="button"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
                onClick={handleForgotPassword}
                disabled={resetLoading}
              >
                {resetLoading ? "Enviando..." : "Esqueci minha senha"}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-200"
              variant="ghost"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </span>
              ) : (
                "Entrar na plataforma"
              )}
            </Button>
          </form>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4">
            <div className="flex items-center gap-1.5 text-gray-300">
              <Shield className="h-3.5 w-3.5" />
              <span className="text-[11px]">Ambiente seguro</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-300">
              <LockKeyhole className="h-3.5 w-3.5" />
              <span className="text-[11px]">Criptografia ativa</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="text-[11px]">Dados protegidos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
