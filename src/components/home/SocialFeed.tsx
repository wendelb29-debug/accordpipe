import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useEvents, useEventConfirmations, type TenantEvent, EVENT_TYPES } from "@/hooks/useEvents";
import { EventFormDialog } from "@/components/eventos/EventFormDialog";
import { ManageAnnouncementsDialog } from "@/components/home/ManageAnnouncementsDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Calendar, Clock, MapPin, Users, ImagePlus, Megaphone, CalendarPlus,
  Send, Sparkles, Activity as ActivityIcon, CheckCircle2, MoreHorizontal,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { resolveSignedUrl } from "@/hooks/useSignedUrl";

type FeedItem =
  | { kind: "event"; id: string; ts: string; event: TenantEvent }
  | { kind: "announcement"; id: string; ts: string; title: string; description: string | null; image_url: string; created_by_name?: string | null }
  | { kind: "activity"; id: string; ts: string; title: string; type: string; created_by_name: string | null };

const TYPE_GRADIENT: Record<string, string> = {
  reunião: "from-violet-500/30 to-indigo-700/40",
  treinamento: "from-amber-500/30 to-orange-700/40",
  comunicado: "from-cyan-500/30 to-teal-700/40",
  webinar: "from-pink-500/30 to-rose-700/40",
  campanha: "from-orange-500/30 to-red-700/40",
  presencial: "from-emerald-500/30 to-green-700/40",
  online: "from-indigo-500/30 to-blue-700/40",
};

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("");
}

/* ─────────────────────────  COMPOSER  ───────────────────────── */
function QuickPostComposer({
  onOpenAnnouncements,
  onOpenEvent,
}: { onOpenAnnouncements: () => void; onOpenEvent: () => void }) {
  const { profile } = useAuth();
  const [text, setText] = useState("");

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
          <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
            {initials(profile?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="O que deseja compartilhar com a equipe?"
            className="min-h-[56px] resize-none border-0 bg-muted/40 focus-visible:ring-1 focus-visible:ring-primary/30 text-sm"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={onOpenAnnouncements}>
                <ImagePlus className="h-4 w-4 text-emerald-500" /> Mídia
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={onOpenEvent}>
                <CalendarPlus className="h-4 w-4 text-violet-500" /> Evento
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={onOpenAnnouncements}>
                <Megaphone className="h-4 w-4 text-amber-500" /> Comunicado
              </Button>
            </div>
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => {
                if (!text.trim()) return toast.info("Escreva algo ou use Comunicado para publicar com mídia");
                onOpenAnnouncements();
              }}
            >
              <Send className="h-3.5 w-3.5" /> Publicar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────  EVENT STORIES  ──────────────────── */
function EventStories({ events, onCreate }: { events: TenantEvent[]; onCreate: () => void }) {
  const navigate = useNavigate();
  const upcoming = events
    .filter((e) => e.status === "scheduled" && new Date(e.start_at) >= new Date())
    .slice(0, 8);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Em destaque</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCreate}>
          + Novo evento
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        <button
          onClick={onCreate}
          className="shrink-0 w-[120px] h-[150px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <CalendarPlus className="h-6 w-6" />
          Criar evento
        </button>
        {upcoming.map((ev) => {
          const grad = TYPE_GRADIENT[ev.event_type] || "from-slate-500/30 to-slate-700/40";
          return (
            <button
              key={ev.id}
              onClick={() => navigate("/eventos")}
              className="shrink-0 w-[120px] h-[150px] rounded-xl relative overflow-hidden group ring-1 ring-border/50 hover:ring-primary/40 transition-all"
            >
              {ev.thumbnail_url || ev.banner_url ? (
                <img src={ev.thumbnail_url || ev.banner_url!} alt={ev.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute top-2 left-2 right-2">
                <Badge className="text-[9px] px-1.5 py-0 bg-white/15 text-white border-white/20 backdrop-blur-sm capitalize">
                  {ev.event_type}
                </Badge>
              </div>
              <div className="absolute bottom-2 left-2 right-2 text-left">
                <p className="text-[11px] font-semibold text-white line-clamp-2 leading-tight">{ev.title}</p>
                <p className="text-[10px] text-white/70 mt-1">{format(new Date(ev.start_at), "dd MMM", { locale: ptBR })}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────  EVENT CARD  ─────────────────────── */
function EventFeedCard({ event }: { event: TenantEvent }) {
  const navigate = useNavigate();
  const { confirmed, myStatus, respond } = useEventConfirmations(event.id);
  const grad = TYPE_GRADIENT[event.event_type] || "from-slate-500/30 to-slate-700/40";
  const isUpcoming = new Date(event.start_at) >= new Date();
  const cover = event.banner_url || event.thumbnail_url;

  return (
    <article className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 p-4">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Novo evento</p>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">{event.event_type}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
      </div>

      <div className="relative aspect-[16/7] w-full overflow-hidden">
        {cover ? (
          <img src={cover} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${grad}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <h3 className="text-lg font-bold drop-shadow">{event.title}</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/90 mt-1">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(event.start_at), "dd 'de' MMM", { locale: ptBR })}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(event.start_at), "HH:mm", { locale: ptBR })}</span>
            {event.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>}
          </div>
        </div>
      </div>

      {event.description && (
        <p className="text-sm text-muted-foreground px-4 pt-3 line-clamp-2">{event.description}</p>
      )}

      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" /> {confirmed} confirmados
        </div>
        <div className="flex gap-2">
          {isUpcoming && (
            <Button
              size="sm"
              variant={myStatus === "confirmed" ? "default" : "outline"}
              className="h-8 gap-1.5"
              onClick={() => respond.mutate(myStatus === "confirmed" ? "declined" : "confirmed")}
              disabled={respond.isPending}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {myStatus === "confirmed" ? "Vou participar" : "Participar"}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-8" onClick={() => navigate("/eventos")}>
            Detalhes
          </Button>
        </div>
      </div>
    </article>
  );
}

/* ──────────────────────  ANNOUNCEMENT CARD  ─────────────────── */
function AnnouncementFeedCard({ item }: { item: Extract<FeedItem, { kind: "announcement" }> }) {
  return (
    <article className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 p-4">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/5 flex items-center justify-center">
          <Megaphone className="h-5 w-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Comunicado oficial</p>
          <p className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(item.ts), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="px-4 pb-3">
        <h3 className="text-base font-bold text-foreground">{item.title}</h3>
        {item.description && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.description}</p>}
      </div>

      {item.image_url && (
        <div className="relative w-full max-h-[420px] overflow-hidden bg-muted">
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
        </div>
      )}
    </article>
  );
}

/* ──────────────────────  ACTIVITY MINI CARD  ────────────────── */
function ActivityMiniCard({ item }: { item: Extract<FeedItem, { kind: "activity" }> }) {
  return (
    <article className="rounded-2xl border border-border/50 bg-card/60 px-4 py-3 flex items-center gap-3">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="text-[11px] bg-accent text-accent-foreground">
          {initials(item.created_by_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <ActivityIcon className="h-3 w-3" />
          {item.created_by_name || "Sistema"} · {formatDistanceToNow(new Date(item.ts), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </article>
  );
}

/* ─────────────────────────  MAIN FEED  ──────────────────────── */
export function SocialFeed() {
  const tenantId = useActiveCompanyId();
  const { isMaster } = useAuth();
  const { events, createEvent } = useEvents();
  const [eventOpen, setEventOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const announcementsQ = useQuery({
    queryKey: ["feed-announcements", tenantId, isMaster],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase.from("announcements").select("id,title,image_url,description,created_at,created_by")
        .eq("is_active", true).order("created_at", { ascending: false }).limit(15);
      if (isMaster && tenantId) q = q.eq("servidor_id", tenantId);
      const { data } = await q;
      const rows = (data ?? []) as any[];
      return await Promise.all(rows.map(async (r) => ({
        ...r,
        image_url: r.image_url ? await resolveSignedUrl(r.image_url) : "",
      })));
    },
  });

  const activitiesQ = useQuery({
    queryKey: ["feed-activities", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_lead_activities")
        .select("id,title,type,created_by_name,created_at")
        .eq("servidor_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data ?? []) as any[];
    },
  });

  const announcementsList = announcementsQ.data ?? [];

  const refetchAnnouncements = announcementsQ.refetch;

  const merged = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    for (const ev of events) {
      items.push({ kind: "event", id: ev.id, ts: ev.created_at, event: ev });
    }
    for (const a of announcementsList) {
      items.push({
        kind: "announcement", id: a.id, ts: a.created_at,
        title: a.title, description: a.description, image_url: a.image_url,
      });
    }
    for (const act of activitiesQ.data ?? []) {
      items.push({
        kind: "activity", id: act.id, ts: act.created_at,
        title: act.title, type: act.type, created_by_name: act.created_by_name,
      });
    }
    return items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [events, announcementsList, activitiesQ.data]);

  return (
    <div className="space-y-4">
      <QuickPostComposer
        onOpenAnnouncements={() => setManageOpen(true)}
        onOpenEvent={() => setEventOpen(true)}
      />

      <EventStories events={events} onCreate={() => setEventOpen(true)} />

      <div className="flex items-center gap-3 pt-2">
        <Separator className="flex-1" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Feed</span>
        <Separator className="flex-1" />
      </div>

      {merged.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nada por aqui ainda. Publique o primeiro comunicado ou evento!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {merged.map((it) => {
            if (it.kind === "event") return <EventFeedCard key={`e-${it.id}`} event={it.event} />;
            if (it.kind === "announcement") return <AnnouncementFeedCard key={`a-${it.id}`} item={it} />;
            return <ActivityMiniCard key={`t-${it.id}`} item={it} />;
          })}
        </div>
      )}

      <EventFormDialog
        open={eventOpen}
        onOpenChange={setEventOpen}
        onSubmit={(data) => createEvent.mutate(data, { onSuccess: () => setEventOpen(false) })}
        loading={createEvent.isPending}
      />
      <ManageAnnouncementsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        announcements={announcementsList.map((a) => ({
          id: a.id, title: a.title, image_url: a.image_url, description: a.description,
        }))}
        onRefresh={refetchAnnouncements}
      />
    </div>
  );
}
