import { useState } from "react";
import { Building2, User, Phone, Mail, Lock, Eye, EyeOff, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface TrialSignupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrialSignupDialog({ open, onOpenChange }: TrialSignupDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    cnpj: "",
    razao_social: "",
    nome_fantasia: "",
    responsavel: "",
    telefone: "",
    email: "",
    password: "",
    role: "admin",
  });

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    }
    return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.cnpj || !form.razao_social || !form.responsavel || !form.telefone || !form.email || !form.password) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (form.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-trial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar conta de teste.");
        return;
      }

      // Auto-login
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (loginError) {
        toast.success("Conta criada! Faça login com suas credenciais.");
        onOpenChange(false);
        navigate("/auth");
      } else {
        toast.success("Bem-vindo ao ACCORD! Seu teste de 7 dias começou.");
        onOpenChange(false);
        navigate("/home");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = form.cnpj.replace(/\D/g, "").length === 14 && form.razao_social && form.responsavel && form.telefone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Rocket className="h-5 w-5 text-green-500" />
            Teste Gratuito – 7 Dias
          </DialogTitle>
          <DialogDescription>
            Cadastre sua empresa e comece a usar o ACCORD agora mesmo. Sem cartão de crédito.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>CNPJ *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: formatCnpj(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                  className="pl-10 rounded-xl h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razão Social *</Label>
                <Input
                  value={form.razao_social}
                  onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                  placeholder="Razão Social"
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input
                  value={form.nome_fantasia}
                  onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                  placeholder="Nome Fantasia"
                  className="rounded-xl h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsável *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    value={form.responsavel}
                    onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                    placeholder="Nome completo"
                    className="pl-10 rounded-xl h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>WhatsApp *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    className="pl-10 rounded-xl h-11"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Perfil Inicial</Label>
              <RadioGroup
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v })}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="admin" id="role-admin" />
                  <Label htmlFor="role-admin" className="cursor-pointer">Administrador</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="operador" id="role-operador" />
                  <Label htmlFor="role-operador" className="cursor-pointer">Operador</Label>
                </div>
              </RadioGroup>
            </div>
            <Button className="w-full h-11 rounded-xl" disabled={!isStep1Valid} onClick={() => { setError(null); setStep(2); }}>
              Continuar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail de acesso *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="seu@email.com"
                  className="pl-10 rounded-xl h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-10 pr-10 rounded-xl h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                ✅ 7 dias gratuitos • Sem cartão de crédito • Acesso imediato
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
                Iniciar Teste Gratuito
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
