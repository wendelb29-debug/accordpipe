import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowLeft, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      // Check if email exists in profiles
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
    <div className="flex min-h-screen">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />
        
        <div className="relative flex flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2 text-primary-foreground/60 hover:text-primary-foreground transition-colors w-fit">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Voltar ao site</span>
          </Link>
          <div>
            <img src={orbitLogo} alt="ORBIT" className="h-14 w-auto mb-10 brightness-0 invert opacity-90" />
            <h1 className="text-5xl font-black leading-[1.1] tracking-tight">Controle total<br />da sua operação<br />em um só lugar.</h1>
            <p className="mt-6 text-lg text-primary-foreground/60 max-w-md leading-relaxed">CRM, contratos, WhatsApp e IA integrada para automatizar e escalar sua operação.</p>
          </div>
          <p className="text-xs text-primary-foreground/30 font-medium tracking-wider">© 2026 ORBIT HUB — TODOS OS DIREITOS RESERVADOS</p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 lg:hidden text-center">
            <img src={orbitLogo} alt="ORBIT" className="h-10 w-auto mx-auto mb-4" />
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Voltar ao site</Link>
          </div>

          <Card className="border-0 shadow-none lg:border lg:border-border/50 lg:shadow-card rounded-2xl">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl font-extrabold tracking-tight">Bem-vindo de volta</CardTitle>
              <CardDescription className="text-[15px]">Entre com suas credenciais para acessar a plataforma</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive" className="animate-fade-in rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="animate-fade-in border-accent/50 bg-accent/10 rounded-xl">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <AlertDescription className="text-accent">{success}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input id="login-email" type="email" placeholder="seu@email.com" className="pl-10 rounded-xl h-11" autoComplete="username" {...loginForm.register("email")} />
                  </div>
                  {loginForm.formState.errors.email && <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 rounded-xl h-11" {...loginForm.register("password")} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Lembrar-me
                    </label>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                  >
                    {resetLoading ? "Enviando..." : "Esqueci minha senha"}
                  </button>
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl text-sm font-semibold" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Entrando...
                    </div>
                  ) : "Entrar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
