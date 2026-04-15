import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Megaphone, Loader2 } from "lucide-react";
import { resolveSignedUrl } from "@/hooks/useSignedUrl";

interface Announcement {
  id: string;
  title: string;
  image_url: string;
  description: string | null;
}

export function AnnouncementsCarousel() {
  const { isMaster, activeCompanyId } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    (async () => {
      let q = supabase.from("announcements").select("id,title,image_url,description")
        .eq("is_active", true).order("display_order");
      if (isMaster && activeCompanyId) q = q.eq("servidor_id", activeCompanyId);
      const { data } = await q;
      const raw = (data as Announcement[]) || [];
      // Resolve signed URLs for images from private buckets
      const resolved = await Promise.all(
        raw.map(async (item) => ({
          ...item,
          image_url: await resolveSignedUrl(item.image_url),
        }))
      );
      setItems(resolved);
      setLoading(false);
    })();
  }, [activeCompanyId]);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setCurrent(p => (p + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (loading) return (
    <Card className="flex items-center justify-center h-48">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </Card>
  );

  if (!items.length) return (
    <Card className="flex flex-col items-center justify-center h-48 text-muted-foreground">
      <Megaphone className="h-10 w-10 mb-2 opacity-30" />
      <p className="text-sm">Nenhum comunicado disponível</p>
    </Card>
  );

  return (
    <div className="relative rounded-xl overflow-hidden shadow-sm border border-border/60">
      <div className="relative aspect-[21/9] w-full bg-muted">
        {items.map((item, i) => (
          <div key={item.id} className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              {item.description && <p className="text-white/80 text-sm mt-0.5 line-clamp-2">{item.description}</p>}
            </div>
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <>
          <button onClick={() => setCurrent(p => (p - 1 + items.length) % items.length)} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setCurrent(p => (p + 1) % items.length)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {items.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
