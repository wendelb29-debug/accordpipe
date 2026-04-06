import { useState, useEffect } from "react";
import { Search, Shield, ShieldCheck, ShieldX, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PERMISSION_MODULES, ALL_PERMISSION_KEYS } from "@/lib/permissions";
import { useUserPermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";

interface PermissionsEditorProps {
  userId: string;
  isCeoOrMaster?: boolean;
  onClose?: () => void;
}

export function PermissionsEditor({ userId, isCeoOrMaster, onClose }: PermissionsEditorProps) {
  const { toast } = useToast();
  const {
    roleDefaults,
    customPerms,
    hasCustom,
    loading,
    userRole,
    getEffectivePermission,
    saveCustomPermissions,
    clearCustomPermissions,
  } = useUserPermissions(userId);

  const [searchTerm, setSearchTerm] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCustomMode(hasCustom);
    if (hasCustom) {
      // Build full permission map from effective values
      const perms: Record<string, boolean> = {};
      ALL_PERMISSION_KEYS.forEach(key => {
        perms[key] = getEffectivePermission(key);
      });
      setLocalPerms(perms);
    } else {
      // Use role defaults
      const perms: Record<string, boolean> = {};
      ALL_PERMISSION_KEYS.forEach(key => {
        perms[key] = roleDefaults.includes(key);
      });
      setLocalPerms(perms);
    }
  }, [hasCustom, roleDefaults, customPerms]);

  if (isCeoOrMaster) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <p className="font-medium text-foreground">Acesso Total</p>
          <p className="text-sm text-muted-foreground">
            Usuários CEO/Master possuem todas as permissões e não podem ser restringidos.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleToggle = (key: string) => {
    setLocalPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (customMode) {
        await saveCustomPermissions(localPerms);
        toast({ title: "Permissões salvas", description: "As permissões customizadas foram aplicadas." });
      } else {
        await clearCustomPermissions();
        toast({ title: "Permissões resetadas", description: "Usando permissões padrão do perfil." });
      }
      onClose?.();
    } catch {
      toast({ title: "Erro", description: "Não foi possível salvar as permissões.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    const perms: Record<string, boolean> = {};
    ALL_PERMISSION_KEYS.forEach(key => {
      perms[key] = roleDefaults.includes(key);
    });
    setLocalPerms(perms);
    setCustomMode(false);
  };

  const filteredModules = PERMISSION_MODULES.map(module => ({
    ...module,
    permissions: module.permissions.filter(p =>
      p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.label.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(m => m.permissions.length > 0);

  const grantedCount = ALL_PERMISSION_KEYS.filter(k => localPerms[k]).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">Permissões</span>
          <Badge variant="secondary" className="text-xs">
            {grantedCount}/{ALL_PERMISSION_KEYS.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="custom-mode" className="text-sm text-muted-foreground">
            Personalizar
          </Label>
          <Switch
            id="custom-mode"
            checked={customMode}
            onCheckedChange={(checked) => {
              setCustomMode(checked);
              if (!checked) handleResetToDefaults();
            }}
          />
        </div>
      </div>

      {!customMode && (
        <div className="p-3 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
          Usando permissões padrão do perfil <Badge variant="outline" className="ml-1">{userRole}</Badge>. 
          Ative "Personalizar" para ajustar individualmente.
        </div>
      )}

      {customMode && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar permissões..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Modules */}
          <Accordion type="multiple" className="space-y-2" defaultValue={PERMISSION_MODULES.map(m => m.key)}>
            {filteredModules.map(module => {
              const ModIcon = module.icon;
              const moduleGranted = module.permissions.filter(p => localPerms[p.key]).length;
              return (
                <AccordionItem key={module.key} value={module.key} className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <ModIcon className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">{module.label}</span>
                      <Badge variant={moduleGranted === module.permissions.length ? "default" : "secondary"} className="text-xs">
                        {moduleGranted}/{module.permissions.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div className="space-y-3">
                      {module.permissions.map(perm => (
                        <div key={perm.key} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            {localPerms[perm.key] ? (
                              <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <ShieldX className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">{perm.label}</p>
                              <p className="text-xs text-muted-foreground">{perm.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={localPerms[perm.key] || false}
                            onCheckedChange={() => handleToggle(perm.key)}
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* Reset button */}
          <Button variant="ghost" size="sm" onClick={handleResetToDefaults} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Restaurar padrão do perfil
          </Button>
        </>
      )}

      {/* Save */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        {onClose && (
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Permissões"}
        </Button>
      </div>
    </div>
  );
}
