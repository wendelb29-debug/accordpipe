import { useState, useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import {
  Bold, Italic, Strikethrough, RemoveFormatting, Type,
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  Video, Code, Smile, Sparkles, AtSign, Paperclip,
  FileText, Quote, Hash, VideoIcon, ChevronDown, X, Loader2, Send, Plus,
  FolderOpen, Search, Upload, File as FileIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ComposerTab = "message" | "event" | "poll" | "file" | "more";

interface Props {
  open: boolean;
  onClose: () => void;
  onPublished?: () => void;
  initialTab?: ComposerTab;
  userId?: string;
  servidorId?: string;
}

const TABS: { id: ComposerTab; label: string }[] = [
  { id: "message", label: "MENSAGEM" },
  { id: "event", label: "EVENTO" },
  { id: "poll", label: "ENQUETE" },
  { id: "file", label: "ARQUIVO" },
  { id: "more", label: "MAIS" },
];

export function ExpandedComposer({ open, onClose, onPublished, initialTab = "message", userId, servidorId }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<ComposerTab>(initialTab);
  const [publishing, setPublishing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Poll state
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollMultiple, setPollMultiple] = useState(false);

  // Event state
  const [evTitle, setEvTitle] = useState("");
  const [evDate, setEvDate] = useState("");
  const [evDesc, setEvDesc] = useState("");

  // Recipients picker
  type TenantUser = { user_id: string; name: string; avatar_url: string | null };
  const [allRecipients, setAllRecipients] = useState(true);
  const [selectedRecipients, setSelectedRecipients] = useState<TenantUser[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [recipientPickerOpen, setRecipientPickerOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");

  useEffect(() => {
    if (!open || !servidorId) return;
    (async () => {
      const { data: links } = await supabase
        .from("user_tenants")
        .select("user_id")
        .eq("tenant_id", servidorId)
        .eq("status", "ativo");
      const ids = (links || []).map((l: any) => l.user_id).filter((id: string) => id !== userId);
      if (ids.length === 0) {
        setTenantUsers([]);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", ids);
      const list: TenantUser[] = (profs || []).map((p: any) => ({
        user_id: p.user_id,
        name: p.name || "Sem nome",
        avatar_url: p.avatar_url || null,
      }));
      setTenantUsers(list);
    })();
  }, [open, servidorId, userId]);

  useEffect(() => {
    if (open) {
      setAllRecipients(true);
      setSelectedRecipients([]);
      setRecipientPickerOpen(false);
      setRecipientSearch("");
    }
  }, [open]);

  const filteredTenantUsers = useMemo(
    () => tenantUsers.filter((u) => u.name.toLowerCase().includes(recipientSearch.toLowerCase())),
    [tenantUsers, recipientSearch]
  );

  const toggleRecipient = (u: TenantUser) => {
    setAllRecipients(false);
    setSelectedRecipients((prev) =>
      prev.find((p) => p.user_id === u.user_id)
        ? prev.filter((p) => p.user_id !== u.user_id)
        : [...prev, u]
    );
  };

  const recipientsValue = useMemo(
    () => (allRecipients || selectedRecipients.length === 0 ? "all" : selectedRecipients.map((u) => u.user_id).join(",")),
    [allRecipients, selectedRecipients]
  );

  // File source state
  const [fileSource, setFileSource] = useState<"upload" | "drive">("upload");
  const [driveFiles, setDriveFiles] = useState<Array<{ id: string; name: string; file_path: string | null; file_url: string | null; file_type: string | null }>>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveSearch, setDriveSearch] = useState("");

  useEffect(() => {
    if (!open || tab !== "file" || fileSource !== "drive" || !servidorId) return;
    setDriveLoading(true);
    supabase
      .from("drive_files")
      .select("id,name,file_path,file_url,file_type")
      .eq("servidor_id", servidorId)
      .eq("type", "file")
      .eq("status", "normal")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setDriveFiles(data || []);
        setDriveLoading(false);
      });
  }, [open, tab, fileSource, servidorId]);

  const filteredDriveFiles = useMemo(
    () => driveFiles.filter((f) => f.name.toLowerCase().includes(driveSearch.toLowerCase())),
    [driveFiles, driveSearch]
  );

  const handleAttachFromDrive = async (f: typeof driveFiles[number]) => {
    try {
      let url = f.file_url || "";
      if (!url && f.file_path) {
        const { data } = await supabase.storage.from("contract-pdfs").createSignedUrl(f.file_path, 60 * 60 * 24 * 365);
        url = data?.signedUrl || "";
      }
      if (!url) {
        toast.error("Arquivo indisponível");
        return;
      }
      const isImage = (f.file_type || "").startsWith("image/");
      if (isImage) {
        editor?.chain().focus().setImage({ src: url }).run();
      } else {
        editor?.chain().focus().setLink({ href: url }).insertContent(f.name).run();
      }
      setTab("message");
      toast.success(`"${f.name}" anexado`);
    } catch (err: any) {
      toast.error("Erro ao anexar", { description: err?.message });
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({}) as any,
      Link.configure({ openOnClick: false, autolink: true }) as any,
      Image as any,
      TextStyle as any,
      Color as any,
      Placeholder.configure({ placeholder: "Compartilhe uma novidade com a equipe..." }) as any,
    ],
    editorProps: {
      attributes: {
        class: "tiptap prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[180px] px-4 py-3",
      },
    },
  });

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      editor?.commands.clearContent();
      setPollQuestion(""); setPollOptions(["", ""]); setPollMultiple(false);
      setEvTitle(""); setEvDate(""); setEvDesc("");
    }
  }, [open, initialTab]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  // ─────────── PUBLICAR MENSAGEM ───────────
  const publishMessage = async () => {
    const html = editor?.getHTML() || "";
    const text = editor?.getText().trim() || "";
    if (!text) { toast.error("Escreva algo antes de publicar"); return; }

    const tags = extractHashtags(text);
    const { error } = await supabase.from("feed_posts").insert({
      servidor_id: servidorId!, author_id: userId!,
      content: html, tags, post_type: "mensagem", recipients: recipientsValue,
    } as any);
    if (error) throw error;
  };

  // ─────────── PUBLICAR ENQUETE ───────────
  const publishPoll = async () => {
    if (!pollQuestion.trim()) { toast.error("Informe a pergunta da enquete"); throw new Error("skip"); }
    const opts = pollOptions.map(o => o.trim()).filter(Boolean);
    if (opts.length < 2) { toast.error("Adicione ao menos 2 opções"); throw new Error("skip"); }

    const { data: post, error: ePost } = await supabase.from("feed_posts").insert({
      servidor_id: servidorId!, author_id: userId!,
      content: pollQuestion.trim(), tags: [], post_type: "enquete", recipients: recipientsValue,
    } as any).select("id").single();
    if (ePost || !post) throw ePost;

    const { data: poll, error: ePoll } = await (supabase as any).from("feed_polls").insert({
      post_id: (post as any).id, servidor_id: servidorId!,
      question: pollQuestion.trim(), allow_multiple: pollMultiple,
    }).select("id").single();
    if (ePoll || !poll) throw ePoll;

    const optsRows = opts.map((text, i) => ({ poll_id: poll.id, text, position: i }));
    const { error: eOpt } = await (supabase as any).from("feed_poll_options").insert(optsRows);
    if (eOpt) throw eOpt;
  };

  // ─────────── PUBLICAR EVENTO ───────────
  const publishEvent = async () => {
    if (!evTitle.trim() || !evDate) { toast.error("Informe título e data do evento"); throw new Error("skip"); }
    const { error } = await supabase.from("feed_posts").insert({
      servidor_id: servidorId!, author_id: userId!,
      content: `📅 ${evTitle.trim()}\n${evDesc.trim()}\n\nQuando: ${new Date(evDate).toLocaleString("pt-BR")}`,
      tags: [], post_type: "mensagem", recipients: recipientsValue,
    } as any);
    if (error) throw error;
  };

  const handlePublish = async () => {
    if (!userId || !servidorId) { toast.error("Sessão inválida"); return; }
    setPublishing(true);
    try {
      if (tab === "message" || tab === "file" || tab === "more") await publishMessage();
      else if (tab === "poll") await publishPoll();
      else if (tab === "event") await publishEvent();

      toast.success("Publicado no feed");
      queryClient.invalidateQueries({ queryKey: ["feed-posts-v2"] });
      editor?.commands.clearContent();
      onPublished?.();
      onClose();
    } catch (err: any) {
      if (err?.message !== "skip") {
        toast.error("Erro ao publicar", { description: err?.message || String(err) });
      }
    } finally {
      setPublishing(false);
    }
  };

  // ─────────── COPILOT ───────────
  const handleCopilotImprove = async () => {
    const text = editor?.getText().trim();
    if (!text) { toast.error("Escreva algo antes de pedir melhoria"); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("feed-ai-assist", {
        body: { text, action: "improve" },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (data?.result) editor?.commands.setContent(data.result);
      toast.success("Texto melhorado");
    } catch (err: any) {
      toast.error("CoPilot indisponível", { description: err?.message });
    } finally {
      setAiLoading(false);
    }
  };

  // ─────────── UPLOAD ARQUIVO ───────────
  const handleAttachFile = async (file: File) => {
    if (!userId || !servidorId) return;
    try {
      const path = `feed/${servidorId}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl || "";
      if (file.type.startsWith("image/")) {
        editor?.chain().focus().setImage({ src: url }).run();
      } else {
        editor?.chain().focus().setLink({ href: url }).insertContent(file.name).run();
      }
      if (tab !== "message") setTab("message");
      toast.success("Arquivo anexado");
    } catch (err: any) {
      toast.error("Erro ao anexar", { description: err?.message });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={onClose} />

      <div
        className="fixed z-[81] left-1/2 top-[8vh] -translate-x-1/2 w-[min(900px,94vw)] max-h-[84vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TABS */}
        <div className="flex items-center border-b border-border px-4 pt-3 gap-1 flex-shrink-0 bg-card">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-2.5 text-[11.5px] font-bold tracking-wider relative transition",
                tab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {tab === t.id && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
              {t.id === "more" && <ChevronDown className="w-3 h-3 inline ml-1" />}
            </button>
          ))}
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TOOLBAR (só mensagem) */}
        {tab === "message" && editor && (
          <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border bg-muted/30 flex-wrap">
            <ToolbarBtn onClick={() => (editor.chain().focus() as any).toggleBold().run()} active={editor.isActive("bold")}><Bold className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn onClick={() => (editor.chain().focus() as any).toggleItalic().run()} active={editor.isActive("italic")}><Italic className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn onClick={() => (editor.chain().focus() as any).toggleStrike().run()} active={editor.isActive("strike")}><Strikethrough className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn onClick={() => (editor.chain().focus() as any).unsetAllMarks().clearNodes().run()}><RemoveFormatting className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarDivider />
            <ToolbarBtn onClick={() => (editor.chain().focus() as any).toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}><Type className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarDivider />
            <ToolbarBtn onClick={() => (editor.chain().focus() as any).toggleOrderedList().run()} active={editor.isActive("orderedList")}><ListOrdered className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn onClick={() => (editor.chain().focus() as any).toggleBulletList().run()} active={editor.isActive("bulletList")}><List className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarDivider />
            <ToolbarBtn onClick={() => {
              const url = prompt("URL do link:");
              if (url) (editor.chain().focus() as any).setLink({ href: url }).run();
            }}><LinkIcon className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn onClick={() => document.getElementById("composer-image-input")?.click()}><ImageIcon className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn disabled><Video className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn onClick={() => (editor.chain().focus() as any).toggleCodeBlock().run()} active={editor.isActive("codeBlock")}><Code className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn disabled><Smile className="w-3.5 h-3.5" /></ToolbarBtn>
            <div className="ml-auto">
              <button
                onClick={handleCopilotImprove}
                disabled={aiLoading}
                className="flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-gradient-to-r from-primary/15 to-violet-500/10 text-primary hover:from-primary/25 hover:to-violet-500/20 text-[11px] font-semibold disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                CoPilot
              </button>
            </div>
          </div>
        )}

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto min-h-[200px]">
          {tab === "message" && <EditorContent editor={editor} />}

          {tab === "poll" && (
            <div className="p-4 space-y-3">
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Sua pergunta"
                maxLength={300}
                className="w-full bg-input text-foreground border border-border rounded-md px-3 h-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={opt}
                    onChange={(e) => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }}
                    placeholder={`Opção ${i + 1}`}
                    maxLength={150}
                    className="flex-1 bg-input text-foreground border border-border rounded-md px-3 h-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} className="w-9 h-9 rounded-md hover:bg-muted text-muted-foreground flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setPollOptions([...pollOptions, ""])}
                disabled={pollOptions.length >= 10}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar opção
              </button>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={pollMultiple} onChange={(e) => setPollMultiple(e.target.checked)} />
                Permitir múltipla escolha
              </label>
            </div>
          )}

          {tab === "event" && (
            <div className="p-4 space-y-3">
              <input
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                placeholder="Título do evento"
                className="w-full bg-input text-foreground border border-border rounded-md px-3 h-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="datetime-local"
                value={evDate}
                onChange={(e) => setEvDate(e.target.value)}
                className="w-full bg-input text-foreground border border-border rounded-md px-3 h-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <textarea
                value={evDesc}
                onChange={(e) => setEvDesc(e.target.value)}
                placeholder="Descrição (opcional)"
                rows={4}
                className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          )}

          {tab === "file" && (
            <div className="p-4 space-y-3">
              {/* Sub-tabs: upload vs drive */}
              <div className="flex items-center gap-1 border-b border-border">
                <button
                  onClick={() => setFileSource("upload")}
                  className={cn(
                    "px-3 py-2 text-[11.5px] font-bold tracking-wider flex items-center gap-1.5 transition relative",
                    fileSource === "upload" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Upload className="w-3.5 h-3.5" /> DO COMPUTADOR
                  {fileSource === "upload" && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
                </button>
                <button
                  onClick={() => setFileSource("drive")}
                  className={cn(
                    "px-3 py-2 text-[11.5px] font-bold tracking-wider flex items-center gap-1.5 transition relative",
                    fileSource === "drive" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FolderOpen className="w-3.5 h-3.5" /> DOCUMENTOS ACCORD
                  {fileSource === "drive" && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
                </button>
              </div>

              {fileSource === "upload" && (
                <>
                  <input
                    id="composer-file-direct"
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleAttachFile(e.target.files[0])}
                  />
                  <div
                    onClick={() => document.getElementById("composer-file-direct")?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:bg-muted/30 transition"
                  >
                    <Paperclip className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-sm font-bold text-foreground mb-1">Anexar arquivo</h3>
                    <p className="text-xs text-muted-foreground">Clique pra escolher do seu computador</p>
                  </div>
                </>
              )}

              {fileSource === "drive" && (
                <>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      placeholder="Buscar documento..."
                      className="w-full bg-input text-foreground border border-border rounded-md pl-9 pr-3 h-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="max-h-[320px] overflow-y-auto border border-border rounded-lg divide-y divide-border">
                    {driveLoading && (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" /> Carregando...
                      </div>
                    )}
                    {!driveLoading && filteredDriveFiles.length === 0 && (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        Nenhum arquivo encontrado na pasta Documentos.
                      </div>
                    )}
                    {!driveLoading && filteredDriveFiles.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => handleAttachFromDrive(f)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition text-left"
                      >
                        <FileIcon className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm text-foreground truncate flex-1">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{(f.file_type || "").split("/").pop()?.slice(0, 5)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "more" && (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">Mais tipos em breve: citação, marca, vídeo gravado, documento colaborativo...</p>
            </div>
          )}
        </div>

        {/* INPUTS ESCONDIDOS */}
        <input
          id="composer-image-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleAttachFile(e.target.files[0])}
        />

        {/* BARRA INFERIOR DE AÇÕES RICAS */}
        <div className="flex items-center gap-1 px-3 py-2 border-t border-border bg-muted/20 flex-wrap">
          <BottomActionBtn icon={Sparkles} label="CoPilot" onClick={handleCopilotImprove} highlight />
          <BottomActionBtn icon={Paperclip} label="Arquivo" onClick={() => document.getElementById("composer-image-input")?.click()} />
          <BottomActionBtn icon={FileText} label="Criar documento" disabled />
          <BottomActionBtn icon={AtSign} label="Mencionar" onClick={() => editor?.chain().focus().insertContent("@").run()} />
          <BottomActionBtn icon={Quote} label="Citação" onClick={() => (editor?.chain().focus() as any).toggleBlockquote().run()} />
          <BottomActionBtn icon={Hash} label="Adicionar marca" onClick={() => editor?.chain().focus().insertContent("#").run()} />
          <BottomActionBtn icon={VideoIcon} label="Gravar Vídeo" disabled />
        </div>

        {/* DESTINATÁRIOS */}
        <div className="relative flex items-start gap-3 px-4 py-3 border-t border-border">
          <span className="text-[11px] font-bold text-muted-foreground pt-1.5">Para:</span>
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {allRecipients && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-md text-[11.5px] font-semibold">
                Todos os colaboradores
              </span>
            )}
            {!allRecipients && selectedRecipients.map((u) => (
              <span key={u.user_id} className="inline-flex items-center gap-1.5 bg-primary/15 text-primary px-2 py-1 rounded-md text-[11.5px] font-semibold">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-primary/30 text-[9px] flex items-center justify-center font-bold">
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                )}
                {u.name}
                <button onClick={() => toggleRecipient(u)} className="opacity-60 hover:opacity-100">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={() => setRecipientPickerOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary hover:underline px-1.5 py-1"
            >
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>

          {recipientPickerOpen && (
            <>
              <div className="fixed inset-0 z-[82]" onClick={() => setRecipientPickerOpen(false)} />
              <div className="absolute z-[83] left-12 bottom-full mb-2 w-[320px] bg-popover border border-border rounded-lg shadow-2xl overflow-hidden">
                <div className="p-2 border-b border-border">
                  <input
                    autoFocus
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    placeholder="Buscar pessoa..."
                    className="w-full bg-input border border-border rounded-md px-2.5 h-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="max-h-[280px] overflow-y-auto">
                  <button
                    onClick={() => { setAllRecipients(true); setSelectedRecipients([]); setRecipientPickerOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted text-left transition",
                      allRecipients && "bg-emerald-500/10"
                    )}
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                      <AtSign className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">Todos os colaboradores</p>
                      <p className="text-[10px] text-muted-foreground">Envia para todos do tenant</p>
                    </div>
                    {allRecipients && <span className="text-emerald-600 text-xs font-bold">✓</span>}
                  </button>
                  <div className="h-px bg-border" />
                  {filteredTenantUsers.length === 0 && (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum usuário</p>
                  )}
                  {filteredTenantUsers.map((u) => {
                    const checked = !allRecipients && !!selectedRecipients.find((p) => p.user_id === u.user_id);
                    return (
                      <button
                        key={u.user_id}
                        onClick={() => toggleRecipient(u)}
                        className={cn("w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted text-left transition", checked && "bg-primary/10")}
                      >
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-foreground flex-1 truncate">{u.name}</span>
                        {checked && <span className="text-primary text-xs font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* AÇÕES */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-muted/20">
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="h-10 px-6 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-[12.5px] font-extrabold tracking-wider inline-flex items-center gap-2 disabled:opacity-50"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            ENVIAR
          </button>
          <button
            onClick={onClose}
            disabled={publishing}
            className="h-10 px-4 text-[12px] font-bold tracking-wider text-muted-foreground hover:text-foreground"
          >
            CANCELAR
          </button>
        </div>
      </div>
    </>
  );
}

function ToolbarBtn({ children, onClick, active, disabled }: { children: React.ReactNode; onClick?: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-7 h-7 rounded-md flex items-center justify-center transition",
        active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="w-px h-5 bg-border mx-1" />;
}

function BottomActionBtn({ icon: Icon, label, onClick, disabled, highlight }: { icon: any; label: string; onClick?: () => void; disabled?: boolean; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11px] font-semibold transition",
        highlight && "text-primary hover:bg-primary/10",
        !highlight && "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u00C0-\u017F]+/g) || [];
  return Array.from(new Set(matches.map(t => t.slice(1))));
}
