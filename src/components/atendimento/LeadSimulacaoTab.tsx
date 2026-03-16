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
      await addActivity({
        type: "simulation",
        title: `Simulação - ${planLabel} - ${formatCurrency(result.valorMensal)}/mês`,
        description: `Cliente: ${result.clientName}\nPlano: ${planLabel}\nTotal de vidas: ${result.totalVidas}\nValor mensal: ${formatCurrency(result.valorMensal)}`,
        metadata: { simulation: result },
      });
      toast.success("Simulação salva no histórico!");
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
