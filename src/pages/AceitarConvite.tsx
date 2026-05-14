import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, PartyPopper } from "lucide-react";

export default function AceitarConvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawToken = searchParams.get("token");
  const token = rawToken ? decodeURIComponent(rawToken).trim() : null;
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      const { data: rows, error } = await supabase
        .rpc("get_user_invitation_by_token", { p_token: token });
      const data = Array.isArray(rows) ? rows[0] : rows;


      if (error) {
        console.error("[AceitarConvite] erro ao buscar convite:", error);
        setLoading(false);
        return;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      if (data.status === "accepted" || data.status === "aceito") {
        setAccepted(true);
      } else if (new Date(data.expires_at) < new Date()) {
        setExpired(true);
      }

      setInvitation(data);
    } catch (err) {
      console.error("[AceitarConvite] exceção:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.invitee_email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: invitation.invitee_name,
            company_id: invitation.company_id,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          throw new Error("Este e-mail já está cadastrado. Faça login normalmente.");
        }
        throw authError;
      }

      if (!authData.user) throw new Error("Erro ao criar conta.");

      // Update profile with invitation data
      const profileUpdate: any = {
        status: "ativo",
        is_active: true,
        company_id: invitation.company_id,
      };
      if (invitation.invitee_cpf) profileUpdate.cpf = invitation.invitee_cpf;
      if (invitation.invitee_birth_date) profileUpdate.birth_date = invitation.invitee_birth_date;
      if (invitation.invitee_whatsapp) profileUpdate.whatsapp = invitation.invitee_whatsapp;
      if (invitation.trial_expires_at) {
        profileUpdate.trial_expires_at = invitation.trial_expires_at;
        profileUpdate.is_trial_user = true;
      }

      await supabase
        .from("profiles")
        .update(profileUpdate as any)
        .eq("user_id", authData.user.id);

      // Update role
      if (invitation.role && invitation.role !== "leitura") {
        await supabase
          .from("user_roles")
          .update({ role: invitation.role })
          .eq("user_id", authData.user.id);
      }

      // Mark invitation as accepted (token-scoped RPC)
      await supabase.rpc("accept_user_invitation_by_token", { p_token: token });

      toast.success("Conta criada com sucesso! Verifique seu e-mail para confirmar.");
      setTimeout(() => navigate("/auth"), 3000);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!token || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Convite inválido</CardTitle>
            <CardDescription>
              Este link de convite é inválido ou já foi utilizado. Solicite um novo convite ao administrador.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Convite expirado</CardTitle>
            <CardDescription>Este convite expirou. Solicite um novo convite ao administrador.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Convite já aceito</CardTitle>
            <CardDescription>Este convite já foi utilizado. Faça login para acessar o sistema.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/auth")}>Ir para Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <PartyPopper className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-xl">🎉 Você foi convidado!</CardTitle>
          <CardDescription className="text-base">
            <strong>{invitation.inviter_name}</strong> convidou você para fazer parte de{" "}
            <strong>{invitation.company_name}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={invitation.invitee_name} disabled />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={invitation.invitee_email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Crie sua senha</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pr-10"
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
          <Button
            onClick={handleAccept}
            disabled={isSubmitting || password.length < 6}
            className="w-full"
          >
            {isSubmitting ? "Criando conta..." : "Aceitar Convite e Criar Conta"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
