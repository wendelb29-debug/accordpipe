import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail, AlertCircle, User, UserPlus, ArrowLeft, Search, Building2, Loader2, CheckCircle2, XCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import orbitLogo from "@/assets/orbit-logo.png";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});


const signupSchema = z.object({
  name: z.string().trim().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }).max(100),
  cpf: z.string().trim().min(11, { message: "CPF deve ter 11 dígitos" }).max(14, { message: "CPF inválido" }).refine(
    (v) => v.replace(/\D/g, "").length === 11,
    { message: "CPF deve ter 11 dígitos" }
  ),
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
  confirmPassword: z.string().min(6, { message: "Confirme a senha" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "text-green-600" },
  teste: { label: "Em Teste", color: "text-blue-600" },
  expirado: { label: "Bloqueado", color: "text-destructive" },
};

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  

  // Join existing company state
  const [cnpjSearch, setCnpjSearch] = useState("");
  const [cnpjLooking, setCnpjLooking] = useState(false);
  const [foundServidor, setFoundServidor] = useState<{ id: string; nome_fantasia: string | null; razao_social: string; status: string } | null>(null);
  const [cnpjNotFound, setCnpjNotFound] = useState(false);
  const [cnpjAlreadyRegistered, setCnpjAlreadyRegistered] = useState(false);
  

  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupFormData>({ resolver: zodResolver(signupSchema) });

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

  const handleCnpjLookup = async () => {
    const cleaned = cnpjSearch.replace(/\D/g, "");
    if (cleaned.length < 14) {
      setError("Digite um CNPJ válido com 14 dígitos.");
      return;
    }
    setError(null);
    setCnpjLooking(true);
    setCnpjNotFound(false);
    setCnpjAlreadyRegistered(false);
    setFoundServidor(null);
    try {
      const { data, error } = await supabase.rpc("check_cnpj_status", { _cnpj: cleaned });
      if (error) throw error;
      if (data && data.length > 0) {
        const result = data[0];
        if (result.result_status === "ja_cadastrado") {
          // CNPJ exists as a client company, not a server
          setCnpjAlreadyRegistered(true);
        } else if (result.result_status === "servidor" && (result.company_status === "active" || result.company_status === "teste")) {
          // Valid server found — allow signup
          setFoundServidor({ id: result.id, nome_fantasia: result.nome_fantasia, razao_social: result.razao_social, status: result.company_status });
        } else {
          // Server found but inactive/expired
          setCnpjNotFound(true);
        }
      } else {
        // CNPJ not in any table
        setCnpjNotFound(true);
      }
    } catch {
      setError("Erro ao buscar empresa.");
    } finally {
      setCnpjLooking(false);
    }
  };

  // Signup - join existing company
  const onSignup = async (data: SignupFormData) => {
    setError(null);
    setSuccess(null);

    if (!foundServidor) {
      setError("Busque e selecione a empresa pelo CNPJ antes de solicitar acesso.");
      return;
    }

    setIsSubmitting(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { name: data.name, cpf: data.cpf.replace(/\D/g, ""), company_id: foundServidor.id },
        },
      });
      if (error) {
        if (error.message.includes("User already registered")) {
          setError("Este e-mail já está cadastrado.");
        } else {
          setError("Erro ao criar conta. Tente novamente.");
        }
      } else {
        setSuccess("Solicitação enviada! Verifique seu e-mail para confirmar. Após a confirmação, o administrador do servidor aprovará seu acesso.");
        signupForm.reset();
        setFoundServidor(null);
        setCnpjSearch("");
        setCnpjAlreadyRegistered(false);
        setCnpjNotFound(false);
      }
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const PasswordFields = ({ form, prefix }: { form: any; prefix: string }) => (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-password`}>Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input id={`${prefix}-password`} type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 rounded-xl h-11" {...form.register("password")} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-confirm-password`}>Confirmar Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input id={`${prefix}-confirm-password`} type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 rounded-xl h-11" {...form.register("confirmPassword")} />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {form.formState.errors.confirmPassword && <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="relative flex flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors w-fit">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Voltar ao site</span>
          </Link>
          <div>
            <img src={orbitLogo} alt="ORBIT" className="h-16 w-auto mb-8 brightness-0 invert" />
            <h1 className="text-4xl font-bold leading-tight">Tudo gira sob<br />controle.</h1>
            <p className="mt-4 text-lg text-primary-foreground/70 max-w-md">Gerencie clientes, contratos e recorrências em uma plataforma unificada e intuitiva.</p>
          </div>
          <p className="text-sm text-primary-foreground/40">© 2026 ORBIT HUB</p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex flex-1 items-center justify-center p-6 bg-background overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden text-center">
            <img src={orbitLogo} alt="ORBIT" className="h-12 w-auto mx-auto mb-4" />
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Voltar ao site</Link>
          </div>

          <Card className="border-0 shadow-none lg:border lg:shadow-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold">
                {activeTab === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
              </CardTitle>
              <CardDescription>
                {activeTab === "login"
                  ? "Entre com suas credenciais para acessar a plataforma"
                  : "Preencha os dados abaixo para começar"}
              </CardDescription>
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

              <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setError(null); setSuccess(null); }}>
                <TabsList className="grid w-full grid-cols-2 rounded-xl h-11">
                  <TabsTrigger value="login" className="flex items-center gap-2 rounded-lg text-sm">
                    <User className="h-4 w-4" />
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="flex items-center gap-2 rounded-lg text-sm">
                    <UserPlus className="h-4 w-4" />
                    Criar Conta
                  </TabsTrigger>
                </TabsList>

                {/* LOGIN TAB */}
                <TabsContent value="login" className="space-y-4 mt-6">
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                        <Input id="login-email" type="email" placeholder="seu@email.com" className="pl-10 rounded-xl h-11" {...loginForm.register("email")} />
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
                    <Button type="submit" className="w-full h-11 rounded-xl text-sm font-semibold" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                          Entrando...
                        </div>
                      ) : "Entrar"}
                    </Button>
                    <div className="text-center">
                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                        onClick={async () => {
                          const email = loginForm.getValues("email");
                          if (!email) { setError("Digite seu e-mail no campo acima para redefinir a senha."); return; }
                          setError(null);
                          const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
                          if (error) { setError("Erro ao enviar e-mail de redefinição."); }
                          else { setSuccess("E-mail de redefinição enviado! Verifique sua caixa de entrada."); }
                        }}
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  </form>
                </TabsContent>

                {/* SIGNUP TAB */}
                <TabsContent value="signup" className="space-y-4 mt-6">
                  <div className="space-y-4">
                      {/* CNPJ Search */}
                      <div className="space-y-2">
                        <Label>CNPJ da Empresa</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                            <Input
                              type="text"
                              placeholder="00.000.000/0000-00"
                              className="pl-10 rounded-xl h-11"
                              value={cnpjSearch}
                              onChange={(e) => {
                                setCnpjSearch(e.target.value);
                                setCnpjNotFound(false);
                                setCnpjAlreadyRegistered(false);
                                setFoundServidor(null);
                              }}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCnpjLookup(); } }}
                            />
                          </div>
                          <Button type="button" variant="outline" className="rounded-xl h-11 px-4" onClick={handleCnpjLookup} disabled={cnpjLooking}>
                            {cnpjLooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-1" /> Buscar</>}
                          </Button>
                        </div>
                      </div>

                      {/* CNPJ already registered as client company */}
                      {cnpjAlreadyRegistered && (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 animate-fade-in">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-foreground">Empresa já possui cadastro</p>
                              <p className="text-sm text-muted-foreground mt-1">Este CNPJ já está registrado como cliente no sistema. Se você perdeu o acesso, entre em contato com o administrador.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Found company card */}
                      {foundServidor && (
                        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3 animate-fade-in">
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-accent/10 p-2">
                              <Building2 className="h-5 w-5 text-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">Empresa encontrada</p>
                              <p className="font-semibold text-foreground truncate">{foundServidor.nome_fantasia || foundServidor.razao_social}</p>
                              <p className="text-sm text-muted-foreground truncate">{foundServidor.razao_social}</p>
                              <p className={`text-xs font-medium mt-1 ${statusLabels[foundServidor.status]?.color || "text-muted-foreground"}`}>
                                📊 {statusLabels[foundServidor.status]?.label || foundServidor.status}
                              </p>
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-1" />
                          </div>

                        </div>
                      )}

                      {/* CNPJ not found / not authorized */}
                      {cnpjNotFound && (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 animate-fade-in">
                          <div className="flex items-start gap-3">
                            <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-foreground">CNPJ não autorizado</p>
                              <p className="text-sm text-muted-foreground mt-1">Nenhum servidor ativo com este CNPJ foi encontrado. Verifique o número e tente novamente.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* User data form (only show after finding valid servidor) */}
                      {foundServidor && (
                        <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4 animate-fade-in">
                          <div className="space-y-2">
                            <Label htmlFor="join-name">Nome Completo</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                              <Input id="join-name" type="text" placeholder="Seu nome completo" className="pl-10 rounded-xl h-11" {...signupForm.register("name")} />
                            </div>
                            {signupForm.formState.errors.name && <p className="text-sm text-destructive">{signupForm.formState.errors.name.message}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="join-cpf">CPF</Label>
                            <div className="relative">
                              <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                              <Input id="join-cpf" type="text" placeholder="000.000.000-00" className="pl-10 rounded-xl h-11" {...signupForm.register("cpf")} />
                            </div>
                            {signupForm.formState.errors.cpf && <p className="text-sm text-destructive">{signupForm.formState.errors.cpf.message}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="join-email">E-mail</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                              <Input id="join-email" type="email" placeholder="seu@email.com" className="pl-10 rounded-xl h-11" {...signupForm.register("email")} />
                            </div>
                            {signupForm.formState.errors.email && <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>}
                          </div>
                          <PasswordFields form={signupForm} prefix="join" />
                          <Button type="submit" className="w-full h-11 rounded-xl text-sm font-semibold" disabled={isSubmitting}>
                            {isSubmitting ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Criando conta...
                              </div>
                            ) : "Criar Conta"}
                          </Button>
                        </form>
                      )}
                    </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
