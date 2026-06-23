import { useWhatsappCalls } from "@/hooks/useWhatsappCalls";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, PhoneIncoming, PhoneOutgoing } from "lucide-react";

interface CallHistoryProps {
  companyId: string;
  workspaceId?: string;
  isAdmin?: boolean;
}

const statusLabel: Record<string, string> = {
  initiated: "Iniciada",
  ringing: "Tocando",
  active: "Em curso",
  ended: "Finalizada",
  rejected: "Rejeitada",
  missed: "Perdida",
};

const statusVariant: Record<string, string> = {
  active: "bg-green-500/15 text-green-600 border-green-500/30",
  ended: "bg-muted text-muted-foreground",
  rejected: "bg-red-500/15 text-red-600 border-red-500/30",
  missed: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  initiated: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  ringing: "bg-blue-500/15 text-blue-600 border-blue-500/30",
};

export function CallHistory({ companyId, workspaceId, isAdmin }: CallHistoryProps) {
  const { calls, isLoading } = useWhatsappCalls(companyId, workspaceId, isAdmin);

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando chamadas...</div>;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <Phone size={16} /> Histórico de Chamadas
      </h3>

      {calls.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma chamada registrada.</p>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <div
              key={call.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-card"
            >
              <div className="flex items-center gap-3 min-w-0">
                {call.call_type === "outgoing" ? (
                  <PhoneOutgoing size={16} className="text-muted-foreground shrink-0" />
                ) : (
                  <PhoneIncoming size={16} className="text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">{call.contact_name || call.contact_phone}</p>
                  <p className="text-xs text-muted-foreground truncate">{call.contact_phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {typeof call.duration_seconds === "number" && call.duration_seconds > 0 && (
                  <span className="text-xs font-medium tabular-nums">
                    {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                  </span>
                )}
                <Badge variant="outline" className={statusVariant[call.status] || ""}>
                  {statusLabel[call.status] || call.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(call.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
