import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2 } from "lucide-react";
import { useAuth, type AppRole } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
  onSuccess?: () => void;
}

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "ceo", label: "CEO" },
  { value: "comercial", label: "Comercial" },
  { value: "administrativo", label: "Administrativo" },
  { value: "financeiro", label: "Financeiro" },
  { value: "operador", label: "Operador" },
  { value: "leitura", label: "Leitura" },
];

export function InviteUserDialog({ open, onOpenChange, tenantId, onSuccess }: Props) {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [role, setRole] = useState<AppRole>("leitura");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName(""); setEmail(""); setWhatsapp(""); setRole("leitura");
  };

  const handleSend = async () => {
    if (!name || !email || !tenantId) {
      toast({ title: "Preencha nome e e-mail", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Buscar nome do tenant
      const { data: company } = await supabase
        .from("companies")
        .select("nome_fantasia, razao_social")
        .eq("id", tenantId)
        .maybeSingle();
      const companyName = company?.nome_fantasia || company?.razao_social || "Accord";

      // Criar registro de convite
      const { data: invite, error: invErr } = await supabase
        .from("user_invitations")
        .insert({
          inviter_user_id: user?.id,
          inviter_name: profile?.name || user?.email || "Equipe Accord",
          invitee_name: name,
          invitee_email: email,
          invitee_whatsapp: whatsapp || null,
          company_id: tenantId,
          company_name: companyName,
          role,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id")
        .single();

      if (invErr || !invite) throw invErr || new Error("Falha ao criar convite");

      // Disparar envio de e-mail (e WhatsApp se houver)
      const { error: sendErr } = await supabase.functions.invoke("send-invite", {
        body: { invitation_id: invite.id },
      });
      if (sendErr) throw sendErr;

      toast({ title: "Convite enviado! ✉️", description: `${name} receberá o e-mail em instantes.` });
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Erro ao enviar convite",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" /> Convidar Usuário
          </DialogTitle>
          <DialogDescription>
            Envie um convite por e-mail. O usuário criará a senha ao aceitar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Nome completo</Label>
            <Input
              placeholder="Ex: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input
              type="email"
              placeholder="joao@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>WhatsApp (opcional)</Label>
            <Input
              placeholder="(00) 00000-0000"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Perfil de acesso</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={loading || !name || !email}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Enviar Convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
