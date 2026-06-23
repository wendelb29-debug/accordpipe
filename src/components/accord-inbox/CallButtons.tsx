import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWhatsappCalls } from "@/hooks/useWhatsappCalls";
import { toast } from "sonner";

interface CallButtonsProps {
  contactId: string;
  phone: string;
  contactName: string;
  companyId: string;
  workspaceId?: string;
  compact?: boolean;
}

export function CallButtons({
  contactId,
  phone,
  contactName,
  companyId,
  workspaceId,
  compact,
}: CallButtonsProps) {
  const { makeCall, rejectCall } = useWhatsappCalls(companyId, workspaceId);

  const handleMakeCall = async () => {
    try {
      await makeCall.mutateAsync({
        contact_id: contactId,
        phone,
        contact_name: contactName,
        workspace_id: workspaceId,
      });
      toast.success("Chamada iniciada");
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    }
  };

  const handleRejectCall = async () => {
    try {
      await rejectCall.mutateAsync({ phone, rejection_reason: "Rejeitada pelo usuário" });
      toast.success("Chamada rejeitada");
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    }
  };

  if (compact) {
    return (
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleMakeCall}
          disabled={makeCall.isPending}
          title="Iniciar chamada"
        >
          <Phone size={16} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleRejectCall}
          disabled={rejectCall.isPending}
          title="Rejeitar chamada"
        >
          <PhoneOff size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={handleMakeCall} disabled={makeCall.isPending} className="gap-2">
        <Phone size={16} /> Ligar
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={handleRejectCall}
        disabled={rejectCall.isPending}
        className="gap-2"
      >
        <PhoneOff size={16} /> Rejeitar
      </Button>
    </div>
  );
}
