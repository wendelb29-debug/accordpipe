import { useState } from "react";
import { 
  Settings, Save, X, Play, MessageCircle, 
  Copy, Trash2, Plus, GripVertical, Eye, 
  Variable, Check, Smartphone, Info
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { useCloser, type Script, type ScriptBranch } from "@/hooks/useCloser";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface WorkspaceCloserConfigDialogProps {
  workspaceId: string;
  workspaceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceCloserConfigDialog({
  workspaceId,
  workspaceName,
  open,
  onOpenChange
}: WorkspaceCloserConfigDialogProps) {
  const { profile, role } = useAuth();
  const queryClient = useQueryClient();
  const { settings, playbooks, updateSettings, scripts } = useCloser();
  const { hasPermission } = usePermissions();
  
  const [activeTab, setActiveTab] = useState("geral");
  const [localSettings, setLocalSettings] = useState<any>(null);

  // Initialize local settings when data loads
  useState(() => {
    if (settings) setLocalSettings(settings);
  });

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync(localSettings || settings || {});
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    }
  };

  const isMasterOrAdmin = profile?.is_master || role === 'admin' || role === 'ceo' || hasPermission("configure_closer");

  if (!isMasterOrAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Settings className="h-5 w-5 text-primary" />
            Configurações do Closer — {workspaceName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 border-b">
            <TabsList className="h-12 bg-transparent gap-6 p-0">
              <TabsTrigger value="geral" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent p-0 px-2 font-bold text-xs uppercase tracking-wider">
                Geral
              </TabsTrigger>
              <TabsTrigger value="scripts" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent p-0 px-2 font-bold text-xs uppercase tracking-wider">
                Scripts
              </TabsTrigger>
              <TabsTrigger value="ramificacoes" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent p-0 px-2 font-bold text-xs uppercase tracking-wider">
                Ramificações
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent p-0 px-2 font-bold text-xs uppercase tracking-wider">
                WhatsApp e Variáveis
              </TabsTrigger>
              <TabsTrigger value="preview" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent p-0 px-2 font-bold text-xs uppercase tracking-wider">
                Pré-visualização
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="geral" className="mt-0 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Exibir aba Closer neste workspace</Label>
                  <p className="text-xs text-muted-foreground">Ativa ou desativa o módulo Closer para todos os usuários deste workspace.</p>
                </div>
                <Switch 
                  checked={localSettings?.closer_enabled ?? settings?.closer_enabled ?? false}
                  onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, closer_enabled: checked }))}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Playbook Selecionado</Label>
                  <Select 
                    value={localSettings?.playbook_id || settings?.playbook_id || ""}
                    onValueChange={(val) => setLocalSettings(prev => ({ ...prev, playbook_id: val }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-background border-border">
                      <SelectValue placeholder="Selecione um playbook" />
                    </SelectTrigger>
                    <SelectContent>
                      {playbooks?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">O playbook define o conjunto de scripts e fluxos deste workspace.</p>
                </div>

                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex gap-3">
                  <Info className="h-5 w-5 text-yellow-500 shrink-0" />
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    <strong>Atenção:</strong> Estas configurações afetam somente o workspace <strong>{workspaceName}</strong>. 
                    Alterações em scripts globais podem afetar outros workspaces que usam o mesmo playbook.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scripts" className="mt-0 space-y-4">
               <div className="flex items-center justify-between mb-2">
                 <h3 className="text-sm font-bold">Scripts do Playbook</h3>
                 <Button size="sm" className="h-8 rounded-lg gap-1 text-[10px] font-bold uppercase">
                   <Plus className="h-3 w-3" /> Novo Script
                 </Button>
               </div>
               
               <div className="space-y-3">
                 {scripts?.map((script) => (
                   <div key={script.id} className="group flex items-center justify-between p-3 rounded-xl border bg-card hover:border-primary/50 transition-all">
                     <div className="flex items-center gap-3">
                       <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab" />
                       <div>
                         <p className="text-sm font-bold">{script.title}</p>
                         <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{script.step_key} • {script.channel}</p>
                       </div>
                     </div>
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Eye className="h-4 w-4" /></Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Copy className="h-4 w-4" /></Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive"><Trash2 className="h-4 w-4" /></Button>
                     </div>
                   </div>
                 ))}
                 {(!scripts || scripts.length === 0) && (
                   <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/20">
                     <p className="text-sm text-muted-foreground">Nenhum script encontrado para este playbook.</p>
                   </div>
                 )}
               </div>
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-0 space-y-6">
               <div className="space-y-4">
                 <div className="space-y-2">
                   <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Script padrão para "Enviar Mensagem"</Label>
                   <Select 
                     value={localSettings?.default_send_message_script_id || settings?.default_send_message_script_id || ""}
                     onValueChange={(val) => setLocalSettings(prev => ({ ...prev, default_send_message_script_id: val }))}
                   >
                     <SelectTrigger className="h-12 rounded-xl bg-background border-border">
                       <SelectValue placeholder="Selecione o script principal" />
                     </SelectTrigger>
                     <SelectContent>
                       {scripts?.map(s => (
                         <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>

                 <div className="space-y-2">
                   <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Script padrão para "WhatsApp Web"</Label>
                   <Select 
                     value={localSettings?.default_whatsapp_script_id || settings?.default_whatsapp_script_id || ""}
                     onValueChange={(val) => setLocalSettings(prev => ({ ...prev, default_whatsapp_script_id: val }))}
                   >
                     <SelectTrigger className="h-12 rounded-xl bg-background border-border">
                       <SelectValue placeholder="Selecione o script secundário" />
                     </SelectTrigger>
                     <SelectContent>
                       {scripts?.map(s => (
                         <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               </div>

               <div className="rounded-xl border bg-muted/30 p-4">
                 <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                   <Variable className="h-3 w-3 text-primary" /> Variáveis Disponíveis
                 </h4>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                   {["[Nome]", "[Telefone]", "[WhatsApp]", "[Empresa]", "[Veiculo]", "[Placa]", "[Placa/Modelo]", "[Responsavel]", "[Vendedor]", "[Data]", "[Hora]", "[ValorPS]", "[ValorMRR]"].map(v => (
                     <div key={v} className="px-2 py-1 rounded bg-background border text-[10px] font-mono text-center truncate" title={v}>
                       {v}
                     </div>
                   ))}
                 </div>
                 <p className="mt-3 text-[10px] text-muted-foreground italic">
                   As variáveis são substituídas automaticamente pelos dados reais do card ao abrir o WhatsApp.
                 </p>
               </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
               <div className="rounded-2xl border bg-slate-950 p-6 text-white space-y-4 shadow-inner">
                 <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                   <Smartphone className="h-4 w-4 text-emerald-500" />
                   <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">WhatsApp Preview</span>
                 </div>
                 <div className="space-y-4">
                   <div className="bg-emerald-600/20 border border-emerald-600/30 rounded-2xl p-4 relative ml-8">
                     <div className="absolute -left-2 top-4 w-4 h-4 bg-emerald-600/20 border-l border-b border-emerald-600/30 rotate-45" />
                     <p className="text-sm leading-relaxed">
                       Olá, <strong>Carlos</strong>! Vimos que seu veículo <strong>ABC1D23 Onix</strong> está sem proteção...
                     </p>
                     <span className="block text-[9px] text-white/40 text-right mt-2">12:45</span>
                   </div>
                 </div>
                 <div className="pt-4 flex justify-center">
                    <Button variant="outline" className="h-9 rounded-xl border-white/20 hover:bg-white/10 text-white gap-2 font-bold px-6">
                      <Play className="h-3 w-3 fill-emerald-500 text-emerald-500" /> Testar no WhatsApp
                    </Button>
                 </div>
               </div>
            </TabsContent>
            
            <TabsContent value="ramificacoes" className="mt-0">
               <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/20">
                 <p className="text-sm text-muted-foreground">Editor de ramificações será implementado conforme necessário.</p>
               </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-6 border-t bg-muted/10">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
            Cancelar
          </Button>
          <Button onClick={handleSaveSettings} className="rounded-xl font-bold gap-2 px-8">
            <Save className="h-4 w-4" /> Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
