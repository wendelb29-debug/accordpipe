import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Upload, Loader2, Star, ImageIcon, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  logo_path: string | null;
  is_default: boolean;
  servidor_id: string;
}

interface BrandManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servidorId: string;
  onBrandsChange?: () => void;
}

export function BrandManagerDialog({ open, onOpenChange, servidorId, onBrandsChange }: BrandManagerDialogProps) {
  const { profile } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetBrandId, setTargetBrandId] = useState<string | null>(null);

  const canManage = profile?.is_master || (profile as any)?.is_admin;

  useEffect(() => {
    if (open) fetchBrands();
  }, [open, servidorId]);

  const fetchBrands = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("proposal_brands")
      .select("*")
      .eq("servidor_id", servidorId)
      .order("is_default", { ascending: false })
      .order("name");
    setBrands((data as Brand[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("proposal_brands").insert({
      name: newName.trim(),
      servidor_id: servidorId,
      created_by: profile?.user_id,
    } as any);
    if (error) {
      toast.error("Erro ao criar marca");
    } else {
      toast.success("Marca criada!");
      setNewName("");
      await fetchBrands();
      onBrandsChange?.();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("proposal_brands").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir marca"); return; }
    toast.success("Marca excluída!");
    await fetchBrands();
    onBrandsChange?.();
  };

  const handleSetDefault = async (id: string) => {
    // Remove default from all
    await supabase.from("proposal_brands").update({ is_default: false } as any).eq("servidor_id", servidorId);
    // Set new default
    await supabase.from("proposal_brands").update({ is_default: true } as any).eq("id", id);
    toast.success("Marca padrão atualizada!");
    await fetchBrands();
    onBrandsChange?.();
  };

  const handleUploadLogo = async (brandId: string, file: File) => {
    setUploading(brandId);
    try {
      const ext = file.name.split(".").pop();
      const path = `brands/${servidorId}/${brandId}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
      await supabase.from("proposal_brands").update({ logo_url: urlData.publicUrl, logo_path: path } as any).eq("id", brandId);
      toast.success("Logo atualizado!");
      await fetchBrands();
      onBrandsChange?.();
    } catch {
      toast.error("Erro ao enviar logo");
    } finally {
      setUploading(null);
    }
  };

  const triggerUpload = (brandId: string) => {
    setTargetBrandId(brandId);
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && targetBrandId) {
      handleUploadLogo(targetBrandId, file);
    }
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Gerenciar Marcas
          </DialogTitle>
        </DialogHeader>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />

        {/* Create new brand */}
        {canManage && (
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Nova marca</Label>
              <Input
                placeholder="Nome da marca..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-9"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()} className="gap-1.5 h-9">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar
            </Button>
          </div>
        )}

        {/* Brand list */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : brands.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma marca cadastrada</p>
          ) : (
            brands.map((brand) => (
              <div key={brand.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                {/* Logo preview */}
                <div className="h-12 w-12 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt={brand.name} className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Brand info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{brand.name}</p>
                    {brand.is_default && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Padrão</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {brand.logo_url ? "Logo configurado" : "Sem logo"}
                  </p>
                </div>

                {/* Actions */}
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Enviar logo"
                      onClick={() => triggerUpload(brand.id)}
                      disabled={uploading === brand.id}
                    >
                      {uploading === brand.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                    {!brand.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Definir como padrão"
                        onClick={() => handleSetDefault(brand.id)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Excluir"
                      onClick={() => handleDelete(brand.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
