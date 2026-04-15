import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Calendar as CalendarIcon, List, Search, Clock, MapPin,
  Link2, AlertTriangle, CheckCircle2, XCircle,
} from "lucide-react";
import { useEvents, EVENT_TYPES, type TenantEvent, type EventFormData } from "@/hooks/useEvents";
import { EventFormDialog } from "@/components/eventos/EventFormDialog";
import { EventDetailDialog } from "@/components/eventos/EventDetailDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { Calendar } from "@/components/ui/calendar";

const statusLabels: Record<string, string> = { scheduled: "Agendado", cancelled: "Cancelado", completed: "Concluído" };
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

export default function Eventos() {
  const { events, isLoading, createEvent, updateEvent, cancelEvent, deleteEvent } = useEvents();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("create_events");
  const canEdit = hasPermission("edit_events");
  const canDelete = hasPermission("delete_events");

  const [formOpen, setFormOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<TenantEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<TenantEvent | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (typeFilter !== "all" && e.event_type !== typeFilter) return false;
      return true;
    });
  }, [events, search, statusFilter, typeFilter]);

  const upcoming = filtered.filter((e) => e.status === "scheduled" && new Date(e.start_at) >= new Date());
  const past = filtered.filter((e) => e.status !== "scheduled" || new Date(e.start_at) < new Date());

  const calendarEvents = useMemo(() => {
    if (!calendarDate) return [];
    const d = calendarDate.toDateString();
    return events.filter((e) => new Date(e.start_at).toDateString() === d);
  }, [events, calendarDate]);

  const eventDates = useMemo(() => events.map((e) => new Date(e.start_at)), [events]);

  const handleCreate = (data: EventFormData) => {
    createEvent.mutate(data, { onSuccess: () => setFormOpen(false) });
  };

  const handleUpdate = (data: EventFormData) => {
    if (!editEvent) return;
    updateEvent.mutate({ ...data, id: editEvent.id }, { onSuccess: () => { setEditEvent(null); } });
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const renderCard = (ev: TenantEvent) => (
    <Card
      key={ev.id}
      className="cursor-pointer hover:border-primary/40 transition-colors group"
      onClick={() => setDetailEvent(ev)}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-1">{ev.title}</h3>
          <div className="flex gap-1 shrink-0">
            <Badge className={`text-[10px] px-1.5 ${typeColors[ev.event_type] ?? "bg-muted"}`}>{ev.event_type}</Badge>
            {ev.is_mandatory && <Badge variant="destructive" className="text-[10px] px-1.5">Obrigatório</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{fmtDate(ev.start_at)}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtTime(ev.start_at)}</span>
          {ev.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</span>}
          {ev.meeting_url && <Link2 className="h-3 w-3 text-primary" />}
        </div>
        <Badge className={`text-[10px] ${statusColors[ev.status]}`}>{statusLabels[ev.status] ?? ev.status}</Badge>

        {(canEdit || canDelete) && ev.status === "scheduled" && (
          <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            {canEdit && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditEvent(ev)}>Editar</Button>
            )}
            {canEdit && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => cancelEvent.mutate(ev.id)}>Cancelar</Button>
            )}
            {canDelete && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteEvent.mutate(ev.id)}>Excluir</Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Eventos</h1>
          <p className="text-sm text-muted-foreground">Agenda de eventos do tenant</p>
        </div>
        {canCreate && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Criar Evento
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar eventos..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="scheduled">Agendado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {EVENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list"><List className="h-4 w-4 mr-1" /> Lista</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarIcon className="h-4 w-4 mr-1" /> Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 mt-4">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Próximos Eventos</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {upcoming.map(renderCard)}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Eventos Passados</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {past.map(renderCard)}
                  </div>
                </div>
              )}
              {!upcoming.length && !past.length && (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum evento encontrado</p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <div className="grid md:grid-cols-[auto_1fr] gap-6">
            <Card className="w-fit">
              <CardContent className="p-2">
                <Calendar
                  mode="single"
                  selected={calendarDate}
                  onSelect={setCalendarDate}
                  modifiers={{ hasEvent: eventDates }}
                  modifiersClassNames={{ hasEvent: "bg-primary/20 font-bold" }}
                />
              </CardContent>
            </Card>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {calendarDate ? calendarDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "Selecione uma data"}
              </h2>
              {calendarEvents.length > 0 ? (
                <div className="grid gap-3">{calendarEvents.map(renderCard)}</div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum evento nesta data</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        loading={createEvent.isPending}
      />
      <EventFormDialog
        open={!!editEvent}
        onOpenChange={(v) => !v && setEditEvent(null)}
        onSubmit={handleUpdate}
        event={editEvent}
        loading={updateEvent.isPending}
      />
      <EventDetailDialog
        open={!!detailEvent}
        onOpenChange={(v) => !v && setDetailEvent(null)}
        event={detailEvent}
      />
    </div>
  );
}
