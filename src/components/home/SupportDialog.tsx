import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HeadphonesIcon, Send, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject || !message) { toast.error("Preencha todos os campos"); return; }
    setSending(true);
    const { error } = await supabase.from("support_requests").insert({ user_id: user?.id, subject, message } as any);
    if (error) toast.error("Erro ao enviar");
    else { toast.success("Solicitação enviada!"); setSubject(""); setMessage(""); onOpenChange(false); }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeadphonesIcon className="h-5 w-5 text-primary" />
            Solicitar Suporte
          </DialogTitle>
          <DialogDescription>Envie sua solicitação e nossa equipe entrará em contato</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Assunto</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Erro ao emitir contrato" />
          </div>
          <div className="grid gap-2">
            <Label>Mensagem</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Descreva o problema..." rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
