import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Building2, Users, Lock, Unlock, Crown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ResellerTabProps {
  companyId: string;
}

export function ResellerTab({ companyId }: ResellerTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isReseller, setIsReseller] = useState(false);
  const [canCreateTenants, setCanCreateTenants] = useState(false);
  const [canManageChildTenants, setCanManageChildTenants] = useState(false);
  const [maxChildTenants, setMaxChildTenants] = useState<number | null>(null);
  const [childCount, setChildCount] = useState(0);
  const [activeChildren, setActiveChildren] = useState(0);
  const [blockedChildren, setBlockedChildren] = useState(0);

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: company }, { data: children }] = await Promise.all([
        supabase.from("companies").select("is_reseller, can_create_tenants, can_manage_child_tenants, max_child_tenants, tenant_type").eq("id", companyId).single(),
        supabase.from("companies").select("id, status").or(`parent_tenant_id.eq.${companyId},created_by_tenant_id.eq.${companyId}`).neq("id", companyId),
      ]);

      if (company) {
        setIsReseller((company as any).is_reseller || false);
        setCanCreateTenants((company as any).can_create_tenants || false);
        setCanManageChildTenants((company as any).can_manage_child_tenants || false);
        setMaxChildTenants((company as any).max_child_tenants || null);
      }

      const childList = children || [];
      setChildCount(childList.length);
      setActiveChildren(childList.filter((c: any) => c.status === "active").length);
      setBlockedChildren(childList.filter((c: any) => c.status !== "active").length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReseller = async (enabled: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("companies").update({
        is_reseller: enabled,
        reseller_panel_enabled: enabled,
        tenant_type: enabled ? "reseller" : "standard",
        can_create_tenants: enabled,
        can_manage_child_tenants: enabled,
      } as any).eq("id", companyId);

      if (error) throw error;

      setIsReseller(enabled);
      setCanCreateTenants(enabled);
      setCanManageChildTenants(enabled);
      toast.success(enabled ? "Modo revendedor ativado" : "Modo revendedor desativado");
    } catch {
      toast.error("Erro ao atualizar modo revenda");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveField = async (field: string, value: any) => {
    try {
      const { error } = await supabase.from("companies").update({ [field]: value } as any).eq("id", companyId);
      if (error) throw error;
      toast.success("Configuração salva");
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main toggle */}
      <Card className="p-5 border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Modo Revendedor / White Label</p>
              <p className="text-sm text-muted-foreground">Permitir que este tenant crie e gerencie outros tenants</p>
            </div>
          </div>
          <Switch checked={isReseller} onCheckedChange={handleToggleReseller} disabled={saving} />
        </div>
      </Card>

      {isReseller && (
        <>
          {/* Config fields */}
          <Card className="p-5 border-border space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Configurações de Revenda</h3>

            <div className="space-y-2">
              <Label>Quantidade máxima de tenants filhos</Label>
              <Input
                type="number"
                min={0}
                value={maxChildTenants ?? ""}
                placeholder="Ilimitado"
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : null;
                  setMaxChildTenants(val);
                }}
                onBlur={() => handleSaveField("max_child_tenants", maxChildTenants)}
              />
              <p className="text-xs text-muted-foreground">Deixe vazio para sem limite</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Pode criar tenants filhos</p>
                  <p className="text-xs text-muted-foreground">Criar novos ambientes independentes</p>
                </div>
                <Switch
                  checked={canCreateTenants}
                  onCheckedChange={(val) => {
                    setCanCreateTenants(val);
                    handleSaveField("can_create_tenants", val);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Pode gerenciar tenants filhos</p>
                  <p className="text-xs text-muted-foreground">Editar, bloquear e visualizar filhos</p>
                </div>
                <Switch
                  checked={canManageChildTenants}
                  onCheckedChange={(val) => {
                    setCanManageChildTenants(val);
                    handleSaveField("can_manage_child_tenants", val);
                  }}
                />
              </div>
            </div>
          </Card>

          {/* Child tenant summary */}
          <Card className="p-5 border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">Resumo da Revenda</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Building2 className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-xl font-bold text-foreground">{childCount}</p>
                <p className="text-xs text-muted-foreground">Tenants Filhos</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Unlock className="h-5 w-5 mx-auto text-green-500 mb-1" />
                <p className="text-xl font-bold text-foreground">{activeChildren}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Lock className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                <p className="text-xl font-bold text-foreground">{blockedChildren}</p>
                <p className="text-xs text-muted-foreground">Bloqueados</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                <p className="text-xl font-bold text-foreground">
                  {maxChildTenants ? `${maxChildTenants - childCount}` : "∞"}
                </p>
                <p className="text-xs text-muted-foreground">Capacidade</p>
              </div>
            </div>

            {maxChildTenants && childCount >= maxChildTenants && (
              <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Limite de tenants filhos atingido
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
