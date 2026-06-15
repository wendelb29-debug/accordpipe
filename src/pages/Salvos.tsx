import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, ArrowLeft, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useFeedPosts, type FeedPost } from "@/hooks/useFeedPosts";
import { gradientFor, initials, relativeTime } from "@/components/home/PostComments";
import { PostTypeBadge } from "@/components/home/FeedPostExtras";
import { Button } from "@/components/ui/button";

export default function Salvos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const companyId = useActiveCompanyId();
  const qc = useQueryClient();
  const { data: posts = [], isLoading } = useFeedPosts();

  const saved = useMemo(() => posts.filter(p => p.saved_by_me), [posts]);

  async function unsave(post: FeedPost) {
    if (!user?.id) return;
    await (supabase as any)
      .from("feed_post_saves")
      .delete()
      .eq("post_id", post.id)
      .eq("user_id", user.id);
    toast({ title: "Removido dos favoritos" });
    qc.invalidateQueries({ queryKey: ["feed-posts-v2"] });
  }

  function openInFeed(postId: string) {
    navigate(`/home?post=${postId}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Bookmark className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Publicações salvas</h1>
          <span className="ml-auto text-sm text-muted-foreground">
            {saved.length} {saved.length === 1 ? "item" : "itens"}
          </span>
        </div>

        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">Carregando…</div>
        )}

        {!isLoading && saved.length === 0 && (
          <div className="rounded-xl border border-border bg-card/50 p-12 text-center">
            <Bookmark className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <div className="font-semibold text-foreground mb-1">
              Você ainda não salvou nenhuma publicação
            </div>
            <div className="text-sm text-muted-foreground max-w-sm mx-auto">
              No feed, clique no ícone de marcador (Bookmark) ou em "Adicionar aos favoritos" no menu da publicação para guardar aqui.
            </div>
            <Button className="mt-4" onClick={() => navigate("/home")}>
              Ir para o Feed
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {saved.map(post => (
            <div
              key={post.id}
              className="rounded-xl bg-white text-[#151515] overflow-hidden"
            >
              <div className="flex items-start gap-3 p-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
                  style={{ background: gradientFor(post.author.user_id) }}
                >
                  {post.author.avatar_url ? (
                    <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initials(post.author.name)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#2067B0] font-semibold text-sm">
                      {post.author.name || "Colega"}
                    </span>
                    <PostTypeBadge post={post} />
                  </div>
                  <div className="text-xs text-[#82828B] mt-0.5">
                    {relativeTime(post.created_at)}
                  </div>
                </div>
                <button
                  onClick={() => unsave(post)}
                  title="Remover dos favoritos"
                  className="text-[#0B66C3] hover:bg-[#F5F7F9] rounded p-2 transition"
                >
                  <Bookmark className="w-5 h-5 fill-current" />
                </button>
              </div>

              {post.content && (
                <div className="px-4 pb-3 text-[14.5px] leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </div>
              )}

              {post.image_url && (
                <img src={post.image_url} alt="" className="w-full max-h-96 object-cover" />
              )}

              {post.tags.length > 0 && (
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {post.tags.map(t => (
                    <span
                      key={t}
                      className="bg-[#E8F4FF] text-[#0B66C3] text-xs px-2 py-0.5 rounded"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              <div className="border-t border-[#F0F1F2] px-3 py-2 flex items-center gap-2">
                <button
                  onClick={() => openInFeed(post.id)}
                  className="flex items-center gap-2 text-sm text-[#82828B] hover:text-[#0B66C3] hover:bg-[#F5F7F9] px-3 py-1.5 rounded transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  Ver no feed
                </button>
                <div className="ml-auto text-xs text-[#82828B]">
                  {post.total_reactions > 0 && (
                    <span>
                      {post.total_reactions} reaç{post.total_reactions > 1 ? "ões" : "ão"}
                    </span>
                  )}
                  {post.comments_count > 0 && (
                    <span>
                      {post.total_reactions > 0 && " · "}
                      {post.comments_count} comentário{post.comments_count > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
