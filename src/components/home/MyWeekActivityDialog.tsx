import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { Heart, MessageCircle, Bell, FileText, Loader2 } from "lucide-react";
import { relativeTime } from "./PostComments";

export type MyWeekTab = "posts" | "reactions" | "comments" | "follows";

interface PostItem {
  id: string;
  content: string;
  created_at: string;
  author_name?: string | null;
  reactions_count?: number;
  comments_count?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialTab: MyWeekTab;
  onOpenPost?: (postId: string) => void;
}

export function MyWeekActivityDialog({ open, onOpenChange, initialTab, onOpenPost }: Props) {
  const { user } = useAuth();
  const companyId = useActiveCompanyId();
  const [tab, setTab] = useState<MyWeekTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PostItem[]>([]);

  useEffect(() => { if (open) setTab(initialTab); }, [open, initialTab]);

  useEffect(() => {
    if (!open || !user?.id || !companyId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        let postIds: string[] = [];

        if (tab === "posts") {
          const { data } = await supabase
            .from("feed_posts")
            .select("id,content,created_at,author_id")
            .eq("servidor_id", companyId)
            .eq("author_id", user.id)
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(50);
          if (cancelled) return;
          const rows = (data || []) as any[];
          postIds = rows.map(r => r.id);
          await enrichAndSet(rows, postIds);
        } else if (tab === "reactions") {
          const { data } = await (supabase as any)
            .from("feed_post_reactions")
            .select("post_id, created_at")
            .eq("user_id", user.id)
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(50);
          postIds = Array.from(new Set(((data || []) as any[]).map(r => r.post_id)));
          await loadPostsByIds(postIds);
        } else if (tab === "comments") {
          const { data } = await (supabase as any)
            .from("feed_post_comments")
            .select("post_id, created_at")
            .eq("user_id", user.id)
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(50);
          postIds = Array.from(new Set(((data || []) as any[]).map(r => r.post_id)));
          await loadPostsByIds(postIds);
        } else {
          const { data } = await (supabase as any)
            .from("feed_post_follows")
            .select("post_id, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50);
          postIds = Array.from(new Set(((data || []) as any[]).map(r => r.post_id)));
          await loadPostsByIds(postIds);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    async function loadPostsByIds(ids: string[]) {
      if (ids.length === 0) { if (!cancelled) setItems([]); return; }
      const { data } = await supabase
        .from("feed_posts")
        .select("id,content,created_at,author_id")
        .in("id", ids);
      const rows = (data || []) as any[];
      const orderMap = new Map(ids.map((id, i) => [id, i]));
      rows.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
      await enrichAndSet(rows, rows.map(r => r.id));
    }

    async function enrichAndSet(rows: any[], ids: string[]) {
      if (ids.length === 0) { if (!cancelled) setItems([]); return; }
      const authorIds = Array.from(new Set(rows.map(r => r.author_id).filter(Boolean)));
      const [profsRes, reactsRes, commsRes] = await Promise.all([
        authorIds.length
          ? supabase.from("profiles").select("user_id,name").in("user_id", authorIds)
          : Promise.resolve({ data: [] as any[] } as any),
        (supabase as any).from("feed_post_reactions").select("post_id").in("post_id", ids),
        (supabase as any).from("feed_post_comments").select("post_id").in("post_id", ids),
      ]);
      const nameMap = new Map<string, string>();
      ((profsRes.data || []) as any[]).forEach(p => nameMap.set(p.user_id, p.name));
      const rCount: Record<string, number> = {};
      ((reactsRes.data || []) as any[]).forEach(r => { rCount[r.post_id] = (rCount[r.post_id] || 0) + 1; });
      const cCount: Record<string, number> = {};
      ((commsRes.data || []) as any[]).forEach(c => { cCount[c.post_id] = (cCount[c.post_id] || 0) + 1; });

      if (cancelled) return;
      setItems(rows.map(r => ({
        id: r.id,
        content: r.content || "",
        created_at: r.created_at,
        author_name: nameMap.get(r.author_id) || null,
        reactions_count: rCount[r.id] || 0,
        comments_count: cCount[r.id] || 0,
      })));
    }

    return () => { cancelled = true; };
  }, [open, tab, user?.id, companyId]);

  const empty: Record<MyWeekTab, string> = {
    posts: "Você ainda não publicou nada nos últimos 7 dias.",
    reactions: "Você ainda não reagiu a publicações nos últimos 7 dias.",
    comments: "Você ainda não comentou em publicações nos últimos 7 dias.",
    follows: "Você ainda não está seguindo nenhuma publicação.",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Sua atividade na semana</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as MyWeekTab)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="posts" className="gap-1.5"><FileText className="w-3.5 h-3.5" />Posts</TabsTrigger>
            <TabsTrigger value="reactions" className="gap-1.5"><Heart className="w-3.5 h-3.5" />Reações</TabsTrigger>
            <TabsTrigger value="comments" className="gap-1.5"><MessageCircle className="w-3.5 h-3.5" />Coment.</TabsTrigger>
            <TabsTrigger value="follows" className="gap-1.5"><Bell className="w-3.5 h-3.5" />Seguindo</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-3 max-h-[60vh] overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando...
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">{empty[tab]}</div>
            ) : items.map(item => (
              <button
                key={item.id}
                onClick={() => { onOpenChange(false); onOpenPost?.(item.id); }}
                className="w-full text-left rounded-lg border border-border bg-card hover:bg-accent/40 transition p-3"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground">{item.author_name || "Colega"}</span>
                  <span className="text-[11px] text-muted-foreground">{relativeTime(item.created_at)}</span>
                </div>
                <div className="text-sm text-foreground/90 line-clamp-2 whitespace-pre-wrap break-words">
                  {item.content || <span className="italic text-muted-foreground">(sem texto)</span>}
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" />{item.reactions_count}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" />{item.comments_count}</span>
                </div>
              </button>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
