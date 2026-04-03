import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Image, Loader2 } from "lucide-react";

interface Announcement {
  id: string; title: string; image_url: string; description: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  announcements: Announcement[];
  onRefresh: () => void;
}

export function ManageAnnouncementsDialog({ open, onOpenChange, announcements, onRefresh }: Props) {
  const { user, isMaster, activeCompanyId, profile } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleAdd = async () => {
    if (!title || !file) { toast.error("Preencha o título e selecione uma imagem"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `announcements/${Date.now()}.${ext}`;
      const { error: ue } = await supabase.storage.from("documents").upload(path, file);
      if (ue) throw ue;
      const { data: ud } = supabase.storage.from("documents").getPublicUrl(path);
      const servidorId = isMaster ? activeCompanyId : profile?.company_id;
      const { error } = await supabase.from("announcements").insert({
        title, description: desc || null, image_url: ud.publicUrl,
        created_by: user?.id, display_order: announcements.length, servidor_id: servidorId,
      } as any);
      if (error) throw error;
      toast.success("Recado adicionado!");
      setTitle(""); setDesc(""); setFile(null); setAddOpen(false);
      onRefresh();
    } catch (e: any) { toast.error("Erro: " + (e.message || "tente novamente")); }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Excluído"); onRefresh(); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gerenciar Recados</DialogTitle>
            <DialogDescription>Adicione ou remova comunicados da Home</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {announcements.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum recado</p>}
            {announcements.map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <img src={item.image_url} alt={item.title} className="h-14 w-20 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{item.title}</p>
                  {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                </div>
                <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button className="w-full gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Adicionar Recado
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Recado</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" />
            </div>
            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição" rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Imagem</Label>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="gap-2" onClick={() => document.getElementById("ann-img")?.click()}>
                  <Image className="h-4 w-4" /> Selecionar
                </Button>
                {file && <span className="text-sm text-muted-foreground truncate">{file.name}</span>}
              </div>
              <input id="ann-img" type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={uploading} className="gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
