import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { resolveSignedUrl } from "@/hooks/useSignedUrl";
import { MentionTextarea, renderMentionContent, type MentionResult } from "./MentionTextarea";

interface CommentRow {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  parent_id: string | null;
  mentions: string[];
  mention_all: boolean;
  author?: { name: string | null; avatar_url: string | null };
  reactions_count: number;
  reacted_by_me: boolean;
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

function CommentAvatar({ id, name, url, size = 32 }: { id?: string; name?: string | null; url?: string | null; size?: number }) {
  return (
    <div
      className="afp-comment-av"
      style={{
        background: gradientFor(id),
        width: size,
        height: size,
        borderRadius: size >= 30 ? 10 : 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size >= 30 ? 12 : 10,
        fontWeight: 600,
        color: "#fff",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }} /> : initials(name)}
    </div>
  );
}

export function PostComments({ postId, servidorId }: { postId: string; servidorId?: string }) {
  const { user, profile, isAdmin, isCeo, isMaster } = useAuth();
  const companyId = useActiveCompanyId();
  const tenantId = servidorId || companyId || "";
  const qc = useQueryClient();
  const canMentionAll = isAdmin || isCeo || isMaster;

  const [text, setText] = useState("");
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const load = async () => {
    const { data } = await (supabase as any)
      .from("feed_post_comments")
      .select("id, content, user_id, created_at, parent_id, mentions, mention_all")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    const rows = ((data || []) as any[]).map((c) => ({
      ...c,
      mentions: c.mentions || [],
      reactions_count: 0,
      reacted_by_me: false,
    })) as CommentRow[];

    const ids = Array.from(new Set(rows.map((c) => c.user_id)));
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,name,avatar_url")
        .in("user_id", ids);
      const map: Record<string, any> = {};
      await Promise.all(
        ((profs || []) as any[]).map(async (p) => {
          const url = p.avatar_url ? await resolveSignedUrl(p.avatar_url).catch(() => p.avatar_url) : null;
          map[p.user_id] = { name: p.name, avatar_url: url };
        })
      );
      rows.forEach((c) => {
        c.author = map[c.user_id];
      });
    }

    // Load reactions
    const commentIds = rows.map((r) => r.id);
    if (commentIds.length > 0) {
      const { data: reacts } = await (supabase as any)
        .from("feed_comment_reactions")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);
      const countMap: Record<string, number> = {};
      const meMap: Record<string, boolean> = {};
      ((reacts as any[]) || []).forEach((r) => {
        countMap[r.comment_id] = (countMap[r.comment_id] || 0) + 1;
        if (r.user_id === user?.id) meMap[r.comment_id] = true;
      });
      rows.forEach((r) => {
        r.reactions_count = countMap[r.id] || 0;
        r.reacted_by_me = !!meMap[r.id];
      });
    }

    setComments(rows);
    setLoading(false);
  };

  useEffect(() => { load(); }, [postId]);

  const handleSend = async (parentId: string | null, payload: MentionResult) => {
    if (!payload.text.trim() || !user?.id || !postId) return;
    if (!tenantId) {
      toast({ title: "Erro ao comentar", description: "Empresa ativa não detectada", variant: "destructive" });
      return;
    }
    const { error } = await (supabase as any).from("feed_post_comments").insert({
      post_id: postId,
      user_id: user.id,
      servidor_id: tenantId,
      content: payload.text.trim(),
      parent_id: parentId,
      mentions: payload.mentions,
      mention_all: payload.mention_all && canMentionAll,
    });
    if (error) {
      console.error("[PostComments] insert error:", error);
      toast({ title: "Erro ao comentar", description: error.message, variant: "destructive" });
      return;
    }
    if (parentId) { setReplyText(""); setReplyingTo(null); } else { setText(""); }
    await load();
    qc.invalidateQueries({ queryKey: ["feed-posts-v2"] });
  };

  const toggleReaction = async (commentId: string, reacted: boolean) => {
    if (!user?.id || !tenantId) return;
    if (reacted) {
      await (supabase as any)
        .from("feed_comment_reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);
    } else {
      await (supabase as any).from("feed_comment_reactions").insert({
        comment_id: commentId,
        user_id: user.id,
        servidor_id: tenantId,
        emoji: "❤️",
      });
    }
    await load();
  };

  const { roots, childrenByParent } = useMemo(() => {
    const roots: CommentRow[] = [];
    const childrenByParent: Record<string, CommentRow[]> = {};
    comments.forEach((c) => {
      if (c.parent_id) {
        (childrenByParent[c.parent_id] = childrenByParent[c.parent_id] || []).push(c);
      } else {
        roots.push(c);
      }
    });
    return { roots, childrenByParent };
  }, [comments]);

  const renderComment = (c: CommentRow, isReply = false) => (
    <div key={c.id} className="afp-comment" style={{ display: "flex", gap: 8, marginLeft: isReply ? 40 : 0, marginTop: 8 }}>
      <CommentAvatar id={c.user_id} name={c.author?.name} url={c.author?.avatar_url} size={isReply ? 26 : 32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="afp-comment-bubble"
          style={{
            background: "hsl(var(--muted))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border) / 0.55)",
            padding: "8px 12px",
            borderRadius: 12,
          }}
        >
          <div className="afp-comment-author" style={{ fontSize: 12.5, fontWeight: 600 }}>{c.author?.name || "Colega"}</div>
          <div className="afp-comment-text" style={{ fontSize: 13, marginTop: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {renderMentionContent(c.content)}
          </div>
        </div>
        <div className="afp-comment-actions" style={{ display: "flex", gap: 12, fontSize: 11.5, color: "hsl(var(--muted-foreground))", padding: "4px 8px 0" }}>
          <button
            type="button"
            onClick={() => toggleReaction(c.id, c.reacted_by_me)}
            style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              color: c.reacted_by_me ? "#ef4444" : "inherit",
              fontWeight: c.reacted_by_me ? 600 : 400,
              fontFamily: "inherit", fontSize: "inherit",
            }}
          >
            {c.reacted_by_me ? "❤️" : "🤍"} Curtir{c.reactions_count > 0 && ` · ${c.reactions_count}`}
          </button>
          {!isReply && (
            <button
              type="button"
              onClick={() => {
                if (replyingTo === c.id) { setReplyingTo(null); setReplyText(""); }
                else { setReplyingTo(c.id); setReplyText(`@[${c.author?.name || "colega"}](${c.user_id}) `); }
              }}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", fontFamily: "inherit", fontSize: "inherit" }}
            >
              Responder
            </button>
          )}
          <span>{relativeTime(c.created_at)}</span>
        </div>

        {replyingTo === c.id && (
          <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "flex-start" }}>
            <CommentAvatar id={user?.id} name={profile?.name} url={profile?.avatar_url} size={26} />
            <MentionTextarea
              value={replyText}
              onChange={setReplyText}
              onSubmit={(r) => handleSend(c.id, r)}
              placeholder="Escrever resposta..."
              canMentionAll={canMentionAll}
              autoFocus
              compact
            />
          </div>
        )}

        {(childrenByParent[c.id] || []).map((child) => renderComment(child, true))}
      </div>
    </div>
  );

  return (
    <div className="afp-post-comments" style={{ padding: "12px 0 4px" }}>
      {loading && <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Carregando comentários…</div>}
      {!loading && roots.length === 0 && (
        <div style={{ fontSize: 11.5, color: "hsl(var(--muted-foreground))", padding: "4px 0 8px" }}>
          Seja o primeiro a comentar.
        </div>
      )}
      {roots.map((c) => renderComment(c))}

      <div className="afp-comment-input-row" style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "flex-start" }}>
        <CommentAvatar id={user?.id} name={profile?.name} url={profile?.avatar_url} size={30} />
        <MentionTextarea
          value={text}
          onChange={setText}
          onSubmit={(r) => handleSend(null, r)}
          placeholder="Escrever comentário... (use @ para mencionar)"
          canMentionAll={canMentionAll}
        />
      </div>
    </div>
  );
}

/** Compact preview shown under a post when comments exist and full thread is collapsed. */
export function PostCommentsPreview({
  postId,
  count,
  onExpand,
}: {
  postId: string;
  count: number;
  onExpand: () => void;
}) {
  const [previews, setPreviews] = useState<CommentRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("feed_post_comments")
        .select("id, content, user_id, created_at, parent_id, mentions, mention_all")
        .eq("post_id", postId)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(2);
      const rows = ((data || []) as any[]).reverse().map((c) => ({
        ...c,
        mentions: c.mentions || [],
        reactions_count: 0,
        reacted_by_me: false,
      })) as CommentRow[];
      const ids = Array.from(new Set(rows.map((c) => c.user_id)));
      if (ids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id,name,avatar_url").in("user_id", ids);
        const map: Record<string, any> = {};
        await Promise.all(
          ((profs || []) as any[]).map(async (p) => {
            const url = p.avatar_url ? await resolveSignedUrl(p.avatar_url).catch(() => p.avatar_url) : null;
            map[p.user_id] = { name: p.name, avatar_url: url };
          })
        );
        rows.forEach((c) => { c.author = map[c.user_id]; });
      }
      if (alive) setPreviews(rows);
    })();
    return () => { alive = false; };
  }, [postId]);

  if (previews.length === 0) return null;

  return (
    <div style={{ padding: "8px 0 4px", borderTop: "1px solid hsl(var(--border) / 0.65)" }}>
      {count > previews.length && (
        <button
          type="button"
          onClick={onExpand}
          style={{
            background: "none", border: "none", color: "#3B82F6",
            fontSize: 12.5, cursor: "pointer", padding: "4px 0 8px", fontFamily: "inherit", fontWeight: 500,
          }}
        >
          Ver todos os {count} comentários
        </button>
      )}
      {previews.map((c) => (
        <div key={c.id} style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <CommentAvatar id={c.user_id} name={c.author?.name} url={c.author?.avatar_url} size={28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border) / 0.55)", padding: "6px 10px", borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{c.author?.name || "Colega"}</div>
              <div style={{ fontSize: 12.5, marginTop: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {renderMentionContent(c.content)}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", padding: "2px 8px 0" }}>{relativeTime(c.created_at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
