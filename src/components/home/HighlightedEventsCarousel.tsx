import { useEvents, type TenantEvent } from "@/hooks/useEvents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const TYPE_GRADIENTS: Record<string, string> = {
  reunião: "from-purple-600/80 to-indigo-900/90",
  treinamento: "from-amber-600/80 to-orange-900/90",
  comunicado: "from-cyan-600/80 to-teal-900/90",
  webinar: "from-pink-600/80 to-rose-900/90",
  campanha: "from-orange-600/80 to-red-900/90",
  presencial: "from-emerald-600/80 to-green-900/90",
  online: "from-indigo-600/80 to-blue-900/90",
};

export function HighlightedEventsCarousel() {
  const { events } = useEvents();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const highlighted = useMemo(
    () => events.filter((e) => e.highlight_on_home && e.status === "scheduled" && new Date(e.start_at) >= new Date()),
    [events]
  );

  if (!highlighted.length) return null;

  const ev = highlighted[index % highlighted.length];
  const imgUrl = ev.thumbnail_url || ev.banner_url || null;
  const gradient = TYPE_GRADIENTS[ev.event_type] || "from-slate-600/80 to-slate-900/90";

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const prev = () => setIndex((i) => (i - 1 + highlighted.length) % highlighted.length);
  const next = () => setIndex((i) => (i + 1) % highlighted.length);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Eventos em Destaque</h2>
      </div>

      <div className="relative rounded-2xl overflow-hidden min-h-[200px] group">
        {imgUrl ? (
          <img src={imgUrl} alt={ev.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="relative z-10 flex flex-col justify-end h-full p-6 min-h-[200px]">
          <Badge className="w-fit text-[10px] px-2 py-0.5 mb-2 bg-primary/30 text-primary-foreground border border-primary/40">
            {ev.event_type}
          </Badge>
          <h3 className="text-xl font-bold text-white mb-2 drop-shadow-md">{ev.title}</h3>
          <div className="flex items-center gap-4 text-sm text-white/80 mb-3">
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {fmtDate(ev.start_at)}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {fmtTime(ev.start_at)}</span>
          </div>
          <Button size="sm" variant="secondary" className="w-fit" onClick={() => navigate("/eventos")}>
            Ver evento
          </Button>
        </div>

        {/* Nav arrows */}
        {highlighted.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dots */}
        {highlighted.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {highlighted.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index % highlighted.length ? "w-5 bg-primary" : "w-1.5 bg-white/40"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
