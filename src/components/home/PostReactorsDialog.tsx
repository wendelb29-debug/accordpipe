import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { gradientFor, initials } from "./PostComments";

interface Reactor {
  user_id: string;
  emoji: string;
  user_name: string | null;
}

export function PostReactorsDialog({
  postId, open, onOpenChange,
}: {
  postId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [reactors, setReactors] = useState<Reactor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !postId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: reacts } = await (supabase as any)
        .from("feed_post_reactions")
        .select("user_id, emoji, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });
      const userIds = Array.from(new Set(((reacts || []) as any[]).map((r) => r.user_id)));
      let profMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles").select("user_id,name").in("user_id", userIds);
        (profs || []).forEach((p: any) => { profMap[p.user_id] = p; });
      }
      if (cancelled) return;
      setReactors(((reacts || []) as any[]).map((r) => ({
        user_id: r.user_id,
        emoji: r.emoji,
        user_name: profMap[r.user_id]?.name || null,
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [postId, open]);

  const groups = reactors.reduce<Record<string, Reactor[]>>((acc, r) => {
    (acc[r.emoji] ||= []).push(r);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reações ({reactors.length})</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2 max-h-96 overflow-y-auto">
          {loading && <div className="text-xs text-muted-foreground py-3">Carregando…</div>}
          {!loading && reactors.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">Nenhuma reação ainda.</p>
          )}
          {Object.entries(groups).map(([emoji, users]) => (
            <div key={emoji}>
              <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                <span className="text-base">{emoji}</span>
                {users.length} {users.length === 1 ? "reação" : "reações"}
              </div>
              <div className="space-y-1">
                {users.map((u) => (
                  <div key={u.user_id + emoji} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: gradientFor(u.user_id) }}
                    >
                      {initials(u.user_name)}
                    </div>
                    <span className="text-[12.5px] font-medium text-foreground">{u.user_name || "Colega"}</span>
                    <span className="ml-auto text-base">{u.emoji}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
