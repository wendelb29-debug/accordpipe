import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Upload, Cloud, HardDrive, FileSpreadsheet, Presentation, LayoutDashboard,
  Bold, Italic, Smile, ChevronDown, BarChart3, ThumbsUp, Eye, BellOff, Bell,
  Copy, MessageSquarePlus, Pencil, ClipboardCopy, ThumbsDown, Loader2,
  Pin, PinOff, Star, Link2, Mail, UserPlus, Edit3, EyeOff, ListChecks, Trash2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { resolveSignedUrl } from "@/hooks/useSignedUrl";

type FeedItem =
  | { kind: "event"; id: string; ts: string; event: TenantEvent }
  | { kind: "announcement"; id: string; ts: string; title: string; description: string | null; image_url: string }
  | { kind: "post"; id: string; ts: string; content: string; image_url: string | null; tags: string[]; author_id: string; author_name: string | null; author_avatar: string | null; pinned: boolean }
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

type PollQuestion = { id: string; question: string; answers: string[]; multi: boolean };
const newPollQ = (): PollQuestion => ({
  id: crypto.randomUUID(), question: "", answers: ["", ""], multi: false,
});

type Recipient = { id: string; name: string; avatar_url?: string | null };
const ALL_RECIPIENT: Recipient = { id: "__all__", name: "Todos os colaboradores" };

function MentionPicker({
  trigger, selectedIds, onPick,
}: {
  trigger: React.ReactNode;
  selectedIds: Set<string>;
  onPick: (r: Recipient) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const tenantId = useActiveCompanyId();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["mention-users", tenantId, q],
    enabled: open && !!tenantId,
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id,user_id,name,avatar_url,company_id")
        .eq("company_id", tenantId!)
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(30);
      if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
      const { data } = await query;
      return (data ?? []).map((u: any) => ({
        id: u.user_id || u.id,
        name: u.name || "Sem nome",
        avatar_url: u.avatar_url,
      })) as Recipient[];
    },
  });

  const allSelected = selectedIds.has(ALL_RECIPIENT.id);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b border-border/50">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar pessoas"
            className="h-9"
            autoFocus
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {/* Todos os colaboradores */}
          <button
            onClick={() => { onPick(ALL_RECIPIENT); setOpen(false); }}
            disabled={allSelected}
            className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent transition-colors text-left disabled:opacity-40"
          >
            <div className="h-7 w-7 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Todos os colaboradores</p>
              <p className="text-[10px] text-muted-foreground">Notifica toda a equipe</p>
            </div>
            {allSelected && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          </button>
          <div className="my-1 border-t border-border/40" />
          {isLoading ? (
            <p className="text-xs text-muted-foreground p-3 text-center">Carregando…</p>
          ) : users.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">Nenhum usuário</p>
          ) : users.map((u) => {
            const picked = selectedIds.has(u.id);
            return (
              <button
                key={u.id}
                onClick={() => { onPick(u); setOpen(false); }}
                disabled={picked}
                className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent transition-colors text-left disabled:opacity-40"
              >
                <Avatar className="h-7 w-7">
                  {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                  <AvatarFallback className="text-[10px]">{initials(u.name)}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm truncate">{u.name}</span>
                {picked && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FileSourcesPanel({ onUpload }: { onUpload: () => void }) {
  const sources = [
    { icon: Upload, label: "Carregar", color: "text-emerald-500", bg: "bg-emerald-500/10", onClick: onUpload },
    { icon: Cloud, label: "Meu Drive", color: "text-sky-500", bg: "bg-sky-500/10" },
    { icon: HardDrive, label: "Google Docs", color: "text-rose-500", bg: "bg-rose-500/10" },
    { icon: FileText, label: "Office 365", color: "text-orange-500", bg: "bg-orange-500/10" },
    { icon: Cloud, label: "Dropbox", color: "text-blue-500", bg: "bg-blue-500/10" },
  ];
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {sources.map((s) => (
          <button
            key={s.label}
            onClick={s.onClick || (() => toast.info(`${s.label} em breve`))}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/60 hover:bg-card ring-1 ring-white/5 hover:ring-white/10 transition-all"
          >
            <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <span className="text-[11px] font-medium">{s.label}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onUpload}
        className="w-full py-6 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all text-sm text-muted-foreground"
      >
        Solte seus arquivos aqui
      </button>
    </div>
  );
}

function DocumentTypesPanel() {
  const docs = [
    { icon: FileText, label: "Documento", ext: "DOCX", color: "from-blue-500 to-blue-600" },
    { icon: FileSpreadsheet, label: "Planilha", ext: "XLSX", color: "from-emerald-500 to-emerald-600" },
    { icon: Presentation, label: "Apresentação", ext: "PPTX", color: "from-orange-500 to-red-500" },
    { icon: LayoutDashboard, label: "Lousa", ext: "BOARD", color: "from-cyan-500 to-teal-500" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
      {docs.map((d) => (
        <button
          key={d.label}
          onClick={() => toast.info(`Criar ${d.label} em breve`)}
          className="group relative flex flex-col items-center gap-2 p-4 rounded-xl bg-card/60 hover:bg-card ring-1 ring-white/5 hover:ring-white/10 transition-all"
        >
          <div className={`h-14 w-14 rounded-lg bg-gradient-to-br ${d.color} flex items-center justify-center text-white text-[10px] font-bold relative`}>
            {d.ext}
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
              <Plus className="h-3.5 w-3.5" />
            </div>
          </div>
          <span className="text-xs font-medium">{d.label}</span>
        </button>
      ))}
    </div>
  );
}

function EventQuickFields({
  onCreate, loading,
}: { onCreate: (f: { title: string; start_at: string; end_at: string; location: string }) => void; loading: boolean }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [location, setLocation] = useState("");
  return (
    <div className="space-y-3 animate-fade-in">
      <Input placeholder="Título do evento" value={title} onChange={(e) => setTitle(e.target.value)} className="h-10" />
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10" />
        </div>
        <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-10 w-32" />
        <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-10 w-32" />
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Localização (sala, link, endereço)" value={location} onChange={(e) => setLocation(e.target.value)} className="h-10" />
      </div>
      <Button
        onClick={() => {
          if (!title.trim()) return toast.error("Adicione um título");
          onCreate({
            title,
            start_at: new Date(`${date}T${start}`).toISOString(),
            end_at: new Date(`${date}T${end}`).toISOString(),
            location,
          });
        }}
        disabled={loading}
        className="w-full sm:w-auto bg-primary hover:bg-primary/90"
      >
        <CalendarPlus className="h-4 w-4 mr-2" /> Criar evento
      </Button>
    </div>
  );
}

function PollBuilder({ onPublish }: { onPublish: () => void }) {
  const [questions, setQuestions] = useState<PollQuestion[]>([newPollQ()]);

  const updateQ = (id: string, patch: Partial<PollQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  return (
    <div className="space-y-4 animate-fade-in">
      {questions.map((q, qi) => (
        <div key={q.id} className="space-y-2 p-3 rounded-xl bg-card/40 ring-1 ring-white/5">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Pergunta"
              value={q.question}
              onChange={(e) => updateQ(q.id, { question: e.target.value })}
              className="h-10"
            />
            {questions.length > 1 && (
              <button
                onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
                className="h-9 w-9 rounded-md hover:bg-white/5 flex items-center justify-center text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {q.answers.map((ans, ai) => (
            <div key={ai} className="flex items-center gap-2">
              <Input
                placeholder={`Resposta ${ai + 1}`}
                value={ans}
                onChange={(e) => {
                  const next = [...q.answers]; next[ai] = e.target.value;
                  updateQ(q.id, { answers: next });
                }}
                className="h-9"
              />
              {q.answers.length > 2 && (
                <button
                  onClick={() => updateQ(q.id, { answers: q.answers.filter((_, i) => i !== ai) })}
                  className="h-8 w-8 rounded-md hover:bg-white/5 flex items-center justify-center text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => updateQ(q.id, { answers: [...q.answers, ""] })}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Adicionar resposta
            </button>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox checked={q.multi} onCheckedChange={(v) => updateQ(q.id, { multi: !!v })} />
              Permitir múltipla escolha
            </label>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setQuestions((qs) => [...qs, newPollQ()])}
          className="text-primary"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar pergunta
        </Button>
        <Button size="sm" onClick={onPublish} className="bg-primary hover:bg-primary/90">
          Publicar enquete
        </Button>
      </div>
    </div>
  );
}

function QuickPostComposer({
  onOpenAnnouncements, onOpenEvent, onCreateEvent, eventCreating,
  onPublishPost, publishing,
}: {
  onOpenAnnouncements: () => void;
  onOpenEvent: () => void;
  onCreateEvent: (f: { title: string; start_at: string; end_at: string; location: string }) => void;
  eventCreating: boolean;
  onPublishPost: (p: { content: string; tags: string[] }) => Promise<void> | void;
  publishing: boolean;
}) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<ComposerTab>("Mensagem");
  const [text, setText] = useState("");
  const [showTags, setShowTags] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [moreView, setMoreView] = useState<"document" | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const selectedIds = useMemo(() => new Set(recipients.map((r) => r.id)), [recipients]);
  const addRecipient = (r: Recipient) => {
    setRecipients((cur) => (cur.some((x) => x.id === r.id) ? cur : [...cur, r]));
  };
  const removeRecipient = (id: string) =>
    setRecipients((cur) => cur.filter((x) => x.id !== id));

  const handleSubmit = async () => {
    if (tab === "Mensagem") {
      if (!text.trim()) return toast.info("Escreva algo para publicar");
      await onPublishPost({ content: text.trim(), tags });
      setText(""); setTags([]); setShowTags(false); setRecipients([]);
    } else if (tab === "Arquivo") {
      onOpenAnnouncements();
    } else if (tab === "Enquete") {
      toast.success("Enquete publicada (preview)");
      setText("");
    }
  };

  const handleCancel = () => {
    setText(""); setTags([]); setShowTags(false); setRecipients([]); setTab("Mensagem");
    setCollapsed(true);
  };

  const toolbar = [
    { icon: Sparkle, label: "CoPilot", color: "text-violet-500" },
    { icon: Paperclip, label: "Arquivo", onClick: () => setTab("Arquivo") },
    { icon: FileText, label: "Criar documento", onClick: () => { setTab("Mais"); setMoreView("document"); } },
    { icon: Quote, label: "Citação" },
    { icon: Hash, label: "Marca", onClick: () => setShowTags((v) => !v) },
    { icon: Video, label: "Gravar vídeo" },
  ];

  // Collapsed compact prompt
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="group w-full text-left animate-fade-in rounded-2xl bg-card/95 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.25)] hover:ring-primary/30 hover:shadow-[0_8px_40px_rgba(124,58,237,0.18)] transition-all px-5 py-3.5 flex items-center gap-3"
      >
        <Avatar className="h-9 w-9 ring-2 ring-primary/20 shrink-0">
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
          <AvatarFallback className="bg-gradient-to-br from-primary to-violet-600 text-white text-xs font-semibold">
            {initials(profile?.name)}
          </AvatarFallback>
        </Avatar>
        <span className="flex-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
          Compartilhe uma atualização com sua equipe…
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 h-8 px-3 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider">
          <Sparkle className="h-3.5 w-3.5" /> Criar
        </span>
      </button>
    );
  }


  return (
    <div className="animate-fade-in rounded-2xl bg-card/95 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.25)] overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-white/[0.06]">
        {COMPOSER_TABS.map((t) => {
          const active = tab === t;
          const isMore = t === "Mais";
          return (
            <Popover key={t} open={isMore && showMore} onOpenChange={isMore ? setShowMore : undefined}>
              <PopoverTrigger asChild>
                <button
                  onClick={() => {
                    if (isMore) { setShowMore(true); return; }
                    setTab(t); setMoreView(null);
                  }}
                  className={`relative px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}{isMore && <ChevronDown className="h-3 w-3" />}
                  {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary rounded-full" />}
                </button>
              </PopoverTrigger>
              {isMore && (
                <PopoverContent align="start" className="w-48 p-1">
                  {[
                    { label: "Criar documento", icon: FileText, onClick: () => { setTab("Mais"); setMoreView("document"); } },
                    { label: "Tarefa", icon: CheckCircle2, onClick: () => toast.info("Tarefa em breve") },
                    { label: "Anúncio importante", icon: Megaphone, onClick: () => onOpenAnnouncements() },
                  ].map((m) => (
                    <button
                      key={m.label}
                      onClick={() => { setShowMore(false); m.onClick?.(); }}
                      className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-accent text-sm text-left"
                    >
                      <m.icon className="h-4 w-4 text-muted-foreground" /> {m.label}
                    </button>
                  ))}
                </PopoverContent>
              )}
            </Popover>
          );
        })}
      </div>

      {/* Body per tab */}
      <div className="px-5 pt-4 pb-2">
        {tab === "Mensagem" && (
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
              placeholder="Digite @ para mencionar alguém ou Espaço para usar o CoPilot"
              className="min-h-[110px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-[15px] placeholder:text-muted-foreground/60"
            />
          </div>
        )}
        {tab === "Evento" && <EventQuickFields onCreate={onCreateEvent} loading={eventCreating} />}
        {tab === "Enquete" && <PollBuilder onPublish={handleSubmit} />}
        {tab === "Arquivo" && (
          <>
            <input ref={fileRef} type="file" hidden onChange={() => onOpenAnnouncements()} />
            <FileSourcesPanel onUpload={() => fileRef.current?.click()} />
          </>
        )}
        {tab === "Mais" && moreView === "document" && <DocumentTypesPanel />}
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
        <MentionPicker
          selectedIds={selectedIds}
          onPick={addRecipient}
          trigger={
            <button className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors">
              <AtSign className="h-4 w-4" /><span className="hidden sm:inline">Mencionar</span>
            </button>
          }
        />
      </div>

      {/* Tags row */}
      {showTags && (
        <div className="px-5 py-3 flex items-center gap-3 border-t border-white/[0.04] bg-white/[0.015] animate-fade-in">
          <span className="text-[12px] font-medium text-muted-foreground shrink-0">Tags:</span>
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="h-7 px-2 rounded-md gap-1">
                #{t}
                <X className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100" onClick={() => setTags(tags.filter((x) => x !== t))} />
              </Badge>
            ))}
            <input
              placeholder="+ Adicionar tag"
              className="bg-transparent text-[12px] outline-none text-primary placeholder:text-primary"
              onKeyDown={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                if (e.key === "Enter" && v) {
                  setTags([...tags, v]);
                  (e.target as HTMLInputElement).value = "";
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Recipients — só aparece quando alguém foi mencionado/selecionado */}
      {recipients.length > 0 && (
        <div className="px-5 py-3 flex items-center gap-3 border-t border-white/[0.04] bg-white/[0.015] animate-fade-in">
          <span className="text-[12px] font-medium text-muted-foreground shrink-0">Para:</span>
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {recipients.map((r) => {
              const isAll = r.id === ALL_RECIPIENT.id;
              return (
                <Badge
                  key={r.id}
                  variant="secondary"
                  className={`h-7 px-2.5 rounded-md gap-1.5 ${
                    isAll
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                      : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                  }`}
                >
                  {isAll ? <Users className="h-3 w-3" /> : <AtSign className="h-3 w-3" />}
                  {r.name}
                  <X
                    className="h-3 w-3 opacity-60 hover:opacity-100 cursor-pointer ml-1"
                    onClick={() => removeRecipient(r.id)}
                  />
                </Badge>
              );
            })}
            <MentionPicker
              selectedIds={selectedIds}
              onPick={addRecipient}
              trigger={
                <button className="flex items-center gap-1 h-7 px-2 rounded-md text-[12px] font-medium text-primary hover:bg-primary/10 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Adicionar mais
                </button>
              }
            />
          </div>
        </div>
      )}

      {/* Submit */}
      {tab !== "Evento" && tab !== "Enquete" && (
        <div className="px-5 py-3 flex items-center gap-2 border-t border-white/[0.04]">
          <Button
            onClick={handleSubmit}
            disabled={publishing}
            className="h-9 px-5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold tracking-wide text-[12px] uppercase disabled:opacity-60"
          >
            {publishing ? "Enviando…" : "Enviar"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => { setText(""); setTab("Mensagem"); }}
            className="h-9 px-4 rounded-md text-muted-foreground hover:text-foreground font-semibold tracking-wide text-[12px] uppercase"
          >
            Cancelar
          </Button>
        </div>
      )}
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
function PostActionsBar({
  confirmed = 0,
  postKey,
  sourceText = "",
  postId,
  authorId,
}: {
  confirmed?: number;
  postKey: string;
  sourceText?: string;
  postId?: string;
  authorId?: string;
}) {
  const { user, profile } = useAuth();
  const tenantId = useActiveCompanyId();
  const qc = useQueryClient();
  const isAuthor = !!postId && !!authorId && user?.id === authorId;

  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(Math.max(confirmed, 0));
  const [following, setFollowing] = useState(true);
  const [commentOpen, setCommentOpen] = useState(true);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<{ id: string; author: string; avatar?: string | null; text: string; ts: string }[]>([]);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotText, setCopilotText] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);

  // Register view (only if not the author and we have a real post id)
  useEffect(() => {
    if (!postId || !user?.id || !tenantId || isAuthor) return;
    let cancelled = false;
    (async () => {
      const { error } = await supabase
        .from("feed_post_views")
        .insert({ post_id: postId, user_id: user.id, servidor_id: tenantId });
      // Ignore duplicate key errors (user already viewed)
      if (!cancelled && !error) {
        qc.invalidateQueries({ queryKey: ["feed-post-viewers", postId] });
      }
    })();
    return () => { cancelled = true; };
  }, [postId, user?.id, tenantId, isAuthor, qc]);

  // Author fetches viewers
  const viewersQ = useQuery({
    queryKey: ["feed-post-viewers", postId],
    enabled: !!postId && isAuthor,
    queryFn: async () => {
      const { data: views } = await supabase
        .from("feed_post_views")
        .select("user_id, viewed_at")
        .eq("post_id", postId!)
        .order("viewed_at", { ascending: false });
      const ids = Array.from(new Set((views ?? []).map((v: any) => v.user_id)));
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      return (views ?? []).map((v: any) => ({
        user_id: v.user_id,
        viewed_at: v.viewed_at,
        name: map.get(v.user_id)?.name || "Usuário",
        avatar_url: map.get(v.user_id)?.avatar_url || null,
      }));
    },
  });
  const viewers = viewersQ.data ?? [];

  const runCopilot = async (prompt?: string) => {
    setCopilotOpen(true);
    setCopilotLoading(true);
    setCopilotText("");
    // Lightweight simulated assistant reply based on the post content
    await new Promise((r) => setTimeout(r, 650));
    const base = sourceText.trim();
    const reply = prompt
      ? `${prompt}\n\nO texto "${base || "publicação"}" pode ser interpretado como uma mensagem da equipe. Posso reescrevê-lo, resumi-lo ou transformá-lo em um anúncio formal.`
      : `O texto "${base || "publicação"}" é uma mensagem do feed. Posso resumir, reescrever em tom profissional, gerar perguntas para a equipe ou transformar em uma tarefa. É só dizer.`;
    setCopilotText(reply);
    setCopilotLoading(false);
  };

  const submitComment = () => {
    if (!comment.trim()) return;
    setComments((c) => [
      ...c,
      {
        id: crypto.randomUUID(),
        author: profile?.name || "Você",
        avatar: profile?.avatar_url,
        text: comment.trim(),
        ts: new Date().toISOString(),
      },
    ]);
    setComment("");
  };

  return (
    <div className="pt-3 mt-3 border-t border-white/[0.04]">
      {/* Action row */}
      <div className="flex items-center gap-0.5 flex-wrap">
        <button
          onClick={() => { setLiked(!liked); setLikes(l => liked ? l - 1 : l + 1); }}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-medium transition-all hover:bg-white/5 ${liked ? "text-rose-500" : "text-muted-foreground"}`}
        >
          <Heart className={`h-4 w-4 transition-transform ${liked ? "fill-rose-500 scale-110" : ""}`} />
          Curtir{likes > 0 && <span className="ml-0.5 opacity-80">· {likes}</span>}
        </button>
        <button
          onClick={() => setCommentOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-medium text-muted-foreground hover:bg-white/5 transition-colors"
        >
          <MessageCircle className="h-4 w-4" /> Comentar
        </button>
        <button
          onClick={() => { setFollowing((v) => !v); toast.success(following ? "Você deixou de seguir" : "Você está seguindo"); }}
          className="flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-medium text-muted-foreground hover:bg-white/5 transition-colors"
        >
          {following ? <><BellOff className="h-4 w-4" /> Deixar de seguir</> : <><Bell className="h-4 w-4" /> Seguir</>}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-medium text-muted-foreground hover:bg-white/5 transition-colors">
              Mais
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={() => { navigator.clipboard?.writeText(sourceText); toast.success("Link copiado"); }}>
              <Share2 className="h-4 w-4 mr-2" /> Compartilhar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("Fixado no topo")}>
              <Hash className="h-4 w-4 mr-2" /> Fixar publicação
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("Marcado como lido")}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como lido
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info("Denúncia enviada")}>
              <ThumbsDown className="h-4 w-4 mr-2" /> Denunciar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={() => runCopilot()}
          className="flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-semibold text-violet-400 hover:bg-violet-500/10 transition-colors"
        >
          <Sparkle className="h-4 w-4" /> CoPilot
        </button>
        {isAuthor && (
          <Popover open={viewersOpen} onOpenChange={setViewersOpen}>
            <PopoverTrigger asChild>
              <button
                className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-foreground pr-2 h-9 transition-colors"
                title="Quem visualizou"
              >
                <Eye className="h-3.5 w-3.5" /> {viewers.length}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
              <div className="px-3 py-2 border-b border-border/50">
                <p className="text-xs font-semibold">Visualizações</p>
                <p className="text-[11px] text-muted-foreground">{viewers.length} pessoa{viewers.length === 1 ? "" : "s"} visualizaram</p>
              </div>
              <div className="max-h-72 overflow-y-auto p-1">
                {viewersQ.isLoading ? (
                  <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Carregando…
                  </div>
                ) : viewers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Ninguém visualizou ainda.</p>
                ) : (
                  viewers.map((v) => (
                    <div key={v.user_id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50">
                      <Avatar className="h-7 w-7">
                        {v.avatar_url && <AvatarImage src={v.avatar_url} />}
                        <AvatarFallback className="text-[10px]">{initials(v.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{v.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(v.viewed_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* CoPilot inline panel */}
      {copilotOpen && (
        <div className="mt-3 rounded-2xl bg-amber-50/95 dark:bg-amber-100/[0.06] ring-1 ring-amber-300/40 dark:ring-amber-400/15 p-4 relative animate-fade-in">
          <button
            onClick={() => setCopilotOpen(false)}
            className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-muted-foreground"
            aria-label="Fechar CoPilot"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <div className="h-8 w-8 rounded-lg bg-violet-500/15 ring-1 ring-violet-500/30 flex items-center justify-center shrink-0">
              <Sparkle className="h-4 w-4 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              {copilotLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> CoPilot está pensando…
                </div>
              ) : (
                <p className="text-[13px] leading-relaxed text-foreground/85 whitespace-pre-wrap">{copilotText}</p>
              )}
              <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                <Sparkle className="h-3 w-3" />
                <span>Textos gerados pelo CoPilot nem sempre podem ser factualmente precisos.</span>
                <a className="underline ml-auto" href="#" onClick={(e) => e.preventDefault()}>Saiba mais</a>
              </div>
              {!copilotLoading && (
                <div className="flex items-center gap-1 mt-3 flex-wrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-white dark:bg-white/10 ring-1 ring-black/5 dark:ring-white/10 text-xs hover:bg-white/90 dark:hover:bg-white/15 transition">
                        Ações <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-60">
                      <DropdownMenuItem onClick={() => runCopilot("Editar consulta")}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar consulta
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { navigator.clipboard?.writeText(copilotText); toast.success("Copiado"); }}>
                        <Copy className="h-4 w-4 mr-2" /> Copiar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setComment(copilotText); setCommentOpen(true); toast.success("Texto enviado para o comentário"); }}>
                        <ClipboardCopy className="h-4 w-4 mr-2" /> Copiar para o comentário
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success("Copiado para nova publicação")}>
                        <MessageSquarePlus className="h-4 w-4 mr-2" /> Copiar para uma nova publicação
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toast.info("Obrigado pelo feedback")}>
                        <ThumbsUp className="h-4 w-4 mr-2" /> Feedback
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="sm" className="h-8 px-3 text-[11px] uppercase tracking-wide" onClick={() => runCopilot("Refazer")}>
                    Refazer
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comments + composer */}
      {commentOpen && (
        <div className="mt-3 space-y-2.5 animate-fade-in">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <Avatar className="h-8 w-8 shrink-0">
                {c.avatar && <AvatarImage src={c.avatar} />}
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-violet-600 text-white">
                  {initials(c.author)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 rounded-2xl bg-white/[0.04] ring-1 ring-white/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{c.author}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.ts), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <p className="text-[13px] text-foreground/90 mt-0.5 whitespace-pre-wrap">{c.text}</p>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 shrink-0">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-violet-600 text-white">
                {initials(profile?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex items-center gap-2 rounded-full bg-white/[0.04] ring-1 ring-white/5 px-3 h-10 focus-within:ring-primary/40 transition">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                placeholder="Adicionar comentário"
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
              />
              <button
                onClick={() => runCopilot("Sugerir um comentário")}
                className="h-7 w-7 rounded-full flex items-center justify-center text-violet-400 hover:bg-violet-500/10 transition"
                title="CoPilot"
              >
                <Sparkle className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={submitComment}
                disabled={!comment.trim()}
                className="h-7 w-7 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition disabled:opacity-40"
                title="Enviar"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
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

        <PostActionsBar confirmed={confirmed} postKey={`event-${event.id}`} sourceText={event.title} />
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
        <PostActionsBar postKey={`ann-${item.id}`} sourceText={item.title} />
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
  const { isMaster, profile, user } = useAuth();
  const { events, createEvent } = useEvents();
  const [eventOpen, setEventOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const queryClient = useQueryClient();

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

  const postsQ = useQuery({
    queryKey: ["feed-posts", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("feed_posts")
        .select("id,content,image_url,tags,author_id,created_at,servidor_id,pinned")
        .eq("servidor_id", tenantId!)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const list = (rows ?? []) as any[];
      const ids = Array.from(new Set(list.map((r) => r.author_id).filter(Boolean)));
      const authors: Record<string, { name: string | null; avatar_url: string | null }> = {};
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles").select("user_id,name,avatar_url").in("user_id", ids);
        await Promise.all(((profs ?? []) as any[]).map(async (p) => {
          const url = p.avatar_url ? await resolveSignedUrl(p.avatar_url).catch(() => p.avatar_url) : null;
          authors[p.user_id] = { name: p.name, avatar_url: url };
        }));
      }
      return list.map((r) => ({ ...r, author: authors[r.author_id] || { name: null, avatar_url: null } }));
    },
  });

  const announcementsList = announcementsQ.data ?? [];
  const refetchAnnouncements = announcementsQ.refetch;
  const postsList = postsQ.data ?? [];

  const publishPost = useMutation({
    mutationFn: async ({ content, tags }: { content: string; tags: string[] }) => {
      if (!tenantId) throw new Error("Empresa não definida");
      if (!user?.id) throw new Error("Sessão expirada");
      const { error } = await supabase.from("feed_posts").insert({
        servidor_id: tenantId,
        author_id: user.id,
        content,
        tags,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Publicado no feed");
      queryClient.invalidateQueries({ queryKey: ["feed-posts", tenantId] });
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível publicar"),
  });

  const merged = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    for (const ev of events) items.push({ kind: "event", id: ev.id, ts: ev.created_at, event: ev });
    for (const a of announcementsList) items.push({
      kind: "announcement", id: a.id, ts: a.created_at,
      title: a.title, description: a.description, image_url: a.image_url,
    });
    for (const p of postsList) items.push({
      kind: "post", id: p.id, ts: p.created_at,
      content: p.content, image_url: p.image_url, tags: p.tags ?? [],
      author_id: p.author_id, author_name: p.author?.name ?? null, author_avatar: p.author?.avatar_url ?? null,
      pinned: !!p.pinned,
    });
    return items.sort((a, b) => {
      const ap = a.kind === "post" && a.pinned ? 1 : 0;
      const bp = b.kind === "post" && b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return new Date(b.ts).getTime() - new Date(a.ts).getTime();
    });
  }, [events, announcementsList, postsList]);

  const isLoading = announcementsQ.isLoading || postsQ.isLoading;

  let postIndex = 0;

  return (
    <div className="space-y-4">
      <QuickPostComposer
        onOpenAnnouncements={() => setManageOpen(true)}
        onOpenEvent={() => setEventOpen(true)}
        onCreateEvent={(f) =>
          createEvent.mutate(
            { ...f, event_type: "reunião", description: "", target_mode: "all" } as any,
            { onSuccess: () => toast.success("Evento criado") }
          )
        }
        eventCreating={createEvent.isPending}
        onPublishPost={async (p) => { await publishPost.mutateAsync(p); }}
        publishing={publishPost.isPending}
      />

      <FeedHeaderBar />

      {isLoading ? (
        <FeedSkeleton />
      ) : merged.length === 0 ? (
        <div className="rounded-3xl bg-card/40 backdrop-blur-md ring-1 ring-white/5 p-12 text-center animate-fade-in">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/10 mx-auto flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <p className="text-base font-semibold mb-1">Seu feed está vazio</p>
          <p className="text-sm text-muted-foreground">Escreva uma mensagem acima e clique em Enviar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {merged.map((it) => {
            const idx = postIndex++;
            if (it.kind === "event") return <EventFeedCard key={`e-${it.id}`} event={it.event} index={idx} />;
            if (it.kind === "announcement") return <AnnouncementFeedCard key={`a-${it.id}`} item={it} index={idx} />;
            if (it.kind === "post") return <PostFeedCard key={`p-${it.id}`} item={it} index={idx} />;
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

/* ────────────────────────  POST FEED CARD  ─────────────────────── */
function PostFeedCard({ item, index }: { item: Extract<FeedItem, { kind: "post" }>; index: number }) {
  const { user, profile, isMaster, role } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = useActiveCompanyId();
  const navigate = useNavigate();
  const isAuthor = user?.id === item.author_id;
  const canManage = isAuthor || isMaster || role === "admin" || role === "ceo";

  const [favorited, setFavorited] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem("feed:favorites") || "[]").includes(item.id); } catch { return false; }
  });
  const [hidden, setHidden] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem("feed:hidden") || "[]").includes(item.id); } catch { return false; }
  });

  const toggleLocalList = (key: string, on: boolean) => {
    try {
      const cur: string[] = JSON.parse(localStorage.getItem(key) || "[]");
      const next = on ? Array.from(new Set([...cur, item.id])) : cur.filter((x) => x !== item.id);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };

  const pinMutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase.from("feed_posts").update({ pinned: next }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: (_d, next) => {
      toast.success(next ? "Publicação fixada no topo" : "Publicação desafixada");
      queryClient.invalidateQueries({ queryKey: ["feed-posts", tenantId] });
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível fixar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("feed_posts").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Publicação excluída");
      queryClient.invalidateQueries({ queryKey: ["feed-posts", tenantId] });
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível excluir"),
  });

  const copyLink = () => {
    const url = `${window.location.origin}/home#post-${item.id}`;
    navigator.clipboard?.writeText(url);
    toast.success("Link copiado");
  };

  const openMessage = () => {
    window.location.hash = `#post-${item.id}`;
    toast.info("Abrindo publicação");
  };

  const handleEdit = () => toast.info("Edição em breve");
  const handleAddRecipients = () => toast.info("Adicionar destinatários em breve");
  const handleCreateTask = () => navigate("/atividades?from=post&postId=" + item.id);

  if (hidden) return null;

  return (
    <article
      id={`post-${item.id}`}
      className={`group animate-fade-in rounded-3xl backdrop-blur-xl ring-1 transition-all overflow-hidden ${
        item.pinned
          ? "bg-gradient-to-br from-amber-500/[0.04] to-card/70 ring-amber-500/30 shadow-[0_4px_30px_rgba(245,158,11,0.15)]"
          : "bg-card/70 ring-white/5 hover:ring-white/10 shadow-[0_4px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.16)]"
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {item.pinned && (
        <div className="flex items-center gap-1.5 px-5 pt-3 text-[11px] font-semibold text-amber-500 uppercase tracking-wide">
          <Pin className="h-3 w-3 fill-amber-500" /> Fixado no topo
        </div>
      )}
      <div className="flex items-center gap-3 px-5 pt-5">
        <Avatar className="h-11 w-11 ring-2 ring-primary/20">
          {item.author_avatar && <AvatarImage src={item.author_avatar} />}
          <AvatarFallback className="bg-gradient-to-br from-primary to-violet-600 text-white text-xs font-semibold">
            {initials(item.author_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">{item.author_name || "Colaborador"}</p>
            <span className="text-[11px] text-muted-foreground">› Para todos os colaboradores</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(item.ts), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-9 w-9 rounded-full hover:bg-white/5 flex items-center justify-center text-muted-foreground transition-colors"
              aria-label="Ações da publicação"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {canManage && (
              <DropdownMenuItem onClick={() => pinMutation.mutate(!item.pinned)}>
                {item.pinned ? (
                  <><PinOff className="h-4 w-4 mr-2" /> Desafixar</>
                ) : (
                  <><Pin className="h-4 w-4 mr-2" /> Fixar no topo</>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => { const next = !favorited; setFavorited(next); toggleLocalList("feed:favorites", next); toast.success(next ? "Adicionado aos favoritos" : "Removido dos favoritos"); }}>
              <Star className={`h-4 w-4 mr-2 ${favorited ? "fill-amber-500 text-amber-500" : ""}`} />
              {favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openMessage}>
              <Mail className="h-4 w-4 mr-2" /> Abrir mensagem
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyLink}>
              <Link2 className="h-4 w-4 mr-2" /> Copiar link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddRecipients}>
              <UserPlus className="h-4 w-4 mr-2" /> Adicionar destinatários
            </DropdownMenuItem>
            {isAuthor && (
              <DropdownMenuItem onClick={handleEdit}>
                <Edit3 className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => { setHidden(true); toggleLocalList("feed:hidden", true); toast.success("Publicação ocultada"); }}>
              <EyeOff className="h-4 w-4 mr-2" /> Ocultar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCreateTask}>
              <ListChecks className="h-4 w-4 mr-2" /> Criar tarefa
            </DropdownMenuItem>
            {canManage && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm("Excluir esta publicação? Esta ação não pode ser desfeita.")) {
                      deleteMutation.mutate();
                    }
                  }}
                  className="text-rose-500 focus:text-rose-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-5 pt-3">
        <p className="text-[15px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{item.content}</p>
        {item.tags?.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            {item.tags.map((t) => (
              <Badge key={t} variant="secondary" className="h-6 px-2 rounded-md text-[11px] gap-1">#{t}</Badge>
            ))}
          </div>
        )}
      </div>

      {item.image_url && (
        <div className="relative mt-4 mx-5 rounded-2xl overflow-hidden bg-muted/40">
          <img src={item.image_url} alt="" className="w-full max-h-[480px] object-cover" />
        </div>
      )}

      <div className="px-5 pt-3 pb-5">
        <PostActionsBar postKey={`post-${item.id}`} sourceText={item.content} postId={item.id} authorId={item.author_id} />
      </div>
    </article>
  );
}
