import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useEvents, useEventConfirmations, type TenantEvent } from "@/hooks/useEvents";
import { EventFormDialog } from "@/components/eventos/EventFormDialog";
import { ManageAnnouncementsDialog } from "@/components/home/ManageAnnouncementsDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar, Clock, MapPin, Users, ImagePlus, Megaphone, CalendarPlus,
  Send, Heart, MessageCircle, Share2, CheckCircle2, MoreHorizontal, Sparkles,
  Sparkle, Paperclip, FileText, AtSign, Quote, Hash, Video, Type, Search, X, Plus,
} from "lucide-react";

import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { resolveSignedUrl } from "@/hooks/useSignedUrl";

type FeedItem =
  | { kind: "event"; id: string; ts: string; event: TenantEvent }
  | { kind: "announcement"; id: string; ts: string; title: string; description: string | null; image_url: string }
  | { kind: "activity"; id: string; ts: string; title: string; type: string; created_by_name: string | null };

const TYPE_GRADIENT: Record<string, string> = {
  reunião: "from-violet-500 via-purple-600 to-indigo-700",
  treinamento: "from-amber-500 via-orange-500 to-red-600",
  comunicado: "from-cyan-500 via-sky-600 to-blue-700",
  webinar: "from-pink-500 via-rose-500 to-fuchsia-700",
  campanha: "from-orange-500 via-red-500 to-pink-600",
  presencial: "from-emerald-500 via-green-600 to-teal-700",
  online: "from-indigo-500 via-blue-600 to-cyan-700",
};

const initials = (n?: string | null) =>
  !n ? "?" : n.split(" ").filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("");

/* ───────────────────────────  COMPOSER (Bitrix-style)  ─────────────────────────── */
const COMPOSER_TABS = ["Mensagem", "Evento", "Enquete", "Arquivo", "Mais"] as const;
type ComposerTab = typeof COMPOSER_TABS[number];

function QuickPostComposer({
  onOpenAnnouncements, onOpenEvent,
}: { onOpenAnnouncements: () => void; onOpenEvent: () => void }) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<ComposerTab>("Mensagem");
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (tab === "Evento") return onOpenEvent();
    if (!text.trim()) return toast.info("Escreva algo ou use Comunicado para publicar com mídia");
    onOpenAnnouncements();
  };

  const handleTab = (t: ComposerTab) => {
    setTab(t);
    if (t === "Evento") onOpenEvent();
    if (t === "Arquivo") onOpenAnnouncements();
  };

  const toolbar = [
    { icon: Sparkle, label: "CoPilot", color: "text-violet-500" },
    { icon: Paperclip, label: "Arquivo", onClick: onOpenAnnouncements },
    { icon: FileText, label: "Criar documento" },
    { icon: AtSign, label: "Mencionar" },
    { icon: Quote, label: "Citação" },
    { icon: Hash, label: "Marca" },
    { icon: Video, label: "Gravar vídeo" },
  ];

  return (
    <div className="animate-fade-in rounded-2xl bg-card/95 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.25)] overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-white/[0.06]">
        {COMPOSER_TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => handleTab(t)}
              className={`relative px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* Textarea area */}
      <div className="px-5 pt-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20 shrink-0">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="bg-gradient-to-br from-primary to-violet-600 text-white text-xs font-semibold">
              {initials(profile?.name)}
            </AvatarFallback>
          </Avatar>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              tab === "Evento" ? "Crie um novo evento…" :
              tab === "Enquete" ? "Faça uma pergunta para a equipe…" :
              tab === "Arquivo" ? "Anexe um arquivo para compartilhar…" :
              "O que deseja compartilhar?"
            }
            className="min-h-[110px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-[15px] placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Action toolbar */}
      <div className="px-5 pt-2 pb-3 flex flex-wrap items-center gap-1 border-t border-white/[0.04]">
        {toolbar.map((t, i) => (
          <button
            key={i}
            onClick={t.onClick}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
          >
            <t.icon className={`h-4 w-4 ${t.color ?? ""}`} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Recipients */}
      <div className="px-5 py-3 flex items-center gap-3 border-t border-white/[0.04] bg-white/[0.015]">
        <span className="text-[12px] font-medium text-muted-foreground shrink-0">Para:</span>
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <Badge variant="secondary" className="h-7 px-2.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 gap-1.5">
            <Users className="h-3 w-3" />
            Todos os colaboradores
            <X className="h-3 w-3 opacity-60 hover:opacity-100 cursor-pointer ml-1" />
          </Badge>
          <button className="flex items-center gap-1 h-7 px-2 rounded-md text-[12px] font-medium text-primary hover:bg-primary/10 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Adicionar mais
          </button>
        </div>
      </div>

      {/* Submit */}
      <div className="px-5 py-3 flex items-center gap-2 border-t border-white/[0.04]">
        <Button
          onClick={handleSubmit}
          className="h-9 px-5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold tracking-wide text-[12px] uppercase"
        >
          Enviar
        </Button>
        <Button
          variant="ghost"
          onClick={() => setText("")}
          className="h-9 px-4 rounded-md text-muted-foreground hover:text-foreground font-semibold tracking-wide text-[12px] uppercase"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────  FEED HEADER BAR  ─────────────────────── */
function FeedHeaderBar() {
  return (
    <div className="flex items-center gap-4 px-1">
      <h2 className="text-2xl font-bold tracking-tight">Feed</h2>
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <input
          type="text"
          placeholder="Filtro e pesquisa"
          className="w-full h-10 pl-9 pr-3 rounded-lg bg-card/60 ring-1 ring-white/5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-primary/40 transition"
        />
      </div>
    </div>
  );
}


/* ───────────────────────  POST ACTIONS BAR  ─────────────────────── */
function PostActionsBar({ confirmed = 0 }: { confirmed?: number }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(Math.max(confirmed, 0));
  return (
    <div className="flex items-center gap-1 pt-3 mt-3 border-t border-white/[0.04]">
      <button
        onClick={() => { setLiked(!liked); setLikes(l => liked ? l - 1 : l + 1); }}
        className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-medium transition-all hover:bg-white/5 ${liked ? "text-rose-500" : "text-muted-foreground"}`}
      >
        <Heart className={`h-4 w-4 transition-transform ${liked ? "fill-rose-500 scale-110" : ""}`} />
        {likes > 0 && <span>{likes}</span>}
      </button>
      <button className="flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-medium text-muted-foreground hover:bg-white/5 transition-colors">
        <MessageCircle className="h-4 w-4" /> Comentar
      </button>
      <button className="flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-medium text-muted-foreground hover:bg-white/5 transition-colors">
        <Share2 className="h-4 w-4" /> Compartilhar
      </button>
    </div>
  );
}

/* ─────────────────────────  EVENT FEED CARD  ─────────────────────── */
function EventFeedCard({ event, index }: { event: TenantEvent; index: number }) {
  const navigate = useNavigate();
  const { confirmed, myStatus, respond } = useEventConfirmations(event.id);
  const grad = TYPE_GRADIENT[event.event_type] || "from-slate-500 to-slate-700";
  const isUpcoming = new Date(event.start_at) >= new Date();
  const cover = event.banner_url || event.thumbnail_url;
  const day = format(new Date(event.start_at), "dd", { locale: ptBR });
  const month = format(new Date(event.start_at), "MMM", { locale: ptBR }).toUpperCase();

  return (
    <article
      className="group animate-fade-in rounded-3xl bg-card/70 backdrop-blur-xl ring-1 ring-white/5 hover:ring-white/10 shadow-[0_4px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.16)] transition-all overflow-hidden"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* author row */}
      <div className="flex items-center gap-3 px-5 pt-5">
        <div className="relative h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/10 ring-1 ring-white/10 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Novo evento</p>
            <Badge variant="secondary" className="text-[10px] px-2 py-0 capitalize bg-white/5 border-0">{event.event_type}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        <button className="h-9 w-9 rounded-full hover:bg-white/5 flex items-center justify-center text-muted-foreground transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* banner */}
      <div className="relative mt-4 mx-5 rounded-2xl overflow-hidden aspect-[16/8] group/banner">
        {cover ? (
          <img src={cover} alt={event.title} className="absolute inset-0 w-full h-full object-cover group-hover/banner:scale-[1.03] transition-transform duration-700" />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

        {/* date chip */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-2 text-center shadow-xl min-w-[56px]">
          <div className="text-[10px] font-bold text-rose-500 leading-none">{month}</div>
          <div className="text-xl font-bold text-slate-900 leading-none mt-0.5">{day}</div>
        </div>

        {/* event meta */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <h3 className="text-xl md:text-2xl font-bold drop-shadow-lg leading-tight">{event.title}</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/90 mt-2">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {format(new Date(event.start_at), "HH:mm", { locale: ptBR })}</span>
            {event.location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {event.location}</span>}
          </div>
        </div>
      </div>

      {/* body */}
      <div className="px-5 pt-4">
        {event.description && (
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">{event.description}</p>
        )}

        {/* participants + CTA */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`h-7 w-7 rounded-full ring-2 ring-card bg-gradient-to-br ${TYPE_GRADIENT[Object.keys(TYPE_GRADIENT)[i % 7]]}`} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{confirmed}</span> confirmados
            </span>
          </div>
          {isUpcoming && (
            <Button
              size="sm"
              className={`h-9 px-4 rounded-full font-medium transition-all ${
                myStatus === "confirmed"
                  ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border border-emerald-500/30"
                  : "bg-gradient-to-r from-primary to-violet-600 text-white shadow-lg shadow-primary/20 hover:opacity-90"
              }`}
              onClick={() => respond.mutate(myStatus === "confirmed" ? "declined" : "confirmed")}
              disabled={respond.isPending}
            >
              {myStatus === "confirmed" ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Vou participar</> : "Participar"}
            </Button>
          )}
        </div>

        <PostActionsBar confirmed={confirmed} />
      </div>
      <div className="h-2" />
    </article>
  );
}

/* ──────────────────────  ANNOUNCEMENT FEED CARD  ─────────────────── */
function AnnouncementFeedCard({ item, index }: { item: Extract<FeedItem, { kind: "announcement" }>; index: number }) {
  return (
    <article
      className="group animate-fade-in rounded-3xl bg-card/70 backdrop-blur-xl ring-1 ring-white/5 hover:ring-white/10 shadow-[0_4px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.16)] transition-all overflow-hidden"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center gap-3 px-5 pt-5">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/10 ring-1 ring-white/10 flex items-center justify-center">
          <Megaphone className="h-5 w-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Comunicado</p>
            <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-amber-500/10 text-amber-500 border-0">oficial</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(item.ts), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        <button className="h-9 w-9 rounded-full hover:bg-white/5 flex items-center justify-center text-muted-foreground transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5 pt-4">
        <h3 className="text-lg font-bold text-foreground leading-tight">{item.title}</h3>
        {item.description && <p className="text-sm text-foreground/75 mt-2 leading-relaxed">{item.description}</p>}
      </div>

      {item.image_url && (
        <div className="relative mt-4 mx-5 rounded-2xl overflow-hidden bg-muted/40 group/img">
          <img src={item.image_url} alt={item.title} className="w-full max-h-[480px] object-cover group-hover/img:scale-[1.02] transition-transform duration-700" />
        </div>
      )}

      <div className="px-5 pt-3 pb-5">
        <PostActionsBar />
      </div>
    </article>
  );
}

/* ──────────────────────  ACTIVITY MINI CARD  ───────────────────── */
function ActivityMiniCard({ item, index }: { item: Extract<FeedItem, { kind: "activity" }>; index: number }) {
  return (
    <article
      className="group animate-fade-in flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-card/40 backdrop-blur-md ring-1 ring-white/[0.04] hover:bg-card/60 transition-all"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <Avatar className="h-9 w-9 ring-1 ring-white/10">
        <AvatarFallback className="text-[11px] bg-gradient-to-br from-slate-600 to-slate-800 text-white">
          {initials(item.created_by_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/90 truncate">
          <span className="font-semibold">{item.created_by_name || "Sistema"}</span>
          <span className="text-muted-foreground"> · {item.title}</span>
        </p>
        <p className="text-[11px] text-muted-foreground/80">
          {formatDistanceToNow(new Date(item.ts), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </article>
  );
}

/* ─────────────────────────  SKELETON  ───────────────────────── */
function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-3xl bg-card/40 ring-1 ring-white/5 p-5 animate-pulse">
          <div className="flex gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 bg-white/5 rounded" />
              <div className="h-2 w-20 bg-white/5 rounded" />
            </div>
          </div>
          <div className="mt-4 aspect-[16/8] rounded-2xl bg-white/5" />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────  MAIN FEED  ─────────────────────── */
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
        ...r, image_url: r.image_url ? await resolveSignedUrl(r.image_url) : "",
      })));
    },
  });

  const announcementsList = announcementsQ.data ?? [];
  const refetchAnnouncements = announcementsQ.refetch;

  const merged = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    for (const ev of events) items.push({ kind: "event", id: ev.id, ts: ev.created_at, event: ev });
    for (const a of announcementsList) items.push({
      kind: "announcement", id: a.id, ts: a.created_at,
      title: a.title, description: a.description, image_url: a.image_url,
    });
    return items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [events, announcementsList]);

  const isLoading = announcementsQ.isLoading;

  let postIndex = 0;

  return (
    <div className="space-y-4">
      <QuickPostComposer
        onOpenAnnouncements={() => setManageOpen(true)}
        onOpenEvent={() => setEventOpen(true)}
      />

      {isLoading ? (
        <FeedSkeleton />
      ) : merged.length === 0 ? (
        <div className="rounded-3xl bg-card/40 backdrop-blur-md ring-1 ring-white/5 p-12 text-center animate-fade-in">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/10 mx-auto flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <p className="text-base font-semibold mb-1">Seu feed está vazio</p>
          <p className="text-sm text-muted-foreground">Publique o primeiro comunicado ou crie um evento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {merged.map((it) => {
            const idx = postIndex++;
            if (it.kind === "event") return <EventFeedCard key={`e-${it.id}`} event={it.event} index={idx} />;
            if (it.kind === "announcement") return <AnnouncementFeedCard key={`a-${it.id}`} item={it} index={idx} />;
            return null;
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
