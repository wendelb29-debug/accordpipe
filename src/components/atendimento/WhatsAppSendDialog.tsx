import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  phone: string;
  contactName?: string | null;
  companyName?: string | null;
  tenantId: string;
  onSent?: (text: string, formattedPhone: string) => void;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function applyVars(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

export function WhatsAppSendDialog({
  open, onOpenChange, phone, contactName, companyName, tenantId, onSent,
}: Props) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tenantName, setTenantName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !tenantId) return;
    supabase.from("companies").select("nome_fantasia, razao_social").eq("id", tenantId).maybeSingle()
      .then(({ data }) => setTenantName((data as any)?.nome_fantasia || (data as any)?.razao_social || ""));
  }, [open, tenantId]);

  const vars = useMemo(() => ({
    nome: (contactName || companyName || "").split(" ")[0] || "",
    vendedor: profile?.name || "",
    empresa: tenantName || "",
  }), [contactName, companyName, profile?.name, tenantName]);

  const templates = useMemo(() => ([
    { label: "Primeiro contato", text: `Olá, {{nome}}! Tudo bem? 😊\nMeu nome é {{vendedor}}, da {{empresa}}.\nVi que você tem interesse em nossos serviços. Posso te contar mais?` },
    { label: "Follow up", text: `Olá, {{nome}}! Passando para saber se você teve a oportunidade de analisar nossa proposta. Fico à disposição! 🙂` },
    { label: "Proposta enviada", text: `Olá, {{nome}}! Acabei de enviar nossa proposta para seu e-mail. Qualquer dúvida estou aqui! 👍` },
    { label: "Personalizado", text: "" },
  ]), []);

  const formattedPhone = useMemo(() => formatPhone(phone || ""), [phone]);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Escreva uma mensagem");
      return;
    }
    if (!formattedPhone) {
      toast.error("Telefone inválido");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          tenant_id: tenantId,
          phone: formattedPhone,
          text: message,
          message_type: "text",
        },
      });
      if (error || !(data as any)?.success) {
        const msg = (data as any)?.message || error?.message || "Falha ao enviar";
        toast.error(msg);
        setSending(false);
        return;
      }
      toast.success("Mensagem enviada!", {
        action: {
          label: "Ver conversa →",
          onClick: () => navigate(`/atendimento?contact=${formattedPhone}`),
        },
        duration: 5000,
      });
      onSent?.(message, formattedPhone);
      setMessage("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-emerald-500" /> Enviar via WhatsApp
          </DialogTitle>
          <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
            <div>Para: <span className="text-foreground font-medium">{contactName || companyName || "—"}</span></div>
            <div>Número: <span className="text-foreground font-mono">+{formattedPhone || "—"}</span></div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">💬 Templates rápidos</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {templates.map((t) => (
                <Button
                  key={t.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-8 justify-start"
                  onClick={() => setMessage(t.text ? applyVars(t.text, vars) : "")}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">Mensagem</Label>
            <Textarea
              className="text-xs min-h-[140px] mt-1.5"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva sua mensagem ou escolha um template acima..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
