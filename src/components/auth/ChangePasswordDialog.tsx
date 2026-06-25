import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const email = profile?.email || "";
  const [step, setStep] = useState<1 | 2>(1);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const reset = () => {
    setStep(1); setCode(""); setNewPassword(""); setConfirm("");
    setSending(false); setSubmitting(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSend = async () => {
    if (!email) { toast.error("E-mail da conta não encontrado."); return; }
    setSending(true);
    try {
      await supabase.functions.invoke("password-otp-request", { body: { email } });
      toast.success("Código enviado. Verifique seu e-mail (e WhatsApp, se disponível).");
      setStep(2);
    } catch {
      toast.success("Se a conta existir, enviamos um código.");
      setStep(2);
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 4) { toast.error("Informe o código recebido."); return; }
    if (newPassword.length < 8) { toast.error("A nova senha deve ter ao menos 8 caracteres."); return; }
    if (newPassword !== confirm) { toast.error("As senhas não conferem."); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("password-otp-verify-and-reset", {
        body: { email, code, newPassword },
      });
      if (error || !(data as any)?.ok) {
        toast.error((data as any)?.error || "Código inválido ou expirado.");
        return;
      }
      toast.success("Senha alterada com sucesso.");
      handleClose(false);
    } catch {
      toast.error("Erro ao alterar a senha.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>
            {step === 1
              ? `Enviaremos um código de verificação para ${email || "seu e-mail"}.`
              : "Informe o código recebido e defina sua nova senha."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <DialogFooter>
            <Button variant="ghost" onClick={() => handleClose(false)}>Cancelar</Button>
            <Button onClick={handleSend} disabled={sending || !email}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar código"}
            </Button>
          </DialogFooter>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="otp-code">Código</Label>
              <Input id="otp-code" inputMode="numeric" maxLength={6} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" />
            </div>
            <div>
              <Label htmlFor="new-pwd">Nova senha</Label>
              <Input id="new-pwd" type="password" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </div>
            <div>
              <Label htmlFor="confirm-pwd">Confirmar nova senha</Label>
              <Input id="confirm-pwd" type="password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}>Voltar</Button>
              <Button onClick={handleVerify} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
