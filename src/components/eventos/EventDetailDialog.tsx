import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, MapPin, Link2, Users, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { type TenantEvent, useEventConfirmations } from "@/hooks/useEvents";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: TenantEvent | null;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500/20 text-blue-400",
  cancelled: "bg-red-500/20 text-red-400",
  completed: "bg-green-500/20 text-green-400",
};

const typeColors: Record<string, string> = {
  reunião: "bg-purple-500/20 text-purple-400",
  treinamento: "bg-amber-500/20 text-amber-400",
  comunicado: "bg-cyan-500/20 text-cyan-400",
  webinar: "bg-pink-500/20 text-pink-400",
  campanha: "bg-orange-500/20 text-orange-400",
  presencial: "bg-emerald-500/20 text-emerald-400",
  online: "bg-indigo-500/20 text-indigo-400",
};

export function EventDetailDialog({ open, onOpenChange, event }: Props) {
  const { myStatus, confirmed, declined, pending, respond } = useEventConfirmations(event?.id ?? null);

  if (!event) return null;

  const total = confirmed + declined + pending;
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {event.title}
            {event.is_mandatory && (
              <Badge variant="destructive" className="text-[10px] px-1.5">Obrigatório</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={typeColors[event.event_type] ?? "bg-muted text-muted-foreground"}>
              {event.event_type}
            </Badge>
            <Badge className={statusColors[event.status] ?? ""}>
              {event.status === "scheduled" ? "Agendado" : event.status === "cancelled" ? "Cancelado" : "Concluído"}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{fmtDate(event.start_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{fmtTime(event.start_at)}{event.end_at ? ` — ${fmtTime(event.end_at)}` : ""}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{event.location}</span>
              </div>
            )}
            {event.meeting_url && (
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <a href={event.meeting_url} target="_blank" rel="noopener" className="text-primary underline truncate">
                  {event.meeting_url}
                </a>
              </div>
            )}
          </div>

          {event.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
          )}

          {/* Confirmations */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" /> Confirmações
            </div>
            <Progress value={pct} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-400" /> {confirmed}</span>
              <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-yellow-400" /> {pending}</span>
              <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-400" /> {declined}</span>
            </div>

            {event.status === "scheduled" && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant={myStatus === "confirmed" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => respond.mutate("confirmed")}
                  disabled={respond.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar
                </Button>
                <Button
                  size="sm"
                  variant={myStatus === "declined" ? "destructive" : "outline"}
                  className="flex-1"
                  onClick={() => respond.mutate("declined")}
                  disabled={respond.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Recusar
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
