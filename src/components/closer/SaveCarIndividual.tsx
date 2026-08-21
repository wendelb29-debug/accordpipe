import { useState, useMemo } from "react";
import { 
  Phone, MessageSquare, Copy, Check, Shield, 
  MessageCircle, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCloser } from "@/hooks/useCloser";
import { useCrmLeads } from "@/hooks/useCrmLeads";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

function CopyButton({ text, onCopy }: { text: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try { 
      await navigator.clipboard.writeText(text); 
      setCopied(true); 
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
      toast.success("Script copiado!");
    } catch {
      toast.error("Erro ao copiar script");
    }
  };
  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={handle}
      className="h-8 w-8 rounded-lg"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
    </Button>
  );
}

export function SaveCarIndividual() {
  const { profile } = useAuth();
  const { activeWorkspaceId } = useWorkspaceContext();
  const { createLead, leads } = useCrmLeads("commercial", activeWorkspaceId);
  
  const [clientData, setClientData] = useState({
    name: "",
    vehicle: "",
    phone: ""
  });
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedBranchKey, setSelectedBranchKey] = useState<string | null>(null);
  const [vendeuStep, setVendeuStep] = useState<number>(1);

  const { playbooks, scripts, createSession, logEvent, updateSession } = useCloser();

  // Find the recovery playbook - search for "Recuperação" specifically
  const currentPlaybook = useMemo(() => 
    playbooks?.find(p => p.name.toLowerCase().includes('recuperação')),
    [playbooks]
  );

  const { scripts: playbookScripts } = useCloser(currentPlaybook?.id);

  const sortedScripts = useMemo(() => 
    playbookScripts?.sort((a, b) => a.sort_order - b.sort_order) || [],
    [playbookScripts]
  );

  const startSession = async () => {
    if (!currentPlaybook || !activeWorkspaceId) return null;
    try {
      const session = await createSession.mutateAsync({
        playbook_id: currentPlaybook.id,
        workspace_id: activeWorkspaceId,
        client_name: clientData.name,
        client_phone: clientData.phone,
        metadata: { vehicle: clientData.vehicle, source: "save-car-individual" }
      } as any);
      setCurrentSessionId(session.id);
      return session.id;
    } catch (err) {
      console.error(err);
      toast.error("Erro ao iniciar sessão");
      return null;
    }
  };

  const syncToKanban = async () => {
    if (!clientData.name || !clientData.phone) return;

    // Phone normalization for duplicate check
    const normalizedPhone = clientData.phone.replace(/\D/g, "");

    // Prevenção de duplicidade: procura lead com mesmo telefone ou nome/veículo
    const existingLead = leads.find(l => 
      (l.phone && l.phone.replace(/\D/g, "") === normalizedPhone) ||
      (l.contact_name?.toLowerCase() === clientData.name.toLowerCase() && 
       l.notes?.includes(clientData.vehicle))
    );

    if (!existingLead) {
      await createLead({
        contact_name: clientData.name,
        phone: clientData.phone,
        notes: `Veículo anterior: ${clientData.vehicle}`,
        source: "save-car-individual",
        workspace_id: activeWorkspaceId
      });
    }
  };

  const getProcessedText = (text: string) => {
    if (!text) return "";
    let processed = text
      .replace(/\[Nome\]/g, clientData.name || "[Nome]")
      .replace(/\[Placa\/Modelo\]/g, clientData.vehicle || "[Placa/Modelo]")
      .replace(/\[Telefone\]/g, clientData.phone || "[Telefone]")
      .replace(/\[Empresa\]/g, "Accord Pipe") // Default if not found
      .replace(/\[NomeVendedor\]/g, profile?.name || "[Vendedor]")
      .replace(/\[ValorIndicação\]/g, "R$ 50,00");
    
    // Split "Vendeu" script if it has both steps in one branch_content
    if (text.includes("Está sem veículo atualmente?") && text.includes("Bacana!")) {
      const parts = text.split("Bacana!");
      if (vendeuStep === 1) return parts[0].trim();
      return "Bacana!" + parts[1];
    }

    return processed;
  };

  const handleAction = async (type: 'copy' | 'whatsapp' | 'branch', stepKey: string, content: string, branchKey?: string) => {
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await startSession();
    }

    const text = getProcessedText(content);

    if (sessionId) {
      logEvent.mutate({
        session_id: sessionId,
        event_type: type === 'whatsapp' ? 'whatsapp_opened' : type,
        step_key: stepKey,
        branch_key: branchKey,
        content: text
      });
    }

    if (type === 'whatsapp') {
      if (!clientData.phone) {
        toast.error("Informe o WhatsApp do associado.");
        return;
      }

      await syncToKanban();
      
      let phone = clientData.phone.replace(/\D/g, "");
      // Add DDI 55 if not present and length suggests BR mobile
      if (phone.length === 11 && !phone.startsWith("55")) {
        phone = "55" + phone;
      }
      
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
    }
  };

  const resetSession = () => {
    if (window.confirm("Limpar atendimento atual?")) {
      setCurrentSessionId(null);
      setClientData({ name: "", vehicle: "", phone: "" });
      setSelectedBranchKey(null);
      setVendeuStep(1);
    }
  };

  const step1 = sortedScripts.find(s => s.step_key === 'abertura');
  const step2 = sortedScripts.find(s => s.step_key === 'investigacao');
  const step3 = sortedScripts.find(s => s.step_key === 'motivo');

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full font-sans">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-[24px] bg-primary p-6 sm:p-8 text-primary-foreground shadow-xl">
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl font-black mb-2">Recuperação de Associados</h2>
          <p className="text-primary-foreground/80 text-sm sm:text-base opacity-90 max-w-lg">Fluxo consultivo de alto impacto para contratos inativos.</p>
        </div>
        <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Shield className="h-24 w-24 sm:h-32 w-32" />
        </div>
      </div>

      {/* Client Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Nome do Associado</label>
          <Input
            placeholder="Ex: Wendel"
            value={clientData.name}
            onChange={(e) => setClientData(prev => ({ ...prev, name: e.target.value }))}
            className="h-12 rounded-xl bg-card border-border"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Veículo Anterior</label>
          <Input
            placeholder="Ex: ABC1234"
            value={clientData.vehicle}
            onChange={(e) => setClientData(prev => ({ ...prev, vehicle: e.target.value }))}
            className="h-12 rounded-xl bg-card border-border"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">WhatsApp (Opcional)</label>
          <Input
            placeholder="Ex: 11999999999"
            value={clientData.phone}
            onChange={(e) => setClientData(prev => ({ ...prev, phone: e.target.value }))}
            className="h-12 rounded-xl bg-card border-border"
          />
        </div>
      </div>

      {/* Steps Container */}
      <div className="space-y-6">
        {/* Step 1 */}
        {step1 && (
          <div className="group rounded-[20px] border border-border bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl font-bold bg-emerald-500 text-white">
                  1
                </div>
                <h3 className="text-lg font-black text-foreground">{step1.title}</h3>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <CopyButton 
                  text={getProcessedText(step1.content)} 
                  onCopy={() => handleAction('copy', step1.step_key, step1.content)}
                />
                <Button 
                  onClick={() => handleAction('whatsapp', step1.step_key, step1.content)}
                  className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-9 gap-2 px-4 font-bold"
                >
                  <MessageCircle className="h-4 w-4 fill-current" /> WhatsApp
                </Button>
              </div>
            </div>

            <div className="relative rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4 sm:p-5">
              <p className="text-sm sm:text-base leading-relaxed text-foreground italic">
                "{getProcessedText(step1.content)}"
              </p>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step2 && (
          <div className="group rounded-[20px] border border-border bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl font-bold bg-primary text-primary-foreground">
                  2
                </div>
                <h3 className="text-lg font-black text-foreground">{step2.title}</h3>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <CopyButton 
                  text={getProcessedText(step2.content)} 
                  onCopy={() => handleAction('copy', step2.step_key, step2.content)}
                />
                <Button 
                  onClick={() => handleAction('whatsapp', step2.step_key, step2.content)}
                  className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-9 gap-2 px-4 font-bold"
                >
                  <MessageCircle className="h-4 w-4 fill-current" /> WhatsApp
                </Button>
              </div>
            </div>

            <div className="relative rounded-2xl bg-muted p-4 sm:p-5">
              <p className="text-sm sm:text-base leading-relaxed text-foreground italic">
                "{getProcessedText(step2.content)}"
              </p>
            </div>
          </div>
        )}

        {/* Step 3 - Ramificações */}
        {step3 && (
          <div className="group rounded-[20px] border border-border bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl font-bold bg-blue-600 text-white">
                3
              </div>
              <h3 className="text-lg font-black text-foreground">{step3.title}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {step3.branches?.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => {
                    setSelectedBranchKey(branch.branch_key);
                    handleAction('branch', step3.step_key, branch.branch_content || "", branch.branch_key);
                  }}
                  className={cn(
                    "h-12 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 shadow-sm",
                    selectedBranchKey === branch.branch_key 
                      ? "bg-blue-600 border-blue-600 text-white translate-y-[1px]" 
                      : "bg-background border-border text-muted-foreground hover:border-blue-400 hover:text-blue-600"
                  )}
                >
                  {branch.label}
                </button>
              ))}
            </div>

            {selectedBranchKey ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {selectedBranchKey === 'vendeu' && (
                  <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                    <button 
                      onClick={() => setVendeuStep(1)}
                      className={cn(
                        "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-tight transition-all",
                        vendeuStep === 1 ? "bg-background text-blue-600 shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      Passo 1
                    </button>
                    <button 
                      onClick={() => setVendeuStep(2)}
                      className={cn(
                        "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-tight transition-all",
                        vendeuStep === 2 ? "bg-background text-blue-600 shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      Passo 2
                    </button>
                  </div>
                )}

                <div className="relative rounded-[20px] bg-blue-600 p-6 text-white shadow-lg">
                  <p className="text-sm sm:text-base leading-relaxed font-medium mb-6">
                    {selectedBranchKey && getProcessedText(step3.branches?.find(b => b.branch_key === selectedBranchKey)?.branch_content || "")}
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={() => handleAction('copy', step3.step_key, step3.branches?.find(b => b.branch_key === selectedBranchKey)?.branch_content || "", selectedBranchKey)}
                      variant="secondary"
                      className="bg-white/10 hover:bg-white/20 text-white border-none rounded-xl h-10 gap-2 px-6 font-bold flex-1 sm:flex-none"
                    >
                      <Copy className="h-4 w-4" /> Copiar
                    </Button>
                    <Button 
                      onClick={() => handleAction('whatsapp', step3.step_key, step3.branches?.find(b => b.branch_key === selectedBranchKey)?.branch_content || "", selectedBranchKey)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-xl h-10 gap-2 px-6 font-bold flex-1 sm:flex-none"
                    >
                      <MessageCircle className="h-4 w-4 fill-current" /> WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-border rounded-[20px] bg-muted/50">
                <p className="text-sm text-muted-foreground font-medium">Selecione uma opção acima para ver o script correspondente.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-border gap-4">
        <Button 
          variant="ghost" 
          onClick={resetSession}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
        >
          <RotateCcw className="h-4 w-4 mr-2" /> Limpar Atendimento
        </Button>
        
        <Button 
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-10 h-12 font-black shadow-lg shadow-primary/20"
          disabled={!currentSessionId}
          onClick={() => {
            if (currentSessionId) {
              updateSession.mutate({ id: currentSessionId, status: 'completed' });
              toast.success("Atendimento concluído e registrado!");
              resetSession();
            }
          }}
        >
          Registrar e Finalizar
        </Button>
      </div>
    </div>
  );
}
