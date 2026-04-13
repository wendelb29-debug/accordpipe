import { useState } from "react";
import {
  Upload, Palette, Loader2, ImageIcon, Home, BarChart3, Users,
  Settings, FileText, Eye, Monitor, FileSignature, ChevronRight,
  Bell, Search, LayoutDashboard, PieChart, Plus, MoreHorizontal,
  Smartphone, MonitorIcon, CheckCircle2, Clock, Shield, User,
  TrendingUp, ArrowUpRight, GripVertical, Calendar, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
type DeviceView = "desktop" | "mobile";

const uiColorFields: Array<{ key: keyof CompanyFormData; label: string; desc: string }> = [
  { key: "brandPrimaryColor", label: "Cor Primária", desc: "Sidebar, títulos, ícones ativos e destaques principais" },
  { key: "brandSecondaryColor", label: "Cor Secundária", desc: "Linhas divisórias, bordas e elementos de apoio" },
  { key: "brandAccentColor", label: "Cor de Destaque", desc: "Botões, CTA, badges, valores e gradientes" },
  { key: "brandBgColor", label: "Cor de Fundo", desc: "Background principal do sistema" },
  { key: "brandTextColor", label: "Cor do Texto", desc: "Tipografia, conteúdo e labels" },
];

const docColorFields: Array<{ key: keyof CompanyFormData; label: string; desc: string }> = [
  { key: "docPrimaryColor", label: "Cor Primária", desc: "Cabeçalho, títulos e identidade do documento" },
  { key: "docSecondaryColor", label: "Cor Secundária", desc: "Linhas divisórias, tabelas e destaques sutis" },
  { key: "docAccentColor", label: "Cor de Destaque", desc: "Badges de valor, CTA e botões de aceite" },
  { key: "docBgColor", label: "Cor de Fundo", desc: "Background da proposta/contrato" },
  { key: "docTextColor", label: "Cor do Texto", desc: "Corpo do texto, descrições e rodapé" },
];

export function BrandIdentityFields({ formData, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [activeContext, setActiveContext] = useState<BrandContext>("sistema");
  const [deviceView, setDeviceView] = useState<DeviceView>("desktop");
  const [useSameDocLogo, setUseSameDocLogo] = useState(true);

  const handleLogoUpload = async (file: File, target: "system" | "doc" = "system") => {
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
      {/* ─── Logo Upload ─── */}
      <div className="space-y-4">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Logo da Empresa
        </Label>

        {/* System Logo */}
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Logo do Sistema</p>
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

        {/* Doc Logo Toggle */}
        <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/20">
          <Checkbox
            id="useSameDocLogo"
            checked={useSameDocLogo}
            onCheckedChange={(v) => setUseSameDocLogo(!!v)}
          />
          <label htmlFor="useSameDocLogo" className="text-xs text-muted-foreground cursor-pointer select-none">
            Usar mesma logo do sistema para Propostas e Contratos
          </label>
        </div>

        {!useSameDocLogo && (
          <div className="space-y-2 animate-fade-in">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Logo para Documentos</p>
            <p className="text-[10px] text-muted-foreground">
              Essa logo será usada exclusivamente nas propostas e contratos gerados
            </p>
            <div className="flex items-center gap-4">
              <div className="h-16 w-32 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center">
                <FileSignature className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <Button variant="outline" size="sm" disabled={uploading} onClick={triggerUpload}>
                <Upload className="h-4 w-4 mr-2" />
                Enviar Logo de Documento
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Context Toggle + Device Toggle ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Paleta de Cores
          </Label>
          <div className="flex items-center gap-2">
            {/* Context toggle */}
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
                Sistema
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
                Proposta
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {activeContext === "sistema"
            ? "Essas cores serão aplicadas à interface do sistema deste tenant (sidebar, botões, ícones, cards)"
            : "Essas cores serão aplicadas às propostas e contratos gerados deste tenant"}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {colorFields.map((field) => (
            <div key={field.key} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card transition-all hover:shadow-sm group">
              <input
                type="color"
                value={formData[field.key] as string}
                onChange={(e) => handleColorChange(field.key, e.target.value)}
                className="h-9 w-9 rounded-lg cursor-pointer border-0 bg-transparent p-0 shrink-0 transition-transform duration-200 group-hover:scale-110"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{field.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{field.desc}</p>
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

      {/* ─── Preview ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Simulador White Label — {activeContext === "sistema" ? "Sistema (UI)" : "Proposta / Contrato"}
          </Label>
          {/* Device toggle */}
          <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
            <button
              onClick={() => setDeviceView("desktop")}
              className={cn(
                "p-1.5 rounded transition-all duration-200",
                deviceView === "desktop" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              title="Desktop"
            >
              <MonitorIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDeviceView("mobile")}
              className={cn(
                "p-1.5 rounded transition-all duration-200",
                deviceView === "mobile" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              title="Mobile"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className={cn(
          "transition-all duration-300 mx-auto",
          deviceView === "mobile" ? "max-w-[320px]" : "max-w-full"
        )}>
          {activeContext === "sistema" ? (
            <SystemPreview
              formData={formData}
              sidebarBg={sidebarBg}
              sidebarAccentBg={sidebarAccentBg}
              primaryCss={primaryCss}
              glowCss={glowCss}
              gradientBtn={gradientBtn}
              deviceView={deviceView}
            />
          ) : (
            <ProposalPreview formData={formData} deviceView={deviceView} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── System UI Preview ─── */
function SystemPreview({
  formData, sidebarBg, sidebarAccentBg, primaryCss, glowCss, gradientBtn, deviceView,
}: {
  formData: CompanyFormData;
  sidebarBg: string; sidebarAccentBg: string;
  primaryCss: string; glowCss: string; gradientBtn: string;
  deviceView: DeviceView;
}) {
  const isMobile = deviceView === "mobile";

  const sidebarItems = [
    { icon: Home, label: "Home", active: false },
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: Users, label: "CRM", active: false },
    { icon: PieChart, label: "Relatórios", active: false },
    { icon: FileText, label: "Contratos", active: false },
    { icon: Settings, label: "Config", active: false },
  ];

  const kanbanCards = [
    { name: "Acme Corp", value: "R$ 2.400", stage: "Proposta", time: "3d" },
    { name: "Tech Solutions", value: "R$ 1.800", stage: "Negociação", time: "1d" },
    { name: "Global Inc", value: "R$ 5.200", stage: "Fechamento", time: "5h" },
  ];

  return (
    <div
      className="rounded-xl border border-border overflow-hidden shadow-md animate-fade-in"
      style={{ backgroundColor: formData.brandBgColor }}
    >
      <div className={cn("flex", isMobile ? "flex-col h-[420px]" : "h-[340px]")}>
        {/* Sidebar */}
        {!isMobile && (
          <div
            className="w-[56px] flex flex-col items-center py-3 gap-1 shrink-0 transition-colors duration-300"
            style={{ backgroundColor: sidebarBg }}
          >
            <div className="mb-2 px-1">
              {formData.brandLogoUrl ? (
                <img src={formData.brandLogoUrl} alt="Logo" className="h-7 w-7 object-contain rounded" />
              ) : (
                <div className="h-7 w-7 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
              )}
            </div>
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
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col transition-colors duration-300 min-w-0">
          {/* Top bar */}
          <div className="h-10 border-b border-border/50 bg-card/80 flex items-center justify-between px-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {isMobile && formData.brandLogoUrl && (
                <img src={formData.brandLogoUrl} alt="Logo" className="h-5 w-5 object-contain rounded shrink-0" />
              )}
              <span className="text-xs font-bold truncate" style={{ color: primaryCss }}>Dashboard</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="text-[10px] text-muted-foreground truncate">Visão geral</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="h-6 w-6 rounded-md bg-muted/50 flex items-center justify-center">
                <Search className="h-3 w-3 text-muted-foreground/60" />
              </div>
              <div className="relative h-6 w-6 rounded-md bg-muted/50 flex items-center justify-center">
                <Bell className="h-3 w-3 text-muted-foreground/60" />
                <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-card text-[6px] font-bold text-white flex items-center justify-center"
                  style={{ backgroundColor: formData.brandAccentColor }}>3</div>
              </div>
              <div className="flex items-center gap-1 pl-1">
                <div className="h-6 w-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ backgroundColor: primaryCss }}>
                  {(formData.responsavel || "U")[0].toUpperCase()}
                </div>
                {!isMobile && (
                  <span className="text-[9px] text-muted-foreground truncate max-w-[60px]">
                    {formData.responsavel || "Usuário"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-3 flex flex-col gap-2.5 overflow-hidden">
            {/* Action bar */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {["Hoje", "Semana", "Mês"].map((l, i) => (
                  <button key={l} className="px-2 py-0.5 rounded text-[8px] font-medium transition-colors"
                    style={i === 0
                      ? { backgroundColor: primaryCss, color: "#fff" }
                      : { color: formData.brandTextColor, opacity: 0.5 }
                    }>{l}</button>
                ))}
              </div>
              <button className="px-2.5 py-1 rounded text-[8px] font-semibold text-white shadow-sm flex items-center gap-1"
                style={{ background: gradientBtn }}>
                <Plus className="h-2.5 w-2.5" />
                Novo Card
              </button>
            </div>

            {/* KPI Cards */}
            <div className={cn("grid gap-2", isMobile ? "grid-cols-2" : "grid-cols-4")}>
              {[
                { label: "Leads", value: "127", change: "+12%", icon: Users },
                { label: "Propostas", value: "48", change: "+8%", icon: FileText },
                { label: "Contratos", value: "32", change: "+15%", icon: CheckCircle2 },
                { label: "Receita", value: "R$ 24k", change: "+22%", icon: TrendingUp },
              ].map((kpi) => (
                <div key={kpi.label}
                  className="rounded-lg border border-border/40 bg-card p-2 flex flex-col gap-0.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-medium" style={{ color: formData.brandTextColor, opacity: 0.5 }}>
                      {kpi.label}
                    </span>
                    <kpi.icon className="h-3 w-3" style={{ color: primaryCss, opacity: 0.4 }} />
                  </div>
                  <div className="text-sm font-bold leading-none" style={{ color: primaryCss }}>{kpi.value}</div>
                  <div className="flex items-center gap-0.5 text-[7px] font-medium" style={{ color: formData.brandAccentColor }}>
                    <ArrowUpRight className="h-2 w-2" />
                    {kpi.change}
                  </div>
                </div>
              ))}
            </div>

            {/* Mini Kanban */}
            <div className="flex-1 min-h-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-semibold" style={{ color: formData.brandTextColor }}>Pipeline</span>
                <MoreHorizontal className="h-3 w-3 text-muted-foreground/40" />
              </div>
              <div className={cn("flex gap-1.5 h-full", isMobile && "flex-col")}>
                {kanbanCards.map((card, i) => (
                  <div key={i} className="flex-1 rounded-md border border-border/40 bg-card p-2 flex flex-col gap-1 min-w-0">
                    <div className="h-[2px] rounded-full" style={{ background: gradientBtn }} />
                    <div className="flex items-center gap-1">
                      <GripVertical className="h-2.5 w-2.5 text-muted-foreground/30" />
                      <span className="text-[8px] font-semibold truncate" style={{ color: formData.brandTextColor }}>{card.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-bold" style={{ color: primaryCss }}>{card.value}</span>
                      <span className="text-[7px] flex items-center gap-0.5 text-muted-foreground">
                        <Clock className="h-2 w-2" />{card.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom bar */}
            <div className="flex gap-2 mt-auto shrink-0">
              <button className="flex-1 px-2 py-1 rounded text-[9px] font-medium border transition-colors"
                style={{ borderColor: primaryCss, color: primaryCss }}>Cancelar</button>
              <button className="flex-1 px-2 py-1 rounded text-[9px] font-semibold text-white shadow-sm"
                style={{ background: gradientBtn }}>Confirmar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <div className="h-10 border-t border-border/30 flex items-center justify-around shrink-0"
          style={{ backgroundColor: sidebarBg }}>
          {sidebarItems.slice(0, 5).map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-0.5">
              <item.icon className="h-3.5 w-3.5"
                style={{ color: item.active ? glowCss : "rgba(255,255,255,0.4)" }} />
              <span className="text-[6px]" style={{ color: item.active ? glowCss : "rgba(255,255,255,0.3)" }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Proposal / Contract Preview ─── */
function ProposalPreview({ formData, deviceView }: { formData: CompanyFormData; deviceView: DeviceView }) {
  const isMobile = deviceView === "mobile";

  return (
    <div
      className="rounded-xl border border-border overflow-hidden shadow-md animate-fade-in"
      style={{ backgroundColor: formData.docBgColor }}
    >
      <div className={cn("p-5 space-y-4", isMobile && "p-4 space-y-3")}>
        {/* Status bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: formData.docAccentColor }}>
            <CheckCircle2 className="h-2.5 w-2.5" />
            Aguardando Aceite
          </div>
          <div className="flex items-center gap-1 text-[9px]" style={{ color: formData.docTextColor, opacity: 0.4 }}>
            <Calendar className="h-3 w-3" />
            {new Date().toLocaleDateString("pt-BR")}
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {formData.brandLogoUrl ? (
              <img src={formData.brandLogoUrl} alt="Logo" className={cn("object-contain", isMobile ? "h-8" : "h-10")} />
            ) : (
              <div className={cn("rounded-lg flex items-center justify-center", isMobile ? "h-8 w-8" : "h-10 w-10")}
                style={{ backgroundColor: `${formData.docPrimaryColor}15` }}>
                <FileSignature className="h-5 w-5" style={{ color: formData.docPrimaryColor }} />
              </div>
            )}
            <div>
              <h3 className={cn("font-bold tracking-wide", isMobile ? "text-xs" : "text-sm")}
                style={{ color: formData.docPrimaryColor }}>
                PROPOSTA COMERCIAL
              </h3>
              <p className="text-[10px]" style={{ color: formData.docTextColor, opacity: 0.5 }}>
                {formData.razaoSocial || "Nome da Empresa"} · Ref: #PC-2026-001
              </p>
            </div>
          </div>
          {!isMobile && (
            <div className="text-right shrink-0">
              <p className="text-[10px] font-medium" style={{ color: formData.docTextColor, opacity: 0.6 }}>
                Válida por 15 dias
              </p>
              <p className="text-[9px]" style={{ color: formData.docTextColor, opacity: 0.4 }}>
                Emissão: {new Date().toLocaleDateString("pt-BR")}
              </p>
            </div>
          )}
        </div>

        {/* Primary divider */}
        <div className="h-[3px] rounded-full transition-colors duration-300"
          style={{ background: `linear-gradient(90deg, ${formData.docPrimaryColor}, ${formData.docSecondaryColor})` }} />

        {/* Client / Vendor info */}
        <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2")}>
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-wider"
              style={{ color: formData.docPrimaryColor, opacity: 0.6 }}>
              <User className="h-2.5 w-2.5 inline mr-1" />
              Cliente
            </p>
            <p className="text-xs font-medium" style={{ color: formData.docTextColor }}>
              {formData.nomeFantasia || formData.razaoSocial || "Cliente Exemplo Ltda"}
            </p>
            <p className="text-[10px]" style={{ color: formData.docTextColor, opacity: 0.6 }}>
              CNPJ: {formData.cnpj || "00.000.000/0000-00"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-wider"
              style={{ color: formData.docPrimaryColor, opacity: 0.6 }}>
              <Star className="h-2.5 w-2.5 inline mr-1" />
              Vendedor
            </p>
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
            <div className={cn("grid gap-0 text-[9px] font-bold px-3 py-1.5", isMobile ? "grid-cols-6" : "grid-cols-12")}
              style={{ backgroundColor: `${formData.docPrimaryColor}10`, color: formData.docPrimaryColor }}>
              <span className={cn(isMobile ? "col-span-3" : "col-span-6")}>Serviço</span>
              {!isMobile && <span className="col-span-2 text-center">Qtd</span>}
              <span className={cn(isMobile ? "col-span-1 text-center" : "col-span-2 text-right")}>Qtd</span>
              <span className={cn(isMobile ? "col-span-2 text-right" : "col-span-2 text-right")}>Total</span>
            </div>
            {[
              { name: "Plano Premium", qty: 1, unit: "R$ 1.200", total: "R$ 1.200,00" },
              { name: "Setup Inicial", qty: 1, unit: "R$ 300", total: "R$ 300,00" },
              { name: "Treinamento", qty: 2, unit: "R$ 150", total: "R$ 300,00" },
            ].map((row, i) => (
              <div key={i} className={cn("grid gap-0 text-[10px] px-3 py-1.5 border-t", isMobile ? "grid-cols-6" : "grid-cols-12")}
                style={{ borderColor: `${formData.docSecondaryColor}20`, color: formData.docTextColor }}>
                <span className={cn("font-medium", isMobile ? "col-span-3" : "col-span-6")}>{row.name}</span>
                {!isMobile && <span className="col-span-2 text-center">{row.qty}</span>}
                <span className={cn(isMobile ? "col-span-1 text-center" : "col-span-2 text-right")}>{row.qty}</span>
                <span className={cn("font-semibold", isMobile ? "col-span-2 text-right" : "col-span-2 text-right")}>{row.total}</span>
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
            R$ 1.800,00
            <span className="text-[10px] font-normal opacity-80">/mês</span>
          </div>
        </div>

        {/* Commercial Conditions */}
        <div className="rounded-lg p-3 space-y-1.5" style={{ backgroundColor: `${formData.docPrimaryColor}08`, borderLeft: `3px solid ${formData.docSecondaryColor}` }}>
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: formData.docPrimaryColor, opacity: 0.7 }}>
            Condições Comerciais
          </p>
          <ul className="space-y-0.5">
            {["Fidelidade mínima: 12 meses", "Forma de pagamento: Boleto/PIX", "Reajuste anual pelo IGPM"].map((item, i) => (
              <li key={i} className="text-[9px] flex items-start gap-1.5" style={{ color: formData.docTextColor, opacity: 0.7 }}>
                <CheckCircle2 className="h-2.5 w-2.5 mt-0.5 shrink-0" style={{ color: formData.docAccentColor }} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Signature / Accept area */}
        <div className="rounded-lg border-2 border-dashed p-3 flex items-center justify-between gap-3"
          style={{ borderColor: `${formData.docAccentColor}50` }}>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" style={{ color: formData.docAccentColor }} />
            <div>
              <p className="text-[10px] font-semibold" style={{ color: formData.docTextColor }}>
                Assinatura Digital
              </p>
              <p className="text-[8px]" style={{ color: formData.docTextColor, opacity: 0.5 }}>
                Documento com validade jurídica
              </p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-md text-[9px] font-bold text-white"
            style={{ backgroundColor: formData.docAccentColor }}>
            Aceitar Proposta
          </div>
        </div>

        {/* Footer divider */}
        <div className="h-px transition-colors duration-300" style={{ backgroundColor: `${formData.docSecondaryColor}40` }} />

        {/* Footer */}
        <div className={cn("flex items-center", isMobile ? "flex-col gap-1 text-center" : "justify-between")}>
          <div>
            <p className="text-[9px] font-medium" style={{ color: formData.docPrimaryColor, opacity: 0.5 }}>
              {formData.razaoSocial || "Empresa"} · CNPJ {formData.cnpj || "00.000.000/0000-00"}
            </p>
            <p className="text-[8px]" style={{ color: formData.docTextColor, opacity: 0.3 }}>
              {formData.email || "contato@empresa.com"} · {formData.telefone || "(00) 00000-0000"}
            </p>
          </div>
          <p className="text-[8px]" style={{ color: formData.docTextColor, opacity: 0.3 }}>
            Documento gerado automaticamente · Página 1 de 1
          </p>
        </div>
      </div>
    </div>
  );
}
