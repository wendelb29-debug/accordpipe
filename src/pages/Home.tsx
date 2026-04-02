import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Megaphone, HeadphonesIcon, Send, Image, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  image_url: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export default function Home() {
  const { user, isAdmin, isMaster, profile, activeCompanyId } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Admin dialog
  const [manageOpen, setManageOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Support dialog
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);

  const fetchAnnouncements = async () => {
    let query = supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    // Master with active company filter, or master sees all via RLS
    if (isMaster && activeCompanyId) {
      query = query.eq("servidor_id", activeCompanyId);
    }

    const { data, error } = await query;
    if (!error) setAnnouncements((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [activeCompanyId]);

  // Auto-rotate carousel
  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  const handleAddAnnouncement = async () => {
    if (!newTitle || !newImageFile) {
      toast.error("Preencha o título e selecione uma imagem");
      return;
    }
    setUploading(true);
    try {
      const ext = newImageFile.name.split(".").pop();
      const path = `announcements/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, newImageFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);

      const servidorId = isMaster ? activeCompanyId : profile?.company_id;

      const { error } = await supabase.from("announcements").insert({
        title: newTitle,
        description: newDescription || null,
        image_url: urlData.publicUrl,
        created_by: user?.id,
        display_order: announcements.length,
        servidor_id: servidorId,
      } as any);
      if (error) throw error;

      toast.success("Recado adicionado!");
      setNewTitle("");
      setNewDescription("");
      setNewImageFile(null);
      setAddOpen(false);
      await fetchAnnouncements();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || "tente novamente"));
    }
    setUploading(false);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Recado excluído");
      await fetchAnnouncements();
    }
  };

  const handleSendSupport = async () => {
    if (!supportSubject || !supportMessage) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSendingSupport(true);
    const { error } = await supabase.from("support_requests").insert({
      user_id: user?.id,
      subject: supportSubject,
      message: supportMessage,
    } as any);
    if (error) {
      toast.error("Erro ao enviar solicitação");
    } else {
      toast.success("Solicitação enviada com sucesso!");
      setSupportSubject("");
      setSupportMessage("");
      setSupportOpen(false);
    }
    setSendingSupport(false);
  };

  return (
    <div className="space-y-8 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground">Início</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Bem-vindo ao ACCORD</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" className="gap-2" onClick={() => setManageOpen(true)}>
              <Megaphone className="h-4 w-4" />
              Gerenciar Recados
            </Button>
          )}
          <Button className="gap-2 gradient-primary text-primary-foreground shadow-md" onClick={() => setSupportOpen(true)}>
            <HeadphonesIcon className="h-4 w-4" />
            Suporte
          </Button>
        </div>
      </div>

      {/* Carousel */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : announcements.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Megaphone className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum recado disponível</p>
          {isAdmin && <p className="text-sm mt-1">Clique em "Gerenciar Recados" para adicionar</p>}
        </Card>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-card shadow-card">
          <div className="relative aspect-[21/9] w-full">
            {announcements.map((item, idx) => (
              <div
                key={item.id}
                className={`absolute inset-0 transition-opacity duration-700 ${idx === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              >
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-bold text-white mb-1">{item.title}</h3>
                  {item.description && (
                    <p className="text-white/80 text-sm max-w-2xl">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {announcements.length > 1 && (
            <>
              <button
                onClick={() => setCurrentSlide((prev) => (prev - 1 + announcements.length) % announcements.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentSlide((prev) => (prev + 1) % announcements.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                {announcements.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all ${idx === currentSlide ? "w-6 bg-white" : "w-2 bg-white/50"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Manage Announcements Dialog (Admin) */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gerenciar Recados</DialogTitle>
            <DialogDescription>Adicione ou remova imagens e recados da Home</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {announcements.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Nenhum recado cadastrado</p>
            )}
            {announcements.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <img src={item.image_url} alt={item.title} className="h-14 w-20 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{item.title}</p>
                  {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                </div>
                <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleDeleteAnnouncement(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button className="w-full gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Adicionar Recado
          </Button>
        </DialogContent>
      </Dialog>

      {/* Add Announcement Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Recado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título do recado" />
            </div>
            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Descrição breve" rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Imagem</Label>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="gap-2" onClick={() => document.getElementById("ann-image")?.click()}>
                  <Image className="h-4 w-4" />
                  Selecionar Imagem
                </Button>
                {newImageFile && <span className="text-sm text-muted-foreground truncate">{newImageFile.name}</span>}
              </div>
              <input id="ann-image" type="file" accept="image/*" className="hidden" onChange={(e) => setNewImageFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddAnnouncement} disabled={uploading} className="gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Support Dialog */}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeadphonesIcon className="h-5 w-5 text-primary" />
              Solicitar Suporte
            </DialogTitle>
            <DialogDescription>Envie sua solicitação e nossa equipe entrará em contato</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Assunto</Label>
              <Input value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} placeholder="Ex: Erro ao emitir contrato" />
            </div>
            <div className="grid gap-2">
              <Label>Mensagem</Label>
              <Textarea value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="Descreva o problema ou solicitação..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupportOpen(false)}>Cancelar</Button>
            <Button onClick={handleSendSupport} disabled={sendingSupport} className="gap-2">
              {sendingSupport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
