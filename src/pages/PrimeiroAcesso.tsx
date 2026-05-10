import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

export default function PrimeiroAcesso() {
  const { user, profile, refreshProfile } = useAuth() as any;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) {
      toast({ title: "Senha muito curta", description: "Mínimo de 8 caracteres.", variant: "destructive" });
      return;
    }
    if (pwd !== confirm) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error: pwdErr } = await supabase.auth.updateUser({ password: pwd });
      if (pwdErr) throw pwdErr;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ must_change_password: false } as any)
        .eq("user_id", user.id);
      if (profErr) throw profErr;

      if (typeof refreshProfile === "function") await refreshProfile();
      toast({ title: "Senha definida com sucesso! 🎉", description: "Bem-vindo ao Accord." });
      navigate("/home", { replace: true });
    } catch (err: any) {
      toast({ title: "Erro ao definir senha", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/60 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Primeiro Acesso</CardTitle>
          <CardDescription>
            Olá{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}! Defina uma senha permanente para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label>Confirmar senha</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
              Definir senha e entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
