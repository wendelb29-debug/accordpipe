import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Settings, Upload, Zap, Pencil, Trash2, Plus, Loader2, Bell, Users2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhatsAppProfileSettings } from "@/hooks/useWhatsAppProfileSettings";
import { useQuickReplies, QuickReply } from "@/hooks/useQuickReplies";
import { useAuth } from "@/contexts/AuthContext";
import { QueueTab } from "./QueueTab";
import { NotificationPreferences } from "./NotificationPreferences";
import { DepartmentManagement } from "../atendimento/DepartmentManagement";
import { DepartmentRoutingConfig } from "../atendimento/DepartmentRoutingConfig";

interface WhatsAppSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null | undefined;
  integrationId: string | null | undefined;
  serverUrl: string | null | undefined;
}

export function WhatsAppSettingsDialog({
  open, onOpenChange, companyId, integrationId, serverUrl,
}: WhatsAppSettingsDialogProps) {
  const { loading: profileLoading, ready, updateName, updateImage } = useWhatsAppProfileSettings(integrationId, serverUrl);
  const { replies, isLoading: repliesLoading, create, update, remove } = useQuickReplies(companyId);
  const { role, isMaster } = useAuth();
  const isAdmin = isMaster || role === "ceo" || role === "admin";

  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [draft, setDraft] = useState<{ title: string; content: string; shortcut: string; category: string }>({
    title: "", content: "", shortcut: "", category: "",
  });

  const resetDraft = () => {
    setEditing(null);
    setDraft({ title: "", content: "", shortcut: "", category: "" });
  };

  const onPickImage = (f: File | null) => {
    setImageFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const submitName = async () => {
    if (await updateName(name)) setName("");
  };
  const submitImage = async () => {
    if (imageFile && (await updateImage(imageFile))) {
      onPickImage(null);
    }
  };

  const startEdit = (r: QuickReply) => {
    setEditing(r);
    setDraft({
      title: r.title,
      content: r.content,
      shortcut: r.shortcut || "",
      category: r.category || "",
    });
  };

  const submitDraft = async () => {
    if (!draft.title.trim() || !draft.content.trim()) return;
    const payload = {
      title: draft.title,
      content: draft.content,
      shortcut: draft.shortcut.replace(/^\//, "") || null,
      category: draft.category || null,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    resetDraft();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Configurações WhatsApp
          </DialogTitle>
          <DialogDescription>
            Alterar nome/foto do perfil conectado e gerenciar as respostas rápidas do time.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="quick">
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Respostas rápidas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 pt-4">
            {!ready && (
              <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
                Configure uma instância Uazapi/Z-API ativa no Perfil para habilitar estas opções.
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome de exibição</Label>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Atendimento Accord"
                  disabled={!ready || profileLoading}
                />
                <Button onClick={submitName} disabled={!ready || profileLoading || !name.trim()}>
                  {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Foto de perfil</Label>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-muted overflow-hidden flex items-center justify-center text-muted-foreground">
                  {imagePreview ? (
                    <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                  disabled={!ready || profileLoading}
                  className="text-xs flex-1"
                />
                <Button
                  onClick={submitImage}
                  disabled={!ready || profileLoading || !imageFile}
                  className="gap-2"
                >
                  {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Enviar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A imagem é enviada ao WhatsApp via Uazapi e fica visível para seus contatos.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="quick" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                placeholder="Título"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Atalho (ex: oi)"
                  value={draft.shortcut}
                  onChange={(e) => setDraft((d) => ({ ...d, shortcut: e.target.value }))}
                />
                <Input
                  placeholder="Categoria"
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                />
              </div>
            </div>
            <Textarea
              rows={3}
              placeholder="Conteúdo da mensagem…"
              value={draft.content}
              onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            />
            <div className="flex justify-end gap-2">
              {editing && (
                <Button variant="ghost" onClick={resetDraft}>Cancelar edição</Button>
              )}
              <Button
                onClick={submitDraft}
                disabled={!draft.title.trim() || !draft.content.trim() || create.isPending || update.isPending}
                className="gap-2"
              >
                {(create.isPending || update.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editing ? "Salvar alterações" : "Adicionar resposta"}
              </Button>
            </div>

            <div className="rounded-lg border border-border/60 max-h-72 overflow-y-auto divide-y divide-border/60">
              {repliesLoading ? (
                <div className="p-4 text-xs text-muted-foreground">Carregando…</div>
              ) : replies.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground">Nenhuma resposta cadastrada.</div>
              ) : (
                replies.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-start gap-3 p-3",
                      editing?.id === r.id && "bg-primary/5",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.shortcut && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            /{r.shortcut}
                          </span>
                        )}
                        <span className="text-sm font-medium truncate">{r.title}</span>
                        {r.category && (
                          <span className="text-[10px] text-muted-foreground">{r.category}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.content}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => remove.mutate(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
