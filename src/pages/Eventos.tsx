import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus, Calendar as CalendarIcon, List, Search, Clock, MapPin,
  Link2, Star, AlertTriangle, Sparkles, CalendarPlus, Check,
} from "lucide-react";
import { useEventAgenda } from "@/hooks/useEventAgenda";
import { useEvents, EVENT_TYPES, type TenantEvent, type EventFormData } from "@/hooks/useEvents";
import { EventFormDialog } from "@/components/eventos/EventFormDialog";
import { EventDetailDialog } from "@/components/eventos/EventDetailDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { Calendar } from "@/components/ui/calendar";

const statusLabels: Record<string, string> = { scheduled: "Agendado", cancelled: "Cancelado", completed: "Concluído" };
const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
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

const TYPE_GRADIENTS: Record<string, string> = {
  reunião: "from-purple-600/80 to-indigo-900/90",
  treinamento: "from-amber-600/80 to-orange-900/90",
  comunicado: "from-cyan-600/80 to-teal-900/90",
  webinar: "from-pink-600/80 to-rose-900/90",
  campanha: "from-orange-600/80 to-red-900/90",
  presencial: "from-emerald-600/80 to-green-900/90",
  online: "from-indigo-600/80 to-blue-900/90",
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

  // Stats
  const totalUpcoming = events.filter((e) => e.status === "scheduled" && new Date(e.start_at) >= new Date()).length;
  const totalMandatory = events.filter((e) => e.is_mandatory && e.status === "scheduled").length;
  const todayStr = new Date().toDateString();
  const totalToday = events.filter((e) => new Date(e.start_at).toDateString() === todayStr).length;

  const handleCreate = (data: EventFormData) => {
    createEvent.mutate(data, { onSuccess: () => setFormOpen(false) });
  };

  const handleUpdate = (data: EventFormData) => {
    if (!editEvent) return;
    updateEvent.mutate({ ...data, id: editEvent.id }, { onSuccess: () => setEditEvent(null) });
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const fmtDateLong = (d: string) => new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long" });

  const getImageUrl = (ev: TenantEvent) => ev.thumbnail_url || ev.banner_url || null;
  const getGradient = (ev: TenantEvent) => TYPE_GRADIENTS[ev.event_type] || "from-slate-600/80 to-slate-900/90";

  const renderCard = (ev: TenantEvent) => {
    const imgUrl = getImageUrl(ev);
    const gradient = getGradient(ev);

    return (
      <div
        key={ev.id}
        className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] min-h-[220px] flex flex-col"
        onClick={() => setDetailEvent(ev)}
      >
        {/* Background */}
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={ev.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 group-hover:from-black/85" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-5">
          {/* Top badges */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge className={`text-[10px] px-2 py-0.5 border ${typeColors[ev.event_type] ?? "bg-muted"}`}>
                {ev.event_type}
              </Badge>
              <Badge className={`text-[10px] px-2 py-0.5 border ${statusColors[ev.status]}`}>
                {statusLabels[ev.status] ?? ev.status}
              </Badge>
            </div>
            <div className="flex gap-1">
              {ev.is_mandatory && (
                <Badge variant="destructive" className="text-[10px] px-1.5">
                  <AlertTriangle className="h-3 w-3 mr-0.5" /> Obrigatório
                </Badge>
              )}
              {ev.highlight_on_home && (
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 drop-shadow" />
              )}
            </div>
          </div>

          {/* Bottom info */}
          <div className="mt-auto space-y-2">
            <h3 className="text-lg font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
              {ev.title}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" /> {fmtDateLong(ev.start_at)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {fmtTime(ev.start_at)}
              </span>
              {ev.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {ev.location}
                </span>
              )}
              {ev.meeting_url && <Link2 className="h-3.5 w-3.5 text-primary" />}
            </div>

            {/* Hover actions */}
            {(canEdit || canDelete) && ev.status === "scheduled" && (
              <div
                className="flex gap-1.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {canEdit && (
                  <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setEditEvent(ev)}>
                    Editar
                  </Button>
                )}
                {canEdit && (
                  <Button size="sm" variant="secondary" className="h-7 text-xs text-destructive" onClick={() => cancelEvent.mutate(ev.id)}>
                    Cancelar
                  </Button>
                )}
                {canDelete && (
                  <Button size="sm" variant="secondary" className="h-7 text-xs text-destructive" onClick={() => deleteEvent.mutate(ev.id)}>
                    Excluir
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary/20 via-primary/10 to-accent/10 border border-primary/10 p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_70%)]" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">Eventos</h1>
            </div>
            <p className="text-sm text-muted-foreground">Central de eventos e comunicações do tenant</p>
          </div>
          {canCreate && (
            <Button onClick={() => setFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Criar Evento
            </Button>
          )}
        </div>

        {/* Counters */}
        <div className="relative z-10 grid grid-cols-3 gap-3 mt-6 max-w-md">
          <div className="rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{totalUpcoming}</p>
            <p className="text-[11px] text-muted-foreground">Próximos</p>
          </div>
          <div className="rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{totalMandatory}</p>
            <p className="text-[11px] text-muted-foreground">Obrigatórios</p>
          </div>
          <div className="rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{totalToday}</p>
            <p className="text-[11px] text-muted-foreground">Hoje</p>
          </div>
        </div>
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
          <TabsTrigger value="list"><List className="h-4 w-4 mr-1" /> Cards</TabsTrigger>
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
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {upcoming.map(renderCard)}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Eventos Passados</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {past.map(renderCard)}
                  </div>
                </div>
              )}
              {!upcoming.length && !past.length && (
                <div className="text-center py-16 text-muted-foreground">
                  <CalendarIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Nenhum evento encontrado</p>
                  <p className="text-sm">Crie um novo evento para começar</p>
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
                <div className="grid gap-4 sm:grid-cols-2">{calendarEvents.map(renderCard)}</div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum evento nesta data</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={handleCreate} loading={createEvent.isPending} />
      <EventFormDialog open={!!editEvent} onOpenChange={(v) => !v && setEditEvent(null)} onSubmit={handleUpdate} event={editEvent} loading={updateEvent.isPending} />
      <EventDetailDialog open={!!detailEvent} onOpenChange={(v) => !v && setDetailEvent(null)} event={detailEvent} />
    </div>
  );
}
