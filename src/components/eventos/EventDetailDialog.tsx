import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Calendar, Clock, MapPin, Link2, Users, CheckCircle2, XCircle,
  AlertTriangle, CalendarPlus, CalendarMinus, Bell,
} from "lucide-react";
import { type TenantEvent, useEventConfirmations } from "@/hooks/useEvents";
import { useEventAgenda } from "@/hooks/useEventAgenda";

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

const REMINDER_OPTIONS = [
  { value: "0", label: "Sem lembrete" },
  { value: "5", label: "5 minutos antes" },
  { value: "10", label: "10 minutos antes" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "120", label: "2 horas antes" },
  { value: "1440", label: "1 dia antes" },
];

export function EventDetailDialog({ open, onOpenChange, event }: Props) {
  const { myStatus, confirmed, declined, pending, respond } = useEventConfirmations(event?.id ?? null);
  const { isAdded, addToAgenda, removeFromAgenda } = useEventAgenda();
  const [reminderMinutes, setReminderMinutes] = useState("15");

  if (!event) return null;

  const total = confirmed + declined + pending;
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const eventAdded = isAdded(event.id);
  const isScheduled = event.status === "scheduled" && new Date(event.start_at) >= new Date();

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const handleAddToAgenda = () => {
    addToAgenda.mutate({ event, reminderMinutes: parseInt(reminderMinutes, 10) });
  };

  const handleRemoveFromAgenda = () => {
    removeFromAgenda.mutate(event.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Banner image */}
        {(event.banner_url || event.thumbnail_url) && (
          <div className="relative -mx-6 -mt-6 mb-4 rounded-t-lg overflow-hidden h-40">
            <img
              src={event.banner_url || event.thumbnail_url || ""}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        )}

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

          {/* Add to Agenda section */}
          {isScheduled && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarPlus className="h-4 w-4 text-primary" /> Minha Agenda
              </div>

              {eventAdded ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    Adicionado à sua agenda
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive"
                    onClick={handleRemoveFromAgenda}
                    disabled={removeFromAgenda.isPending}
                  >
                    <CalendarMinus className="h-4 w-4" /> Remover
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Lembrete</Label>
                  </div>
                  <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={handleAddToAgenda}
                    disabled={addToAgenda.isPending}
                  >
                    <CalendarPlus className="h-4 w-4" /> Adicionar à Minha Agenda
                  </Button>
                </div>
              )}
            </div>
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
