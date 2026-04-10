import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Settings2, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export function WhatsAppRoutingConfig() {
  const { profile } = useAuth();
  const { workspaces } = useWorkspaceContext();
  const companyId = useActiveCompanyId();

  const [defaultWsId, setDefaultWsId] = useState<string | null>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New rule form
  const [newRuleType, setNewRuleType] = useState("keyword");
  const [newRuleValue, setNewRuleValue] = useState("");
  const [newRuleWsId, setNewRuleWsId] = useState("");

  const fetchConfig = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const [{ data: config }, { data: rulesData }] = await Promise.all([
      supabase
        .from("whatsapp_workspace_config")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_default", true)
        .maybeSingle(),
      supabase
        .from("whatsapp_routing_rules")
        .select("*")
        .eq("company_id", companyId)
        .order("priority", { ascending: false }),
    ]);

    setDefaultWsId(config?.workspace_id || null);
    setRules(rulesData || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSetDefault = async (wsId: string) => {
    if (!companyId) return;
    setSaving(true);

    // Remove old default
    await supabase
      .from("whatsapp_workspace_config")
      .delete()
      .eq("company_id", companyId)
      .eq("is_default", true);

    // Set new default
    await supabase.from("whatsapp_workspace_config").insert({
      company_id: companyId,
      workspace_id: wsId,
      is_default: true,
    } as any);

    setDefaultWsId(wsId);
    setSaving(false);
    toast.success("Workspace padrão definido!");
  };

  const handleAddRule = async () => {
    if (!companyId || !newRuleWsId || !newRuleValue.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("whatsapp_routing_rules").insert({
      company_id: companyId,
      workspace_id: newRuleWsId,
      rule_type: newRuleType,
      rule_value: newRuleValue.trim(),
      priority: rules.length,
    } as any);
    if (error) {
      toast.error("Erro ao criar regra");
    } else {
      toast.success("Regra criada!");
      setNewRuleValue("");
      fetchConfig();
    }
    setSaving(false);
  };

  const handleDeleteRule = async (id: string) => {
    await supabase.from("whatsapp_routing_rules").delete().eq("id", id);
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success("Regra removida");
  };

  const handleToggleRule = async (id: string, isActive: boolean) => {
    await supabase.from("whatsapp_routing_rules").update({ is_active: isActive } as any).eq("id", id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: isActive } : r));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Default Workspace */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Workspace Padrão do WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Novos leads do WhatsApp serão criados neste workspace por padrão, a menos que uma regra de roteamento se aplique.
          </p>
          <Select value={defaultWsId || ""} onValueChange={handleSetDefault} disabled={saving}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Selecione um workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map(ws => (
                <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Routing Rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Route className="h-4 w-4" /> Regras de Roteamento Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Defina regras para rotear automaticamente conversas do WhatsApp para workspaces específicos com base em palavras-chave ou DDD.
          </p>

          {/* Existing rules */}
          {rules.length > 0 && (
            <div className="space-y-2">
              {rules.map(rule => {
                const ws = workspaces.find(w => w.id === rule.workspace_id);
                return (
                  <div key={rule.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                    />
                    <Badge variant="outline" className="text-[10px]">
                      {rule.rule_type === "keyword" ? "Palavra-chave" : "DDD"}
                    </Badge>
                    <span className="text-xs font-medium flex-1">{rule.rule_value}</span>
                    <span className="text-xs text-muted-foreground">→ {ws?.name || "?"}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteRule(rule.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new rule */}
          <div className="flex flex-wrap items-end gap-2 pt-2 border-t">
            <div className="space-y-1">
              <Label className="text-[11px]">Tipo</Label>
              <Select value={newRuleType} onValueChange={setNewRuleType}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">Palavra-chave</SelectItem>
                  <SelectItem value="ddd">DDD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-[120px]">
              <Label className="text-[11px]">Valor</Label>
              <Input
                value={newRuleValue}
                onChange={e => setNewRuleValue(e.target.value)}
                placeholder={newRuleType === "keyword" ? "Ex: seguro" : "Ex: 34"}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1 min-w-[140px]">
              <Label className="text-[11px]">Workspace</Label>
              <Select value={newRuleWsId} onValueChange={setNewRuleWsId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map(ws => (
                    <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={handleAddRule} disabled={saving} className="h-8 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
