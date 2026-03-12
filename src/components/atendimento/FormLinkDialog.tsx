import { useState, useEffect } from "react";
import { Plus, Copy, Check, X, Tag, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CrmTag {
  id: string;
  name: string;
  color: string;
  servidor_id: string;
}

interface Servidor {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

interface FormLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

export function FormLinkDialog({ open, onOpenChange }: FormLinkDialogProps) {
  const { activeCompanyId, profile, isMaster } = useAuth();
  const defaultServidorId = activeCompanyId || profile?.company_id;
  const [selectedServidorId, setSelectedServidorId] = useState<string | null>(null);
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const servidorId = selectedServidorId || defaultServidorId;

  const [tags, setTags] = useState<CrmTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && isMaster && !defaultServidorId) {
      fetchServidores();
    }
    if (open && servidorId) fetchTags();
  }, [open, servidorId]);

  useEffect(() => {
    if (!open) {
      setSelectedServidorId(null);
      setSelectedTags([]);
    }
  }, [open]);

  const fetchServidores = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, razao_social, nome_fantasia")
      .is("servidor_id", null)
      .in("status", ["active", "teste"])
      .order("razao_social");
    if (data) setServidores(data);
  };

  const fetchTags = async () => {
    if (!servidorId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_tags")
      .select("*")
      .eq("servidor_id", servidorId)
      .order("name");
    if (!error) setTags((data as CrmTag[]) || []);
    setLoading(false);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !servidorId) return;
    const { data, error } = await supabase
      .from("crm_tags")
      .insert({ name: newTagName.trim(), color: newTagColor, servidor_id: servidorId } as any)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") toast.error("Tag já existe!");
      else toast.error("Erro ao criar tag");
      return;
    }
    setTags((prev) => [...prev, data as CrmTag].sort((a, b) => a.name.localeCompare(b.name)));
    setNewTagName("");
    toast.success("Tag criada!");
  };

  const handleDeleteTag = async (id: string) => {
    const { error } = await supabase.from("crm_tags").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir tag"); return; }
    setTags((prev) => prev.filter((t) => t.id !== id));
    setSelectedTags((prev) => prev.filter((t) => t !== id));
    toast.success("Tag excluída");
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const generatedLink = (() => {
    if (!servidorId) return "";
    const base = `${window.location.origin}/captura/${servidorId}`;
    const selected = tags.filter((t) => selectedTags.includes(t.id));
    if (selected.length === 0) return base;
    const tagNames = selected.map((t) => t.name).join(",");
    return `${base}?tags=${encodeURIComponent(tagNames)}`;
  })();

  const copyLink = () => {
    if (!generatedLink) {
      toast.error("Selecione um servidor primeiro");
      return;
    }
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Link do Formulário
          </DialogTitle>
          <DialogDescription>
            Crie tags e gere links personalizados para captura de leads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Create new tag */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <Tag className="h-3.5 w-3.5" /> Criar Nova Tag
            </Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nome da tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                className="flex-1"
              />
              <div className="flex items-center gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: newTagColor === color ? "hsl(var(--foreground))" : "transparent",
                    }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
              <Button size="sm" onClick={handleCreateTag} disabled={!newTagName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Existing tags */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Tags Disponíveis</Label>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : tags.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Nenhuma tag criada ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <div key={tag.id} className="flex items-center gap-1">
                      <Badge
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:shadow-sm gap-1.5 pr-1"
                        style={{
                          backgroundColor: isSelected ? tag.color : "transparent",
                          borderColor: tag.color,
                          color: isSelected ? "#fff" : tag.color,
                        }}
                        onClick={() => toggleTag(tag.id)}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: isSelected ? "#fff" : tag.color }}
                        />
                        {tag.name}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag.id); }}
                          className="ml-0.5 hover:opacity-70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Generated link */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-sm font-semibold">Link Gerado</Label>
            <p className="text-xs text-muted-foreground">
              {selectedTags.length > 0
                ? `${selectedTags.length} tag(s) selecionada(s) — leads capturados por este link receberão essas tags automaticamente.`
                : "Selecione tags acima para gerar um link personalizado, ou copie o link padrão."}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded-md text-xs font-mono break-all max-h-20 overflow-y-auto">
                {generatedLink || "Selecione um servidor"}
              </code>
              <Button size="sm" onClick={copyLink} disabled={!generatedLink} className="gap-1.5 shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado!" : "Copiar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
