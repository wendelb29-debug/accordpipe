import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, X, MessageSquare, BarChart3, Megaphone, ThumbsUp } from "lucide-react";

type Mode = "mensagem" | "enquete" | "anuncio" | "apreciacao";

const APPRECIATION_KINDS = [
  { value: "obrigado", label: "Obrigado 🙏" },
  { value: "parabens", label: "Parabéns 🎉" },
  { value: "excelente", label: "Excelente trabalho ⭐" },
  { value: "inovacao", label: "Inovação 💡" },
];

const ANNOUNCEMENT_DURATIONS = [
  { value: "1", label: "1 dia" },
  { value: "3", label: "3 dias" },
  { value: "7", label: "1 semana" },
  { value: "14", label: "2 semanas" },
  { value: "30", label: "1 mês" },
  { value: "0", label: "Sem prazo" },
];

interface Colleague { user_id: string; name: string | null; }

export function QuickPostDialog({
  open, onOpenChange, userId, servidorId, onPublished,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId?: string;
  servidorId?: string;
  onPublished?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("mensagem");
  const [publishing, setPublishing] = useState(false);

  // mensagem
  const [content, setContent] = useState("");
  const [tagsText, setTagsText] = useState("");

  // enquete
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollMultiple, setPollMultiple] = useState(false);

  // anúncio
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementDuration, setAnnouncementDuration] = useState("7");

  // apreciação
  const [apprTo, setApprTo] = useState<string>("");
  const [apprKind, setApprKind] = useState<string>("obrigado");
  const [apprMessage, setApprMessage] = useState("");

  const [colleagues, setColleagues] = useState<Colleague[]>([]);

  useEffect(() => {
    if (!open || !servidorId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id,name")
        .eq("company_id", servidorId)
        .eq("is_active", true)
        .order("name");
      setColleagues((data as any[] || []).filter(p => p.user_id !== userId));
    })();
  }, [open, servidorId, userId]);

  function resetAll() {
    setContent("");
    setTagsText("");
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollMultiple(false);
    setAnnouncementContent("");
    setAnnouncementDuration("7");
    setApprTo("");
    setApprKind("obrigado");
    setApprMessage("");
    setMode("mensagem");
  }

  async function publishMensagem() {
    if (!content.trim()) { toast({ title: "Escreva algo antes de publicar" }); return; }
    const tags = tagsText.split(",").map(t => t.trim().replace(/^#/, "")).filter(Boolean);
    const { error } = await supabase.from("feed_posts").insert({
      content: content.trim(), tags, servidor_id: servidorId!, author_id: userId!,
      post_type: "mensagem",
    } as any);
    if (error) throw error;
  }

  async function publishEnquete() {
    if (!pollQuestion.trim()) { toast({ title: "Informe a pergunta da enquete" }); throw new Error("no question"); }
    const opts = pollOptions.map(o => o.trim()).filter(Boolean);
    if (opts.length < 2) { toast({ title: "Adicione ao menos 2 opções" }); throw new Error("min options"); }

    const { data: post, error: ePost } = await supabase.from("feed_posts").insert({
      content: pollQuestion.trim(),
      tags: [],
      servidor_id: servidorId!, author_id: userId!,
      post_type: "enquete",
    } as any).select("id").single();
    if (ePost || !post) throw ePost;

    const { data: poll, error: ePoll } = await (supabase as any).from("feed_polls").insert({
      post_id: (post as any).id,
      servidor_id: servidorId!,
      question: pollQuestion.trim(),
      allow_multiple: pollMultiple,
    }).select("id").single();
    if (ePoll || !poll) throw ePoll;

    const optsRows = opts.map((text, i) => ({ poll_id: poll.id, text, position: i }));
    const { error: eOpt } = await (supabase as any).from("feed_poll_options").insert(optsRows);
    if (eOpt) throw eOpt;
  }

  async function publishAnuncio() {
    if (!announcementContent.trim()) { toast({ title: "Escreva o anúncio" }); throw new Error("no content"); }
    const days = parseInt(announcementDuration, 10);
    const expires_at = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
    const { error } = await supabase.from("feed_posts").insert({
      content: announcementContent.trim(),
      tags: [],
      servidor_id: servidorId!, author_id: userId!,
      post_type: "anuncio",
      expires_at,
    } as any);
    if (error) throw error;
  }

  async function publishApreciacao() {
    if (!apprTo) { toast({ title: "Selecione o destinatário" }); throw new Error("no target"); }
    const { error } = await supabase.from("feed_posts").insert({
      content: apprMessage.trim(),
      tags: [],
      servidor_id: servidorId!, author_id: userId!,
      post_type: "apreciacao",
      appreciation_to: apprTo,
      appreciation_kind: apprKind,
    } as any);
    if (error) throw error;
  }

  async function handlePublish() {
    if (!userId || !servidorId) {
      toast({ title: "Sessão inválida", variant: "destructive" });
      return;
    }
    setPublishing(true);
    try {
      if (mode === "mensagem") await publishMensagem();
      else if (mode === "enquete") await publishEnquete();
      else if (mode === "anuncio") await publishAnuncio();
      else if (mode === "apreciacao") await publishApreciacao();

      toast({ title: "Publicado no feed" });
      resetAll();
      onOpenChange(false);
      onPublished?.();
    } catch (e: any) {
      if (e?.message && !["no question", "min options", "no content", "no target"].includes(e.message)) {
        toast({ title: "Erro ao publicar", description: e.message || String(e), variant: "destructive" });
      }
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAll(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova publicação</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="mensagem"><MessageSquare className="w-4 h-4 mr-1.5" />Mensagem</TabsTrigger>
            <TabsTrigger value="enquete"><BarChart3 className="w-4 h-4 mr-1.5" />Enquete</TabsTrigger>
            <TabsTrigger value="anuncio"><Megaphone className="w-4 h-4 mr-1.5" />Anúncio</TabsTrigger>
            <TabsTrigger value="apreciacao"><ThumbsUp className="w-4 h-4 mr-1.5" />Apreciação</TabsTrigger>
          </TabsList>

          <TabsContent value="mensagem" className="space-y-3 mt-4">
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="No que está pensando?" rows={5} autoFocus maxLength={5000} />
            <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="Tags (separadas por vírgula, opcional)" maxLength={200} />
          </TabsContent>

          <TabsContent value="enquete" className="space-y-3 mt-4">
            <Input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Sua pergunta" maxLength={300} autoFocus />
            <div className="space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={opt} onChange={(e) => {
                    const next = [...pollOptions]; next[i] = e.target.value; setPollOptions(next);
                  }} placeholder={`Opção ${i + 1}`} maxLength={150} />
                  {pollOptions.length > 2 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setPollOptions([...pollOptions, ""])} disabled={pollOptions.length >= 10}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar opção
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="multiple" checked={pollMultiple} onCheckedChange={(v) => setPollMultiple(!!v)} />
              <Label htmlFor="multiple" className="text-sm cursor-pointer">Permitir múltipla escolha</Label>
            </div>
          </TabsContent>

          <TabsContent value="anuncio" className="space-y-3 mt-4">
            <Textarea value={announcementContent} onChange={(e) => setAnnouncementContent(e.target.value)} placeholder="Escreva o anúncio…" rows={5} autoFocus maxLength={5000} />
            <div>
              <Label className="text-sm">Duração</Label>
              <Select value={announcementDuration} onValueChange={setAnnouncementDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ANNOUNCEMENT_DURATIONS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="apreciacao" className="space-y-3 mt-4">
            <div>
              <Label className="text-sm">Para</Label>
              <Select value={apprTo} onValueChange={setApprTo}>
                <SelectTrigger><SelectValue placeholder="Selecione um colega" /></SelectTrigger>
                <SelectContent>
                  {colleagues.map(c => (
                    <SelectItem key={c.user_id} value={c.user_id}>{c.name || "Sem nome"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Tipo</Label>
              <Select value={apprKind} onValueChange={setApprKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPRECIATION_KINDS.map(k => (
                    <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea value={apprMessage} onChange={(e) => setApprMessage(e.target.value)} placeholder="Mensagem personalizada (opcional)" rows={4} maxLength={1000} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={publishing}>Cancelar</Button>
          <Button onClick={handlePublish} disabled={publishing}>
            {publishing ? "Publicando..." : "Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
