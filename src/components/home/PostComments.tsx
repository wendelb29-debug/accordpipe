import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { resolveSignedUrl } from "@/hooks/useSignedUrl";

interface CommentRow {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  author?: { name: string | null; avatar_url: string | null };
}

const GRADIENTS = [
  "linear-gradient(135deg,#5b3fd4,#7c3aed)",
  "linear-gradient(135deg,#3b82f6,#1d4ed8)",
  "linear-gradient(135deg,#ec4899,#be185d)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
  "linear-gradient(135deg,#06b6d4,#0891b2)",
  "linear-gradient(135deg,#8b5cf6,#6d28d9)",
];

export function gradientFor(id?: string | null) {
  if (!id) return GRADIENTS[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

export function initials(name?: string | null) {
  if (!name) return "??";
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "??";
}

export function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function PostComments({ postId, servidorId }: { postId: string; servidorId?: string }) {
  const { user, profile } = useAuth();
  const companyId = useActiveCompanyId();
  const tenantId = servidorId || companyId || "";
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("feed_post_comments")
      .select("id, content, user_id, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    const rows = (data || []) as CommentRow[];
    const ids = Array.from(new Set(rows.map(c => c.user_id)));
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles").select("user_id,name,avatar_url").in("user_id", ids);
      const map: Record<string, any> = {};
      await Promise.all(((profs || []) as any[]).map(async (p) => {
        const url = p.avatar_url ? await resolveSignedUrl(p.avatar_url).catch(() => p.avatar_url) : null;
        map[p.user_id] = { name: p.name, avatar_url: url };
      }));
      rows.forEach(c => { c.author = map[c.user_id]; });
    }
    setComments(rows);
    setLoading(false);
  };

  useEffect(() => { load(); }, [postId]);

  const handleSend = async () => {
    if (!text.trim() || !user?.id) return;
    const { error } = await (supabase as any).from("feed_post_comments").insert({
      post_id: postId,
      user_id: user.id,
      servidor_id: servidorId,
      content: text.trim(),
    });
    if (error) {
      toast({ title: "Erro ao comentar", description: error.message, variant: "destructive" });
      return;
    }
    setText("");
    await load();
    qc.invalidateQueries({ queryKey: ["feed-posts-v2"] });
  };

  return (
    <div className="afp-post-comments">
      {loading && <div style={{ fontSize: 11, opacity: 0.6 }}>Carregando comentários…</div>}
      {!loading && comments.length === 0 && (
        <div style={{ fontSize: 11.5, color: "hsl(var(--muted-foreground))", padding: "4px 0 8px" }}>
          Seja o primeiro a comentar.
        </div>
      )}
      {comments.map(c => (
        <div className="afp-comment" key={c.id}>
          <div className="afp-comment-av" style={{ background: gradientFor(c.user_id) }}>
            {c.author?.avatar_url
              ? <img src={c.author.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: 10, objectFit: "cover" }} />
              : initials(c.author?.name)}
          </div>
          <div style={{ flex: 1 }}>
            <div className="afp-comment-bubble">
              <div className="afp-comment-author">{c.author?.name || "Colega"}</div>
              <div className="afp-comment-text">{c.content}</div>
            </div>
            <div className="afp-comment-actions">
              <span>{relativeTime(c.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
      <div className="afp-comment-input-row">
        <div
          className="afp-comment-av"
          style={{ background: gradientFor(user?.id), width: 30, height: 30, borderRadius: 10 }}
        >
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: 10, objectFit: "cover" }} />
            : initials(profile?.name)}
        </div>
        <input
          className="afp-comment-input"
          placeholder="Escrever comentário..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
        />
      </div>
    </div>
  );
}
