/**
 * Accord Feed Social Premium — data-driven.
 * Layout/estilo preservados (preview HTML aprovado).
 * Conectado a feed_posts, tenant_events, feed_post_reactions/comments/saves,
 * presence realtime, user_follows.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Pin, Bookmark, ExternalLink, Link2, UserPlus, Pencil, EyeOff, CheckSquare, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useFeedPosts, type FeedPost } from "@/hooks/useFeedPosts";
import { useFeedEvents, type FeedEvent } from "@/hooks/useFeedEvents";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { useTrendingTags } from "@/hooks/useTrendingTags";
import { useHeroStats, useMyWeekStats, useSuggestedColleagues } from "@/hooks/useFeedHomeStats";
import { PostComments, PostCommentsPreview, gradientFor, initials, relativeTime } from "./PostComments";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PostReactorsDialog } from "./PostReactorsDialog";
import { QuickPostDialog } from "./QuickPostDialog";
import { FeedPostExtras, PostTypeBadge } from "./FeedPostExtras";

const HIDDEN_KEY = "afp:hidden-posts";
function getHiddenIds(): string[] {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]"); } catch { return []; }
}
function setHiddenIds(ids: string[]) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids));
}

type FilterKey = "all" | "posts" | "events" | "saved";

const REACTION_EMOJIS = ["❤️", "😀", "🎉", "👏", "🔥", "🚀", "💯"];

function greetingFor(hour: number) {
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatBrl(v: number) {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return `R$ ${v.toFixed(0)}`;
}

function formatDateParts(iso: string) {
  const d = new Date(iso);
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return {
    month: months[d.getMonth()],
    day: String(d.getDate()).padStart(2, "0"),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h"),
  };
}

function todayLabel() {
  const d = new Date();
  const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${days[d.getDay()]} · ${d.getDate()} de ${months[d.getMonth()]}`;
}

export function AccordFeedPremium() {
  const { user, profile } = useAuth();
  const companyId = useActiveCompanyId();
  const qc = useQueryClient();

  const { data: posts = [], isLoading: postsLoading } = useFeedPosts();
  const { data: events = [] } = useFeedEvents();
  const onlineUsers = useOnlineUsers();
  const { data: trending = [] } = useTrendingTags();
  const { data: heroStats } = useHeroStats();
  const { data: myWeek } = useMyWeekStats();
  const { data: suggested = [] } = useSuggestedColleagues();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<string[]>(() => getHiddenIds());
  const [composerOpen, setComposerOpen] = useState(false);
  const [reactorsPostId, setReactorsPostId] = useState<string | null>(null);
  const navigate = useNavigate();

  const otherOnline = useMemo(() => onlineUsers.filter(u => u.user_id !== user?.id), [onlineUsers, user?.id]);
  const firstName = (profile?.name || "").split(" ")[0] || "colega";
  const greeting = greetingFor(new Date().getHours());

  const onlineCount = otherOnline.length;
  const postsTodayCount = heroStats?.postsToday ?? 0;
  const eventsWeekCount = heroStats?.eventsWeek ?? 0;
  const weekRevenue = heroStats?.weekRevenue ?? 0;

  const visiblePosts = useMemo(() => posts.filter(p => !hidden.includes(p.id)), [posts, hidden]);
  const savedPosts = useMemo(() => visiblePosts.filter(p => (p as any).saved_by_me), [visiblePosts]);
  const filteredPosts = filter === "events" ? [] : filter === "saved" ? savedPosts : visiblePosts;
  const showEvents = filter === "all" || filter === "events";

  // ─── Handlers ───────────────────────────────────────────

  async function handleReact(postId: string, emoji: string) {
    if (!user?.id || !companyId) return;
    const { data: existing } = await (supabase as any)
      .from("feed_post_reactions")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      await (supabase as any).from("feed_post_reactions").delete().eq("id", existing.id);
    } else {
      const { error } = await (supabase as any).from("feed_post_reactions").insert({
        post_id: postId, user_id: user.id, servidor_id: companyId, emoji,
      });
      if (error) {
        toast({ title: "Erro ao reagir", description: error.message, variant: "destructive" });
        return;
      }
    }
    qc.invalidateQueries({ queryKey: ["feed-posts-v2"] });
  }

  async function handleSave(post: FeedPost) {
    if (!user?.id || !companyId) return;
    if (post.saved_by_me) {
      await (supabase as any).from("feed_post_saves")
        .delete().eq("post_id", post.id).eq("user_id", user.id);
      toast({ title: "Removido dos salvos" });
    } else {
      const { error } = await (supabase as any).from("feed_post_saves").insert({
        post_id: post.id, user_id: user.id, servidor_id: companyId,
      });
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Salvo" });
    }
    qc.invalidateQueries({ queryKey: ["feed-posts-v2"] });
  }

  function handleShare(postId: string) {
    const url = `${window.location.origin}/?post=${postId}`;
    navigator.clipboard.writeText(url).then(
      () => toast({ title: "Link copiado" }),
      () => toast({ title: "Não foi possível copiar", variant: "destructive" }),
    );
  }

  async function handleFollowPost(post: FeedPost) {
    if (!user?.id || !companyId) return;
    if (post.followed_by_me) {
      await (supabase as any).from("feed_post_follows")
        .delete().eq("post_id", post.id).eq("user_id", user.id);
      toast({ title: "Você parou de seguir esta publicação" });
    } else {
      const { error } = await (supabase as any).from("feed_post_follows").insert({
        post_id: post.id, user_id: user.id, servidor_id: companyId,
      });
      if (error && (error as any).code !== "23505") {
        toast({ title: "Erro ao seguir", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Seguindo", description: "Você receberá notificações desta publicação." });
    }
    qc.invalidateQueries({ queryKey: ["feed-posts-v2"] });
  }

  async function handleEventRsvp(eventId: string, status: "going" | "maybe" | "not_going") {
    if (!user?.id) return;
    const { error } = await supabase
      .from("tenant_event_confirmations")
      .upsert({ event_id: eventId, user_id: user.id, status, confirmed_at: new Date().toISOString() },
        { onConflict: "event_id,user_id" });
    if (error) {
      toast({ title: "Erro ao confirmar", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["feed-events"] });
  }

  async function handleFollow(targetUserId: string) {
    if (!user?.id || !companyId || user.id === targetUserId) return;
    const { error } = await (supabase as any).from("user_follows").insert({
      follower_id: user.id, following_id: targetUserId, servidor_id: companyId,
    });
    if (error) {
      if ((error as any).code === "23505") {
        toast({ title: "Você já segue esse colega" });
      } else {
        toast({ title: "Erro ao seguir", description: error.message, variant: "destructive" });
      }
      return;
    }
    toast({ title: "Seguindo" });
    qc.invalidateQueries({ queryKey: ["feed-suggested"] });
  }

  function toggleComments(postId: string) {
    setOpenComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }


  async function handleTogglePin(post: FeedPost) {
    const { error } = await supabase
      .from("feed_posts")
      .update({ pinned: !post.pinned })
      .eq("id", post.id);
    if (error) {
      toast({ title: "Erro ao fixar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: post.pinned ? "Publicação desafixada" : "Publicação fixada no topo" });
    qc.invalidateQueries({ queryKey: ["feed-posts-v2"] });
  }

  function handleOpenPost(postId: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("post", postId);
    window.history.replaceState({}, "", url.toString());
    const el = document.getElementById(`afp-post-${postId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("afp-post-highlight");
      setTimeout(() => el.classList.remove("afp-post-highlight"), 2200);
    }
  }

  async function handleAddRecipients(post: FeedPost) {
    const current = (post as any).recipients || "";
    const next = window.prompt("Adicionar destinatários (separe por vírgula):", current);
    if (next == null) return;
    const { error } = await supabase
      .from("feed_posts")
      .update({ recipients: next })
      .eq("id", post.id);
    if (error) {
      toast({ title: "Erro ao adicionar destinatários", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Destinatários atualizados" });
    qc.invalidateQueries({ queryKey: ["feed-posts-v2"] });
  }

  async function handleEditPost(post: FeedPost) {
    const next = window.prompt("Editar publicação:", post.content);
    if (next == null || next.trim() === "") return;
    const { error } = await supabase
      .from("feed_posts")
      .update({ content: next.trim() })
      .eq("id", post.id);
    if (error) {
      toast({ title: "Erro ao editar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Publicação atualizada" });
    qc.invalidateQueries({ queryKey: ["feed-posts-v2"] });
  }

  function handleHidePost(postId: string) {
    const next = Array.from(new Set([...hidden, postId]));
    setHidden(next);
    setHiddenIds(next);
    toast({
      title: "Publicação ocultada",
      description: "Não vamos mais mostrar essa publicação para você.",
    });
  }

  function handleCreateTask(post: FeedPost) {
    try {
      sessionStorage.setItem("atividade:from-feed", JSON.stringify({
        title: `Tarefa: ${post.content.slice(0, 80)}`,
        description: post.content,
        post_id: post.id,
      }));
    } catch {}
    toast({ title: "Abrindo Atividades..." });
    navigate("/atividades?new=1");
  }

  async function handleDeletePost(post: FeedPost) {
    if (!window.confirm("Excluir esta publicação? Essa ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("feed_posts").delete().eq("id", post.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Publicação excluída" });
    qc.invalidateQueries({ queryKey: ["feed-posts-v2"] });
  }


  return (
    <div className="afp-root">
      <style>{CSS}</style>

      <div className="afp-shell">
        <div className="afp-feed-col">
          {/* HERO */}
          <div className="afp-hero">
            <div className="afp-hero-content">
              <div className="afp-hero-greeting">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                </svg>
                {todayLabel()}
              </div>
              <h1 className="afp-hero-title">{greeting}, {firstName} 👋</h1>
              <p className="afp-hero-sub">
                {weekRevenue > 0
                  ? <>A equipe fechou <strong>{formatBrl(weekRevenue)}</strong> esta semana</>
                  : <>Compartilhe uma novidade com a equipe</>}
                {onlineCount > 0 && <> e há {onlineCount} colega{onlineCount > 1 ? "s" : ""} conectado{onlineCount > 1 ? "s" : ""} agora.</>}
              </p>

              <div className="afp-hero-stats">
                {[
                  [String(postsTodayCount), "Posts hoje"],
                  [String(onlineCount), "Online agora"],
                  [String(eventsWeekCount), "Eventos esta semana"],
                  [formatBrl(weekRevenue), "Faturamento semana"],
                ].map(([v, l]) => (
                  <div className="afp-hero-stat" key={l}>
                    <span className="afp-hero-stat-value">{v}</span>
                    <span className="afp-hero-stat-label">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* STORIES — colegas online reais */}
          <div className="afp-stories">
            <button type="button" className="afp-story" onClick={() => setComposerOpen(true)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
              <div className="afp-story-ring afp-create">
                <div className="afp-story-pic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
              </div>
              <span className="afp-story-name" style={{ color: "hsl(var(--primary))", fontWeight: 600 }}>Publicar</span>
            </button>
            {otherOnline.slice(0, 8).map(u => (
              <div className="afp-story" key={u.user_id}>
                <div className="afp-story-ring">
                  <div className="afp-story-inner">
                    <div className="afp-story-pic" style={{ background: gradientFor(u.user_id) }}>
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: 99, objectFit: "cover" }} />
                        : initials(u.name)}
                    </div>
                  </div>
                </div>
                <span className="afp-story-name">{(u.name || "Colega").split(" ")[0]}</span>
              </div>
            ))}
            {otherOnline.length === 0 && (
              <div style={{ fontSize: 11.5, color: "hsl(var(--muted-foreground))", padding: "20px 8px", alignSelf: "center" }}>
                Ninguém online agora.
              </div>
            )}
          </div>

          {/* FILTROS */}
          <div className="afp-filters">
            {[
              { key: "all" as const, label: "Tudo", count: posts.length + events.length },
              { key: "saved" as const, label: "Salvos", count: savedPosts.length },
              { key: "posts" as const, label: "Posts", count: posts.length },
              { key: "events" as const, label: "Eventos", count: events.length },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`afp-filter-pill ${filter === f.key ? "afp-active" : ""}`}
              >
                {f.label}
                <span className="afp-filter-pill-count">{f.count}</span>
              </button>
            ))}
          </div>

          {/* COMPOSER */}
          <div className="afp-composer">
            <div className="afp-composer-top">
              <div className="afp-composer-avatar" style={{ background: gradientFor(user?.id) }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: 14, objectFit: "cover" }} />
                  : initials(profile?.name)}
              </div>
              <button type="button" className="afp-composer-input" onClick={() => setComposerOpen(true)} style={{ textAlign: "left", cursor: "text", fontFamily: "inherit" }}>No que está pensando, {firstName}?</button>
            </div>
          </div>

          {/* EVENTOS REAIS */}
          {showEvents && events.map(ev => <EventCard key={ev.id} event={ev} onRsvp={handleEventRsvp} currentUserId={user?.id} />)}

          {/* POSTS REAIS */}
          {filteredPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              showComments={openComments.has(post.id)}
              onReact={(emoji) => handleReact(post.id, emoji)}
              onToggleComments={() => toggleComments(post.id)}
              onSave={() => handleSave(post)}
              onShare={() => handleShare(post.id)}
              onFollow={() => handleFollowPost(post)}
              onTogglePin={() => handleTogglePin(post)}
              onOpenPost={() => handleOpenPost(post.id)}
              onAddRecipients={() => handleAddRecipients(post)}
              onEdit={() => handleEditPost(post)}
              onHide={() => handleHidePost(post.id)}
              onCreateTask={() => handleCreateTask(post)}
              onDelete={() => handleDeletePost(post)}
              onOpenReactors={() => setReactorsPostId(post.id)}
            />
          ))}

          {/* Empty state */}
          {!postsLoading && posts.length === 0 && events.length === 0 && (
            <div style={{
              borderRadius: 20,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card) / 0.5)",
              padding: "48px 24px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "hsl(var(--foreground))" }}>
                Nada por aqui ainda
              </div>
              <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 6, maxWidth: 280, margin: "6px auto 0" }}>
                Seja o primeiro a compartilhar algo com a equipe.
              </div>
            </div>
          )}
        </div>

        {/* ═══════ SIDEBAR ═══════ */}
        <div className="afp-side-col">
          {/* MINHAS TAREFAS — Bitrix-style widget */}
          <div className="afp-tasks-widget">
            <div className="afp-tasks-header">
              <span className="afp-tasks-title">
                <span className="afp-tasks-accent" />
                Minhas tarefas
              </span>
              <button
                className="afp-tasks-add"
                onClick={() => navigate("/atividades?new=1")}
                aria-label="Nova tarefa"
              >+</button>
            </div>
            {[
              { label: "Em andamento", count: 0, q: "?status=open" },
              { label: "Auxiliando", count: 0, q: "?status=assisting" },
              { label: "Criadas por mim", count: 0, q: "?status=mine" },
              { label: "Seguindo", count: 0, q: "?status=following" },
            ].map(item => (
              <button
                key={item.label}
                className="afp-tasks-row"
                onClick={() => navigate(`/atividades${item.q}`)}
              >
                <span className="afp-tasks-row-label">{item.label}</span>
                <span className="afp-tasks-row-count">{item.count}</span>
              </button>
            ))}
          </div>

          {/* QUICK STATS */}
          <div className="afp-side-card">
            <div className="afp-side-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
              Você esta semana
            </div>

            <div className="afp-quick-stats">
              {[
                [String(myWeek?.posts ?? 0), "Posts"],
                [String(myWeek?.reactions ?? 0), "Reações"],
                [String(myWeek?.comments ?? 0), "Comentários"],
                [String(myWeek?.shares ?? 0), "Compart."],
              ].map(([v, l]) => (
                <div className="afp-quick-stat" key={l}>
                  <div className="afp-quick-stat-value">{v}</div>
                  <div className="afp-quick-stat-label">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ONLINE AGORA */}
          <div className="afp-side-card">
            <div className="afp-side-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
              Online agora · {onlineCount}
            </div>
            {otherOnline.length === 0 ? (
              <div style={{ fontSize: 11.5, color: "hsl(var(--muted-foreground))", padding: "8px 0" }}>
                Ninguém online no momento.
              </div>
            ) : otherOnline.slice(0, 6).map(u => (
              <div className="afp-online-row" key={u.user_id}>
                <div className="afp-online-av" style={{ background: gradientFor(u.user_id) }}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: 11, objectFit: "cover" }} />
                    : initials(u.name)}
                </div>
                <div className="afp-online-info">
                  <div className="afp-online-name">{u.name || "Colega"}</div>
                  <div className="afp-online-status"><span className="afp-online-dot" /> Disponível</div>
                </div>
              </div>
            ))}
          </div>

          {/* SUGGESTIONS */}
          {suggested.length > 0 && (
            <div className="afp-side-card">
              <div className="afp-side-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" /></svg>
                Colegas pra conhecer
              </div>
              {(suggested as any[]).map(p => (
                <div className="afp-suggest-row" key={p.user_id}>
                  <div className="afp-suggest-av" style={{ background: gradientFor(p.user_id) }}>
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: 12, objectFit: "cover" }} />
                      : initials(p.name)}
                  </div>
                  <div className="afp-suggest-info">
                    <div className="afp-suggest-name">{p.name || "Colega"}</div>
                  </div>
                  <button className="afp-follow-btn" onClick={() => handleFollow(p.user_id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
                    Seguir
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TRENDING */}
          {trending.length > 0 && (
            <div className="afp-side-card">
              <div className="afp-side-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                Em alta no Accord
              </div>
              {trending.map(t => (
                <div className="afp-tag-row" key={t.tag}>
                  <div className="afp-tag-info">
                    <div className="afp-tag-name">#{t.tag}</div>
                    <div className="afp-tag-meta">{t.count} post{t.count > 1 ? "s" : ""} · esta semana</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <QuickPostDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        userId={user?.id}
        servidorId={companyId || undefined}
        onPublished={() => qc.invalidateQueries({ queryKey: ["feed-posts-v2"] })}
      />
      <PostReactorsDialog
        postId={reactorsPostId}
        open={!!reactorsPostId}
        onOpenChange={(v) => { if (!v) setReactorsPostId(null); }}
      />
    </div>
  );
}

// ──────────────── PostCard ────────────────

function PostCard({
  post, currentUserId, showComments, onReact, onToggleComments, onSave, onShare,
  onTogglePin, onOpenPost, onAddRecipients, onEdit, onHide, onCreateTask, onDelete, onOpenReactors,
}: {
  post: FeedPost;
  currentUserId?: string;
  showComments: boolean;
  onReact: (emoji: string) => void;
  onToggleComments: () => void;
  onSave: () => void;
  onShare: () => void;
  onTogglePin: () => void;
  onOpenPost: () => void;
  onAddRecipients: () => void;
  onEdit: () => void;
  onHide: () => void;
  onCreateTask: () => void;
  onDelete: () => void;
  onOpenReactors: () => void;
}) {
  const liked = post.reactions.some(r => r.byMe);
  const isAuthor = !!currentUserId && currentUserId === post.author.user_id;
  return (
    <div className={`afp-post-card${post.pinned ? " afp-post-card-pinned" : ""}${post.post_type === "anuncio" ? " afp-post-card-anuncio" : ""}`} id={`afp-post-${post.id}`}>
      <div className="afp-post-header">
        <div className="afp-av-ring" style={{ background: gradientFor(post.author.user_id) }}>
          <div className="afp-av-inner">
            <div className="afp-av-pic" style={{ background: gradientFor(post.author.user_id) }}>
              {post.author.avatar_url
                ? <img src={post.author.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: 99, objectFit: "cover" }} />
                : initials(post.author.name)}
            </div>
          </div>
        </div>
        <div className="afp-post-author-info">
          <div className="afp-post-author-line1">
            {post.author.name || "Colega"}
          </div>
          <div className="afp-post-author-line2">
            <span>{relativeTime(post.created_at)}</span>
            <PostTypeBadge post={post} />
          </div>
        </div>
        {post.pinned && (
          <span className="afp-post-pin">
            <Pin size={9} />
            FIXADO
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="afp-post-menu-btn" aria-label="Mais opções">
              <MoreHorizontal size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {isAuthor && (
              <DropdownMenuItem onClick={onTogglePin}>
                <Pin className="mr-2 h-4 w-4" />
                {post.pinned ? "Desafixar" : "Fixar"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onSave}>
              <Bookmark className="mr-2 h-4 w-4" />
              {post.saved_by_me ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenPost}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir mensagem
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>
              <Link2 className="mr-2 h-4 w-4" />
              Copiar link
            </DropdownMenuItem>
            {isAuthor && (
              <DropdownMenuItem onClick={onAddRecipients}>
                <UserPlus className="mr-2 h-4 w-4" />
                Adicione destinatários
              </DropdownMenuItem>
            )}
            {isAuthor && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onHide}>
              <EyeOff className="mr-2 h-4 w-4" />
              Ocultar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateTask}>
              <CheckSquare className="mr-2 h-4 w-4" />
              Criar tarefa
            </DropdownMenuItem>
            {isAuthor && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {post.post_type !== "enquete" && post.content && (
        <div className="afp-post-content" style={{ whiteSpace: "pre-wrap" }}>{post.content}</div>
      )}

      <FeedPostExtras post={post} currentUserId={currentUserId} />

      {post.image_url && (
        <div style={{ width: "100%", maxHeight: 480, overflow: "hidden" }}>
          <img src={post.image_url} alt="" style={{ width: "100%", display: "block" }} />
        </div>
      )}

      {post.tags.length > 0 && (
        <div className="afp-post-tags">
          {post.tags.map(t => <span className="afp-post-tag" key={t}>#{t}</span>)}
        </div>
      )}

      {post.total_reactions > 0 && (
        <button type="button" className="afp-post-reactions-summary" onClick={onOpenReactors} style={{ background: "transparent", border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
          <div className="afp-reactions-stack">
            {post.reactions.slice(0, 3).map(r => (
              <div className="afp-reaction-pill" key={r.emoji}>{r.emoji}</div>
            ))}
          </div>
          <span>{post.total_reactions} reaç{post.total_reactions > 1 ? "ões" : "ão"}{post.comments_count > 0 && <> · {post.comments_count} comentário{post.comments_count > 1 ? "s" : ""}</>}</span>
        </button>
      )}

      <div className="afp-post-actions">
        <button className={`afp-action-btn ${liked ? "afp-liked" : ""}`} onClick={() => onReact("❤️")}>
          <svg viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
          Curtir
          <div className="afp-reactions-popup">
            {REACTION_EMOJIS.map(e => (
              <div key={e} className="afp-reaction-emoji" onClick={(ev) => { ev.stopPropagation(); onReact(e); }}>{e}</div>
            ))}
          </div>
        </button>
        <button className="afp-action-btn" onClick={onToggleComments}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          Comentar
        </button>
        <button className="afp-action-btn" onClick={onShare}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
          Compartilhar
        </button>
        <button className={`afp-action-btn ${post.saved_by_me ? "afp-liked" : ""}`} onClick={onSave}>
          <svg viewBox="0 0 24 24" fill={post.saved_by_me ? "currentColor" : "none"} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
          {post.saved_by_me ? "Salvo" : "Salvar"}
        </button>
      </div>

      {!showComments && post.comments_count > 0 && (
        <PostCommentsPreview postId={post.id} count={post.comments_count} onExpand={onToggleComments} />
      )}
      {showComments && <PostComments postId={post.id} servidorId={(post as any).servidor_id || ""} />}
    </div>
  );
}

// ──────────────── EventCard ────────────────

function EventCard({ event, onRsvp, currentUserId }: {
  event: FeedEvent;
  onRsvp: (id: string, status: "going" | "maybe" | "not_going") => void;
  currentUserId?: string;
}) {
  const date = formatDateParts(event.start_at);
  const going = event.going;
  return (
    <div className="afp-event-card">
      <div className="afp-event-banner">
        <div className="afp-event-date-block">
          <div className="afp-event-date-month">{date.month}</div>
          <div className="afp-event-date-day">{date.day}</div>
          <div className="afp-event-date-time">{date.time}</div>
        </div>
        <div className="afp-event-banner-text">
          <div className="afp-event-banner-title">{event.title}</div>
          {(event.meeting_url || event.location) && (
            <div className="afp-event-banner-sub">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
              {event.meeting_url ? "Online" : event.location}
            </div>
          )}
        </div>
      </div>

      <div className="afp-event-body">
        <div className="afp-event-attendees">
          <div className="afp-attendee-stack">
            {event.attendees.slice(0, 4).map(a => (
              <div className="afp-attendee" key={a.user_id} style={{ background: gradientFor(a.user_id) }}>
                {initials(a.user_id.slice(0, 2))}
              </div>
            ))}
            {event.attendees.length > 4 && (
              <div className="afp-attendee afp-more">+{event.attendees.length - 4}</div>
            )}
          </div>
          <span className="afp-event-attendees-text">
            <strong>{going} confirmado{going !== 1 ? "s" : ""}</strong>
            {event.maybe > 0 && <> · {event.maybe} talvez</>}
            {event.not_going > 0 && <> · {event.not_going} não vão</>}
          </span>
        </div>

        <div className="afp-event-actions">
          <button
            className={`afp-event-btn ${event.my_status === "going" ? "afp-confirm" : "afp-maybe"}`}
            onClick={() => onRsvp(event.id, "going")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
            Vou participar
          </button>
          <button
            className={`afp-event-btn ${event.my_status === "maybe" ? "afp-confirm" : "afp-maybe"}`}
            onClick={() => onRsvp(event.id, "maybe")}
          >Talvez</button>
          <button
            className={`afp-event-btn ${event.my_status === "not_going" ? "afp-confirm" : "afp-maybe"}`}
            onClick={() => onRsvp(event.id, "not_going")}
          >Não vou</button>
        </div>
      </div>
    </div>
  );
}

// ──────────────── CSS (inalterado) ────────────────

const CSS = `
.afp-root{
  font-family:'Inter',system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
  letter-spacing:-.011em;
  background:hsl(var(--background));color:hsl(var(--foreground));
  min-height:100vh;
  position:relative;
  overflow-x:hidden;
}
.afp-root *{box-sizing:border-box}
.afp-root svg{stroke-width:2;flex-shrink:0}
.afp-root::before{
  content:'';position:absolute;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(900px 600px at 90% -5%, rgba(91,63,212,0.14), transparent 60%),
    radial-gradient(700px 500px at 5% 80%, rgba(45,75,212,0.12), transparent 60%);
}

.afp-shell{
  position:relative;z-index:1;
  max-width:1320px;margin:0 auto;
  display:grid;grid-template-columns:1fr 340px;gap:28px;
  padding:24px 28px 80px;
}
@media(max-width:1100px){.afp-shell{grid-template-columns:1fr;max-width:680px}}
.afp-feed-col{min-width:0}
.afp-side-col{min-width:0}
@media(max-width:1100px){.afp-side-col{display:none}}

/* HERO */
.afp-hero{
  position:relative;overflow:hidden;border-radius:24px;
  background:linear-gradient(135deg,#2d4bd4 0%,#5b3fd4 60%,#7c3aed 100%);
  padding:28px 30px 30px;margin-bottom:20px;
  box-shadow:0 20px 50px -20px rgba(91,63,212,.55);
}
.afp-hero::after{
  content:'';position:absolute;top:-50%;right:-20%;width:60%;height:200%;
  background:radial-gradient(circle,rgba(255,255,255,.15),transparent 70%);
  pointer-events:none;
}
.afp-hero-content{position:relative;z-index:1}
.afp-hero-greeting{
  font-size:11px;font-weight:700;letter-spacing:.10em;
  color:#fff;text-transform:uppercase;margin-bottom:8px;
  display:inline-flex;align-items:center;gap:6px;opacity:.9;
}
.afp-hero-greeting svg{width:11px;height:11px}
.afp-hero-title{font-size:28px;font-weight:800;letter-spacing:-.025em;color:#fff;line-height:1.15;margin-bottom:6px}
.afp-hero-sub{font-size:13.5px;color:rgba(255,255,255,.78);max-width:480px;line-height:1.5}
.afp-hero-stats{
  display:flex;align-items:center;gap:18px;margin-top:18px;
  padding-top:14px;border-top:1px solid rgba(255,255,255,.18);
}
.afp-hero-stat{display:flex;flex-direction:column}
.afp-hero-stat-value{font-size:18px;font-weight:800;color:#fff;letter-spacing:-.02em}
.afp-hero-stat-label{font-size:10.5px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:.05em;opacity:.85}

/* STORIES */
.afp-stories{display:flex;gap:11px;padding:14px 4px;overflow-x:auto;margin-bottom:18px;scrollbar-width:none}
.afp-stories::-webkit-scrollbar{display:none}
.afp-story{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer}
.afp-story-ring{width:62px;height:62px;border-radius:99px;padding:2.5px;background:linear-gradient(135deg,#f59e0b,#ec4899,#5b3fd4);position:relative}
.afp-story-ring.afp-viewed{background:hsl(var(--muted))}
.afp-story-ring.afp-create{background:transparent;border:2px dashed hsl(var(--border))}
.afp-story-inner{width:100%;height:100%;border-radius:99px;background:hsl(var(--background));padding:2.5px}
.afp-story-pic{width:100%;height:100%;border-radius:99px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:18px;overflow:hidden}
.afp-story-ring.afp-create .afp-story-pic{background:hsl(var(--muted));color:hsl(var(--muted-foreground))}
.afp-story-ring.afp-create .afp-story-pic svg{width:24px;height:24px;stroke-width:2.5}
.afp-story-name{font-size:10.5px;color:hsl(var(--muted-foreground));max-width:70px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* FILTROS */
.afp-filters{display:flex;align-items:center;gap:6px;padding:5px;border-radius:12px;background:hsl(var(--muted) / 0.4);border:1px solid hsl(var(--border));margin-bottom:18px;overflow-x:auto}
.afp-filter-pill{height:32px;padding:0 12px;border-radius:8px;font-size:12px;font-weight:600;color:hsl(var(--muted-foreground));cursor:pointer;border:none;background:transparent;display:inline-flex;align-items:center;gap:5px;font-family:inherit;white-space:nowrap;flex-shrink:0}
.afp-filter-pill.afp-active{background:linear-gradient(135deg,#2d4bd4,#5b3fd4);color:#fff;box-shadow:0 4px 12px -4px rgba(91,63,212,.5)}
.afp-filter-pill-count{background:rgba(255,255,255,.18);font-size:9.5px;font-weight:800;padding:1px 5px;border-radius:99px}

/* COMPOSER */
.afp-composer{background:hsl(var(--card));border:1px solid hsl(var(--border));border-radius:18px;padding:14px;margin-bottom:20px}
.afp-composer-top{display:flex;gap:12px;align-items:center}
.afp-composer-avatar{width:42px;height:42px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;overflow:hidden}
.afp-composer-input{flex:1;background:hsl(var(--card));border:1px solid hsl(var(--border));border-radius:14px;padding:12px 14px;font-size:13.5px;color:hsl(var(--muted-foreground));cursor:text;min-height:42px;display:flex;align-items:center}

/* POST */
.afp-post-card{background:hsl(var(--card) / 0.5);border:1px solid hsl(var(--border));border-radius:20px;overflow:hidden;margin-bottom:16px;position:relative;transition:border-color .2s, box-shadow .2s}
.afp-post-card-pinned{border-color:#f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,.35),0 12px 32px -12px rgba(245,158,11,.35);background:linear-gradient(180deg, rgba(245,158,11,.06), transparent 120px), hsl(var(--card) / 0.5)}
.afp-post-card-anuncio{border-left:3px solid hsl(0 80% 55%)}
.afp-post-header{display:flex;align-items:center;gap:11px;padding:14px 16px}
.afp-av-ring{width:42px;height:42px;border-radius:99px;padding:2px;flex-shrink:0;position:relative}
.afp-av-inner{width:100%;height:100%;border-radius:99px;background:hsl(var(--background));padding:2px}
.afp-av-pic{width:100%;height:100%;border-radius:99px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;overflow:hidden}
.afp-post-author-info{flex:1;min-width:0}
.afp-post-author-line1{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:700;color:hsl(var(--foreground))}
.afp-post-author-line2{display:flex;align-items:center;gap:5px;font-size:11px;color:hsl(var(--muted-foreground));margin-top:1px}
.afp-post-pin{background:rgba(245,158,11,.15);color:#fbbf24;font-size:9px;font-weight:800;padding:3px 7px;border-radius:5px;display:inline-flex;align-items:center;gap:3px;letter-spacing:.05em;text-transform:uppercase}
.afp-post-pin svg{width:9px;height:9px}
.afp-post-menu-btn{margin-left:6px;width:32px;height:32px;border-radius:8px;background:transparent;border:none;cursor:pointer;color:hsl(var(--muted-foreground));display:inline-flex;align-items:center;justify-content:center;transition:.15s}
.afp-post-menu-btn:hover{background:hsl(var(--muted));color:hsl(var(--foreground))}
.afp-post-highlight{box-shadow:0 0 0 2px hsl(var(--primary)),0 16px 40px -10px hsl(var(--primary) / 0.45);transition:box-shadow .4s}
.afp-post-content{padding:0 16px 14px;font-size:13.5px;line-height:1.6;color:hsl(var(--foreground))}
.afp-post-tags{display:flex;flex-wrap:wrap;gap:5px;padding:0 16px 14px}
.afp-post-tag{background:rgba(91,63,212,.12);color:hsl(var(--primary));font-size:10.5px;font-weight:600;padding:3px 9px;border-radius:99px;cursor:pointer}
.afp-post-reactions-summary{display:flex;align-items:center;gap:10px;padding:0 16px 10px;font-size:11.5px;color:hsl(var(--muted-foreground))}
.afp-reactions-stack{display:flex;align-items:center}
.afp-reaction-pill{width:22px;height:22px;border-radius:99px;background:hsl(var(--background));border:2px solid hsl(var(--background));display:flex;align-items:center;justify-content:center;font-size:11px;margin-left:-6px}
.afp-reaction-pill:first-child{margin-left:0}

.afp-post-actions{display:flex;align-items:center;gap:2px;padding:6px 8px;border-top:1px solid hsl(var(--muted))}
.afp-action-btn{flex:1;height:36px;border-radius:9px;background:transparent;border:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:hsl(var(--muted-foreground));display:inline-flex;align-items:center;justify-content:center;gap:6px;position:relative}
.afp-action-btn:hover{background:hsl(var(--card));color:hsl(var(--foreground))}
.afp-action-btn svg{width:15px;height:15px}
.afp-action-btn.afp-liked{color:#f43f5e}
.dark .afp-post-actions{background:rgba(255,255,255,.035);border-top-color:rgba(255,255,255,.13)}
.dark .afp-action-btn{color:rgba(255,255,255,.82);background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08)}
.dark .afp-action-btn:hover{background:rgba(255,255,255,.10);color:#fff;border-color:rgba(255,255,255,.18)}
.dark .afp-action-btn.afp-liked{color:#60a5fa;background:rgba(96,165,250,.14);border-color:rgba(96,165,250,.28)}

.afp-reactions-popup{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(8px);background:hsl(var(--popover));backdrop-filter:blur(14px);border:1px solid hsl(var(--border));border-radius:99px;padding:5px;display:flex;align-items:center;gap:2px;opacity:0;pointer-events:none;transition:.18s;box-shadow:0 16px 40px -12px rgba(0,0,0,.5);z-index:10}
.afp-action-btn:hover .afp-reactions-popup{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0)}
.afp-reaction-emoji{width:36px;height:36px;border-radius:99px;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;transition:.14s}
.afp-reaction-emoji:hover{transform:scale(1.4) translateY(-3px)}

.afp-post-comments{padding:10px 14px 14px;border-top:1px solid hsl(var(--muted))}
.afp-comment{display:flex;gap:9px;margin-bottom:10px}
.afp-comment-av{width:30px;height:30px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:10.5px;overflow:hidden}
.afp-comment-bubble{background:hsl(var(--muted));padding:8px 12px;border-radius:14px;border-top-left-radius:4px;max-width:80%}
.afp-comment-author{font-size:11.5px;font-weight:700;color:hsl(var(--foreground));margin-bottom:1px}
.afp-comment-text{font-size:12px;color:hsl(var(--foreground));line-height:1.45}
.afp-comment-actions{display:flex;gap:12px;font-size:10.5px;color:hsl(var(--muted-foreground));margin-top:3px;font-weight:600}
.afp-comment-input-row{display:flex;gap:9px;align-items:center;margin-top:8px}
.afp-comment-input{flex:1;height:36px;padding:0 14px;border-radius:18px;background:hsl(var(--card));border:1px solid hsl(var(--border));color:hsl(var(--foreground));font-size:12.5px;font-family:inherit;outline:none}
.afp-comment-input::placeholder{color:hsl(var(--muted-foreground))}

/* EVENT */
.afp-event-card{background:hsl(var(--card) / 0.5);border:1px solid hsl(var(--border));border-radius:20px;overflow:hidden;margin-bottom:16px}
.afp-event-banner{height:120px;background:linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#0ea5e9 100%);position:relative;display:flex;align-items:center;padding:0 18px}
.afp-event-date-block{background:#fff;border-radius:12px;padding:8px 12px;text-align:center;min-width:60px;box-shadow:0 6px 18px -4px rgba(0,0,0,.3)}
.afp-event-date-month{font-size:10px;font-weight:800;color:#dc2626;letter-spacing:.08em;text-transform:uppercase}
.afp-event-date-day{font-size:24px;font-weight:900;color:#0f172a;letter-spacing:-.025em;line-height:1;margin-top:1px}
.afp-event-date-time{font-size:9px;font-weight:700;color:#64748b;margin-top:2px}
.afp-event-banner-text{margin-left:14px;flex:1;min-width:0}
.afp-event-banner-title{font-size:16px;font-weight:800;color:#fff;letter-spacing:-.015em}
.afp-event-banner-sub{font-size:11.5px;color:#fff;margin-top:2px;display:inline-flex;align-items:center;gap:5px;opacity:.9}
.afp-event-banner-sub svg{width:11px;height:11px}
.afp-event-body{padding:14px 16px}
.afp-event-attendees{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.afp-attendee-stack{display:flex;align-items:center}
.afp-attendee{width:26px;height:26px;border-radius:99px;border:2px solid hsl(var(--background));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:9.5px;margin-left:-7px}
.afp-attendee:first-child{margin-left:0}
.afp-attendee.afp-more{background:hsl(var(--border));color:hsl(var(--foreground));font-size:9px}
.afp-event-attendees-text{font-size:11.5px;color:hsl(var(--muted-foreground));font-weight:500}
.afp-event-attendees-text strong{color:hsl(var(--foreground));font-weight:700}
.afp-event-actions{display:flex;gap:8px}
.afp-event-btn{flex:1;height:36px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px;font-family:inherit;border:1px solid}
.afp-event-btn svg{width:13px;height:13px}
.afp-event-btn.afp-confirm{background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-color:transparent;box-shadow:0 6px 16px -4px rgba(16,185,129,.5)}
.afp-event-btn.afp-maybe{background:hsl(var(--card));color:hsl(var(--foreground));border-color:hsl(var(--border))}

/* SIDEBAR */
.afp-side-card{background:hsl(var(--card) / 0.5);border:1px solid hsl(var(--border));border-radius:18px;padding:14px;margin-bottom:14px}
.afp-side-title{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:.10em;text-transform:uppercase;color:hsl(var(--muted-foreground));margin-bottom:11px}
.afp-side-title svg{width:11px;height:11px}

.afp-online-row{display:flex;align-items:center;gap:10px;padding:6px 0}
.afp-online-av{width:34px;height:34px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11.5px;position:relative;overflow:hidden}
.afp-online-info{flex:1;min-width:0}
.afp-online-name{font-size:12.5px;font-weight:600;color:hsl(var(--foreground));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.afp-online-status{font-size:10.5px;color:#10b981;font-weight:600;display:inline-flex;align-items:center;gap:4px}
.afp-online-dot{width:6px;height:6px;border-radius:99px;background:#10b981;box-shadow:0 0 0 0 rgba(16,185,129,.6);animation:afp-pulse 1.6s infinite}
@keyframes afp-pulse{0%{box-shadow:0 0 0 0 rgba(16,185,129,.6)}70%{box-shadow:0 0 0 6px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}}

.afp-suggest-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid hsl(var(--border) / 0.4)}
.afp-suggest-row:last-child{border-bottom:none}
.afp-suggest-av{width:36px;height:36px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12.5px;overflow:hidden}
.afp-suggest-info{flex:1;min-width:0}
.afp-suggest-name{font-size:12.5px;font-weight:700;color:hsl(var(--foreground));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.afp-follow-btn{height:30px;padding:0 11px;border-radius:8px;background:linear-gradient(135deg,#2d4bd4,#5b3fd4);color:#fff;font-size:11px;font-weight:700;border:none;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:4px}
.afp-follow-btn svg{width:11px;height:11px}

.afp-tag-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;cursor:pointer}
.afp-tag-info{flex:1}
.afp-tag-name{font-size:12.5px;font-weight:700;color:hsl(var(--primary))}
.afp-tag-meta{font-size:10px;color:hsl(var(--muted-foreground));margin-top:1px}

.afp-quick-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.afp-quick-stat{background:hsl(var(--muted) / 0.4);border:1px solid hsl(var(--muted));border-radius:11px;padding:10px}
.afp-quick-stat-value{font-size:18px;font-weight:800;letter-spacing:-.02em;color:hsl(var(--foreground));line-height:1;font-variant-numeric:tabular-nums}
.afp-quick-stat-label{font-size:10px;font-weight:600;color:hsl(var(--muted-foreground));margin-top:4px;display:inline-flex;align-items:center;gap:3px}

/* ════════════════════════════════════════════════════════════════
   BITRIX24 OVERRIDE — Light cards on dark page, exact tokens
   ════════════════════════════════════════════════════════════════ */
.afp-root{
  --b24-blue-primary:#0B66C3;
  --b24-blue-link:#2067B0;
  --b24-blue-action:#185CCD;
  --b24-blue-send:#3BC8F5;
  --b24-text-primary:#151515;
  --b24-text-secondary:#82828B;
  --b24-text-meta:#828B95;
  --b24-text-label:#525C69;
  --b24-border-input:#C6CDD3;
  --b24-divider:#F0F1F2;
}

/* Layout: 521 + 264, gap 18px */
.afp-shell{
  max-width:823px;
  grid-template-columns:521px 264px;
  gap:18px;
  padding:20px 16px 80px;
}
@media(max-width:900px){
  .afp-shell{grid-template-columns:1fr;max-width:560px}
}

/* COMPOSER → theme card, no shadow, 10px radius */
.afp-composer{
  background:hsl(var(--card));
  color:hsl(var(--card-foreground));
  border:1px solid hsl(var(--border));
  border-radius:10px;
  padding:14px 16px;
  margin-bottom:16px;
  box-shadow:none;
}
.afp-composer-avatar{border-radius:50%;width:42px;height:42px}
.afp-composer-input{
  background:hsl(var(--input));
  border:0.8px solid hsl(var(--border));
  border-radius:18px;
  color:hsl(var(--foreground));
  font-size:14px;
  padding:10px 14px;
}
.afp-composer-input:hover{background:hsl(var(--card));border-color:hsl(var(--primary))}

/* FILTROS / SEARCH BAR — alto contraste em light mode */
.afp-filters{
  background:hsl(var(--secondary));
  border:1px solid hsl(var(--border));
  border-radius:10px;
  padding:5px;
  margin-bottom:16px;
  box-shadow:0 1px 2px hsl(var(--foreground) / 0.06);
}
.afp-filter-pill{
  color:hsl(var(--secondary-foreground));
  background:transparent;
  border:1px solid transparent;
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:0.5px;
  font-weight:700;
}
.afp-filter-pill:hover{
  background:hsl(var(--card));
  color:hsl(var(--primary));
  border-color:hsl(var(--border));
}
.afp-filter-pill .afp-filter-pill-count{
  background:hsl(var(--muted));
  color:hsl(var(--foreground));
}
.afp-filter-pill.afp-active{
  background:hsl(var(--primary));
  color:hsl(var(--primary-foreground));
  border-color:hsl(var(--primary));
  box-shadow:0 2px 8px hsl(var(--primary) / 0.35);
}
.afp-filter-pill.afp-active .afp-filter-pill-count{
  background:hsl(var(--primary-foreground) / 0.22);
  color:hsl(var(--primary-foreground));
}
/* DARK overrides */
.dark .afp-root .afp-filters{
  background:rgba(255,255,255,0.08);
  border-color:rgba(255,255,255,0.18);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);
}
.dark .afp-root .afp-filter-pill{
  color:rgba(255,255,255,0.85);
  background:transparent;
  border-color:transparent;
}
.dark .afp-root .afp-filter-pill:hover{
  background:rgba(255,255,255,0.10);
  color:#fff;
  border-color:rgba(255,255,255,0.18);
}
.dark .afp-root .afp-filter-pill .afp-filter-pill-count{
  background:rgba(255,255,255,0.14);
  color:#fff;
}
.dark .afp-root .afp-filter-pill.afp-active{
  background:#FFFFFF;
  color:var(--b24-blue-action);
  border-color:#FFFFFF;
  box-shadow:0 2px 8px rgba(0,0,0,0.35);
}
.dark .afp-root .afp-filter-pill.afp-active .afp-filter-pill-count{
  background:var(--b24-blue-action);
  color:#fff;
}

/* POST CARD → theme card, no shadow */
.afp-post-card{
  background:hsl(var(--card));
  color:hsl(var(--card-foreground));
  border:1px solid hsl(var(--border));
  border-radius:10px;
  margin-bottom:15px;
  overflow:hidden;
  box-shadow:none;
}
.afp-post-card-pinned{
  border:2px solid #f59e0b;
  box-shadow:0 0 0 1px rgba(245,158,11,.25),0 6px 18px -6px rgba(245,158,11,.35);
  background:linear-gradient(180deg,hsl(var(--secondary)) 0,hsl(var(--card)) 80px);
}
.afp-post-card-anuncio{border-left:4px solid var(--b24-blue-send)}

.afp-post-header{padding:14px 16px 8px;gap:12px}
.afp-av-ring{width:50px;height:50px;padding:0;background:none !important}
.afp-av-inner{padding:0;background:none}
.afp-av-pic{border-radius:50%;font-size:14px}

.afp-post-author-line1{
  color:hsl(var(--primary));
  font-size:14px;
  font-weight:600;
}
.afp-post-author-line2{
  color:hsl(var(--muted-foreground));
  font-size:13px;
  margin-top:2px;
}
.afp-post-author-line2 span{color:hsl(var(--muted-foreground))}

.afp-post-menu-btn{color:hsl(var(--muted-foreground))}
.afp-post-menu-btn:hover{background:hsl(var(--secondary));color:hsl(var(--foreground))}

.afp-post-pin{
  background:#FEF3C7;
  color:#92400E;
  border:0.8px solid #FBBF24;
}

.afp-post-content{
  color:hsl(var(--card-foreground));
  font-size:14.5px;
  line-height:1.5;
  padding:0 16px 12px 78px;
}
.afp-post-tags{padding:0 16px 12px 78px}
.afp-post-tag{
  background:hsl(var(--primary) / 0.12);
  color:hsl(var(--primary));
  border-radius:4px;
}

.afp-post-reactions-summary{
  padding:4px 16px 8px 78px;
  color:hsl(var(--primary));
  font-size:13px;
}
.afp-reaction-pill{
  background:hsl(var(--card));
  border-color:hsl(var(--card));
  box-shadow:0 0 0 1px hsl(var(--border));
}

.afp-post-actions{
  border-top:0.8px solid hsl(var(--border));
  padding:4px 8px;
  gap:6px;
  background:hsl(var(--secondary));
}
.afp-action-btn{
  color:hsl(var(--secondary-foreground));
  background:hsl(var(--card));
  border:1px solid hsl(var(--border));
  font-size:13px;
  font-weight:700;
  border-radius:6px;
  height:34px;
}
.afp-action-btn:hover{background:hsl(var(--accent));color:hsl(var(--primary));border-color:hsl(var(--primary) / .35)}
.afp-action-btn.afp-liked{color:hsl(var(--primary));font-weight:800;background:hsl(var(--primary) / .12);border-color:hsl(var(--primary) / .35)}
.dark .afp-root .afp-post-actions{
  background:rgba(255,255,255,.075);
  border-top:1px solid rgba(255,255,255,.22);
  box-shadow:0 -1px 0 rgba(255,255,255,.05) inset;
  gap:6px;
}
.dark .afp-root .afp-action-btn{
  background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.24);
  color:#FFFFFF;
  font-weight:700;
  box-shadow:0 1px 2px rgba(0,0,0,.22);
}
.dark .afp-root .afp-action-btn:hover{
  background:rgba(255,255,255,.20);
  border-color:rgba(255,255,255,.36);
  color:#FFFFFF;
}
.dark .afp-root .afp-action-btn.afp-liked{
  background:rgba(37,99,235,.26);
  border-color:rgba(96,165,250,.54);
  color:#93C5FD;
  font-weight:800;
}
.dark .afp-root .afp-action-btn svg{color:currentColor;stroke-width:2.4}

.afp-post-comments{
  background:hsl(var(--secondary));
  color:hsl(var(--secondary-foreground));
  border-top:0.8px solid hsl(var(--border));
  padding:12px 16px;
}
.afp-comment-bubble{
  background:hsl(var(--card));
  color:hsl(var(--card-foreground));
  border:1px solid hsl(var(--border));
  border-radius:14px;
  border-top-left-radius:4px;
}
.afp-comment-author{color:hsl(var(--primary));font-weight:600}
.afp-comment-text{color:hsl(var(--card-foreground))}
.afp-comment-actions{color:hsl(var(--muted-foreground))}
.afp-comment-actions button{color:inherit}
.afp-comment-input{
  background:hsl(var(--input));
  border:0.8px solid hsl(var(--border));
  color:hsl(var(--foreground));
  border-radius:18px;
}
.afp-comment-input::placeholder{color:hsl(var(--muted-foreground))}

/* EVENT CARD → white */
.afp-event-card{
  background:#FFFFFF;
  border:none;
  border-radius:10px;
  box-shadow:none;
}
.afp-event-attendees-text{color:var(--b24-text-secondary)}
.afp-event-attendees-text strong{color:var(--b24-text-primary)}
.afp-attendee{border-color:#FFFFFF}
.afp-event-btn.afp-maybe{
  background:#FFFFFF;
  color:var(--b24-text-label);
  border-color:var(--b24-border-input);
}
.afp-event-btn.afp-confirm{
  background:linear-gradient(135deg,#3BC8F5,#0B66C3);
  box-shadow:0 4px 12px -4px rgba(11,102,195,.5);
}

/* SIDEBAR cards → translucent white over dark bg */
.afp-side-card{
  background:rgba(255,255,255,0.96);
  border:none;
  border-radius:12px;
  padding:14px 16px;
  margin-bottom:12px;
  box-shadow:none;
}
.afp-side-title{
  color:var(--b24-text-primary);
  font-size:14px;
  font-weight:600;
  letter-spacing:normal;
  text-transform:none;
  border-bottom:0.8px solid var(--b24-divider);
  padding-bottom:8px;
  margin-bottom:10px;
}
.afp-side-title svg{width:14px;height:14px;color:var(--b24-blue-primary)}

.afp-online-name,.afp-suggest-name{color:var(--b24-text-primary)}
.afp-online-status{color:#16A34A}
.afp-online-dot{background:#16A34A;box-shadow:0 0 0 0 rgba(22,163,74,.6)}
@keyframes afp-pulse{0%{box-shadow:0 0 0 0 rgba(22,163,74,.6)}70%{box-shadow:0 0 0 6px rgba(22,163,74,0)}100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}

.afp-tag-name{color:var(--b24-blue-primary)}
.afp-tag-meta{color:var(--b24-text-meta)}

.afp-follow-btn{
  background:var(--b24-blue-send);
  color:#FFFFFF;
  border-radius:4px;
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:0.5px;
}

.afp-quick-stat{
  background:#F5F7F9;
  border:0.8px solid var(--b24-divider);
  border-radius:8px;
}
.afp-quick-stat-value{color:var(--b24-text-primary)}
.afp-quick-stat-label{color:var(--b24-text-meta)}

/* MINHAS TAREFAS widget */
.afp-tasks-widget{
  background:rgba(255,255,255,0.96);
  border-radius:12px;
  padding:0 8px 12px;
  margin-bottom:12px;
}
.afp-tasks-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:12px 8px 8px;
  border-bottom:0.8px solid var(--b24-divider);
  margin-bottom:4px;
}
.afp-tasks-title{
  display:flex;
  align-items:center;
  gap:8px;
  color:var(--b24-text-primary);
  font-size:14px;
  font-weight:600;
}
.afp-tasks-accent{
  width:4px;
  height:16px;
  background:var(--b24-blue-send);
  border-radius:2px;
  display:inline-block;
}
.afp-tasks-add{
  background:none;
  border:none;
  color:var(--b24-blue-primary);
  font-size:22px;
  font-weight:300;
  cursor:pointer;
  line-height:1;
  width:24px;
  height:24px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:4px;
}
.afp-tasks-add:hover{background:#F5F7F9}
.afp-tasks-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  width:100%;
  padding:10px 8px;
  background:none;
  border:none;
  cursor:pointer;
  border-radius:6px;
  font-family:inherit;
}
.afp-tasks-row:hover{background:#F5F7F9}
.afp-tasks-row-label{color:#333333;font-size:14px}
.afp-tasks-row-count{color:var(--b24-text-meta);font-size:13px;min-width:20px;text-align:right}

.afp-quick-stat-label{font-size:10px;font-weight:600;color:hsl(var(--muted-foreground));margin-top:4px;display:inline-flex;align-items:center;gap:3px}
`;
