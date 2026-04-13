import { useState } from "react";
import {
  Upload, Palette, Loader2, ImageIcon, Home, BarChart3, Users,
  Settings, FileText, Eye, Monitor, FileSignature, ChevronRight,
  Bell, Search, LayoutDashboard, PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanyFormData } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { hexToHsl, darkenHsl, lightenHsl } from "@/components/layout/ThemeSync";
import { cn } from "@/lib/utils";

interface Props {
  formData: CompanyFormData;
  onChange: (data: CompanyFormData) => void;
}

type BrandContext = "sistema" | "proposta";

const uiColorFields: Array<{ key: keyof CompanyFormData; label: string; desc: string }> = [
  { key: "brandPrimaryColor", label: "Cor Primária", desc: "Títulos, ícones ativos e sidebar" },
  { key: "brandSecondaryColor", label: "Cor Secundária", desc: "Destaque do menu e linhas" },
  { key: "brandAccentColor", label: "Cor de Destaque", desc: "Botões, CTA e gradientes" },
  { key: "brandBgColor", label: "Cor de Fundo", desc: "Background do sistema" },
  { key: "brandTextColor", label: "Cor do Texto", desc: "Texto principal" },
];

const docColorFields: Array<{ key: keyof CompanyFormData; label: string; desc: string }> = [
  { key: "docPrimaryColor", label: "Cor Primária", desc: "Cabeçalho e títulos do documento" },
  { key: "docSecondaryColor", label: "Cor Secundária", desc: "Linhas divisórias e destaques" },
  { key: "docAccentColor", label: "Cor de Destaque", desc: "Badges, valores e CTA" },
  { key: "docBgColor", label: "Cor de Fundo", desc: "Background da proposta/contrato" },
  { key: "docTextColor", label: "Cor do Texto", desc: "Corpo do texto do documento" },
];

export function BrandIdentityFields({ formData, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [activeContext, setActiveContext] = useState<BrandContext>("sistema");

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 2MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `brand-logos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
      onChange({ ...formData, brandLogoUrl: urlData.publicUrl, brandLogoPath: path });
      toast.success("Logo enviado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar logo: " + (err.message || ""));
    } finally { setUploading(false); }
  };

  const triggerUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) handleLogoUpload(f);
    };
    input.click();
  };

  const handleColorChange = (key: keyof CompanyFormData, value: string) => {
    onChange({ ...formData, [key]: value });
  };

  const colorFields = activeContext === "sistema" ? uiColorFields : docColorFields;

  // Derived colors for system preview
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

  return (
    <div className="grid gap-6">
      {/* Logo Upload */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Logo da Empresa
        </Label>
        <p className="text-xs text-muted-foreground">
          Esta logo será utilizada no sistema e nos documentos gerados (propostas e contratos)
        </p>
        <div className="flex items-center gap-4">
          {formData.brandLogoUrl ? (
            <div className="h-16 w-32 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden">
              <img src={formData.brandLogoUrl} alt="Logo" className="max-h-14 max-w-28 object-contain" />
            </div>
          ) : (
            <div className="h-16 w-32 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" disabled={uploading} onClick={triggerUpload}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {formData.brandLogoUrl ? "Alterar Logo" : "Enviar Logo"}
            </Button>
            {formData.brandLogoUrl && (
              <Button variant="ghost" size="sm" className="text-destructive"
                onClick={() => onChange({ ...formData, brandLogoUrl: "", brandLogoPath: "" })}>
                Remover
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Context Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Paleta de Cores
          </Label>
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setActiveContext("sistema")}
              className={cn(
                "px-3 py-1.5 text-xs rounded-md font-medium transition-all duration-200 flex items-center gap-1.5",
                activeContext === "sistema"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Monitor className="h-3 w-3" />
              Sistema (UI)
            </button>
            <button
              onClick={() => setActiveContext("proposta")}
              className={cn(
                "px-3 py-1.5 text-xs rounded-md font-medium transition-all duration-200 flex items-center gap-1.5",
                activeContext === "proposta"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileSignature className="h-3 w-3" />
              Proposta / Contrato
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {activeContext === "sistema"
            ? "Essas cores serão aplicadas ao sistema deste tenant (sidebar, botões, ícones, cards)"
            : "Essas cores serão aplicadas às propostas e contratos gerados deste tenant"}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {colorFields.map((field) => (
            <div key={field.key} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card transition-all hover:shadow-sm">
              <input
                type="color"
                value={formData[field.key] as string}
                onChange={(e) => handleColorChange(field.key, e.target.value)}
                className="h-8 w-8 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{field.label}</p>
                <p className="text-[10px] text-muted-foreground">{field.desc}</p>
              </div>
              <Input
                value={formData[field.key] as string}
                onChange={(e) => handleColorChange(field.key, e.target.value)}
                className="w-24 h-7 text-xs font-mono"
                maxLength={7}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          Preview em Tempo Real — {activeContext === "sistema" ? "Sistema (UI)" : "Proposta / Contrato"}
        </Label>

        <div className="transition-all duration-300">
          {activeContext === "sistema" ? (
            <SystemPreview
              formData={formData}
              sidebarBg={sidebarBg}
              sidebarAccentBg={sidebarAccentBg}
              primaryCss={primaryCss}
              glowCss={glowCss}
              gradientBtn={gradientBtn}
            />
          ) : (
            <ProposalPreview formData={formData} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── System UI Preview ─── */
function SystemPreview({
  formData, sidebarBg, sidebarAccentBg, primaryCss, glowCss, gradientBtn,
}: {
  formData: CompanyFormData;
  sidebarBg: string; sidebarAccentBg: string;
  primaryCss: string; glowCss: string; gradientBtn: string;
}) {
  const sidebarItems = [
    { icon: Home, label: "Home", active: false },
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: Users, label: "CRM", active: false },
    { icon: PieChart, label: "Relatórios", active: false },
    { icon: FileText, label: "Contratos", active: false },
    { icon: Settings, label: "Config", active: false },
  ];

  return (
    <div
      className="rounded-xl border border-border overflow-hidden shadow-sm animate-fade-in"
      style={{ backgroundColor: formData.brandBgColor }}
    >
      <div className="flex h-[280px]">
        {/* Sidebar */}
        <div
          className="w-[56px] flex flex-col items-center py-3 gap-1 shrink-0 transition-colors duration-300"
          style={{ backgroundColor: sidebarBg }}
        >
          {/* Logo */}
          <div className="mb-2 px-1">
            {formData.brandLogoUrl ? (
              <img src={formData.brandLogoUrl} alt="Logo" className="h-7 w-7 object-contain rounded" />
            ) : (
              <div className="h-7 w-7 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
            )}
          </div>
          {/* Nav items */}
          {sidebarItems.map((item) => (
            <div
              key={item.label}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 cursor-default"
              style={{ backgroundColor: item.active ? sidebarAccentBg : "transparent" }}
              title={item.label}
            >
              <item.icon className="h-4 w-4 transition-colors duration-200"
                style={{ color: item.active ? glowCss : "rgba(255,255,255,0.4)" }} />
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col transition-colors duration-300">
          {/* Top bar */}
          <div className="h-10 border-b border-border/50 bg-card/80 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: primaryCss }}>Dashboard</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground">Visão geral</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-muted/50 flex items-center justify-center">
                <Search className="h-3 w-3 text-muted-foreground/60" />
              </div>
              <div className="h-6 w-6 rounded-md bg-muted/50 flex items-center justify-center">
                <Bell className="h-3 w-3 text-muted-foreground/60" />
              </div>
              <div className="h-6 w-6 rounded-full" style={{ backgroundColor: primaryCss, opacity: 0.7 }} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 flex flex-col gap-3">
            {/* Action bar */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {["Hoje", "Semana", "Mês"].map((l, i) => (
                  <button key={l} className="px-2 py-1 rounded text-[9px] font-medium transition-colors"
                    style={i === 0
                      ? { backgroundColor: primaryCss, color: "#fff" }
                      : { color: formData.brandTextColor, opacity: 0.5 }
                    }>{l}</button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <button className="px-2.5 py-1 rounded text-[9px] font-semibold text-white shadow-sm"
                  style={{ background: gradientBtn }}>Novo Card</button>
                <button className="px-2.5 py-1 rounded text-[9px] font-semibold text-white"
                  style={{ backgroundColor: formData.brandAccentColor }}>Salvar</button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-[2px] rounded transition-colors duration-300"
              style={{ backgroundColor: formData.brandSecondaryColor }} />

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-2 flex-1">
              {[
                { label: "Leads", value: "127", change: "+12%" },
                { label: "Propostas", value: "48", change: "+8%" },
                { label: "Contratos", value: "32", change: "+15%" },
                { label: "Receita", value: "R$ 24k", change: "+22%" },
              ].map((kpi) => (
                <div key={kpi.label}
                  className="rounded-lg border border-border/40 bg-card p-2.5 flex flex-col gap-1 transition-all">
                  <div className="text-[9px] font-medium" style={{ color: formData.brandTextColor, opacity: 0.5 }}>
                    {kpi.label}
                  </div>
                  <div className="text-sm font-bold" style={{ color: primaryCss }}>{kpi.value}</div>
                  <div className="text-[8px] font-medium" style={{ color: formData.brandAccentColor }}>
                    {kpi.change}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom bar */}
            <div className="flex gap-2 mt-auto">
              <button className="flex-1 px-2 py-1.5 rounded text-[10px] font-medium border transition-colors"
                style={{ borderColor: primaryCss, color: primaryCss }}>Cancelar</button>
              <button className="flex-1 px-2 py-1.5 rounded text-[10px] font-semibold text-white shadow-sm"
                style={{ background: gradientBtn }}>Confirmar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Proposal / Contract Preview ─── */
function ProposalPreview({ formData }: { formData: CompanyFormData }) {
  return (
    <div
      className="rounded-xl border border-border overflow-hidden shadow-sm animate-fade-in"
      style={{ backgroundColor: formData.docBgColor }}
    >
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {formData.brandLogoUrl ? (
              <img src={formData.brandLogoUrl} alt="Logo" className="h-10 object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: formData.docPrimaryColor, opacity: 0.15 }}>
                <div className="h-full w-full flex items-center justify-center">
                  <FileSignature className="h-5 w-5" style={{ color: formData.docPrimaryColor }} />
                </div>
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold tracking-wide" style={{ color: formData.docPrimaryColor }}>
                PROPOSTA COMERCIAL
              </h3>
              <p className="text-[10px]" style={{ color: formData.docTextColor, opacity: 0.5 }}>
                {formData.razaoSocial || "Nome da Empresa"} · Ref: #PC-2026-001
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium" style={{ color: formData.docTextColor, opacity: 0.6 }}>
              {new Date().toLocaleDateString("pt-BR")}
            </p>
            <p className="text-[10px]" style={{ color: formData.docTextColor, opacity: 0.4 }}>
              Válida por 15 dias
            </p>
          </div>
        </div>

        {/* Primary divider */}
        <div className="h-[3px] rounded-full transition-colors duration-300"
          style={{ backgroundColor: formData.docSecondaryColor }} />

        {/* Client info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1"
              style={{ color: formData.docPrimaryColor, opacity: 0.6 }}>Cliente</p>
            <p className="text-xs font-medium" style={{ color: formData.docTextColor }}>
              {formData.nomeFantasia || formData.razaoSocial || "Cliente Exemplo Ltda"}
            </p>
            <p className="text-[10px]" style={{ color: formData.docTextColor, opacity: 0.6 }}>
              CNPJ: {formData.cnpj || "00.000.000/0000-00"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1"
              style={{ color: formData.docPrimaryColor, opacity: 0.6 }}>Vendedor</p>
            <p className="text-xs font-medium" style={{ color: formData.docTextColor }}>
              {formData.responsavel || "Consultor Responsável"}
            </p>
            <p className="text-[10px]" style={{ color: formData.docTextColor, opacity: 0.6 }}>
              {formData.email || "email@empresa.com"}
            </p>
          </div>
        </div>

        {/* Services table */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider mb-2"
            style={{ color: formData.docPrimaryColor, opacity: 0.6 }}>Serviços Contratados</p>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: `${formData.docSecondaryColor}40` }}>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-0 text-[9px] font-bold px-3 py-1.5"
              style={{ backgroundColor: `${formData.docPrimaryColor}10`, color: formData.docPrimaryColor }}>
              <span className="col-span-6">Serviço</span>
              <span className="col-span-2 text-center">Qtd</span>
              <span className="col-span-2 text-right">Unitário</span>
              <span className="col-span-2 text-right">Total</span>
            </div>
            {/* Rows */}
            {[
              { name: "Plano Premium", qty: 1, unit: "R$ 1.200,00", total: "R$ 1.200,00" },
              { name: "Setup Inicial", qty: 1, unit: "R$ 300,00", total: "R$ 300,00" },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-0 text-[10px] px-3 py-1.5 border-t"
                style={{ borderColor: `${formData.docSecondaryColor}20`, color: formData.docTextColor }}>
                <span className="col-span-6 font-medium">{row.name}</span>
                <span className="col-span-2 text-center">{row.qty}</span>
                <span className="col-span-2 text-right">{row.unit}</span>
                <span className="col-span-2 text-right font-semibold">{row.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-end gap-3">
          <span className="text-xs font-medium" style={{ color: formData.docTextColor, opacity: 0.7 }}>
            Total Mensal:
          </span>
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold text-white transition-colors duration-300"
            style={{ backgroundColor: formData.docAccentColor }}>
            R$ 1.500,00
            <span className="text-[10px] font-normal opacity-80">/mês</span>
          </div>
        </div>

        {/* Footer divider */}
        <div className="h-px transition-colors duration-300" style={{ backgroundColor: `${formData.docSecondaryColor}40` }} />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <p className="text-[9px]" style={{ color: formData.docTextColor, opacity: 0.4 }}>
            Documento gerado automaticamente · {new Date().toLocaleDateString("pt-BR")}
          </p>
          <p className="text-[9px] font-medium" style={{ color: formData.docPrimaryColor, opacity: 0.5 }}>
            Página 1 de 1
          </p>
        </div>
      </div>
    </div>
  );
}
