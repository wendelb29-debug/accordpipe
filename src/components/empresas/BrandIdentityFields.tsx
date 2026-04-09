import { useState, useEffect } from "react";
import { Upload, Palette, Loader2, ImageIcon, Home, BarChart3, Users, Settings, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanyFormData } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { hexToHsl, darkenHsl, lightenHsl } from "@/components/layout/ThemeSync";

interface Props {
  formData: CompanyFormData;
  onChange: (data: CompanyFormData) => void;
}

const colorFields = [
  { key: "brandPrimaryColor" as const, label: "Cor Primária", desc: "Títulos, ícones ativos e sidebar" },
  { key: "brandSecondaryColor" as const, label: "Cor Secundária", desc: "Destaque do menu e linhas" },
  { key: "brandAccentColor" as const, label: "Cor de Destaque", desc: "Botões, CTA e gradientes" },
  { key: "brandBgColor" as const, label: "Cor de Fundo", desc: "Background de propostas" },
  { key: "brandTextColor" as const, label: "Cor do Texto", desc: "Texto principal" },
];

export function BrandIdentityFields({ formData, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [previewTab, setPreviewTab] = useState<"proposta" | "sistema">("sistema");

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

  // Derived colors for preview
  const primaryHsl = hexToHsl(formData.brandPrimaryColor) || "224 76% 53%";
  const accentHsl = hexToHsl(formData.brandAccentColor);
  const secondaryHsl = hexToHsl(formData.brandSecondaryColor);
  const sidebarBgHsl = darkenHsl(primaryHsl, 38);
  const sidebarAccentHsl = darkenHsl(primaryHsl, 30);
  const glowHsl = accentHsl || secondaryHsl || lightenHsl(primaryHsl, 15);

  const sidebarBg = `hsl(${sidebarBgHsl})`;
  const sidebarAccentBg = `hsl(${sidebarAccentHsl})`;
  const primaryCss = `hsl(${primaryHsl})`;
  const glowCss = `hsl(${glowHsl})`;
  const gradientBtn = `linear-gradient(135deg, ${primaryCss}, ${glowCss})`;

  const sidebarItems = [
    { icon: Home, label: "Home", active: false },
    { icon: BarChart3, label: "Dashboard", active: true },
    { icon: Users, label: "CRM", active: false },
    { icon: FileText, label: "Contratos", active: false },
    { icon: Settings, label: "Config", active: false },
  ];

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
          Essas cores serão aplicadas na barra lateral, botões, identidade visual completa do ambiente, propostas e contratos
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

      {/* Preview with tabs */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Preview em Tempo Real
          </Label>
          <div className="flex gap-1 ml-auto">
            <button
              onClick={() => setPreviewTab("sistema")}
              className={`px-2.5 py-1 text-[10px] rounded-md font-medium transition-colors ${
                previewTab === "sistema"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Sistema (UI)
            </button>
            <button
              onClick={() => setPreviewTab("proposta")}
              className={`px-2.5 py-1 text-[10px] rounded-md font-medium transition-colors ${
                previewTab === "proposta"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Proposta
            </button>
          </div>
        </div>

        {previewTab === "sistema" ? (
          <div className="rounded-lg border border-border overflow-hidden flex h-[200px]">
            {/* Sidebar Preview */}
            <div
              className="w-[52px] flex flex-col items-center py-3 gap-2 shrink-0"
              style={{ backgroundColor: sidebarBg }}
            >
              {formData.brandLogoUrl ? (
                <img src={formData.brandLogoUrl} alt="Logo" className="h-6 w-6 object-contain rounded mb-1" />
              ) : (
                <div className="h-6 w-6 rounded bg-white/10 mb-1" />
              )}
              {sidebarItems.map((item) => (
                <div
                  key={item.label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: item.active ? sidebarAccentBg : "transparent",
                  }}
                  title={item.label}
                >
                  <item.icon
                    className="h-4 w-4"
                    style={{
                      color: item.active ? glowCss : "rgba(255,255,255,0.5)",
                    }}
                  />
                </div>
              ))}
            </div>
            {/* Main content area */}
            <div className="flex-1 bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: primaryCss }}>
                  Dashboard
                </span>
                <div className="flex gap-1.5">
                  <button
                    className="px-2.5 py-1 rounded text-[10px] font-semibold text-white shadow-sm"
                    style={{ background: gradientBtn }}
                  >
                    Novo Card
                  </button>
                  <button
                    className="px-2.5 py-1 rounded text-[10px] font-semibold text-white"
                    style={{ backgroundColor: formData.brandAccentColor || primaryCss }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
              <div
                className="h-[2px] rounded"
                style={{ backgroundColor: formData.brandSecondaryColor || primaryCss }}
              />
              <div className="grid grid-cols-3 gap-2 flex-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg border border-border/50 p-2 flex flex-col gap-1">
                    <div className="text-[9px] text-muted-foreground">Métrica {i}</div>
                    <div className="text-sm font-bold" style={{ color: primaryCss }}>
                      {(i * 127).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-auto">
                <button
                  className="flex-1 px-2 py-1.5 rounded text-[10px] font-medium border"
                  style={{ borderColor: primaryCss, color: primaryCss }}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 px-2 py-1.5 rounded text-[10px] font-semibold text-white shadow-sm"
                  style={{ background: gradientBtn }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
