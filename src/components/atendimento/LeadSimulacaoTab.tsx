import { useState, useEffect } from "react";
import { Calculator, Users, UserPlus, Copy, FileText, MessageSquare, Loader2, Trash2, Eye, Edit, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CrmLead } from "@/hooks/useCrmLeads";
import { supabase } from "@/integrations/supabase/client";

interface SimulationResult {
  planType: string;
  parentesco: number;
  semParentesco: number;
  totalVidas: number;
  valorMensal: number;
  custoPorPessoa: number;
  clientName: string;
  createdAt: string;
}

interface LeadSimulacaoTabProps {
  lead: CrmLead;
  addActivity: (data: any) => Promise<any>;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function calculateSimulation(planType: string, parentesco: number, semParentesco: number): { valorMensal: number; totalVidas: number; custoPorPessoa: number } {
  let valorMensal = 0;
  const totalVidas = 1 + parentesco + semParentesco;

  if (planType === "individual") {
    valorMensal = 42.9 + (parentesco * 9.4) + (semParentesco * 11.4);
  } else {
    if (parentesco <= 5) {
      valorMensal = 80.9 + (semParentesco * 11.4);
    } else {
      valorMensal = 80.9 + ((parentesco - 5) * 9.4) + (semParentesco * 11.4);
    }
  }

  const custoPorPessoa = totalVidas > 0 ? valorMensal / totalVidas : 0;
  return { valorMensal, totalVidas, custoPorPessoa };
}

export function LeadSimulacaoTab({ lead, addActivity }: LeadSimulacaoTabProps) {
  const [planType, setPlanType] = useState<string>("individual");
  const [parentesco, setParentesco] = useState(0);
  const [semParentesco, setSemParentesco] = useState(0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSimulations, setSavedSimulations] = useState<SimulationResult[]>([]);
  const [viewingSim, setViewingSim] = useState<SimulationResult | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Load saved simulations from activities
  useEffect(() => {
    loadSimulations();
  }, [lead.id]);

  const loadSimulations = async () => {
    setLoading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("crm_lead_activities")
        .select("*")
        .eq("lead_id", lead.id)
        .eq("type", "simulation")
        .order("created_at", { ascending: false });

      if (data) {
        const sims = data
          .filter((a: any) => a.metadata?.simulation)
          .map((a: any) => a.metadata.simulation as SimulationResult);
        setSavedSimulations(sims);
      }
    } catch (e) {
      console.error("Error loading simulations:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = () => {
    const { valorMensal, totalVidas, custoPorPessoa } = calculateSimulation(planType, parentesco, semParentesco);
    const sim: SimulationResult = {
      planType,
      parentesco,
      semParentesco,
      totalVidas,
      valorMensal,
      custoPorPessoa,
      clientName: lead.contact_name || lead.company_name,
      createdAt: new Date().toISOString(),
    };
    setResult(sim);
  };

  const handleSave = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const planLabel = result.planType === "individual" ? "Plano Individual" : "Plano Familiar";

      // 1. Save simulation activity
      await addActivity({
        type: "simulation",
        title: `Simulação - ${planLabel} - ${formatCurrency(result.valorMensal)}/mês`,
        description: `Cliente: ${result.clientName}\nPlano: ${planLabel}\nTotal de vidas: ${result.totalVidas}\nValor mensal: ${formatCurrency(result.valorMensal)}`,
        metadata: { simulation: result },
      });

      // 2. Automatically create a proposal from the simulation
      const itemsText = [
        `Plano: ${planLabel}`,
        `Titular: 1 pessoa`,
        result.parentesco > 0 ? `Dependentes com parentesco: ${result.parentesco} pessoa(s) × R$ 9,40` : null,
        result.semParentesco > 0 ? `Dependentes sem parentesco: ${result.semParentesco} pessoa(s) × R$ 11,40` : null,
        `Total de vidas: ${result.totalVidas}`,
      ].filter(Boolean).join("\n");

      // Fetch servidor data for proposal snapshot
      let servidorSnapshot = null;
      if (lead.servidor_id) {
        const { data } = await supabase
          .from("companies")
          .select("id, razao_social, nome_fantasia, cnpj, responsavel, email, telefone, endereco, numero, bairro, cidade, estado, cep")
          .eq("id", lead.servidor_id)
          .maybeSingle();
        if (data) servidorSnapshot = data;
      }

      let companySnapshot = null;
      if (lead.company_id) {
        const { data } = await supabase
          .from("companies")
          .select("id, razao_social, nome_fantasia, cnpj, responsavel, email, telefone, endereco, numero, bairro, cidade, estado, cep")
          .eq("id", lead.company_id)
          .maybeSingle();
        if (data) companySnapshot = data;
      }

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 15);

      await addActivity({
        type: "proposal",
        title: `Proposta: ${planLabel} - ${result.clientName}`,
        description: `Proposta comercial gerada a partir da simulação.\nValor mensal: ${formatCurrency(result.valorMensal)}\nCusto por pessoa: ${formatCurrency(result.custoPorPessoa)}`,
        metadata: {
          sigla: `SIM-${Date.now().toString(36).toUpperCase().slice(-4)}`,
          introduction: `Proposta comercial de plano funerário ${planLabel.toLowerCase()} para ${result.clientName}, contemplando ${result.totalVidas} vida(s).`,
          items: itemsText,
          value_ps: 0,
          value_mrr: result.valorMensal,
          validity_days: 15,
          valid_until: validUntil.toISOString(),
          status: "enviada",
          total_items: result.totalVidas,
          payment_method: "boleto",
          version: "1",
          oc_number: "",
          servidor_snapshot: servidorSnapshot,
          company_snapshot: companySnapshot,
          simulation: result,
        },
      });

      toast.success("Simulação salva e proposta comercial gerada!");
      setResult(null);
      setParentesco(0);
      setSemParentesco(0);
      await loadSimulations();
    } catch (e) {
      toast.error("Erro ao salvar simulação");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadProposalPdf = async (sim: SimulationResult) => {
    const planLabel = sim.planType === "individual" ? "Plano Individual" : "Plano Familiar";
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Colors
    const navy = { r: 15, g: 23, b: 42 };
    const gold = { r: 212, g: 175, b: 55 };
    const white = { r: 255, g: 255, b: 255 };
    const lightGray = { r: 180, g: 190, b: 210 };
    const cardBg = { r: 25, g: 35, b: 60 };

    // Full page dark background
    pdf.setFillColor(navy.r, navy.g, navy.b);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    let y = 15;
    const mL = 18;
    const mR = 18;
    const usable = pageWidth - mL - mR;

    // === LOGO ===
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject();
        logoImg.src = "/images/grupo-zelo-logo.jpg";
      });
      const logoW = 30;
      const logoH = 30;
      pdf.addImage(logoImg, "JPEG", pageWidth / 2 - logoW / 2, y, logoW, logoH);
      y += logoH + 5;
    } catch {
      // If logo fails, just skip
      y += 5;
    }

    // === HEADER: Gold line + Title ===
    pdf.setDrawColor(gold.r, gold.g, gold.b);
    pdf.setLineWidth(0.8);
    pdf.line(mL, y, pageWidth - mR, y);
    y += 10;

    pdf.setTextColor(gold.r, gold.g, gold.b);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("PROPOSTA COMERCIAL", pageWidth / 2, y, { align: "center" });
    y += 10;

    pdf.setTextColor(white.r, white.g, white.b);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`${planLabel} — Assistência Familiar`, pageWidth / 2, y, { align: "center" });
    y += 12;

    pdf.setDrawColor(gold.r, gold.g, gold.b);
    pdf.setLineWidth(0.3);
    pdf.line(mL, y, pageWidth - mR, y);
    y += 10;

    // === SECTION: Client Info ===
    // Card background
    const clientCardH = 28;
    pdf.setFillColor(cardBg.r, cardBg.g, cardBg.b);
    pdf.roundedRect(mL, y, usable, clientCardH, 3, 3, "F");
    pdf.setDrawColor(gold.r, gold.g, gold.b);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(mL, y, usable, clientCardH, 3, 3, "S");

    const cy = y + 7;
    pdf.setTextColor(gold.r, gold.g, gold.b);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("CLIENTE", mL + 6, cy);
    pdf.setTextColor(white.r, white.g, white.b);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(sim.clientName, mL + 6, cy + 7);

    pdf.setTextColor(gold.r, gold.g, gold.b);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("DATA", pageWidth - mR - 50, cy);
    pdf.setTextColor(white.r, white.g, white.b);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(new Date(sim.createdAt).toLocaleDateString("pt-BR"), pageWidth - mR - 50, cy + 7);

    pdf.setTextColor(gold.r, gold.g, gold.b);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("VALIDADE", pageWidth - mR - 6, cy, { align: "right" });
    pdf.setTextColor(white.r, white.g, white.b);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text("15 dias", pageWidth - mR - 6, cy + 7, { align: "right" });

    y += clientCardH + 10;

    // === SECTION: "O que está incluso?" ===
    pdf.setTextColor(gold.r, gold.g, gold.b);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("O que está incluso?", mL, y);
    y += 3;

    pdf.setTextColor(lightGray.r, lightGray.g, lightGray.b);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("Proteção completa para toda a família com os melhores serviços.", mL, y + 5);
    y += 14;

    // Service items in 2-column grid with icon circles
    const services = [
      { icon: "♡", title: "Cobertura funeral completa", desc: "Atendimento ao plano, particular e convênios." },
      { icon: "☎", title: "Atendimento 24h", desc: "Suporte a qualquer hora do dia ou da noite." },
      { icon: "💊", title: "Telemedicina 24h", desc: "Consultas médicas online sem sair de casa." },
      { icon: "💰", title: "Descontos em farmácias", desc: "Economia em medicamentos para toda a família." },
      { icon: "🚗", title: "Translado", desc: "Transporte aéreo ou terrestre conforme necessidade." },
      { icon: "🌸", title: "Ornamentação", desc: "Coroa de flores e ornamentação de urnas." },
      { icon: "🏛", title: "Memoriais", desc: "Locação de salas de velório e cerimônias." },
      { icon: "📋", title: "Documentação e registros", desc: "Apoio em toda a burocracia funerária." },
    ];

    const colW = (usable - 6) / 2;
    const cardH = 22;

    for (let i = 0; i < services.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = mL + col * (colW + 6);
      const cardY = y + row * (cardH + 4);

      if (cardY + cardH > pageHeight - 30) {
        pdf.addPage();
        pdf.setFillColor(navy.r, navy.g, navy.b);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        y = 20;
      }

      // Card bg
      pdf.setFillColor(cardBg.r, cardBg.g, cardBg.b);
      pdf.roundedRect(cx, cardY, colW, cardH, 2, 2, "F");
      pdf.setDrawColor(gold.r, gold.g, gold.b);
      pdf.setLineWidth(0.2);
      pdf.roundedRect(cx, cardY, colW, cardH, 2, 2, "S");

      // Gold circle icon
      const circleX = cx + 10;
      const circleY = cardY + cardH / 2;
      pdf.setDrawColor(gold.r, gold.g, gold.b);
      pdf.setLineWidth(0.5);
      pdf.circle(circleX, circleY, 5, "S");

      // Title
      pdf.setTextColor(gold.r, gold.g, gold.b);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text(services[i].title.toUpperCase(), cx + 19, cardY + 8);

      // Desc
      pdf.setTextColor(lightGray.r, lightGray.g, lightGray.b);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      const descLines = pdf.splitTextToSize(services[i].desc, colW - 24);
      pdf.text(descLines, cx + 19, cardY + 13);
    }

    y += Math.ceil(services.length / 2) * (cardH + 4) + 8;

    // === SECTION: Detalhes do Plano ===
    if (y + 70 > pageHeight - 20) {
      pdf.addPage();
      pdf.setFillColor(navy.r, navy.g, navy.b);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      y = 20;
    }

    pdf.setTextColor(gold.r, gold.g, gold.b);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Detalhes do Plano", mL, y);
    y += 10;

    // Plan detail rows
    const planRows = [
      ["Tipo de Plano", planLabel],
      ["Valor base", sim.planType === "individual" ? "R$ 42,90" : "R$ 80,90"],
      ["Dependentes com parentesco", `${sim.parentesco} pessoa(s) × R$ 9,40`],
      ["Dependentes sem parentesco", `${sim.semParentesco} pessoa(s) × R$ 11,40`],
      ["Total de vidas", `${sim.totalVidas}`],
    ];

    for (let i = 0; i < planRows.length; i++) {
      const rowBg = i % 2 === 0 ? cardBg : navy;
      pdf.setFillColor(rowBg.r, rowBg.g, rowBg.b);
      pdf.rect(mL, y, usable, 8, "F");

      pdf.setTextColor(white.r, white.g, white.b);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(planRows[i][0], mL + 4, y + 5.5);
      pdf.setFont("helvetica", "bold");
      pdf.text(planRows[i][1], pageWidth - mR - 4, y + 5.5, { align: "right" });
      y += 8;
    }

    y += 6;

    // === TOTAL BOX ===
    const totalBoxH = 22;
    pdf.setFillColor(gold.r, gold.g, gold.b);
    pdf.roundedRect(mL, y, usable, totalBoxH, 3, 3, "F");

    pdf.setTextColor(navy.r, navy.g, navy.b);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("VALOR MENSAL TOTAL", mL + 8, y + 9);

    pdf.setFontSize(16);
    pdf.text(formatCurrency(sim.valorMensal), pageWidth - mR - 8, y + 10, { align: "right" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`Custo por pessoa: ${formatCurrency(sim.custoPorPessoa)}`, mL + 8, y + 17);

    y += totalBoxH + 10;

    // === Conditions ===
    pdf.setTextColor(gold.r, gold.g, gold.b);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("Condições", mL, y);
    y += 6;

    pdf.setTextColor(lightGray.r, lightGray.g, lightGray.b);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const conditions = [
      "• Validade desta proposta: 15 dias",
      "• Forma de pagamento: Boleto bancário",
      sim.planType === "familiar" ? "• O Plano Familiar inclui até 5 pessoas com parentesco no valor base" : null,
      "• Valores sujeitos a reajuste anual conforme política da empresa",
      "• Assistência nacional com rede de parceiros",
    ].filter(Boolean) as string[];

    for (const c of conditions) {
      pdf.text(c, mL + 4, y);
      y += 5;
    }

    // === "Plano administrado por" section ===
    y += 6;
    if (y + 35 > pageHeight - 20) {
      pdf.addPage();
      pdf.setFillColor(navy.r, navy.g, navy.b);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      y = 20;
    }

    pdf.setDrawColor(gold.r, gold.g, gold.b);
    pdf.setLineWidth(0.3);
    pdf.line(mL, y, pageWidth - mR, y);
    y += 8;

    pdf.setTextColor(gold.r, gold.g, gold.b);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("Plano administrado e prestado por:", mL, y);
    y += 6;

    pdf.setTextColor(white.r, white.g, white.b);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("Grupo Zelo", mL, y);
    y += 6;

    pdf.setTextColor(lightGray.r, lightGray.g, lightGray.b);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const adminText = "Este plano de assistência funerária é administrado e executado pelo Grupo Zelo, sendo a Amparo Familiar Benefícios LTDA responsável pela consultoria comercial, intermediação e suporte ao cliente.";
    const adminLines = pdf.splitTextToSize(adminText, usable);
    pdf.text(adminLines, mL, y);
    y += adminLines.length * 4 + 4;

    // === Footer ===
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFillColor(navy.r, navy.g, navy.b);
      // Ensure background on all pages
      pdf.setDrawColor(gold.r, gold.g, gold.b);
      pdf.setLineWidth(0.3);
      pdf.line(mL, pageHeight - 14, pageWidth - mR, pageHeight - 14);
      pdf.setTextColor(lightGray.r, lightGray.g, lightGray.b);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(7);
      pdf.text("Grupo Zelo • Assistência Familiar • Proposta gerada automaticamente", mL, pageHeight - 9);
      pdf.text(`Página ${i} de ${totalPages}`, pageWidth - mR, pageHeight - 9, { align: "right" });
    }

    pdf.save(`Proposta_${sim.clientName.replace(/\s+/g, "_")}_${planLabel.replace(/\s+/g, "_")}.pdf`);
    toast.success("Proposta PDF baixada!");
  };

  const handleWhatsAppText = (sim: SimulationResult) => {
    const planLabel = sim.planType === "individual" ? "Plano Individual" : "Plano Familiar";
    const text = `*Simulação de Plano Funerário*\n\nCliente: ${sim.clientName}\nPlano: ${planLabel}\nTotal de vidas: ${sim.totalVidas}\nValor mensal: ${formatCurrency(sim.valorMensal)}\nCusto por pessoa: ${formatCurrency(sim.custoPorPessoa)}\n\n_Com parentesco: ${sim.parentesco} pessoa(s)_\n_Sem parentesco: ${sim.semParentesco} pessoa(s)_`;
    navigator.clipboard.writeText(text);
    toast.success("Texto copiado para WhatsApp!");
  };

  const handleEditSim = (sim: SimulationResult, index: number) => {
    setPlanType(sim.planType);
    setParentesco(sim.parentesco);
    setSemParentesco(sim.semParentesco);
    setEditingIndex(index);
    setResult(null);
    setViewingSim(null);
  };

  const currentSim = viewingSim || result;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Calculator className="h-4 w-4" /> Simulação de Plano
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Nome do cliente</Label>
              <Input className="h-8 text-xs" value={lead.contact_name || lead.company_name} disabled />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Tipo de plano</Label>
              <RadioGroup value={planType} onValueChange={setPlanType} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="text-xs cursor-pointer">Individual (R$ 42,90)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="familiar" id="familiar" />
                  <Label htmlFor="familiar" className="text-xs cursor-pointer">Familiar (R$ 80,90)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Users className="h-3 w-3" /> Com parentesco
                </Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min={0}
                  value={parentesco}
                  onChange={(e) => setParentesco(Math.max(0, Number(e.target.value)))}
                />
                <p className="text-[10px] text-muted-foreground">R$ 9,40/pessoa</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <UserPlus className="h-3 w-3" /> Sem parentesco
                </Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min={0}
                  value={semParentesco}
                  onChange={(e) => setSemParentesco(Math.max(0, Number(e.target.value)))}
                />
                <p className="text-[10px] text-muted-foreground">R$ 11,40/pessoa</p>
              </div>
            </div>

            {planType === "familiar" && (
              <p className="text-[10px] text-muted-foreground bg-muted p-2 rounded">
                ℹ️ O Plano Familiar inclui até 5 pessoas com parentesco no valor base. Acima de 5, cada adicional custa R$ 9,40.
              </p>
            )}

            <Button onClick={handleCalculate} className="w-full gap-2 text-xs" size="sm">
              <Calculator className="h-3.5 w-3.5" /> Calcular Simulação
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        <Card className={currentSim ? "border-primary/50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            {currentSim ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Plano</p>
                    <p className="text-xs font-semibold">{currentSim.planType === "individual" ? "Individual" : "Familiar"}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Total de vidas</p>
                    <p className="text-xs font-semibold">{currentSim.totalVidas}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Com parentesco</p>
                    <p className="text-xs font-semibold">{currentSim.parentesco}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Sem parentesco</p>
                    <p className="text-xs font-semibold">{currentSim.semParentesco}</p>
                  </div>
                </div>

                <div className="bg-primary/10 rounded-lg p-4 text-center space-y-1">
                  <p className="text-[10px] text-muted-foreground">Valor mensal total</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(currentSim.valorMensal)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatCurrency(currentSim.custoPorPessoa)} por pessoa
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {result && !viewingSim && (
                    <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs flex-1">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                      Salvar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleWhatsAppText(currentSim)} className="gap-1.5 text-xs flex-1">
                    <Copy className="h-3.5 w-3.5" /> WhatsApp
                  </Button>
                  {viewingSim && (
                    <Button size="sm" variant="ghost" onClick={() => setViewingSim(null)} className="text-xs">
                      Fechar
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Configure e clique em calcular</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Saved simulations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Simulações Salvas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : savedSimulations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma simulação salva</p>
          ) : (
            <div className="space-y-2">
              {savedSimulations.map((sim, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md border text-xs hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-[10px]">
                      {sim.planType === "individual" ? "Individual" : "Familiar"}
                    </Badge>
                    <span>{sim.totalVidas} vidas</span>
                    <span className="font-semibold text-primary">{formatCurrency(sim.valorMensal)}/mês</span>
                    <span className="text-muted-foreground">
                      {new Date(sim.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setViewingSim(sim)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDownloadProposalPdf(sim)} title="Baixar Proposta PDF">
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEditSim(sim, i)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleWhatsAppText(sim)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
