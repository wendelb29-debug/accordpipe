import { useState } from "react";
import { Upload, Palette, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanyFormData } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  formData: CompanyFormData;
  onChange: (data: CompanyFormData) => void;
}

const colorFields = [
  { key: "brandPrimaryColor" as const, label: "Cor Primária", desc: "Títulos e cabeçalhos" },
  { key: "brandSecondaryColor" as const, label: "Cor Secundária", desc: "Linhas de destaque" },
  { key: "brandAccentColor" as const, label: "Cor de Destaque", desc: "Botões e CTA" },
  { key: "brandBgColor" as const, label: "Cor de Fundo", desc: "Background da proposta" },
  { key: "brandTextColor" as const, label: "Cor do Texto", desc: "Texto principal" },
];

export function BrandIdentityFields({ formData, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `brand-logos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
      onChange({
        ...formData,
        brandLogoUrl: urlData.publicUrl,
        brandLogoPath: path,
      });
      toast.success("Logo enviado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar logo: " + (err.message || ""));
    } finally {
      setUploading(false);
    }
  };

  const handleColorChange = (key: keyof CompanyFormData, value: string) => {
    onChange({ ...formData, [key]: value });
  };

  return (
    <div className="grid gap-6">
      {/* Logo Upload */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Logo da Empresa
        </Label>
        <p className="text-xs text-muted-foreground">
          Será exibido no canto superior esquerdo das propostas e contratos
        </p>
        <div className="flex items-center gap-4">
          {formData.brandLogoUrl ? (
            <div className="h-16 w-32 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden">
              <img
                src={formData.brandLogoUrl}
                alt="Logo"
                className="max-h-14 max-w-28 object-contain"
              />
            </div>
          ) : (
            <div className="h-16 w-32 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) handleLogoUpload(f);
                };
                input.click();
              }}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {formData.brandLogoUrl ? "Alterar Logo" : "Enviar Logo"}
            </Button>
            {formData.brandLogoUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => onChange({ ...formData, brandLogoUrl: "", brandLogoPath: "" })}
              >
                Remover
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Color Fields */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Paleta de Cores
        </Label>
        <p className="text-xs text-muted-foreground">
          Essas cores serão aplicadas automaticamente em propostas e contratos
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {colorFields.map((field) => (
            <div key={field.key} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <input
                type="color"
                value={formData[field.key]}
                onChange={(e) => handleColorChange(field.key, e.target.value)}
                className="h-8 w-8 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{field.label}</p>
                <p className="text-[10px] text-muted-foreground">{field.desc}</p>
              </div>
              <Input
                value={formData[field.key]}
                onChange={(e) => handleColorChange(field.key, e.target.value)}
                className="w-24 h-7 text-xs font-mono"
                maxLength={7}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Preview</Label>
        <div
          className="rounded-lg p-4 border border-border"
          style={{ backgroundColor: formData.brandBgColor }}
        >
          <div className="flex items-center gap-3 mb-3">
            {formData.brandLogoUrl && (
              <img src={formData.brandLogoUrl} alt="Logo" className="h-8 object-contain" />
            )}
            <span
              className="text-sm font-bold"
              style={{ color: formData.brandPrimaryColor }}
            >
              PROPOSTA COMERCIAL
            </span>
          </div>
          <div
            className="h-1 rounded mb-3"
            style={{ backgroundColor: formData.brandSecondaryColor }}
          />
          <p className="text-xs mb-2" style={{ color: formData.brandTextColor }}>
            Exemplo de texto do corpo da proposta com as cores configuradas.
          </p>
          <div
            className="inline-block px-3 py-1 rounded text-xs font-semibold text-white"
            style={{ backgroundColor: formData.brandAccentColor }}
          >
            R$ 1.500,00
          </div>
        </div>
      </div>
    </div>
  );
}
